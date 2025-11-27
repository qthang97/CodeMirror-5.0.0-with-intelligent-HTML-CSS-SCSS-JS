// ==UserScript==
// @name         Sapo Intelligent All-in-One (JS + CSS + HTML)
// @namespace    http://tampermonkey.net/
// @version      2025-11-27-V4
// @description  Ultimate IntelliSense for Sapo (JS Context, HTML Classes, Local/External CSS)
// @author       You
// @match        https://*.mysapo.net/admin/themes/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mysapo.net
// @run-at       document-idle
// @grant        window.onurlchange
// ==/UserScript==

;(function () {
	'use strict'
	console.log('Sapo Intelligent All-in-One Loaded')

	const DEBUG_MODE = false

	function debugLog(...args) {
		if (DEBUG_MODE) {
			console.log('%c[Sapo-Debug]', 'color: #e0005a; font-weight: bold;', ...args)
		}
	}
	function waitLoadElement(elemWait, funCallback) {
		// Wait load element
		let count = 0
		let timeInterval = setInterval(() => {
			let tmpElem = document.querySelector(elemWait)
			if (tmpElem) {
				if (count >= 5) {
					funCallback()
					clearInterval(timeInterval)
				}
				count++
			}
		}, 100)

		setTimeout(() => {
			clearInterval(timeInterval)
		}, 30000)
	}
	// --- CẤU HÌNH CHUNG ---
	const CDN_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16'

	// --- KHO DỮ LIỆU ---
	// 1. JS Keywords
	const jsKeywords = [
		'abstract',
		'arguments',
		'await',
		'async',
		'boolean',
		'break',
		'byte',
		'case',
		'catch',
		'char',
		'class',
		'const',
		'continue',
		'debugger',
		'default',
		'delete',
		'do',
		'double',
		'else',
		'enum',
		'eval',
		'export',
		'extends',
		'false',
		'final',
		'finally',
		'float',
		'for',
		'function',
		'goto',
		'if',
		'implements',
		'import',
		'in',
		'instanceof',
		'int',
		'interface',
		'let',
		'long',
		'native',
		'new',
		'null',
		'package',
		'private',
		'protected',
		'public',
		'return',
		'short',
		'static',
		'super',
		'switch',
		'synchronized',
		'this',
		'throw',
		'throws',
		'transient',
		'true',
		'try',
		'typeof',
		'var',
		'void',
		'volatile',
		'while',
		'with',
		'yield',
		'Promise',
		'Map',
		'Set',
		'WeakMap',
		'WeakSet',
		'Symbol',
		'Proxy',
		'Reflect',
		'JSON',
		'Math',
		'Date',
		'Array',
		'Object',
		'String',
		'Number',
		'Boolean',
		'RegExp',
		'Error',
		'undefined',
		'NaN',
		'Infinity',
		'map',
		'filter',
		'reduce',
		'forEach',
		'find',
		'findIndex',
		'includes',
		'indexOf',
		'push',
		'pop',
		'shift',
		'unshift',
		'splice',
		'slice',
		'join',
		'split',
		'keys',
		'values',
		'entries',
		'assign',
		'freeze',
		'seal',
		'create',
		'length',
		'toString',
		'substring',
		'substr',
		'replace',
		'replaceAll',
		'trim',
		'window',
		'document',
		'console',
		'log',
		'error',
		'warn',
		'info',
		'localStorage',
		'sessionStorage',
		'navigator',
		'history',
		'location',
		'setTimeout',
		'setInterval',
		'clearTimeout',
		'clearInterval',
		'alert',
		'prompt',
		'confirm',
		'fetch',
		'querySelector',
		'querySelectorAll',
		'getElementById',
		'getElementsByClassName',
		'addEventListener',
		'removeEventListener',
		'innerHTML',
		'innerText',
		'textContent',
		'getAttribute',
		'setAttribute',
		'classList',
		'add',
		'remove',
		'toggle',
		'body',
		'head',
		'createElement',
		'appendChild',
		'style',
		'src',
		'href',
		'$',
		'jQuery',
		'sapo',
		'Bizweb',
	]

	let localJsVars = new Set()
	let localCssClasses = new Set()
	let externalCssClasses = new Set()
	let currentFileType = 'unknown'
	const LS_KEY = window.location.host

	// --- 1. DETECT URL & FILE TYPE ---
	if (window.onurlchange === null) {
		window.addEventListener('urlchange', info => {
			currentFileType = detectFileType(info.url)
			localJsVars.clear()
			localCssClasses.clear() // Reset local khi đổi file
		})
	}

	function detectFileType(urlString) {
		const url = new URL(urlString)
		const key = url.searchParams.get('key')
		if (!key) return 'unknown'
		if (key.endsWith('.js') || key.endsWith('.js.bwt')) return 'javascript'
		if (key.endsWith('.css') || key.endsWith('.scss')) return 'css'
		if (key.endsWith('.bwt') || key.endsWith('.liquid') || key.endsWith('.html')) return 'html'
		return 'unknown'
	}

	// --- 2. DATA LOADERS (CSS External) ---
	function getCsrfToken() {
		const meta = document.querySelector('meta[name="csrf-token"]')
		return meta ? meta.getAttribute('content') : ''
	}

	async function fetchExternalCSS(forceUpdate = false) {
		console.log('[All-in-One] Bắt đầu tiến trình lấy CSS...')
		let EXTERNAL_CSS_URL = []
		let cachedData = new Map()

		// 1. Lấy danh sách file từ Sidebar
		let sideBar_el = document.querySelector('#asset-list-container')
		if (sideBar_el) {
			let a_tags = sideBar_el.querySelectorAll('li a')
			if (a_tags.length > 0) {
				EXTERNAL_CSS_URL = Array.from(a_tags)
					.map(r => r.getAttribute('data-asset-key'))
					.filter(r => /\.(css|css\.bwt|scss\.bwt|scss)$/i.test(r))
			}
		}

		// Nếu không tìm thấy file nào trong sidebar, dừng lại
		if (EXTERNAL_CSS_URL.length === 0) {
			console.warn('[All-in-One] Không tìm thấy file CSS nào trong sidebar.')
			return
		}

		try {
			let adminUrl = window.location.href
			let matchUrlWithAdmin = adminUrl.match(/(https:\/\/\w.+\/admin\/themes\/)(\d+)/i)
			if (!matchUrlWithAdmin) throw 'Cannot found url admin/themes/ID'

			// Reset Set nếu force update
			if (forceUpdate) {
				externalCssClasses.clear()
			}

			// Hiển thị trạng thái đang tải (nếu có nút bấm)
			const btn = document.getElementById('btn-refresh-css')
			if (btn) btn.innerText = 'Đang tải...'

			// 2. Duyệt qua từng file và Fetch nội dung
			// SỬA LỖI: Dùng vòng lặp đúng logic cho Array
			for (let i = 0; i < EXTERNAL_CSS_URL.length; i++) {
				let assetKey = EXTERNAL_CSS_URL[i]

				// Xây dựng URL chuẩn để fetch asset (dựa trên logic cũ của bạn)
				// Lưu ý: key phải là assetKey thực tế (ví dụ: assets/theme.css)
				let url = matchUrlWithAdmin[1] + 'assets/' + matchUrlWithAdmin[2] + '?key=' + encodeURIComponent(assetKey)

				// Fetch dữ liệu
				const response = await fetch(url, {
					headers: {
						'content-type': 'application/json; charset=utf-8',
						Accept: 'application/json',
						'X-Requested-With': 'XMLHttpRequest',
						'X-CSRF-Token': getCsrfToken(), // Hoặc hàm getCsrfToken() của bạn
					},
				})

				const rawText = await response.text()
				let cssContent = ''

				try {
					const data = JSON.parse(rawText)
					cssContent = data.content || data.value || (data.asset ? data.asset.value : '')
				} catch (e) {
					cssContent = rawText
				}

				// 3. Regex lấy Class name
				if (cssContent && typeof cssContent === 'string') {
					// Regex này lấy class bắt đầu bằng dấu chấm
					const regex = /\.([a-zA-Z0-9_\-]+)\s*\{/g
					let match
					while ((match = regex.exec(cssContent)) !== null) {
						externalCssClasses.add(match[1])
					}
					cachedData.set(assetKey, [...externalCssClasses])
				}
			}

			// 4. Lưu vào LocalStorage sau khi hoàn tất
			localStorage.setItem(LS_KEY, JSON.stringify([...cachedData]))

			console.log(`[All-in-One] Đã tải và lưu ${externalCssClasses.size} classes vào LocalStorage.`)
			alert(`Cập nhật thành công! Đã tìm thấy ${externalCssClasses.size} classes.`)
		} catch (e) {
			console.error('[All-in-One] Lỗi khi fetch CSS:', e)
		} finally {
			// Trả lại trạng thái nút bấm
			const btn = document.getElementById('btn-refresh-css')
			if (btn) btn.innerText = 'Cập nhật CSS Cache'
		}
	}

	/**
	 * Hàm khởi tạo: Kiểm tra Storage và tạo nút bấm
	 */
	function initCSSManager() {
		// 1. Kiểm tra LocalStorage
		const cachedData = localStorage.getItem(LS_KEY)

		if (cachedData) {
			// TRƯỜNG HỢP 1: Đã có dữ liệu -> Load từ cache
			try {
				const parsedData = JSON.parse(cachedData)
				const tmpMap = new Map(parsedData)
				for (const [key, value] of tmpMap) {
					value.forEach(r => externalCssClasses.add(r))
				}
				console.log(`[All-in-One] Loaded ${externalCssClasses.size} classes from LocalStorage.`)
			} catch (e) {
				console.error('Lỗi parse cache, sẽ fetch lại.', e)
				fetchExternalCSS(true)
			}
		} else {
			// TRƯỜNG HỢP 2: Chưa có dữ liệu -> Fetch lần đầu
			console.log('[All-in-One] Chưa có cache, bắt đầu fetch lần đầu...')
			fetchExternalCSS(true)
		}

		// 2. Tạo nút bấm cập nhật thủ công (Manual Update)
		createUpdateButton()
	}

	/**
	 * Tạo nút bấm UI ở góc màn hình
	 */
	function createUpdateButton() {
		// Kiểm tra nếu nút đã tồn tại thì thôi
		if (document.getElementById('btn-refresh-css')) return
		let btn
		const divEl = document.querySelector('.template-editor-titlebar__actions')
		if (!divEl) {
			btn = document.createElement('button')
			btn.id = 'btn-refresh-css'
			btn.innerText = 'Cập nhật CSS Cache'

			// Style cho nút bấm (Góc dưới bên phải hoặc vị trí tùy ý)
			Object.assign(btn.style, {
				position: 'fixed',
				bottom: '20px',
				right: '20px',
				zIndex: 9999,
				padding: '10px 15px',
				backgroundColor: '#008060', // Màu xanh Shopify
				color: '#fff',
				border: 'none',
				borderRadius: '4px',
				cursor: 'pointer',
				boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
				fontWeight: 'bold',
				fontSize: '14px',
			})
			document.body.appendChild(btn)
		} else {
			divEl.insertAdjacentHTML('afterbegin', '<span class="ui-button ui-button--transparent ui-button--size-small" href="javascript:void(0);" id="btn-refresh-css">Cập nhật CSS Cache</span>')
		}
		btn = divEl.querySelector('#btn-refresh-css')
		// Sự kiện click: Gọi hàm fetch với forceUpdate = true
		btn.addEventListener('click', function (e) {
			e.preventDefault()
			console.log('clicked')
			fetchExternalCSS(true)
		})
	}

	// --- 3. SCANNERS (Local JS & CSS) ---
	function scanLocalJS(editor) {
		const content = editor.getValue()
		const newSet = new Set()
		const wordRegex = /\b[a-zA-Z_$][a-zA-Z0-9_$]{1,}\b/g

		if (currentFileType === 'javascript') {
			// File JS thuần -> Quét hết
			let match
			while ((match = wordRegex.exec(content)) !== null) {
				if (!jsKeywords.includes(match[0])) newSet.add(match[0])
			}
		} else {
			// File HTML -> Chỉ quét nội dung nằm trong cặp thẻ script
			// Regex này bắt buộc phải có thẻ đóng mới lấy nội dung
			const scriptBlockRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
			let blockMatch
			while ((blockMatch = scriptBlockRegex.exec(content)) !== null) {
				const jsContent = blockMatch[1]
				let wordMatch
				while ((wordMatch = wordRegex.exec(jsContent)) !== null) {
					if (!jsKeywords.includes(wordMatch[0])) newSet.add(wordMatch[0])
				}
			}
		}
		localJsVars = newSet
	}

	function scanLocalCSS(editor) {
		const content = editor.getValue()
		const newSet = new Set()
		// Quét trong thẻ <style>
		const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
		let blockMatch
		while ((blockMatch = styleBlockRegex.exec(content)) !== null) {
			const cssText = blockMatch[1]
			const classRegex = /\.([a-zA-Z0-9_\-]+)/g
			let clsMatch
			while ((clsMatch = classRegex.exec(cssText)) !== null) {
				newSet.add(clsMatch[1])
			}
		}
		localCssClasses = newSet
		// Nếu file là CSS thuần thì quét toàn bộ
		if (currentFileType === 'css') {
			const classRegex = /\.([a-zA-Z0-9_\-]+)/g
			let clsMatch
			while ((clsMatch = classRegex.exec(content)) !== null) {
				newSet.add(clsMatch[1])
			}
			localCssClasses = newSet
		}
		return localCssClasses
	}

	// Hàm này được gọi sau khi scanLocalCSS chạy xong
	function updateLocalCachedDataWhenSaveFile(localCssClasses) {
		// Set Update value current file to Cache
		let matchCurrentFileName = window.location.href.match(/\?key\=(\w.*)/)
		if (!matchCurrentFileName) return
		let currentFileName = matchCurrentFileName[1]
		const cachedData = localStorage.getItem(LS_KEY)

		if (cachedData) {
			const parsedData = JSON.parse(cachedData)
			const tmpMap = new Map(parsedData)
			tmpMap.set(currentFileName, [...localCssClasses])
			localStorage.setItem(LS_KEY, JSON.stringify([...tmpMap]))
		}
	}

	// --- HÀM XỬ LÝ SỰ KIỆN LƯU (Ctrl + S) ---
	function handleCtrlS(editor) {
		// 1. Scan lại dữ liệu cục bộ (JS Vars và CSS Classes)
		let tmpClass = scanLocalCSS(editor) // Hàm này đã gọi updateLocalCachedDataWhenSaveFile() bên trong.
		updateLocalCachedDataWhenSaveFile(tmpClass)
		// 2. Chặn hành vi lưu mặc định của trình duyệt/code editor
		// Thường cần trả về false hoặc gọi preventDefault() nếu có thể.
		// Trong CodeMirror, việc định nghĩa extraKeys đã giúp chặn hành vi mặc định.

		console.log('[All-in-One] Bắt Ctrl+S: Đã cập nhật local cache.')
		// Thêm feedback nhỏ cho người dùng
		const message = `[IntelliSense] Đã quét xong (${localCssClasses.size} classes) và cập nhật cache!`
		console.warn(message)
		// (Tùy chọn: Bạn có thể thêm một UI alert nhỏ ở đây)
	}

	// --- 4. CONTEXT HELPERS ---
	// --- HÀM KIỂM TRA STRICT CONTEXT ---
	function isJsContext(cm) {
		if (currentFileType === 'javascript') return true

		const cursor = cm.getCursor()
		const doc = cm.getDoc()
		const totalLines = doc.lineCount()

		// --- FIX REGEX: Bỏ dấu ^ ---
		const regexOpen = /<\s*script\b/gi
		const regexClose = /<\s*\/\s*script\b/gi

		const getRegexLastIndex = (str, regex) => {
			regex.lastIndex = 0
			let match
			let lastIndex = -1
			while ((match = regex.exec(str)) !== null) {
				lastIndex = match.index
			}
			return lastIndex
		}

		// --- LOG BẮT ĐẦU ---
		debugLog(`Checking JS Context at Line ${cursor.line + 1}, Ch ${cursor.ch}`)

		// BƯỚC 1: QUÉT NGƯỢC
		let foundOpenTag = false
		for (let i = cursor.line; i >= 0; i--) {
			let text = doc.getLine(i)
			if (i === cursor.line) text = text.slice(0, cursor.ch)

			const lastOpen = getRegexLastIndex(text, regexOpen)
			const lastClose = getRegexLastIndex(text, regexClose)

			if (lastClose !== -1) {
				if (lastClose > lastOpen) {
					debugLog(`-> FAIL: Found </script> at line ${i + 1} pos ${lastClose}. It is after <script pos ${lastOpen}`)
					return false
				}
			}

			if (lastOpen !== -1) {
				debugLog(`-> FOUND START: <script at line ${i + 1} pos ${lastOpen}`)
				foundOpenTag = true
				break
			}
		}

		if (!foundOpenTag) {
			debugLog(`-> FAIL: Scanned all way up, no <script found.`)
			return false
		}

		// BƯỚC 2: QUÉT XUÔI
		for (let i = cursor.line; i < totalLines; i++) {
			let text = doc.getLine(i)
			if (i === cursor.line) text = text.slice(cursor.ch)

			regexOpen.lastIndex = 0
			regexClose.lastIndex = 0

			const matchOpen = regexOpen.exec(text)
			const matchClose = regexClose.exec(text)

			const firstOpen = matchOpen ? matchOpen.index : -1
			const firstClose = matchClose ? matchClose.index : -1

			if (firstOpen !== -1) {
				if (firstClose === -1 || firstOpen < firstClose) {
					debugLog(`-> FAIL: Found new <script at line ${i + 1} pos ${firstOpen} BEFORE </script>`)
					return false
				}
			}

			if (firstClose !== -1) {
				debugLog(`=> JS CONTEXT CONFIRMED! (Found <script up, </script> down)`)
				return true
			}
		}

		debugLog(`-> FAIL: End of file, no </script> found.`)
		return false
	}

	// --- 4. CONTEXT HELPERS (Bổ sung logic bắt dính CSS) ---
	function isCssContext(editor) {
		// 1. Nếu file gốc là .css hoặc .scss -> Chắc chắn là CSS
		if (currentFileType === 'css' || currentFileType === 'scss') return true

		// 2. Kiểm tra inner mode (Cách chuẩn)
		const cursor = editor.getCursor()
		const token = editor.getTokenAt(cursor)
		const inner = CodeMirror.innerMode(editor.getMode(), token.state)
		if (inner.mode.name === 'css' || inner.mode.name === 'text/x-scss') return true

		// 3. Deep State Check (Dò tìm thẻ <style> trong file HTML/Liquid)
		// CodeMirror 5 trong chế độ HTMLMixed thường giấu state CSS trong localState
		let state = token.state
		// Dò ngược state để xem có đang nằm trong thẻ style không
		while (state) {
			if (state.tagName === 'style') return true // Bắt dính thẻ <style>
			if (state.context && state.context.tagName === 'style') return true

			// Di chuyển xuống state sâu hơn hoặc thoát ra
			if (state.htmlState) state = state.htmlState
			else if (state.localState) state = state.localState
			else break
		}

		return false
	}

	// --- 5. HINT PROVIDERS ---

	// JS Hint (Custom V3)
	function getJsHints(cm) {
		const cursor = cm.getCursor()
		const line = cm.getLine(cursor.line)
		const startOfWord = line.slice(0, cursor.ch).search(/[a-zA-Z0-9_$]+$/)
		let currentWord = startOfWord !== -1 ? line.slice(startOfWord, cursor.ch) : ''

		if (!currentWord) return null

		const combined = [...jsKeywords, ...localJsVars]
		const list = combined.filter(item => item.toLowerCase().indexOf(currentWord.toLowerCase()) === 0)
		list.sort((a, b) => a.length - b.length || a.localeCompare(b))

		return {
			list: list,
			from: CodeMirror.Pos(cursor.line, startOfWord !== -1 ? startOfWord : cursor.ch),
			to: CodeMirror.Pos(cursor.line, cursor.ch),
		}
	}

	// HTML Class Hint
	function getClassHints(editor) {
		const cursor = editor.getCursor()
		const lineContent = editor.getLine(cursor.line).slice(0, cursor.ch)
		const classMatch = lineContent.match(/class\s*=\s*["']([^"']*)$/)
		if (!classMatch) return null
		const words = classMatch[1].split(/\s+/)
		const wordToComplete = words[words.length - 1]
		const combinedList = [...externalCssClasses, ...localCssClasses]
		const resultList = combinedList.filter(cls => cls.startsWith(wordToComplete)).sort()

		return {
			list: resultList,
			from: CodeMirror.Pos(cursor.line, cursor.ch - wordToComplete.length),
			to: CodeMirror.Pos(cursor.line, cursor.ch),
		}
	}

	// --- 6. CORE LOGIC (Router v5 - Strict JS Fix) ---
	function applyConfig(cm) {
		if (cm._hasAllInOneHook) return

		console.log('[All-in-One] Strict JS/CSS Context Applied!')
		cm._wasInJsBlock = false
		cm._wasInCssBlock = false

		const extraKeys = cm.getOption('extraKeys') || {}
		let debounceScanTimer = null

		// --- SCANNER ---
		const performFullScan = editor => {
			// Chỉ scan JS nếu đang ở file JS hoặc trong thẻ script (để tiết kiệm)
			if (currentFileType === 'javascript' || isJsContext(editor)) {
				scanLocalJS(editor)
			}
			scanLocalCSS(editor)
		}

		// --- MAIN TRIGGER FUNCTION (V4.3 - Smart Hybrid Fix) ---
    const triggerIntelliSense = (editor, isAuto = false) => {
      if (!isAuto) performFullScan(editor)

      const cursor = editor.getCursor()
      const line = editor.getLine(cursor.line)

      const hintOptions = {
        completeSingle: false, // Quan trọng: Luôn hiện danh sách, không tự điền nếu chỉ có 1 kết quả
        closeCharacters: /[\s()\[\]{};:>,]/,
        alignWithWord: true,
      }

      // 1. Kiểm tra HTML Class (Ưu tiên số 1: class="...")
      const isClassAttr = /class\s*=\s*["']([^"']*)$/.test(line.slice(0, cursor.ch))
      if (isClassAttr) {
        const hints = getClassHints(editor)
        if (hints && hints.list.length > 0) CodeMirror.showHint(editor, () => hints, hintOptions)
        return
      }

      // 2. Kiểm tra JS Context
      if (isJsContext(editor)) {
        CodeMirror.showHint(editor, getJsHints, hintOptions)
        return
      }

      // 3. Kiểm tra CSS Context
      if (isCssContext(editor)) {
        CodeMirror.showHint(editor, CodeMirror.hint.css, hintOptions)
        return
      }

      // --- 4. FALLBACK THÔNG MINH: HTML vs TEXT ---
      // Logic: Thử lấy gợi ý HTML chuẩn trước. Nếu có kết quả thì dùng, nếu không thì dùng Anyword.
      const token = editor.getTokenAt(cursor)
      const inner = CodeMirror.innerMode(editor.getMode(), token.state)

      if (inner.mode.name === 'xml') {
        // Mẹo: Gọi trực tiếp hàm hint.html để xem nó có tìm thấy gì không
        // Lưu ý: CodeMirror.hint.html trả về {list: [], ...} hoặc null
        let htmlResult = null
        try {
            htmlResult = CodeMirror.hint.html(editor, hintOptions)
        } catch (e) { /* Ignore error */ }

        // Nếu HTML hint tìm thấy danh sách thẻ hoặc thuộc tính hợp lệ (ví dụ gõ '<' hoặc 'cla')
        if (htmlResult && htmlResult.list && htmlResult.list.length > 0) {
          CodeMirror.showHint(editor, CodeMirror.hint.html, hintOptions)
          return
        }
      }

      // 5. Nếu HTML Hint không trả về gì (ví dụ đang gõ nội dung text), dùng Anyword
      if (isAuto) return
      CodeMirror.showHint(editor, CodeMirror.hint.anyword, hintOptions)
    }

		// --- BINDING ---
		extraKeys['Ctrl-S'] = function (editor) {
			handleCtrlS(editor)
			document.getElementById('save-button').click()
		}
		extraKeys['Ctrl-Space'] = function (editor) {
			triggerIntelliSense(editor, false)
		}
		cm.setOption('extraKeys', extraKeys)

		// --- INPUT EVENT ---
		cm.on('inputRead', function (editor, change) {
			const validTrigger = /[a-zA-Z0-9_\.\-\$#@]/
			if (change.origin === '+input' && change.text[0] && validTrigger.test(change.text[0])) {
				setTimeout(() => {
					triggerIntelliSense(editor, true)
				}, 20)
			}

			if (debounceScanTimer) clearTimeout(debounceScanTimer)
			debounceScanTimer = setTimeout(() => {
				performFullScan(editor)
			}, 1500)
		})

		// --- CURSOR ACTIVITY ---
		cm.on('cursorActivity', instance => {
			const inJS = isJsContext(instance)
			const inCSS = isCssContext(instance)

			// Chỉ scan khi thực sự chuyển đổi ngữ cảnh để tránh lag
			if (instance._wasInJsBlock && !inJS) scanLocalJS(instance)
			// if (instance._wasInCssBlock && !inCSS) scanLocalCSS(instance) // CSS ít thay đổi cục bộ nên có thể bỏ qua

			instance._wasInJsBlock = inJS
			instance._wasInCssBlock = inCSS
		})

		cm.on('blur', () => {
			performFullScan(cm)
		})
		cm._hasAllInOneHook = true
	}

	// --- 7. INITIALIZATION ---
	function loadScript(src, callback) {
		if (document.querySelector(`script[src="${src}"]`)) {
			if (callback) callback()
			return
		}
		var s = document.createElement('script')
		s.src = src
		s.onload = callback
		document.head.appendChild(s)
	}

	function init() {
		currentFileType = detectFileType(window.location.href)
		console.log('currentFileType', currentFileType)
		waitLoadElement('#asset-list-container li a', function () {
			console.log('loaded')
			initCSSManager()
		})

		// CSS Style for Hints
		const customStyle = document.createElement('style')
		customStyle.innerHTML = `
            .CodeMirror-hints { z-index: 999999 !important; font-family: 'Consolas', monospace; font-size: 13px; }
            .CodeMirror-hint-active { background: #0084ff !important; color: white !important; }
        `
		document.head.appendChild(customStyle)

		// Load CSS for ShowHint
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = `${CDN_BASE}/addon/hint/show-hint.min.css`
		document.head.appendChild(link)

		// Load Dependency Chain
		loadScript(`${CDN_BASE}/addon/hint/show-hint.min.js`, () => {
			loadScript(`${CDN_BASE}/addon/hint/javascript-hint.min.js`, () => {
				loadScript(`${CDN_BASE}/addon/hint/css-hint.min.js`, () => {
					loadScript(`${CDN_BASE}/addon/hint/xml-hint.min.js`, () => {
						// Required for HTML
						loadScript(`${CDN_BASE}/addon/hint/html-hint.min.js`, () => {
							loadScript(`${CDN_BASE}/addon/hint/anyword-hint.min.js`, () => {
								startObserver()
							})
						})
					})
				})
			})
		})
	}

	function startObserver() {
		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === 1) {
						if (node.classList.contains('CodeMirror') && node.CodeMirror) {
							applyConfig(node.CodeMirror)
						} else {
							node.querySelectorAll('.CodeMirror').forEach(cmEl => {
								if (cmEl.CodeMirror) applyConfig(cmEl.CodeMirror)
							})
						}
					}
				})
			})
		})
		observer.observe(document.body, { childList: true, subtree: true })
		document.querySelectorAll('.CodeMirror').forEach(cmEl => {
			if (cmEl.CodeMirror) applyConfig(cmEl.CodeMirror)
		})
	}

	setTimeout(init, 2000)
})()
