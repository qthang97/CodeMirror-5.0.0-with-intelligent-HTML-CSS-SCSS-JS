// ==UserScript==
// @name         Sapo Intelligent All-in-One (JS + CSS + HTML)
// @namespace    http://tampermonkey.net/
// @version      2025-11-27-V4
// @description  Ultimate IntelliSense for Sapo (JS Context, HTML Classes, Local/External CSS)
// @author       You
// @match        https://*.mysapo.net/admin/themes/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mysapo.net
// @grant        GM_addStyle
// @run-at       document-idle
// @grant        window.onurlchange
// ==/UserScript==

;(function () {
	'use strict'

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
			let matchUrlWithAdmin = adminUrl.match(/https:\/\/\w.+\/admin\/themes\/\d+/i)
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
				let url = matchUrlWithAdmin[0] + '/assets?asset[key]=' + encodeURIComponent(assetKey)

				// Fetch dữ liệu
				const response = await fetch(url, {
					headers: {
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
					const regex = /\.([a-zA-Z0-9_\-]+)/g
					let match
					while ((match = regex.exec(cssContent)) !== null) {
						externalCssClasses.add(match[1])
					}
				}
			}

			// 4. Lưu vào LocalStorage sau khi hoàn tất
			localStorage.setItem(LS_KEY, JSON.stringify([...externalCssClasses]))

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
				parsedData.forEach(c => externalCssClasses.add(c))
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
		}else{
			divEl.insertAdjacentHTML("afterbegin",'<a class="ui-button ui-button--transparent ui-button--size-small" href="javascript:void()" id="btn-refresh-css">Cập nhật CSS Cache</a>')
			btn = divEl.querySelector('#btn-refresh-css')
		}

		// Sự kiện click: Gọi hàm fetch với forceUpdate = true
		btn.addEventListener("click",function () {
			if (confirm('Bạn có muốn quét lại toàn bộ file CSS để cập nhật classes mới không? Quá trình này có thể mất vài giây.')) {
				fetchExternalCSS(true)
			}
		})

		
	}

	// --- 3. SCANNERS (Local JS & CSS) ---
	function scanLocalJS(editor) {
		const content = editor.getValue()
		const newSet = new Set()
		const wordRegex = /\b[a-zA-Z_$][a-zA-Z0-9_$]{1,}\b/g
		let match
		while ((match = wordRegex.exec(content)) !== null) {
			const word = match[0]
			if (!jsKeywords.includes(word)) {
				newSet.add(word)
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
	}

	// --- 4. CONTEXT HELPERS ---
	function isJsContext(editor) {
		if (currentFileType === 'javascript') return true
		const cursor = editor.getCursor()
		const token = editor.getTokenAt(cursor)
		const inner = CodeMirror.innerMode(editor.getMode(), token.state)

		if (inner.mode.name === 'javascript') return true

		// Deep State Check (V3 Logic)
		let state = token.state
		if (state.localState) state = state.localState
		while (state) {
			if (state.tagName === 'script') return true
			if (state.htmlState && state.htmlState.tagName === 'script') return true
			if (state.htmlState) state = state.htmlState
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

	// --- 6. CORE LOGIC (The Router) ---
	function applyConfig(cm) {
		if (cm._hasAllInOneHook) return

		console.log('[All-in-One] Config Hooked!')
		cm._wasInJsBlock = false
		cm._wasInCssBlock = false

		const extraKeys = cm.getOption('extraKeys') || {}

		// *** SUPER CTRL+SPACE ROUTER ***
		extraKeys['Ctrl-Space'] = function (editor) {
			// 1. Scan Local Data Now
			scanLocalJS(editor)
			// Nếu đang ở file HTML/Liquid thì mới cần scan CSS local trong thẻ style,
			// còn ở file CSS thì thôi (vì nặng) hoặc scan nhẹ.
			if (currentFileType !== 'css') scanLocalCSS(editor)

			// 2. Identify Context
			const cursor = editor.getCursor()
			const token = editor.getTokenAt(cursor)
			const line = editor.getLine(cursor.line)

			// Get current typing word
			const startOfWord = line.slice(0, cursor.ch).search(/[a-zA-Z0-9_$]+$/)
			const currentWord = startOfWord !== -1 ? line.slice(startOfWord, cursor.ch) : ''

			// A. Check HTML Class Context first (Strong Signal)
			// Regex check if cursor is inside class="..."
			const isClassAttr = /class\s*=\s*["']([^"']*)$/.test(line.slice(0, cursor.ch))

			if (isClassAttr) {
				console.log('[Router] -> HTML Class Hints')
				const hints = getClassHints(editor)
				if (hints && hints.list.length > 0) {
					CodeMirror.showHint(editor, () => hints, { completeSingle: false })
				}
				return
			}

			// B. Check JS Context
			const isJS = isJsContext(editor)
			// Fallback V3: If HTML but typing JS keyword (e.g. "con" -> console)
			const looksLikeJS = currentFileType === 'html' && currentWord.length >= 2 && jsKeywords.some(k => k.startsWith(currentWord))

			if (isJS || looksLikeJS) {
				console.log('[Router] -> JS Hints')
				CodeMirror.showHint(editor, getJsHints, { completeSingle: false })
				return
			}

			// C. Check CSS Context (Inside <style> or .css file)
			const innerMode = CodeMirror.innerMode(editor.getMode(), token.state).mode.name
			if (innerMode === 'css' || currentFileType === 'css') {
				console.log('[Router] -> CSS Hints')
				CodeMirror.showHint(editor, CodeMirror.hint.css, { completeSingle: false })
				return
			}

			// D. Default / HTML
			console.log('[Router] -> Default/Anyword')
			CodeMirror.showHint(editor, CodeMirror.hint.anyword, { completeSingle: false })
		}

		cm.setOption('extraKeys', extraKeys)

		// *** SMART AUTO-SCAN ***
		cm.on('cursorActivity', instance => {
			const isNowInJs = isJsContext(instance)

			// Lấy inner mode để check CSS
			const token = instance.getTokenAt(instance.getCursor())
			const innerMode = CodeMirror.innerMode(instance.getMode(), token.state).mode.name
			const isNowInCss = innerMode === 'css'

			// Logic 1: Left JS Block -> Scan JS
			if (instance._wasInJsBlock && !isNowInJs) {
				scanLocalJS(instance)
			}
			// Logic 2: Left CSS Block -> Scan CSS
			if (instance._wasInCssBlock && !isNowInCss) {
				scanLocalCSS(instance)
			}

			instance._wasInJsBlock = isNowInJs
			instance._wasInCssBlock = isNowInCss
		})

		cm.on('blur', () => {
			scanLocalJS(cm)
			scanLocalCSS(cm)
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
		waitLoadElement('#asset-list-container li a', function () {
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
