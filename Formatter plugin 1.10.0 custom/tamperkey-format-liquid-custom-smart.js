// ==UserScript==
// @name         Format Liquid Custom Smart
// @namespace    http://tampermonkey.net/
// @version      2025-11-22
// @description  try to take over the world!
// @author       You
// @match        https://*.mysapo.net/admin/themes/*
// @exclude      https://*.mysapo.net/admin/themes/editor/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mysapo.net
// @require 		 https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Formatter%20plugin%201.10.0%20custom/prettier-3.6.2-standalone.js
// @require 		 https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Formatter%20plugin%201.10.0%20custom/prettier-plugin-liquid-1.10.0-standalone.js
// @require			 https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Formatter%20plugin%201.10.0%20custom/prettier-3.6.2-babel-plugin.js
// @require			 https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Formatter%20plugin%201.10.0%20custom/pretier-3.6.2-postcss-plugin.js
// @require 		 https://raw.githubusercontent.com/qthang97/prettier-plugin-liquid-1.10.0/refs/heads/main/Formatter%20plugin%201.10.0%20custom/prettier-3.2.5-estree-plugin.js
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
	const JS_TYPE = {
		name: 'Javascript',
		regex: /\.(js\.bwt)|(js)$/i,
		options: {
			parser: 'babel',
			plugins: [
				prettierPlugins.babel,
				prettierPlugins.estree, // BẮT BUỘC
			],
		},
	}
	const CSS_TYPE = {
		name: 'css',
		regex: /\.(css\.bwt)|(css)|(scss\.bwt)|(scss)$/i,
		options: {
			parser: 'scss',
			plugins: [prettierPlugins.postcss],
		},
	}
	const LIQUID_TYPE = {
		name: 'Liquid + HTML',
		regex: /(?!\.(js)\.bwt$)\.bwt$/i,
		options: {
			parser: 'liquid-html',
			plugins: [prettierPluginLiquid],
		},
	}
	const URL_WITH_TYPE = [JS_TYPE, CSS_TYPE, LIQUID_TYPE]

	const options = {
		parser: 'liquid-html', // Parser Liquid + HTML, bắt buộc phải khai báo khi dùng plugin Liquid.

		plugins: [prettierPluginLiquid], // Plugin Liquid cho Prettier. Giúp parse Liquid ({{ }}, {% %}, schema,…)

		// ================= PRETTIER CORE =================
		bracketSameLine: true,
		// Để dấu ngoặc đóng `>` của thẻ HTML/JSX ở cùng dòng với nội dung cuối.
		// Ví dụ:
		// <Component>
		//   text
		// </Component>
		// → chuyển thành:
		// <Component>
		//   text</Component>

		bracketSpacing: true,
		// Thêm khoảng trắng trong object literal.
		// { a: 1 } thay vì {a:1}

		htmlWhitespaceSensitivity: 'ignore',
		// Bỏ qua xử lý khoảng trắng HTML theo CSS.
		// Giúp HTML không bị xuống dòng bất thường.

		jsxSingleQuote: true,
		// JSX dùng dấu nháy đơn.
		// <div class='box'> thay vì <div class="box">

		printWidth: 400,
		// Độ dài dòng tối đa.
		// 400 rất lớn → gần như không xuống dòng tự động.

		semi: false,
		// Không dùng dấu `;`.
		// const a = 1 thay vì const a = 1;

		singleAttributePerLine: false,
		// Không bắt HTML phải mỗi attribute 1 dòng.
		// <div a="1" b="2"> thay vì:
		// <div
		//    a="1"
		//    b="2"
		// >

		singleQuote: true,
		// Dùng dấu nháy đơn trong JS/HTML/Liquid.
		// 'text' thay vì "text"

		trailingComma: 'all',
		// Thêm dấu phẩy cuối trong object/array/function.
		// Giúp diff git đẹp hơn, code dễ merge.

		tabWidth: 4,
		// Sử dụng 4 khoản trắng thay cho dấu tab

		useTabs: false,
		// Thụt dòng bằng ký tự tab (\t) thay vì 2 hoặc 4 spaces.
	}

	/******************************************************************
	 * GET CODEMIRROR INSTANCE
	 ******************************************************************/
	function getCodeMirror() {
		let el = document.querySelector('.CodeMirror')
		if (!el) return null
		return el.CodeMirror || el.cm || el.editor || null
	}

	/******************************************************************
	 * LIQUID DETECT (block + inline + single tag)
	 ******************************************************************/

	function extractLiquidBlocks(textArr) {
		// --- 1. BLOCK REGEX (Giữ nguyên) ---
		const regex_LiquidOpen = /{%-?\s*(if|for|case|unless|capture|paginate|comment|form)\b[\s\S]*?%}/gi
		const regex_LiquidClose = /{%-?\s*endif|endfor|endcase|endunless|endcapture|endpaginate|endcomment|endform\b[\s\S]*?%}/gi

		const singleTags = 'assign|render|include|section|layout|break|continue|cycle|increment|decrement|echo|else|elsif|when'
		const pattern_Var = '\\{\\{[\\s\\S]*?\\}\\}'
		const pattern_Tag = `{%-?\\s*(${singleTags})\\b[\\s\\S]*?%}`

		// --- 2. HAI REGEX CHO 2 TRƯỜNG HỢP ---
		const regex_Case1_LineOnly = new RegExp(`^\\s*(${pattern_Var}|${pattern_Tag})\\s*$`, 'i')
		const regex_Case2_Inline = new RegExp(`(${pattern_Var}|${pattern_Tag})`, 'i')

		let isLiquidBlock = false
		let openCount = 0
		let closeCount = 0

		// BỎ: let currentStack = 0  <-- Nguyên nhân gây lỗi
		let tmpstack = []

		for (var i = 0; i < textArr.length; i++) {
			let line = textArr[i]

			// --- XỬ LÝ BLOCK ---
			let matchOpen = line.match(regex_LiquidOpen)
			if (matchOpen) {
				if (!isLiquidBlock) {
					// SỬA: Dùng push thay vì gán index thủ công
					tmpstack.push({
						type: 'block',
						startLine: i,
						content: [],
						formatted: [],
						endLine: null,
					})
					isLiquidBlock = true
				}
				openCount += matchOpen.length
			}

			if (isLiquidBlock) {
				// SỬA: Luôn lấy phần tử cuối cùng của stack để thao tác
				let currentBlock = tmpstack[tmpstack.length - 1]
				currentBlock.content.push(line.trim())

				let matchClose = line.match(regex_LiquidClose)
				if (matchClose) {
					closeCount += matchClose.length
					if (openCount - closeCount == 0) {
						currentBlock.endLine = i
						isLiquidBlock = false
						// BỎ: currentStack++ <-- Không cần thiết nữa
					}
				}
			}

			// --- XỬ LÝ DÒNG LẺ ---
			else {
				// Ưu tiên 1: Line Only
				if (regex_Case1_LineOnly.test(line)) {
					// printDebugLog('Case 1 Detected (Clean Liquid):', line.trim())
					tmpstack.push({
						type: 'line',
						startLine: i,
						content: [line.trim()],
						formatted: [line.trim()],
						endLine: i,
					})
				}
				// Ưu tiên 2: Inline/Mixed
				else if (regex_Case2_Inline.test(line)) {
					// printDebugLog('Case 2 Detected (Inline/Mixed Liquid):', line.trim())
					tmpstack.push({
						type: 'line',
						startLine: i,
						content: [line], // Giữ nguyên indent cho trường hợp inline
						formatted: [line],
						endLine: i,
					})
				}
			}
		}
		return tmpstack
	}
	/******************************************************************
	 * STYLE OR SCRIPT DETECT (style or script)
	 ******************************************************************/
	function extractStyleOrScriptBlock(textArr) {
		// Cấu hình Regex
		const styleTag = {
			type: 'css',
			tagName: 'style',
			regexStart: /^\s*<\s*style\b/i, // Bắt đầu dòng bằng <style
			regexEnd: /<\s*\/\s*style\s*>/i, // Chứa </style>
		}

		const scriptTag = {
			type: 'babel',
			tagName: 'script',
			regexStart: /^\s*<\s*script\b/i, // Bắt đầu dòng bằng <script
			regexEnd: /<\s*\/\s*script\s*>/i, // Chứa </script>
		}

		const tagArr = [styleTag, scriptTag]
		let tmpStack = []
		let currentStackIndex = 0

		// Biến trạng thái
		let activeTagType = null
		let activeTagName = null
		let openLineIndex = null
		let isInsideBlock = false
		let hasFoundOpenBracket = false // Đã tìm thấy dấu ">" của thẻ mở chưa

		for (let i = 0; i < textArr.length; i++) {
			let line = textArr[i]

			// --- CASE 1: TÌM THẺ MỞ (Khi chưa vào block) ---
			if (!isInsideBlock) {
				for (let tag of tagArr) {
					let matchStart = line.match(tag.regexStart)
					if (matchStart) {
						// 1. Khởi tạo Block mới
						activeTagType = tag.type
						activeTagName = tag.tagName
						openLineIndex = i
						isInsideBlock = true

						// Tạo object block mới, thêm mảng attributes
						tmpStack[currentStackIndex] = {
							type: activeTagType,
							tagName: activeTagName,
							startIndex: i,
							endIndex: null,
							attributes: [], // <--- MỚI: Chứa các dòng attribute
							content: [],
							formatted: '',
						}

						// Xác định vị trí kết thúc của tên thẻ (VD: độ dài của "<style")
						// Để bắt đầu lấy attribute từ sau vị trí này
						const tagLength = matchStart[0].length

						// Kiểm tra xem thẻ mở đã đóng ">" chưa
						const openBracketIndex = line.indexOf('>', tagLength) // Tìm > sau tên thẻ
						hasFoundOpenBracket = openBracketIndex > -1

						// --- LOGIC LẤY ATTRIBUTE (DÒNG ĐẦU) ---
						let attrContent = ''
						if (hasFoundOpenBracket) {
							// Lấy từ sau tên thẻ đến trước dấu >
							attrContent = line.substring(tagLength, openBracketIndex)
						} else {
							// Lấy từ sau tên thẻ đến hết dòng
							attrContent = line.substring(tagLength)
						}
						// Chỉ push nếu chuỗi không rỗng hoặc chỉ toàn khoảng trắng (tuỳ nhu cầu, ở đây giữ nguyên raw)
						if (attrContent.trim().length > 0) {
							tmpStack[currentStackIndex].attributes.push(attrContent.trim())
						}

						// Xử lý nội dung Code (Mixed content: <style>.class {)
						let contentOnStartLine = ''
						if (hasFoundOpenBracket) {
							contentOnStartLine = line.substring(openBracketIndex + 1)
						}

						// Kiểm tra: MỞ VÀ ĐÓNG CÙNG 1 DÒNG (VD: <style>css</style>)
						let matchEnd = hasFoundOpenBracket && line.match(tag.regexEnd)

						if (matchEnd) {
							const endIndexInLine = matchEnd.index
							contentOnStartLine = line.substring(openBracketIndex + 1, endIndexInLine)

							tmpStack[currentStackIndex].content.push(contentOnStartLine)
							tmpStack[currentStackIndex].endIndex = i
							resetState()
						} else {
							// Nếu chỉ mở mà chưa đóng cùng dòng
							if (hasFoundOpenBracket) {
								tmpStack[currentStackIndex].content.push(contentOnStartLine)
							}
						}

						break // Đã tìm thấy thẻ, thoát vòng lặp tagArr
					}
				}
				continue // Sang dòng tiếp theo
			}

			// --- CASE 2: ĐANG Ở TRONG BLOCK ---
			if (isInsideBlock) {
				// 2.1. Nếu thẻ mở chưa hoàn thiện (VD: <script \n type="module" \n >)
				// Tức là đang nằm ở các dòng chứa attributes
				if (!hasFoundOpenBracket) {
					const openBracketIndex = line.indexOf('>')

					// --- LOGIC LẤY ATTRIBUTE (DÒNG TIẾP THEO) ---
					let attrContent = ''
					if (openBracketIndex > -1) {
						// Tìm thấy dấu > kết thúc thẻ mở
						hasFoundOpenBracket = true
						// Attribute là phần trước dấu >
						attrContent = line.substring(0, openBracketIndex)

						// Phần Code bắt đầu sau dấu >
						let contentAfterBracket = line.substring(openBracketIndex + 1)

						// Kiểm tra đóng ngay trên dòng này (VD: ... id="abc"> code </style>)
						let currentTagConfig = tagArr.find(t => t.type === activeTagType)
						let matchEnd = line.match(currentTagConfig.regexEnd)

						if (matchEnd) {
							contentAfterBracket = line.substring(openBracketIndex + 1, matchEnd.index)
							tmpStack[currentStackIndex].content.push(contentAfterBracket)
							tmpStack[currentStackIndex].endIndex = i
							resetState()
						} else {
							tmpStack[currentStackIndex].content.push(contentAfterBracket)
						}
					} else {
						// Chưa thấy dấu >, toàn bộ dòng này là attribute
						attrContent = line
					}

					// Push attribute vào mảng
					if (attrContent.trim().length > 0) {
						tmpStack[currentStackIndex].attributes.push(attrContent.trim())
					}

					continue
				}

				// 2.2. Tìm thẻ đóng (trường hợp bình thường - Đã vào phần Content)
				let currentTagConfig = tagArr.find(t => t.type === activeTagType)
				let matchEnd = line.match(currentTagConfig.regexEnd)

				if (matchEnd) {
					let contentBeforeClose = line.substring(0, matchEnd.index)
					tmpStack[currentStackIndex].content.push(contentBeforeClose)
					tmpStack[currentStackIndex].endIndex = i
					resetState()
				} else {
					tmpStack[currentStackIndex].content.push(line)
				}
			}
		}

		function resetState() {
			isInsideBlock = false
			activeTagType = null
			activeTagName = null
			openLineIndex = null
			hasFoundOpenBracket = false
			currentStackIndex++
		}

		return tmpStack
	}

	/******************************************************************
	 * MAIN FORMATTER (JS/CSS/Liquid)
	 ******************************************************************/
	async function formatterOtherLiquid(text, newOptions = null) {
		try {
			const tmpOptions = Object.assign({}, options, newOptions)
			let lang = newOptions?.parser

			// Detect Liquid blocks
			let textArr = text.split('\n')
			printDebugLog('newOptions', newOptions, 'tmpOptions', tmpOptions, 'textArr default', textArr)

			let stack = extractLiquidBlocks(textArr)
			printDebugLog('default Stack', stack)

			if (stack.length == 0) {
				return await prettier.format(text, tmpOptions)
			}

			for (let i = stack.length - 1; i >= 0; i--) {
				let currentStack = stack[i]

				// Remove block
				textArr.splice(currentStack.startLine, currentStack.endLine - currentStack.startLine + 1)

				// Add block ID
				textArr.splice(currentStack.startLine, 0, `/* OTHER_LIQUID_BLOCK_${i} */`)
				printDebugLog('Text Arr after remove and add block id', textArr)
				let liquidFormatted = ''
				if (currentStack.type == 'block') {
					liquidFormatted = await formatterLiquidWithoutTagStyleOrScript(currentStack.content.join('\n'), tmpOptions, currentStack.startLine)
					if (!liquidFormatted) return null
					liquidFormatted = liquidFormatted.split('\n')
				} else {
					liquidFormatted = currentStack.content
				}
				currentStack.formatted = liquidFormatted
			}

			printDebugLog('Stack after liquid formatted', stack)

			printDebugLog('current options', tmpOptions, textArr)
			let currentLangFormat = await prettier.format(textArr.join('\n'), tmpOptions)
			if (!currentLangFormat) return null
			printDebugLog('Formated with current lang: ', lang)

			// Replace value to block ID
			return replaceValueAfterFormat(currentLangFormat, stack, lang)
		} catch (e) {
			throw e
		}
	}

	function replaceValueAfterFormat(text, stack, lang) {
		let textArr = text.split('\n')
		for (let i = stack.length - 1; i >= 0; i--) {
			let currentStack = stack[i]
			let tab = null
			if (lang == 'liquid-html') {
				tab = /^(\s*)\{\%\s*comment\s*\%\}LIQUID_BLOCK_ID_(\d+)\{\%\s*endcomment\s*\%\}/i
			} else {
				tab = /^(\s*)\/\*\s*OTHER_LIQUID_BLOCK_(\d+)\s*\*\//i
			}
			// printDebugLog("regex Match",tab)
			for (let j = textArr.length - 1; j >= 0; j--) {
				let match = textArr[j].match(tab)
				if (match) {
					let tabNum = match[1] || ''
					let id = match[2]
					if (id == i) {
						// printDebugLog('found id', id)
						currentStack.formatted = currentStack.formatted.map(r => tabNum + r)
						textArr.splice(j, 1)
						textArr.splice(j, 0, ...currentStack.formatted)
					}
				}
			}
		}
		return textArr.join('\n')
	}

	async function formatterLiquidWithoutTagStyleOrScript(text, options, offsetLine = 0) {
		try {
			printDebugLog('formatterLiquidWithoutTagStyleOrScript text', text)
			const liquidBlockIDTemplate = `{% comment %}LIQUID_OTHER_BLOCK{% endcomment %}`
			let liquidBlock = extractLiquidBlockContent(text)
			printDebugLog('formatterLiquidWithoutTagStyleOrScript liquidBlock', liquidBlock)

			// format with current lang
			let formattedWithNewValue = await formatterOtherLiquid(liquidBlock.content, options)
			if (!formattedWithNewValue) return text
			printDebugLog('formatterLiquidWithoutTagStyleOrScript formatterOtherLiquid', formattedWithNewValue)

			let contentArr = []
			if (/\n/.test(formattedWithNewValue)) {
				contentArr = formattedWithNewValue.split('\n')
			} else {
				contentArr = [formattedWithNewValue]
			}
			contentArr = contentArr.filter(r => r != '').map(r => ' '.repeat(options.tabWidth) + r)
			contentArr.splice(0, 0, liquidBlock.openTag.trim())
			contentArr.splice(contentArr.length, 0, liquidBlock.closeTag.trim())
			printDebugLog('formatterLiquidWithoutTagStyleOrScript contentArr', contentArr)
			return contentArr.join('\n')
		} catch (e) {
			// --- XỬ LÝ CỘNG DÒNG (OFFSET) ---
			// Nếu có lỗi, cộng thêm vị trí mà block này đang đứng trong file gốc
			if (e.loc && e.loc.start) {
				e.loc.start.line += offsetLine
			} else if (e.line) {
				e.line += offsetLine
			}

			// Ném lỗi đã chỉnh sửa ra ngoài để hàm chính bắt được
			throw e
		}
	}

	function extractLiquidBlockContent(sourceCode) {
		const results = []
		// Stack lưu object đầy đủ để báo lỗi chính xác vị trí: { name: 'if', fullTag: '{% if %}', index: 0 }
		const stack = []

		const blockTags = ['if', 'unless', 'case', 'for', 'capture', 'form', 'paginate', 'javascript', 'style']
		const tagRegex = /{%-?\s*(\w+)[\s\S]*?-?%}/g

		let match
		let currentBlock = null

		while ((match = tagRegex.exec(sourceCode)) !== null) {
			const fullTagStr = match[0]
			const tagName = match[1]

			const tagStartIndex = match.index
			const tagEndIndex = tagStartIndex + fullTagStr.length

			const isClosing = tagName.startsWith('end')
			const pureName = isClosing ? tagName.replace('end', '') : tagName

			if (!blockTags.includes(pureName)) continue

			if (!isClosing) {
				// --- THẺ MỞ ---

				// 1. Logic trích xuất nội dung (Giữ nguyên logic cũ)
				if (stack.length === 0) {
					currentBlock = {
						openTagStr: fullTagStr,
						contentStartIndex: tagEndIndex,
					}
				}

				// 2. Push vào stack (Lưu thêm thông tin để báo lỗi)
				stack.push({
					name: pureName,
					fullTag: fullTagStr,
					index: tagStartIndex,
				})
			} else {
				// --- THẺ ĐÓNG ---

				// CHECK LỖI 1: Dư thẻ đóng (Gặp {% endif %} nhưng chưa mở {% if %})
				if (stack.length === 0) {
					throw new Error(`Lỗi cú pháp Liquid: Tìm thấy thẻ đóng '${fullTagStr}' tại vị trí ${tagStartIndex} nhưng không có thẻ mở tương ứng nào trước đó.`)
				}

				// Lấy thẻ mở gần nhất ra để so sánh
				const lastOpenTag = stack[stack.length - 1]

				// CHECK LỖI 2: Lồng thẻ sai (Ví dụ mở {% if %} nhưng đóng {% endfor %})
				if (lastOpenTag.name !== pureName) {
					throw new Error(`Lỗi cú pháp Liquid: Thẻ đóng không khớp. Đang mở '${lastOpenTag.fullTag}' (tại vị trí ${lastOpenTag.index}) nhưng lại tìm thấy thẻ đóng '${fullTagStr}' (tại vị trí ${tagStartIndex}).`)
				}

				// Nếu khớp, xóa khỏi stack
				stack.pop()

				// Logic trích xuất nội dung (Giữ nguyên logic cũ)
				if (stack.length === 0 && currentBlock) {
					const contentEndIndex = tagStartIndex

					results.push({
						openTag: currentBlock.openTagStr,
						closeTag: fullTagStr,
						content: sourceCode.substring(currentBlock.contentStartIndex, contentEndIndex),
					})

					// Reset block
					currentBlock = null
				}
			}
		}

		// CHECK LỖI 3: Thiếu thẻ đóng (Chạy hết file mà Stack vẫn còn)
		if (stack.length > 0) {
			const unclosedTag = stack[stack.length - 1]
			throw new Error(`Lỗi cú pháp Liquid: \n\tChưa đóng đủ thẻ. Thẻ '${unclosedTag.fullTag}' mở tại vị trí ${unclosedTag.index} chưa có thẻ đóng tương ứng (như {% end${unclosedTag.name} %}).`)
		}

		return results[0]
	}

	async function formatterLiquid(text) {
		let stackOtherLiquid = []

		try {
			let textArr = text.split('\n')
			// printDebugLog('textArr default', textArr)

			// 1. Lấy dữ liệu đã được tách sạch (Code riêng, Attributes riêng)
			stackOtherLiquid = extractStyleOrScriptBlock(textArr)
			// printDebugLog('stackOtherLiquid', stackOtherLiquid)

			if (stackOtherLiquid.length == 0) {
				// printDebugLog('Cannot find style or script block start format with liquid')
				return await prettier.format(text, Object.assign({}, options, LIQUID_TYPE.options))
			} else {
				// printDebugLog('Found style or script block')
				let liquidFormatted = ''

				for (let i = stackOtherLiquid.length - 1; i >= 0; i--) {
					let result = ''
					let currentStack = stackOtherLiquid[i]
					let tempTag = { open: '', close: '' }

					// --- KHÔNG CẦN CHIA TRƯỜNG HỢP 1 DÒNG HAY NHIỀU DÒNG NỮA ---
					// Vì extractStyleOrScriptBlock đã xử lý việc tách attribute và content rồi.

					// 2. Tạo thẻ mở/đóng dựa trên type và attributes
					// Ghép các attribute lại thành chuỗi (nếu có)
					const attrString = currentStack.attributes.length > 0 ? ' ' + currentStack.attributes.join(' ').trim() : ''

					if (currentStack.type === 'css') {
						// Lưu ý: check 'css' hay 'style' tuỳ config trong hàm extract
						tempTag = {
							open: `<style${attrString}>`,
							close: '</style>',
						}
					} else if (currentStack.type === 'babel') {
						tempTag = {
							open: `<script${attrString}>`,
							close: '</script>',
						}
					}

					// 3. Xóa block gốc khỏi mảng textArr để thay bằng comment ID
					// (Xử lý chung cho cả 1 dòng lẫn nhiều dòng)
					const linesToRemove = currentStack.endIndex - currentStack.startIndex + 1
					textArr.splice(currentStack.startIndex, linesToRemove, `{% comment %}LIQUID_BLOCK_ID_${i}{% endcomment %}`)

					// printDebugLog('tag', tempTag)

					// 4. Format nội dung Code
					try {
						// Join nội dung code lại để format
						const rawCode = currentStack.content.join('\n')

						if (currentStack.type == 'css') {
							// printDebugLog('start format with CSS')
							result = await formatterOtherLiquid(rawCode, Object.assign({}, options, CSS_TYPE.options))
							result = result.split('\n')
						} else if (currentStack.type == 'babel') {
							// printDebugLog('start format with JS')
							result = await formatterOtherLiquid(rawCode, Object.assign({}, options, JS_TYPE.options))
							result = result.split('\n')
						} else {
							result = currentStack.content
						}
					} catch (subError) {
						// Tính lại dòng lỗi
						if (subError.loc && subError.loc.start) {
							subError.loc.start.line += currentStack.startIndex + 1
						}
						throw subError
					}

					if (!result) throw new Error('Format sub-block returned empty')

					// 5. Thêm indent (Tab)
					result = result.map(r => ' '.repeat(options.tabWidth) + r)

					// 6. Gắn lại thẻ mở và đóng vào kết quả đã format
					// Kết quả sẽ là: [Tag mở, ...Code đã format, Tag đóng]
					result.splice(0, 0, tempTag.open)
					result.push(tempTag.close)

					// Gán lại vào biến formatted để lát nữa replace
					currentStack.formatted = result
				}

				// printDebugLog('Stack after format', stackOtherLiquid)

				// Start liquid formatted
				liquidFormatted = await prettier.format(textArr.join('\n'), LIQUID_TYPE.options)
				if (!liquidFormatted) return null
				// printDebugLog('After liquid format', liquidFormatted)

				// Replace liquid block ID with new value
				return replaceValueAfterFormat(liquidFormatted, stackOtherLiquid, 'liquid-html')
			}
		} catch (e) {
			// --- GIỮ NGUYÊN PHẦN CỘNG DÒNG LỖI ---
			let errorLine = null
			if (e.loc && e.loc.start && e.loc.start.line) {
				errorLine = e.loc.start.line
			} else if (e.line) {
				errorLine = e.line
			}

			if (errorLine && stackOtherLiquid.length > 0) {
				let sortedStack = stackOtherLiquid.slice().sort((a, b) => a.startIndex - b.startIndex)
				let totalLinesRemoved = 0

				for (let block of sortedStack) {
					let positionInCompressedFile = block.startIndex - totalLinesRemoved
					if (errorLine > positionInCompressedFile) {
						let originalLength = block.endIndex - block.startIndex + 1
						let replacedLength = 1
						let diff = originalLength - replacedLength
						totalLinesRemoved += diff
					} else {
						break
					}
				}
				if (e.loc && e.loc.start) e.loc.start.line += totalLinesRemoved
				if (e.line) e.line += totalLinesRemoved
			}

			throw e
		}
	}
	/******************************************************************
	 * FORMAT CODEMIRROR
	 ******************************************************************/
	async function formatCodeMirror(newOptions) {
		let cm = getCodeMirror()
		if (!cm) {
			alert('Không tìm thấy CodeMirror!')
			return
		}
		let scrollInfo = cm.getScrollInfo()
		let cursor = cm.getCursor()

		let content = cm.getValue()
		let formatted = ''

		try {
			if (newOptions.parser === 'liquid-html') {
				formatted = await formatterLiquid(content)
			} else {
				formatted = await formatterOtherLiquid(content, newOptions)
			}
			if (!formatted) return

			cm.setValue(formatted)
			cm.refresh()
			cm.scrollTo(scrollInfo.left, scrollInfo.top)
			cm.setCursor(cursor)
		} catch (e) {
			console.error('Format Error Detailed:', e)

			// Lấy thông tin dòng lỗi
			let errorLine = null
			let msg = e.message || 'Lỗi không xác định'

			// Prettier thường trả về e.loc.start.line hoặc e.line
			if (e.loc && e.loc.start && e.loc.start.line) {
				errorLine = e.loc.start.line
			} else if (e.line) {
				errorLine = e.line
			}

			let errorMsg = `Lỗi Format: ${msg}`

			if (errorLine) {
				errorMsg += `\n\nKiểm tra tại dòng: ${errorLine}`
				// Di chuyển con trỏ đến dòng lỗi (CodeMirror dòng bắt đầu từ 0 nên phải trừ 1)
				cm.setCursor({ line: errorLine - 1, ch: 0 })
				cm.scrollIntoView({ line: errorLine - 1, ch: 0 }, 200)
				// Highlight dòng lỗi (tùy chọn)
				cm.addLineClass(errorLine - 1, 'background', 'cm-error-line')
				setTimeout(() => {
					cm.removeLineClass(errorLine - 1, 'background', 'cm-error-line')
				}, 5000)
			}
			const error_el = document.querySelector('#UIFlashWrapper')
			if (!error_el) return
			error_el.classList.add('ui-flash-wrapper--is-visible')
			let error_div = error_el.querySelector('#UIFlashMessage')
			if (!error_div) return
			if (!error_div.classList.contains('ui-flash--error')) {
				error_div.classList.add('ui-flash--error')
			}
			let messError = error_el.querySelector('.ui-flash__message')
			if (!messError) return
			messError.innerText = errorMsg
		}
	}

	printDebugLog('URL_WITH_TYPE', URL_WITH_TYPE)
	/******************************************************************
	 * HOTKEY = SHIFT + ALT + F
	 ******************************************************************/
	document.addEventListener('keydown', function (e) {
		if (e.shiftKey && e.altKey && e.key.toUpperCase() === 'F') {
			e.preventDefault()

			let currentURL = window.location.href
			let type_file = null

			for (let i = 0; i < URL_WITH_TYPE.length; i++) {
				if (URL_WITH_TYPE[i].regex.test(currentURL)) {
					type_file = URL_WITH_TYPE[i]
					break
				}
			}

			if (!type_file) return
			formatCodeMirror(type_file.options)
		}
	})
})()
