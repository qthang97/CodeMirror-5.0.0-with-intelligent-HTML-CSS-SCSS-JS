// ==UserScript==
// @name         Sapo Intelligent All-in-One (JS + CSS + HTML)
// @namespace    http://tampermonkey.net/
// @version      2025-11-29-V8-Fix-Hinting
// @description  Ultimate IntelliSense for Sapo (Acorn JS, CSSTree, Fuse.js) - Liquid & BWT Compatible
// @author       You
// @match        https://*.mysapo.net/admin/themes/*
// @exclude      https://*.mysapo.net/admin/themes/editor/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mysapo.net
// @run-at       document-idle
// @grant        window.onurlchange
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/html-hint.min.js
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/javascript-hint.min.js
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/show-hint.min.js
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/xml-hint.min.js
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/css-hint.min.js
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/anyword-hint.min.js
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/acorn-8-11-3.min.js
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/walk-8-3-2.min.js
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/csstree-2-3-1.min.js
// @require      https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Sapo%20intellient%20All-in-One/fuse-7-0-0.min.js
// ==/UserScript==

;(function () {
	'use strict'
	const pad = n => n.toString().padStart(2, '0')
	const printDebugLog = (...args) => {
		if (DEBUG === true) {
			var date = new Date()
			var str_date = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
			console.log(`${str_date} -`, ...args)
		}
	}

	const DEBUG = false

	function waitLoadElement(elemWait, funCallback) {
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

	// --- KHO DỮ LIỆU ---
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
	let localObjectKeys = {}
	let localCssClasses = new Set()
	let externalCssClasses = new Set()
	let currentFileType = 'unknown'
	const LS_KEY = window.location.host

	// --- 1. DETECT URL & FILE TYPE ---
	if (window.onurlchange === null) {
		window.addEventListener('urlchange', info => {
			currentFileType = detectFileType(info.url)
			// Khi đổi file thì mới clear, còn đang gõ thì không clear ẩu
			localJsVars.clear()
			localObjectKeys = {}
			localCssClasses.clear()
		})
	}

	function detectFileType(urlString) {
		const url = new URL(urlString)
		const key = url.searchParams.get('key')
		if (!key) return 'unknown'
		if (key.endsWith('.js') || key.endsWith('.js.bwt')) return 'javascript'
		if (key.endsWith('.css') || key.endsWith('.scss') || key.endsWith('.css.bwt') || key.endsWith('.scss.bwt')) return 'css'
		if (key.endsWith('.bwt') || key.endsWith('.liquid') || key.endsWith('.html')) return 'html'
		return 'unknown'
	}

	// --- 2. DATA LOADERS (CSS External) ---
	function getCsrfToken() {
		const meta = document.querySelector('meta[name="csrf-token"]')
		return meta ? meta.getAttribute('content') : ''
	}

	async function fetchExternalCSS(forceUpdate = false, retryCount = 0) {
		console.log('[All-in-One] Bắt đầu tiến trình lấy CSS...')
		const MAX_RETRIES = 2
		let EXTERNAL_CSS_URL = []
		let cachedData = new Map()

		let sideBar_el = document.querySelector('#asset-list-container')
		if (sideBar_el) {
			let a_tags = sideBar_el.querySelectorAll('li a')
			if (a_tags.length > 0) {
				EXTERNAL_CSS_URL = Array.from(a_tags)
					.map(r => r.getAttribute('data-asset-key'))
					.filter(r => /\.(css|css\.bwt|scss\.bwt|scss)$/i.test(r))
			}
		}

		if (EXTERNAL_CSS_URL.length === 0) {
			console.warn('[All-in-One] Không tìm thấy file CSS nào trong sidebar.')
			return
		}

		try {
			let adminUrl = window.location.href
			let matchUrlWithAdmin = adminUrl.match(/(https:\/\/\w.+\/admin\/themes\/)(\d+)/i)
			if (!matchUrlWithAdmin) throw 'Cannot found url admin/themes/ID'

			if (forceUpdate) {
				externalCssClasses.clear()
			}

			const btn = document.getElementById('btn-refresh-css')
			if (btn) btn.innerText = 'Đang tải...'

			for (let i = 0; i < EXTERNAL_CSS_URL.length; i++) {
				let assetKey = EXTERNAL_CSS_URL[i]
				let url = matchUrlWithAdmin[1] + 'assets/' + matchUrlWithAdmin[2] + '?key=' + encodeURIComponent(assetKey)

				const response = await fetch(url, {
					headers: {
						'content-type': 'application/json; charset=utf-8',
						Accept: 'application/json',
						'X-Requested-With': 'XMLHttpRequest',
						'X-CSRF-Token': getCsrfToken(),
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

				if (cssContent && typeof cssContent === 'string') {
					let cleanCss = cssContent.replace(/\{%[\s\S]*?%\}/g, ' ').replace(/\{\{[\s\S]*?\}\}/g, ' ')
					let parsedSuccess = false
					try {
						const ast = csstree.parse(cleanCss, {
							parseValue: false,
							parseAtrulePrelude: false,
						})
						csstree.walk(ast, function (node) {
							if (node.type === 'ClassSelector') {
								externalCssClasses.add(node.name)
							}
						})
						parsedSuccess = true
					} catch (err) {
						parsedSuccess = false
					}

					if (!parsedSuccess) {
						const regex = /\.([a-zA-Z0-9_\-]+)/g //<-- Không cần dấu {, bắt được nhiều hơn
						let match
						while ((match = regex.exec(cssContent)) !== null) {
							externalCssClasses.add(match[1])
						}
					}
					cachedData.set(assetKey, [...externalCssClasses])
				}
			}

			localStorage.setItem(LS_KEY, JSON.stringify([...cachedData]))
			console.log(`[All-in-One] Đã tải và lưu ${externalCssClasses.size} classes vào LocalStorage.`)
			alert(`Cập nhật thành công! Đã tìm thấy ${externalCssClasses.size} classes.`)
		} catch (e) {
			console.error('[All-in-One] Lỗi khi fetch CSS:', e)

			// --- BỔ SUNG LOGIC RETRY TẠI ĐÂY ---
			if (retryCount < MAX_RETRIES) {
				const nextRetry = retryCount + 1
				const delay = 2000 // 2 giây

				console.log(`[All-in-One] Gặp lỗi, chờ ${delay}ms để thử lại lần ${nextRetry}...`)

				// Cập nhật text hiển thị lỗi tạm thời
				const btn = document.getElementById('btn-refresh-css')
				if (btn) btn.innerText = `Lỗi! Thử lại sau ${delay / 1000}s...`
				const cachingStatus = document.getElementById('csscaching')
				if (cachingStatus) cachingStatus.innerText = `Mất kết nối. Đang thử lại (${nextRetry}/${MAX_RETRIES})...`

				// Gọi lại hàm sau thời gian delay
				setTimeout(() => {
					fetchExternalCSS(forceUpdate, nextRetry)
				}, delay)

				// Return để thoát khỏi hàm hiện tại, không chạy xuống finally ngay
				return
			}
		} finally {
			// Chỉ reset nút bấm nếu KHÔNG PHẢI đang chờ retry
			if (retryCount >= MAX_RETRIES || !document.getElementById('btn-refresh-css')?.innerText.includes('Thử lại sau')) {
				const btn = document.getElementById('btn-refresh-css')
				if (btn) btn.innerText = 'Cập nhật CSS Cache'
			}
		}
	}

	function initCSSManager() {
		const cachedData = localStorage.getItem(LS_KEY)
		if (cachedData) {
			try {
				const parsedData = JSON.parse(cachedData)
				const tmpMap = new Map(parsedData)
				for (const [key, value] of tmpMap) {
					value.forEach(r => externalCssClasses.add(r))
				}
				document.getElementById('csscaching')?.remove()
				console.log(`[All-in-One] Loaded ${externalCssClasses.size} classes from LocalStorage.`)
			} catch (e) {
				console.error('Lỗi parse cache, sẽ fetch lại.', e)
				const cachingStatus = document.getElementById('csscaching')
				if (cachingStatus) cachingStatus.innerText = 'Lỗi parse cache, đang fetch lại....'
				fetchExternalCSS(true)
			}
		} else {
			console.log('[All-in-One] Chưa có cache, bắt đầu fetch lần đầu...')
			fetchExternalCSS(true)
		}
		createUpdateButton()
	}

	function createUpdateButton() {
		if (document.getElementById('btn-refresh-css')) return
		let btn
		const divEl = document.querySelector('.template-editor-titlebar__actions')
		if (!divEl) {
			btn = document.createElement('button')
			btn.id = 'btn-refresh-css'
			btn.innerText = 'Cập nhật CSS Cache'
			Object.assign(btn.style, {
				position: 'fixed',
				bottom: '20px',
				right: '20px',
				zIndex: 9999,
				padding: '10px 15px',
				backgroundColor: '#008060',
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
		btn.addEventListener('click', function (e) {
			e.preventDefault()
			fetchExternalCSS(true)
		})
	}

	// --- 3. SCANNERS (FIXED: Không xóa cache khi Parse lỗi) ---
	function scanLocalJS(editor) {
		const content = editor.getValue()
		const newVars = new Set()
		const newObjKeys = {}
		let hasSuccessfulParse = false // Cờ đánh dấu parse thành công

		const stripLiquidJs = code => {
			let clean = code.replace(/\{\{[\s\S]*?\}\}/g, '0')
			clean = clean.replace(/\{%[\s\S]*?%\}/g, ' ')
			return clean
		}

		const parseCodeWithAcorn = jsText => {
			try {
				const cleanJs = stripLiquidJs(jsText)
				// allowReturnOutsideFunction: Giúp parse được cả trong script tag rời rạc
				const ast = acorn.parse(cleanJs, {
					ecmaVersion: 2020,
					sourceType: 'script',
					allowReturnOutsideFunction: true,
					locations: true,
				})

				acorn.walk.simple(ast, {
					VariableDeclarator(node) {
						if (node.id.type === 'Identifier') {
							newVars.add(node.id.name)
							if (node.init && node.init.type === 'ObjectExpression') {
								const keys = []
								node.init.properties.forEach(prop => {
									if (prop.key) {
										keys.push(prop.key.name || prop.key.value)
									}
								})
								if (keys.length > 0) {
									newObjKeys[node.id.name] = keys
								}
							}
						}
					},
					FunctionDeclaration(node) {
						if (node.id && node.id.name) {
							newVars.add(node.id.name)
						}
					},
					Function(node) {
						node.params.forEach(param => {
							if (param.type === 'Identifier') {
								newVars.add(param.name)
							}
						})
					},
				})
				hasSuccessfulParse = true // Parse ngon lành mới bật cờ
			} catch (e) {
				// Lỗi thì thôi, giữ cờ false
			}
		}

		if (currentFileType === 'javascript') {
			parseCodeWithAcorn(content)
		} else {
			const scriptBlockRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
			let blockMatch
			while ((blockMatch = scriptBlockRegex.exec(content)) !== null) {
				parseCodeWithAcorn(blockMatch[1])
			}
		}

		// SỬA LỖI QUAN TRỌNG: Chỉ cập nhật biến toàn cục nếu parse thành công
		// Nếu parse thất bại (do đang gõ dở), giữ nguyên danh sách biến cũ để gợi ý
		if (hasSuccessfulParse && newVars.size > 0) {
			localJsVars = newVars
			localObjectKeys = newObjKeys
		}
	}

	function scanLocalCSS(editor) {
		const content = editor.getValue()
		const newSet = new Set()

		const parseCssHybrid = cssText => {
			// Mask Liquid tags
			let cleanCss = cssText.replace(/\{%[\s\S]*?%\}/g, ' ').replace(/\{\{[\s\S]*?\}\}/g, ' ')
			let parsed = false

			// Ưu tiên dùng CSSTree
			try {
				const ast = csstree.parse(cleanCss, {
					parseValue: false,
					parseAtrulePrelude: false,
					onParseError: function (e) {},
				})
				csstree.walk(ast, function (node) {
					if (node.type === 'ClassSelector') {
						newSet.add(node.name)
					}
				})
				parsed = true
			} catch (e) {
				parsed = false
			}

			// Fallback Regex: Cập nhật Regex mạnh hơn
			// Bắt tất cả chuỗi .classname kể cả khi không có dấu { ngay sau
			if (!parsed) {
				const regex = /\.([a-zA-Z0-9_\-]+)/g
				let match
				// Quét trên cleanCss để tránh Liquid tag làm nhiễu
				while ((match = regex.exec(cleanCss)) !== null) {
					newSet.add(match[1])
				}
			}
		}

		const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
		let blockMatch
		while ((blockMatch = styleBlockRegex.exec(content)) !== null) {
			parseCssHybrid(blockMatch[1])
		}

		if (currentFileType === 'css') {
			parseCssHybrid(content)
		}

		localCssClasses = newSet
		return localCssClasses
	}

	function updateLocalCachedDataWhenSaveFile(localCssClasses) {
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

	function handleCtrlS(editor) {
		let tmpClass = scanLocalCSS(editor)
		updateLocalCachedDataWhenSaveFile(tmpClass)
		console.log('[All-in-One] Bắt Ctrl+S: Đã cập nhật local cache.')
		const message = `[IntelliSense] Đã quét xong (${localCssClasses.size} classes) và cập nhật cache!`
		console.warn(message)
	}

	// --- 4. CONTEXT HELPERS ---
	function isJsContext(cm) {
		if (currentFileType === 'javascript') return true
		const cursor = cm.getCursor()
		const doc = cm.getDoc()
		const totalLines = doc.lineCount()
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

		// printDebugLog(`Checking JS Context at Line ${cursor.line + 1}, Ch ${cursor.ch}`)

		let foundOpenTag = false
		for (let i = cursor.line; i >= 0; i--) {
			let text = doc.getLine(i)
			if (i === cursor.line) text = text.slice(0, cursor.ch)

			const lastOpen = getRegexLastIndex(text, regexOpen)
			const lastClose = getRegexLastIndex(text, regexClose)

			if (lastClose !== -1) {
				if (lastClose > lastOpen) {
					// printDebugLog(`-> FAIL: Found </script> at line ${i + 1} pos ${lastClose}. It is after <script pos ${lastOpen}`)
					return false
				}
			}
			if (lastOpen !== -1) {
				// printDebugLog(`-> FOUND START: <script at line ${i + 1} pos ${lastOpen}`)
				foundOpenTag = true
				break
			}
		}

		if (!foundOpenTag) {
			// printDebugLog(`-> FAIL: Scanned all way up, no <script found.`)
			return false
		}

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
					// printDebugLog(`-> FAIL: Found new <script at line ${i + 1} pos ${firstOpen} BEFORE </script>`)
					return false
				}
			}
			if (firstClose !== -1) {
				// printDebugLog(`=> JS CONTEXT CONFIRMED! (Found <script up, </script> down)`)
				return true
			}
		}
		// printDebugLog(`-> FAIL: End of file, no </script> found.`)
		return false
	}

	function isCssContext(editor) {
		if (currentFileType === 'css' || currentFileType === 'scss') return true
		const cursor = editor.getCursor()
		const token = editor.getTokenAt(cursor)
		const inner = CodeMirror.innerMode(editor.getMode(), token.state)
		if (inner.mode.name === 'css' || inner.mode.name === 'text/x-scss') return true
		let state = token.state
		while (state) {
			if (state.tagName === 'style') return true
			if (state.context && state.context.tagName === 'style') return true
			if (state.htmlState) state = state.htmlState
			else if (state.localState) state = state.localState
			else break
		}
		return false
	}

	// --- 5. HINT PROVIDERS (FIXED: ƯU TIÊN PREFIX) ---

	function getJsHints(cm) {
		const cursor = cm.getCursor()
		const token = cm.getTokenAt(cursor)
		const line = cm.getLine(cursor.line)

		// A. Object Keys
		let isDotContext = false
		let objectName = ''
		if (token.string === '.') {
			isDotContext = true
			let prevToken = cm.getTokenAt({ line: cursor.line, ch: token.start })
			objectName = prevToken.string.trim()
		} else if (line.charAt(token.start - 1) === '.') {
			isDotContext = true
			let prevToken = cm.getTokenAt({ line: cursor.line, ch: token.start - 1 })
			objectName = prevToken.string.trim()
		}

		if (isDotContext) {
			if (localObjectKeys[objectName]) {
				return {
					list: localObjectKeys[objectName],
					from: CodeMirror.Pos(cursor.line, token.string === '.' ? cursor.ch : token.start),
					to: CodeMirror.Pos(cursor.line, cursor.ch),
				}
			}
		}

		// B. Biến thường (FIXED Logic)
		const startOfWord = line.slice(0, cursor.ch).search(/[a-zA-Z0-9_$]+$/)
		let currentWord = startOfWord !== -1 ? line.slice(startOfWord, cursor.ch) : ''
		if (!currentWord) return null
		if (line.charAt(startOfWord - 1) === '.') return null

		const combined = [...jsKeywords, ...localJsVars]

		// ƯU TIÊN 1: Tìm kiếm chính xác (Starts With) trước
		// Logic: Nếu gõ '$in', ta muốn thấy '$inputSelector' ngay đầu tiên
		let exactMatches = combined.filter(item => item.toLowerCase().startsWith(currentWord.toLowerCase()))
		exactMatches.sort((a, b) => a.length - b.length || a.localeCompare(b))

		// ƯU TIÊN 2: Nếu không có kết quả chính xác, mới dùng Fuse.js (Fuzzy)
		// Hoặc gộp chung nhưng ưu tiên exact matches lên đầu
		let fuzzyMatches = []
		if (exactMatches.length < 5) {
			// Nếu ít kết quả chính xác quá thì tìm thêm fuzzy
			const fuse = new Fuse(combined, {
				threshold: 0.2, // Giảm độ nhạy xuống để bớt rác (0.4 -> 0.2)
				ignoreLocation: true, // Tìm ở mọi vị trí
			})
			const searchResults = fuse.search(currentWord)
			fuzzyMatches = searchResults.map(res => res.item)

			// Loại bỏ trùng lặp đã có trong exactMatches
			fuzzyMatches = fuzzyMatches.filter(item => !exactMatches.includes(item))
		}

		let resultList = [...exactMatches, ...fuzzyMatches]

		return {
			list: resultList,
			from: CodeMirror.Pos(cursor.line, startOfWord !== -1 ? startOfWord : cursor.ch),
			to: CodeMirror.Pos(cursor.line, cursor.ch),
		}
	}

	// HTML Class Hint (FIXED: Ưu tiên StartsWith)
	function getClassHints(editor) {
		const cursor = editor.getCursor()
		const lineContent = editor.getLine(cursor.line).slice(0, cursor.ch)

		// Regex bắt class="..." hoặc class='...'
		const classMatch = lineContent.match(/class\s*=\s*["']([^"']*)$/)
		if (!classMatch) return null

		const words = classMatch[1].split(/\s+/)
		const wordToComplete = words[words.length - 1]

		// Gộp tất cả class từ External và Local
		const combinedList = [...externalCssClasses, ...localCssClasses]

		// 1. Tìm các Class bắt đầu bằng từ khóa (Prefix Match) - Ưu tiên số 1
		// VD: gõ "col" -> lấy "col-6", "col-md-12"
		let resultList = combinedList.filter(cls => cls.startsWith(wordToComplete))

		// Sắp xếp: Class ngắn lên trước (VD: "col-6" lên trước "col-6-auto")
		resultList.sort((a, b) => a.length - b.length || a.localeCompare(b))

		// 2. Logic "Fallback":
		// CHỈ KHI KHÔNG TÌM THẤY class nào bắt đầu bằng từ khóa, lúc đó mới tìm "bao gồm" (Contains)
		// Điều này giúp loại bỏ "rác" như "cart__col-6" khi bạn đang gõ "col-6"
		if (resultList.length === 0 && wordToComplete.length >= 2) {
			let containsMatches = combinedList.filter(cls => cls.includes(wordToComplete))
			containsMatches.sort((a, b) => a.length - b.length || a.localeCompare(b))
			resultList = containsMatches
		}

		return {
			list: resultList,
			from: CodeMirror.Pos(cursor.line, cursor.ch - wordToComplete.length),
			to: CodeMirror.Pos(cursor.line, cursor.ch),
		}
	}

	// --- 6. CORE LOGIC ---
	function applyConfig(cm) {
		if (cm._hasAllInOneHook) return

		console.log('[All-in-One] Strict JS/CSS Context Applied!')
		document.body.insertAdjacentHTML('beforeend', `<div style="position: fixed;bottom: 0;z-index: 999;background: #08f;right: 4px;color: #fff;padding: 2px 10px;" id="csscaching"></div>`)
		const cachingStatus = document.getElementById('csscaching')
		if (cachingStatus) cachingStatus.innerText = 'Chờ css caching...'
		cm._wasInJsBlock = false
		cm._wasInCssBlock = false

		const extraKeys = cm.getOption('extraKeys') || {}
		let debounceScanTimer = null

		const performFullScan = editor => {
			if (currentFileType === 'javascript' || isJsContext(editor)) {
				scanLocalJS(editor)
			}
			scanLocalCSS(editor)
		}

		const triggerIntelliSense = (editor, isAuto = false) => {
			if (!isAuto) performFullScan(editor)

			const cursor = editor.getCursor()
			const line = editor.getLine(cursor.line)

			const hintOptions = {
				completeSingle: false,
				closeCharacters: /[\s()\[\]{};:>,]/,
				alignWithWord: true,
			}

			const isClassAttr = /class\s*=\s*["']([^"']*)$/.test(line.slice(0, cursor.ch))
			if (isClassAttr) {
				const hints = getClassHints(editor)
				if (hints && hints.list.length > 0) CodeMirror.showHint(editor, () => hints, hintOptions)
				return
			}

			if (isJsContext(editor)) {
				CodeMirror.showHint(editor, getJsHints, hintOptions)
				return
			}

			if (isCssContext(editor)) {
				CodeMirror.showHint(editor, CodeMirror.hint.css, hintOptions)
				return
			}

			const token = editor.getTokenAt(cursor)
			const inner = CodeMirror.innerMode(editor.getMode(), token.state)

			if (inner.mode.name === 'xml') {
				let htmlResult = null
				try {
					htmlResult = CodeMirror.hint.html(editor, hintOptions)
				} catch (e) {}

				if (htmlResult && htmlResult.list && htmlResult.list.length > 0) {
					CodeMirror.showHint(editor, CodeMirror.hint.html, hintOptions)
					return
				}
			}

			if (isAuto) return
			CodeMirror.showHint(editor, CodeMirror.hint.anyword, hintOptions)
		}

		extraKeys['Ctrl-S'] = function (editor) {
			handleCtrlS(editor)
			document.getElementById('save-button').click()
		}
		extraKeys['Ctrl-Space'] = function (editor) {
			triggerIntelliSense(editor, false)
		}
		cm.setOption('extraKeys', extraKeys)

		cm.on('inputRead', function (editor, change) {
			// Đảm bảo $ được kích hoạt auto hint
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

		cm.on('cursorActivity', instance => {
			const inJS = isJsContext(instance)
			const inCSS = isCssContext(instance)

			if (instance._wasInJsBlock && !inJS) scanLocalJS(instance)
			instance._wasInJsBlock = inJS
			instance._wasInCssBlock = inCSS
		})

		cm.on('blur', () => {
			performFullScan(cm)
		})
		cm._hasAllInOneHook = true
	}

	// --- 7. INITIALIZATION ---
	function loadLibs() {
		if (!document.getElementById('custom-intelligent-css')) {
			var c = document.createElement('style')
			c.id = 'custom-intelligent-css'
			c.textContent = `/* show-hint.min.css */
      .CodeMirror-hints{position:absolute;z-index:10;overflow:hidden;list-style:none;margin:0;padding:2px;-webkit-box-shadow:2px 3px 5px rgba(0,0,0,.2);-moz-box-shadow:2px 3px 5px rgba(0,0,0,.2);box-shadow:2px 3px 5px rgba(0,0,0,.2);border-radius:3px;border:1px solid silver;background:#fff;font-size:90%;font-family:monospace;max-height:20em;overflow-y:auto;box-sizing:border-box}.CodeMirror-hint{margin:0;padding:0 4px;border-radius:2px;white-space:pre;color:#000;cursor:pointer}li.CodeMirror-hint-active{background:#08f;color:#fff}`
			document.head.appendChild(c)
		}
		startObserver()
	}

	function init() {
		currentFileType = detectFileType(window.location.href)
		console.log('currentFileType', currentFileType)
		waitLoadElement('#asset-list-container li a', function () {
			initCSSManager()
		})

		const customStyle = document.createElement('style')
		customStyle.innerHTML = `
            .CodeMirror-hints { z-index: 999999 !important; font-family: 'Consolas', monospace; font-size: 13px; }
            .CodeMirror-hint-active { background: #0084ff !important; color: white !important; }
        `
		document.head.appendChild(customStyle)
		loadLibs()
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
			if (cmEl.CodeMirror) {
				applyConfig(cmEl.CodeMirror)
			}
		})
	}
	if (!window.__loaded) {
		window.__loaded = true
		waitLoadElement('.CodeMirror', function () {
			document.querySelectorAll('.CodeMirror').forEach(cmEl => {
				if (cmEl.CodeMirror) {
					applyConfig(cmEl.CodeMirror)
					setTimeout(init, 2000)
				}
			})
		})
	}
})()
