// ==UserScript==
// @name         Sapo Intelligent All-in-One (JS + CSS + HTML)
// @namespace    http://tampermonkey.net/
// @version      2025-11-29-V8-Fix-Hinting
// @description  IntelliSense for Sapo (Acorn JS, CSSTree, Fuse.js) - Liquid & BWT Compatible. Use Tampermonkey hook to CodeMirror 5.0.0 of Sapo Web
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

; (function () {
	'use strict'

	// #region ==================== MODULE 1: Utils ====================
	/**
	 * Monitors the DOM for elements matching the given selector and executes callback when found.
	 * Uses MutationObserver to detect dynamically added elements.
	 * Each element is processed only once (tracked via data-processed attribute).
	 *
	 * @param {string} selector - CSS selector string to find elements
	 * @param {Function} callback - Function to execute when element is found (receives element as parameter)
	 * @returns {MutationObserver} Observer instance (call observer.disconnect() to stop monitoring)
	 */
	function onElementFound(selector, callback) {
		// Step 1: Define the check and process logic
		function checkAndProcess() {
			const elements = document.querySelectorAll(selector)
			elements.forEach((element) => {
				// Check if this element has already been processed via 'data-processed' attribute
				if (!element.dataset.processed) {
					// Mark element as processed to prevent duplicate handling
					element.dataset.processed = 'true'

					// Execute user's callback function with the found element
					callback(element)
				}
			})
		}

		// Step 2: Run check immediately (for elements already in DOM at page load)
		checkAndProcess()

		// Step 3: Create MutationObserver to watch for DOM changes
		const observer = new MutationObserver((mutations) => {
			checkAndProcess()
		})

		// Step 4: Start observing the entire document body
		observer.observe(document.body, {
			childList: true, // Watch for child elements being added/removed
			subtree: true, // Watch all descendants, not just direct children
		})

		// Return observer for optional disconnection later: observer.disconnect()
		return observer
	}
	// #endregion Utils

	// #region ==================== MODULE 2: BaseIntelligent ====================
	/**
	 * BaseIntelligent - Core class for managing CodeMirror editor integration with intelligent features
	 * Provides functionality for DOM monitoring, file type detection, and debug logging
	 */
	class BaseIntelligent {
		// PRIVATE VARIABLES
		/**
		 * Main CodeMirror editor instance
		 * @private
		 * @type {Object|null}
		 */
		CodeMirrorEditor = null

		// PUBLIC VARIABLES
		/**
		 * Operation status flag (true = active, false = inactive)
		 * @type {boolean}
		 */
		Status = false

		/**
		 * Debug mode flag (true = debug output enabled)
		 * @type {boolean}
		 */
		Debug = true

		/**
		 * Current file type being edited (set but never updated - consider removing or adding setter)
		 * @type {string}
		 */
		CurrentFileType = 'unknown'

		/**
		 * Name of the current site/application
		 * @type {string}
		 */
		Site_name = 'unknown'

		/**
		 * Error message displayed when initialization fails
		 * @type {string}
		 */
		Fail_mess = 'Intelligent feature failed to install. Please check the console for more details.'

		/**
		 * Reference to the global CodeMirror object
		 * @type {Object|null}
		 */
		CodeMirror_Global_Object = null

		/**
		 * Initializes BaseIntelligent instance
		 * @param {Object} CodeMirror_Global_Object_input - Global CodeMirror object
		 * @param {Object} CodeMirror - CodeMirror editor instance
		 * @param {Object} [options={}] - Configuration options
		 * @param {string} [options.site_name='unknown'] - Site name identifier
		 * @param {boolean} [debug=false] - Enable debug mode
		 */
		constructor(CodeMirror_Global_Object_input, CodeMirror, options = {}, debug = false) {
			this.Debug = debug
			this.Site_name = options.site_name || 'unknown'
			this.CodeMirror_Global_Object = CodeMirror_Global_Object_input

			// Initialize CodeMirror if provided
			if (CodeMirror) {
				this.CodeMirrorEditor = CodeMirror
				this.Status = true
			}

			// ISSUE: CurrentFileType is never updated. Consider calling GetCurrentFileType() here
			// this.CurrentFileType = this.GetCurrentFileType()
		}

		/**
		 * Monitors DOM for elements matching selector and executes callback when found
		 * Uses MutationObserver to detect dynamically added elements
		 *
		 * @param {string} selector - CSS selector string to find elements
		 * @param {Function} callback - Function to execute when element is found (receives element as parameter)
		 * @returns {MutationObserver} Observer instance (can use observer.disconnect() to stop monitoring)
		 */
		OnElementFound(selector, callback) {
			/**
			 * Checks for elements matching selector and processes unprocessed ones
			 * @private
			 */
			function checkAndProcess() {
				const elements = document.querySelectorAll(selector)
				elements.forEach((element) => {
					// Skip elements that have already been processed
					if (!element.dataset.processed) {
						// Mark element as processed to prevent duplicate handling
						element.dataset.processed = 'true'
						callback(element)
					}
				})
			}

			// Initial check for elements already in DOM
			checkAndProcess()

			// Setup MutationObserver to detect DOM changes
			const observer = new MutationObserver(() => {
				checkAndProcess()
			})

			// Start observing the entire document body
			observer.observe(document.body, {
				childList: true, // Watch for child elements being added/removed
				subtree: true, // Watch all descendants, not just direct children
			})

			return observer
		}

		/**
		 * Determines file type from URL query parameters
		 * Parses the current URL for 'key' parameter and checks file extension
		 *
		 * @returns {string} File type: 'javascript', 'css', 'html', or 'unknown'
		 */
		GetCurrentFileType() {
			const url = new URL(window.location.href)
			const key = url.searchParams.get('key')

			if (!key) return 'unknown'

			// Check for JavaScript file extensions
			if (key.endsWith('.js') || key.endsWith('.js.bwt')) return 'javascript'

			// Check for CSS file extensions
			if (key.endsWith('.css') || key.endsWith('.scss') || key.endsWith('.css.bwt') || key.endsWith('.scss.bwt')) return 'css'

			// Check for HTML/template file extensions
			if (key.endsWith('.bwt') || key.endsWith('.liquid') || key.endsWith('.html')) return 'html'

			return 'unknown'
		}

		/**
		 * Outputs formatted debug messages to console
		 * Only executes when this.Debug === true
		 * Formats timestamp and extracts calling function name from stack trace
		 *
		 * @param {...any} args - Values to log (same as console.log)
		 */
		PrintDebugLog = (...args) => {
			// Exit early if debug mode is disabled
			if (this.Debug !== true) return

			// Format helper for consistent timestamp padding
			const pad = (n) => n.toString().padStart(2, '0')
			const date = new Date()

			// Create timestamp: YYYY-MM-DD HH:MM:SS.mmm
			const timestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${date.getMilliseconds()}`

			const className = this.constructor.name
			const stack = new Error().stack
			let functionName = 'unknown'

			// Parse stack trace to find calling function
			const lines = stack.split('\n')
			let fallbackName = null // Keep minified name as fallback

			// Firefox/Tampermonkey stack trace format: functionName@url
			for (let i = 1; i < Math.min(lines.length, 10); i++) {
				const line = lines[i]
				const match = line.match(/^([#a-zA-Z0-9_]+)@/)

				if (match) {
					const name = match[1]
					// Skip PrintDebugLog and constructor name
					if (name === 'PrintDebugLog' || name === className) continue

					// Prefer longer names (real function names) over short minified ones
					if (name.length > 3) {
						functionName = name
						break
					} else if (!fallbackName) {
						// Keep first minified name as fallback
						fallbackName = name
					}
				}
			}

			// Use fallback if no proper name found
			if (functionName === 'unknown' && fallbackName) {
				functionName = fallbackName
			}

			// Output formatted debug message
			console.debug(`[${timestamp}] [${className}::${functionName}]`, ...args)
		}

		/**
		 * Validates that intelligent features are properly initialized
		 * Useful as a guard before executing CodeMirror-dependent operations
		 *
		 * @returns {boolean} true if operational, false if initialization failed
		 */
		CheckIntelligentStatus() {
			// Check if CodeMirror editor instance exists
			if (!this.CodeMirrorEditor) {
				console.error('Cannot find CodeMirror editor')
				return false
			}

			// Check if status flag is true
			if (!this.Status) {
				console.warn(this.Fail_mess)
				return false
			}

			return true
		}
	}
	// #endregion BaseIntelligent

	// #region ==================== MODULE 3: IntelligentHTML ====================
	/**
	 * IntelligentHTML - Extends BaseIntelligent to provide HTML-specific intelligent features
	 * Handles HTML tag hinting and auto-closing tags
	 */
	class IntelligentHTML extends BaseIntelligent {
		// List of void (self-closing) HTML elements that don't need closing tags
		// prettier-ignore
		#voidElements = new Set([
			'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
			'link', 'meta', 'param', 'source', 'track', 'wbr', 'command', 'keygen', 'menuitem'
		])

		// Common HTML tags for autocomplete
		// prettier-ignore
		#htmlTags = [
			// Document structure
			'html', 'head', 'body', 'title', 'meta', 'link', 'script', 'style', 'base',
			// Sections
			'header', 'footer', 'main', 'nav', 'section', 'article', 'aside', 'address',
			// Headings
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup',
			// Content grouping
			'div', 'span', 'p', 'pre', 'blockquote', 'figure', 'figcaption', 'hr',
			// Lists
			'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'menu',
			// Text semantics
			'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr', 'code',
			'var', 'samp', 'kbd', 'sub', 'sup', 'i', 'b', 'u', 'mark', 'ruby', 'rt',
			'rp', 'bdi', 'bdo', 'br', 'wbr', 'time', 'data',
			// Forms
			'form', 'input', 'button', 'select', 'option', 'optgroup', 'textarea',
			'label', 'fieldset', 'legend', 'datalist', 'output', 'progress', 'meter',
			// Tables
			'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
			// Media
			'img', 'audio', 'video', 'source', 'track', 'picture', 'embed', 'object',
			'param', 'iframe', 'canvas', 'map', 'area', 'svg', 'math',
			// Interactive
			'details', 'summary', 'dialog',
			// Template
			'template', 'slot', 'noscript',
			// Deprecated but still used
			'center', 'font', 'marquee'
		]

		constructor(CodeMirror_Global_Object_input, editor_input, options = {}, debug = false) {
			super(CodeMirror_Global_Object_input, editor_input, options, debug)
		}

		/**
		 * Checks if current context is HTML
		 * @returns {boolean} True if in HTML context
		 */
		checkFileTypeOrBlockIsHtmlContext() {
			const cm = this.CodeMirrorEditor
			const cursor = cm.getCursor()
			const token = cm.getTokenAt(cursor)
			const inner = this.CodeMirror_Global_Object.innerMode(cm.getMode(), token.state)

			return inner.mode.name === 'xml' || inner.mode.name === 'htmlmixed'
		}

		/**
		 * Provides HTML tag hints with auto-closing functionality.
		 * Handles both:
		 * 1. Tag completion: <div -> <div></div>
		 * 2. Word expansion: div -> <div></div>
		 * @returns {Object|null} Hint object for CodeMirror or null if not in tag context
		 */
		GetHtmlTagHints() {
			const cm = this.CodeMirrorEditor
			const cursor = cm.getCursor()
			const line = cm.getLine(cursor.line)
			const beforeCursor = line.slice(0, cursor.ch)

			// 1. Check if we're typing after '<' (opening a new tag)
			const tagMatch = beforeCursor.match(/<([a-zA-Z0-9]*)$/)

			// 2. Check if we're typing a word (potential tag for expansion)
			const wordMatch = beforeCursor.match(/\b([a-zA-Z0-9]+)$/)

			let partial = ''
			let start = cursor.ch
			let isTagStart = false

			if (tagMatch) {
				partial = tagMatch[1].toLowerCase()
				start = cursor.ch - partial.length
				isTagStart = true
				this.PrintDebugLog('HTML tag context detected (<tag), partial:', partial)
			} else if (wordMatch) {
				partial = wordMatch[1].toLowerCase()
				start = cursor.ch - partial.length
				isTagStart = false
				this.PrintDebugLog('HTML word context detected (tag), partial:', partial)
			} else {
				return null
			}

			// Filter tags based on partial input
			const matchingTags = this.#htmlTags.filter((tag) => tag.toLowerCase().startsWith(partial))

			if (matchingTags.length === 0) {
				return null
			}

			const self = this
			const hints = matchingTags.map((tag) => {
				const isVoid = self.#voidElements.has(tag)

				return {
					text: tag,
					displayText: isTagStart ? (isVoid ? `<${tag}>` : `<${tag}>...</${tag}>`) : isVoid ? `<${tag}>` : `<${tag}></${tag}>`,
					className: isVoid ? 'CodeMirror-hint-void-tag' : 'CodeMirror-hint-tag',
					hint: function (cm, data, completion) {
						const from = { line: cursor.line, ch: start - (isTagStart ? 1 : 0) } // Include < if present
						const to = { line: cursor.line, ch: cursor.ch }

						if (isVoid) {
							// Void element: insert self-closing tag
							cm.replaceRange(`<${tag}>`, from, to)
							// Position cursor after the tag
							const newCh = from.ch + tag.length + 2 // < + tag + >
							cm.setCursor({ line: cursor.line, ch: newCh })
						} else {
							// Normal element: insert opening and closing tags
							cm.replaceRange(`<${tag}></${tag}>`, from, to)
							// Position cursor between the tags
							const newCh = from.ch + tag.length + 2 // < + tag + >
							cm.setCursor({ line: cursor.line, ch: newCh })
						}
					},
				}
			})

			this.PrintDebugLog('Generated', hints.length, 'HTML hints')

			return {
				list: hints,
				from: { line: cursor.line, ch: start },
				to: cursor,
			}
		}
	}
	// #endregion IntelligentHTML

	// #region ==================== MODULE 4: IntelligentCSS ====================
	/**
	 * CSSCacheManager - LRU (Least Recently Used) Cache for CSS parsing results
	 * Optimized for large projects with configurable max size and automatic eviction
	 */
	class CSSCacheManager {
		/** @private @type {Map<string, {data: Object, lastAccessed: number, size: number}>} */
		#cache = new Map()

		/** @private @type {number} Maximum number of cache entries */
		#maxEntries = 30

		/** @private @type {number} Maximum total memory in bytes (approximate) */
		#maxMemoryBytes = 5 * 1024 * 1024 // 5MB default

		/** @private @type {number} Current estimated memory usage */
		#currentMemory = 0

		/**
		 * Creates a new CSSCacheManager
		 * @param {Object} options - Configuration options
		 * @param {number} options.maxEntries - Maximum cache entries (default: 30)
		 * @param {number} options.maxMemoryMB - Maximum memory in MB (default: 5)
		 */
		constructor(options = {}) {
			this.#maxEntries = options.maxEntries || 30
			this.#maxMemoryBytes = (options.maxMemoryMB || 5) * 1024 * 1024
		}

		/**
		 * Gets a value from cache, updating lastAccessed timestamp
		 * @param {string} key - Cache key
		 * @returns {Object|undefined} Cached data or undefined if not found
		 */
		get(key) {
			const entry = this.#cache.get(key)
			if (entry) {
				entry.lastAccessed = Date.now()
				return entry.data
			}
			return undefined
		}

		/**
		 * Sets a value in cache with LRU eviction if needed
		 * @param {string} key - Cache key
		 * @param {Object} data - Data to cache
		 */
		set(key, data) {
			const size = this.#estimateSize(data)

			// Evict entries if needed
			while (this.#cache.size >= this.#maxEntries || this.#currentMemory + size > this.#maxMemoryBytes) {
				if (this.#cache.size === 0) break
				this.#evictLRU()
			}

			// Remove old entry if exists
			if (this.#cache.has(key)) {
				const oldEntry = this.#cache.get(key)
				this.#currentMemory -= oldEntry.size
			}

			// Add new entry
			this.#cache.set(key, {
				data: data,
				lastAccessed: Date.now(),
				size: size,
			})
			this.#currentMemory += size
		}

		/**
		 * Checks if key exists in cache
		 * @param {string} key - Cache key
		 * @returns {boolean} True if key exists
		 */
		has(key) {
			return this.#cache.has(key)
		}

		/**
		 * Deletes an entry from cache
		 * @param {string} key - Cache key
		 */
		delete(key) {
			const entry = this.#cache.get(key)
			if (entry) {
				this.#currentMemory -= entry.size
				this.#cache.delete(key)
			}
		}

		/**
		 * Clears all cache entries
		 */
		clear() {
			this.#cache.clear()
			this.#currentMemory = 0
		}

		/**
		 * Gets current cache size
		 * @returns {number} Number of entries
		 */
		get size() {
			return this.#cache.size
		}

		/**
		 * Gets cache statistics for debugging
		 * @returns {Object} Cache stats including entries, memory usage
		 */
		getStats() {
			return {
				entries: this.#cache.size,
				maxEntries: this.#maxEntries,
				memoryBytes: this.#currentMemory,
				maxMemoryBytes: this.#maxMemoryBytes,
				memoryMB: (this.#currentMemory / 1024 / 1024).toFixed(2),
			}
		}

		/**
		 * Evicts the least recently used entry
		 * @private
		 */
		#evictLRU() {
			let oldestKey = null
			let oldestTime = Infinity

			for (const [key, entry] of this.#cache) {
				if (entry.lastAccessed < oldestTime) {
					oldestTime = entry.lastAccessed
					oldestKey = key
				}
			}

			if (oldestKey) {
				this.delete(oldestKey)
			}
		}

		/**
		 * Estimates memory size of data (rough approximation)
		 * @private
		 * @param {Object} data - Data to estimate
		 * @returns {number} Estimated size in bytes
		 */
		#estimateSize(data) {
			try {
				return JSON.stringify(data).length * 2 // UTF-16 = 2 bytes per char
			} catch {
				return 1000 // Default estimate for circular refs
			}
		}
	}

	/**
	 * IntelligentCSS - Extends BaseIntelligent to provide CSS/SCSS-specific intelligent features
	 * Handles CSS class discovery, SCSS variable extraction, and intelligent code completion
	 */
	class IntelligentCSS extends BaseIntelligent {
		// PRIVATE PROPERTIES
		#storage = sessionStorage
		#changeHandler
		#enableHandler_CTR_S = false

		// CSS cache collections
		#localCssClasses = new Set()
		#externalCssClasses = new Set()
		#externalCssParentChildMap = {} // Parent-child relationships from entire theme
		#localCssParentChildMap = {} // Parent-child relationships from current file
		#localScssVariables = new Set() // Variables in current file
		#scssVariablesCache = new Map() // Cache for parsed variables
		/** @type {CSSCacheManager} LRU cache for parse results - optimized for large projects */
		#parseCache = new CSSCacheManager({ maxEntries: 50, maxMemoryMB: 10 })

		// Built-in SCSS functions and directives
		// prettier-ignore
		#scssBuiltIns = ['lighten', 'darken', 'saturate', 'desaturate', 'opacify', 'transparentize', 'mix', 'rgba', 'hsl', 'hsla', 'percentage', 'round', 'ceil', 'floor', 'abs', 'min', 'max', 'random', 'length', 'nth', 'join', 'append', 'zip', 'index', 'list-separator', 'map-get', 'map-merge', 'map-remove', 'map-keys', 'map-values', 'map-has-key', 'if', 'for', 'each', 'while', '@mixin', '@include', '@function', '@return', '@if', '@else', '@else if', '@for', '@each', '@while', '@import', '@use', '@forward', '@extend', '@at-root', '@debug', '@warn', '@error', '@media', '@supports', '@keyframes']

		// Custom CSS styles for hint display
		#hintStyles = `
        .CodeMirror-hints {z-index: 999999999 !important;position: absolute !important;}
        .CodeMirror-hints-wrapper {overflow: visible !important;}
        .CodeMirror-hint-local{color:#007acc;font-weight:bold}
        .CodeMirror-hint-global{color:#795e26}
        .CodeMirror-hint-builtin{color:#267f99}
        .CodeMirror-hint-property{color:#001080}
        .CodeMirror-hint-priority::before{content:"★ ";color:#ff6b6b}
        .CodeMirror-hint-active{background:#0084ff!important;color:white!important}
        .CodeMirror-hints{position:absolute;z-index:10;overflow:hidden;list-style:none;margin:0;padding:2px;-webkit-box-shadow:2px 3px 5px rgba(0,0,0,.2);-moz-box-shadow:2px 3px 5px rgba(0,0,0,.2);box-shadow:2px 3px 5px rgba(0,0,0,.2);border-radius:3px;border:1px solid silver;background:#fff;font-size:13px;font-family:monospace;max-height:20em;overflow-y:auto;box-sizing:border-box}
        li.CodeMirror-hint-active{background:#08f;color:#fff}`

		/**
		 * Initializes IntelligentCSS instance
		 * @param {Object} CodeMirror_Global_Object_input - Global CodeMirror object
		 * @param {Object} editor_input - CodeMirror editor instance
		 * @param {Object} options - Configuration options
		 * @param {boolean} options.enableHandler_CTR_S - Enable Ctrl+S handler for cache updates
		 * @param {string} options.site_name - Site name identifier
		 * @param {boolean} debug - Enable debug mode
		 */
		constructor(CodeMirror_Global_Object_input, editor_input, options = {}, debug = false) {
			super(CodeMirror_Global_Object_input, editor_input, options, debug)
			this.#enableHandler_CTR_S = options.enableHandler_CTR_S || false
			this.Fail_mess = 'Intelligent CSS feature failed to install. Please check the console for more details.'
			this.Site_name = options.site_name || 'unknown'

			// Delayed initialization to ensure editor and DOM are ready
			setTimeout(() => {
				this.Status = true
				this.#InitCSSHints()
				this.#AutoScanOnTyping()
			}, 1500)
		}

		// --- CSS EXTERNAL LOADERS ---

		/**
		 * Retrieves CSRF token from page meta tags
		 * @private
		 * @returns {string} CSRF token or empty string if not found
		 */
		#GetCSRFToken() {
			this.PrintDebugLog('Attempting to retrieve CSRF token')
			const meta = document.querySelector('meta[name="csrf-token"]')
			const token = meta ? meta.getAttribute('content') : ''
			this.PrintDebugLog('CSRF token found:', token ? 'Yes' : 'No')
			return token
		}
		/**
		 * Extracts all variables (SCSS and CSS custom properties) from CSS text
		 * Uses caching to avoid re-parsing identical content
		 * @private
		 * @param {string} cssText - CSS/SCSS content to parse
		 * @returns {Set<string>} Set of variable names (e.g., '$variable', '--custom-prop')
		 */
		#ExtractAllVariables(cssText) {
			this.PrintDebugLog('Extracting all variables from text of length:', cssText.length)

			const cacheKey = 'vars_' + this.#HashString(cssText)
			if (this.#scssVariablesCache.has(cacheKey)) {
				this.PrintDebugLog('Using cached variables')
				return this.#scssVariablesCache.get(cacheKey)
			}

			const variables = new Set()
			this.PrintDebugLog('Starting fresh variable extraction')

			// Preprocess: Replace strings with placeholders
			let cleanedText = cssText
			const stringPattern = /(['"`])(?:\\.|(?!\1).)*\1/g
			const stringStore = []
			let stringIndex = 0

			cleanedText = cleanedText.replace(stringPattern, (match) => {
				stringStore.push(match)
				return `__STRING_PLACEHOLDER_${stringIndex++}__`
			})

			// Remove comments
			cleanedText = cleanedText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

			// Extract all variable types
			this.#ExtractScssVariablesFromText(cleanedText, cssText, variables)
			this.#ExtractCssCustomProperties(cleanedText, variables)
			this.#ExtractMixinFunctionParams(cleanedText, variables)

			// Cache results
			this.#scssVariablesCache.set(cacheKey, variables)
			this.PrintDebugLog('Cached', variables.size, 'variables with key:', cacheKey)

			// Limit cache size
			if (this.#scssVariablesCache.size > 50) {
				const firstKey = this.#scssVariablesCache.keys().next().value
				this.#scssVariablesCache.delete(firstKey)
				this.PrintDebugLog('Cleared oldest variable cache entry')
			}

			this.PrintDebugLog('Total variables extracted:', variables.size)
			return variables
		}

		/**
		 * Extracts SCSS variables ($var-name) from preprocessed text
		 * @private
		 * @param {string} cleanedText - Preprocessed CSS text (comments/strings removed)
		 * @param {string} originalText - Original CSS text for line parsing
		 * @param {Set<string>} variables - Set to add found variables to
		 */
		#ExtractScssVariablesFromText(cleanedText, originalText, variables) {
			this.PrintDebugLog('Extracting SCSS variables ($var-name)')

			// Method 1: Regex with balanced bracket handling
			const varRegex = /\$([a-zA-Z][a-zA-Z0-9_-]*)\s*:(?![^:])/g
			let match

			while ((match = varRegex.exec(cleanedText)) !== null) {
				const varName = '$' + match[1]
				variables.add(varName)
				this.PrintDebugLog('Found SCSS variable declaration:', varName)

				// Extract variable value to find referenced variables
				const startPos = match.index + match[0].length
				const value = this.#ExtractScssValue(cleanedText, startPos)

				const referencedVars = value.match(/\$[a-zA-Z][a-zA-Z0-9_-]*/g)
				if (referencedVars) {
					referencedVars.forEach((v) => {
						variables.add(v)
						this.PrintDebugLog('Found referenced SCSS variable:', v)
					})
				}
			}

			// Method 2: Line-by-line parsing
			const lines = originalText.split('\n')
			this.PrintDebugLog('Parsing', lines.length, 'lines for SCSS variables')

			for (let line of lines) {
				line = line.trim()

				// Skip comments
				if (line.startsWith('//') || line.startsWith('/*')) continue

				// Find variable declarations
				const simpleVarMatch = line.match(/^\s*\$([a-zA-Z][a-zA-Z0-9_-]*)\s*:/)
				if (simpleVarMatch) {
					const varName = '$' + simpleVarMatch[1]
					variables.add(varName)
					this.PrintDebugLog('Line-based SCSS variable found:', varName)
				}

				// Find variables in SCSS blocks
				const inBlockVars = line.match(/\$([a-zA-Z][a-zA-Z0-9_-]*)(?=\s*[;,\)\s!])/g)
				if (inBlockVars) {
					inBlockVars.forEach((v) => {
						if (v.startsWith('$')) {
							variables.add(v)
							this.PrintDebugLog('In-block SCSS variable found:', v)
						}
					})
				}
			}
		}

		/**
		 * Extracts CSS Custom Properties (--var-name) from preprocessed text
		 * @private
		 * @param {string} cleanedText - Preprocessed CSS text (comments/strings removed)
		 * @param {Set<string>} variables - Set to add found variables to
		 */
		#ExtractCssCustomProperties(cleanedText, variables) {
			this.PrintDebugLog('Extracting CSS Custom Properties (--var-name)')

			// Find CSS custom property declarations: --var-name: value;
			const cssVarDeclarationRegex = /--([-a-zA-Z0-9_]+)\s*:/g
			let cssVarMatch
			while ((cssVarMatch = cssVarDeclarationRegex.exec(cleanedText)) !== null) {
				const varName = '--' + cssVarMatch[1]
				variables.add(varName)
				this.PrintDebugLog('Found CSS custom property declaration:', varName)
			}

			// Find CSS custom property references: var(--var-name)
			const cssVarReferenceRegex = /var\s*\(\s*(--([-a-zA-Z0-9_]+))/g
			let cssVarRefMatch
			while ((cssVarRefMatch = cssVarReferenceRegex.exec(cleanedText)) !== null) {
				const varName = cssVarRefMatch[1]
				variables.add(varName)
				this.PrintDebugLog('Found CSS custom property reference:', varName)
			}
		}

		/**
		 * Extracts variables from @mixin and @function parameters
		 * @private
		 * @param {string} cleanedText - Preprocessed CSS text (comments/strings removed)
		 * @param {Set<string>} variables - Set to add found variables to
		 */
		#ExtractMixinFunctionParams(cleanedText, variables) {
			this.PrintDebugLog('Extracting @mixin/@function parameter variables')

			const paramRegex = /@(?:mixin|function)\s+\w+\s*\(([^)]*)\)/g
			let paramMatch
			while ((paramMatch = paramRegex.exec(cleanedText)) !== null) {
				const params = paramMatch[1]
				const paramVars = params.match(/\$([a-zA-Z][a-zA-Z0-9_-]*)/g)
				if (paramVars) {
					paramVars.forEach((v) => {
						if (v.startsWith('$')) {
							variables.add(v)
							this.PrintDebugLog('Mixin/function parameter variable found:', v)
						}
					})
				}
			}
		}

		/**
		 * Helper function to extract SCSS value with balanced bracket handling
		 * @private
		 * @param {string} text - Text to parse
		 * @param {number} startPos - Starting position for extraction
		 * @returns {string} Extracted SCSS value
		 */
		#ExtractScssValue(text, startPos) {
			this.PrintDebugLog('Extracting SCSS value starting at position:', startPos)

			let depth = 0
			let inString = false
			let stringChar = ''
			let escapeNext = false
			let result = ''

			for (let i = startPos; i < text.length; i++) {
				const char = text[i]
				const prevChar = i > 0 ? text[i - 1] : ''

				if (escapeNext) {
					escapeNext = false
					result += char
					continue
				}

				if (char === '\\') {
					escapeNext = true
					result += char
					continue
				}

				if (!inString) {
					if (char === '"' || char === "'" || char === '`') {
						inString = true
						stringChar = char
					} else if (char === '(' || char === '[' || char === '{') {
						depth++
					} else if (char === ')' || char === ']' || char === '}') {
						if (depth === 0) {
							break // End of value
						}
						depth--
					} else if (char === ';' && depth === 0 && !inString) {
						break // End of declaration
					} else if (char === '!' && text.substr(i, 9) === '!default' && depth === 0) {
						i += 8 // Skip !default
						continue
					}
				} else {
					if (char === stringChar) {
						inString = false
						stringChar = ''
					}
				}

				result += char
			}

			const trimmedResult = result.trim()
			this.PrintDebugLog('Extracted value:', trimmedResult)
			return trimmedResult
		}

		/**
		 * Simple string hashing function for cache keys
		 * @private
		 * @param {string} str - Input string
		 * @returns {string} Hash value
		 */
		#HashString(str) {
			let hash = 0
			for (let i = 0; i < str.length; i++) {
				const char = str.charCodeAt(i)
				hash = (hash << 5) - hash + char
				hash = hash & hash // Convert to 32-bit integer
			}
			return hash.toString(36)
		}

		/**
		 * Parses CSS/SCSS content to extract classes, variables, and parent-child relationships
		 * Uses caching and optimized stack-based parsing
		 * @private
		 * @param {string} cssText - CSS/SCSS content to parse
		 * @param {Set} targetSet - Target set for extracted classes
		 * @param {Object} targetMap - Target map for parent-child relationships
		 * @param {Set} targetVarSet - Target set for SCSS variables (optional)
		 */
		#ParseSCSSWithStack(cssText, targetSet, targetMap, targetVarSet = null) {
			this.PrintDebugLog('Parsing SCSS with stack for text length:', cssText.length)

			const cacheKey = 'parse_' + this.#HashString(cssText)
			if (this.#parseCache.has(cacheKey)) {
				this.PrintDebugLog('Using cached parse results')
				const cached = this.#parseCache.get(cacheKey)

				// Merge cached results into target sets
				const beforeClasses = targetSet.size
				const beforeVars = targetVarSet ? targetVarSet.size : 0
				const beforeMapKeys = Object.keys(targetMap).length

				cached.classes.forEach((c) => targetSet.add(c))
				cached.variables.forEach((v) => targetVarSet && targetVarSet.add(v))

				// Merge cached maps
				Object.entries(cached.relations).forEach(([parent, children]) => {
					if (!targetMap[parent]) targetMap[parent] = new Set()
					children.forEach((c) => targetMap[parent].add(c))
				})

				this.PrintDebugLog('Merged cached data:', {
					classesAdded: targetSet.size - beforeClasses,
					varsAdded: targetVarSet ? targetVarSet.size - beforeVars : 0,
					mapKeysAdded: Object.keys(targetMap).length - beforeMapKeys,
				})
				return
			}

			this.PrintDebugLog('Starting fresh SCSS parsing')

			// 1. Extract all variables (SCSS $vars and CSS --vars)
			const variables = targetVarSet ? this.#ExtractAllVariables(cssText) : new Set()
			if (targetVarSet) {
				const before = targetVarSet.size
				variables.forEach((v) => targetVarSet.add(v))
				this.PrintDebugLog('Added', targetVarSet.size - before, 'variables to target set')
			}

			// 2. Preprocess CSS text
			let clean = this.#PreprocessCSS(cssText)
			this.PrintDebugLog('Preprocessed text length:', clean.length)

			// 3. Parse classes with stack optimization
			const { classes, relations } = this.#ParseClassesWithStack(clean)
			this.PrintDebugLog('Parsed', classes.length, 'classes and', Object.keys(relations).length, 'relations')

			// 4. Save results to target
			const beforeClasses = targetSet.size
			const beforeMapKeys = Object.keys(targetMap).length

			classes.forEach((c) => targetSet.add(c))
			Object.entries(relations).forEach(([parent, children]) => {
				if (!targetMap[parent]) targetMap[parent] = new Set()
				children.forEach((c) => targetMap[parent].add(c))
			})

			this.PrintDebugLog('Added to target:', {
				classes: targetSet.size - beforeClasses,
				relations: Object.keys(targetMap).length - beforeMapKeys,
			})

			// Cache results
			this.#parseCache.set(cacheKey, {
				classes: new Set(classes),
				variables: new Set(variables),
				relations: Object.fromEntries(Object.entries(relations).map(([k, v]) => [k, new Set(v)])),
			})

			this.PrintDebugLog('Cached parse results with key:', cacheKey)
			this.PrintDebugLog('Cache stats:', this.#parseCache.getStats())

			// Limit cache size for memory optimization (max 30 entries)
			if (this.#parseCache.size > 30) {
				const firstKey = this.#parseCache.keys().next().value
				this.#parseCache.delete(firstKey)
				this.PrintDebugLog('Cleared oldest parse cache entry')
			}
		}

		/**
		 * Preprocesses CSS/SCSS text by removing comments, liquid tags, and normalizing whitespace
		 * @private
		 * @param {string} cssText - Raw CSS/SCSS text
		 * @returns {string} Preprocessed text
		 */
		#PreprocessCSS(cssText) {
			this.PrintDebugLog('Preprocessing CSS text of length:', cssText.length)

			const processed = cssText
				.replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
				.replace(/\/\/.*$/gm, '') // Remove line comments
				.replace(/\{%[\s\S]*?%\}/g, ' ') // Remove liquid tags
				.replace(/\{\{[\s\S]*?\}\}/g, ' ') // Remove liquid variables
				.replace(/\([^)]*\)/g, '()') // Simplify functions
				.replace(/"[^"]*"/g, '""') // Replace strings
				.replace(/'[^']*'/g, "''") // Replace strings
				.replace(/\s+/g, ' ') // Normalize whitespace

			this.PrintDebugLog('Preprocessed length:', processed.length)
			return processed
		}

		/**
		 * Parses CSS classes and parent-child relationships using stack-based algorithm
		 * @private
		 * @param {string} cleanText - Preprocessed CSS text
		 * @returns {Object} Object containing classes array and relations map
		 */
		#ParseClassesWithStack(cleanText) {
			this.PrintDebugLog('Parsing classes with stack for text length:', cleanText.length)

			const classes = new Set()
			const relations = {}
			const stack = []
			let buffer = ''
			let inSelector = true

			this.PrintDebugLog('Starting stack-based parsing')

			const extractClassNames = (str) => {
				// Remove pseudo-classes, pseudo-elements, and other selectors
				const withoutPseudo = str.split(/[:\[#\s]/)[0]
				const matches = withoutPseudo.match(/\.(-?[_a-zA-Z0-9-]+)/g)
				return matches ? matches.map((c) => c.substring(1)) : []
			}

			for (let i = 0; i < cleanText.length; i++) {
				const char = cleanText[i]

				switch (char) {
					case '{':
						if (inSelector) {
							const selectorStr = buffer.trim()
							buffer = ''
							inSelector = false

							if (selectorStr.startsWith('@')) {
								stack.push(null)
								this.PrintDebugLog('Pushed null (directive) to stack')
							} else {
								const classesInSelector = extractClassNames(selectorStr)
								if (classesInSelector.length > 0) {
									const currentClass = classesInSelector[classesInSelector.length - 1]
									classes.add(currentClass)
									this.PrintDebugLog('Found class:', currentClass)

									// Find nearest non-null parent in stack
									for (let k = stack.length - 1; k >= 0; k--) {
										if (stack[k] !== null) {
											const parent = stack[k]
											if (!relations[parent]) relations[parent] = new Set()
											relations[parent].add(currentClass)
											this.PrintDebugLog('Added relation:', parent, '->', currentClass)
											break
										}
									}

									stack.push(currentClass)
									this.PrintDebugLog('Pushed class to stack:', currentClass)
								} else {
									stack.push(null)
									this.PrintDebugLog('Pushed null (no class) to stack')
								}
							}
						}
						break

					case '}':
						if (!inSelector) {
							const popped = stack.pop()
							inSelector = true
							buffer = ''
							this.PrintDebugLog('Popped from stack:', popped)
						}
						break

					case ';':
						if (!inSelector) {
							buffer = ''
							this.PrintDebugLog('Cleared buffer at semicolon')
						}
						break

					default:
						if (inSelector || char !== ' ') {
							buffer += char
						}
						break
				}
			}

			this.PrintDebugLog('Parse complete:', {
				totalClasses: classes.size,
				totalRelations: Object.keys(relations).length,
			})

			return {
				classes: Array.from(classes),
				relations: Object.fromEntries(Object.entries(relations).map(([k, v]) => [k, Array.from(v)])),
			}
		}

		/**
		 * Fetches external CSS files from the current theme and parses them
		 * @private
		 * @param {boolean} forceUpdate - Force cache refresh
		 * @param {number} retryCount - Current retry attempt
		 */
		async #FetchExternalCSS(forceUpdate = false, retryCount = 0) {
			this.PrintDebugLog('Fetching external CSS, forceUpdate:', forceUpdate, 'retryCount:', retryCount)

			const MAX_RETRIES = 2
			let EXTERNAL_CSS_URL = []
			let sideBar_el = document.querySelector('#asset-list-container')

			if (sideBar_el) {
				let a_tags = sideBar_el.querySelectorAll('li a')
				if (a_tags.length > 0) {
					EXTERNAL_CSS_URL = Array.from(a_tags)
						.map((r) => r.getAttribute('data-asset-key'))
						.filter((r) => /\.(css|css\.bwt|scss\.bwt|scss)$/i.test(r))
				}
			}

			this.PrintDebugLog('Found CSS assets:', EXTERNAL_CSS_URL.length)

			if (EXTERNAL_CSS_URL.length === 0) {
				this.PrintDebugLog('Sidebar not ready, retrying...')
				setTimeout(() => this.#FetchExternalCSS(forceUpdate, retryCount + 1), 1500)
				return
			}

			try {
				let adminUrl = window.location.href
				let matchUrlWithAdmin = adminUrl.match(/(https:\/\/\w.+\/admin\/themes\/)(\d+)/i)
				if (!matchUrlWithAdmin) {
					this.PrintDebugLog('Admin URL pattern not found')
					throw new Error('Admin URL pattern not found')
				}

				if (forceUpdate) {
					this.PrintDebugLog('Force update: clearing external cache')
					this.#externalCssClasses.clear()
					this.#externalCssParentChildMap = {}
				}

				const btn = document.getElementById('btn-refresh-css')
				const cachingStatus = document.getElementById('csscaching')

				if (btn) btn.innerText = retryCount > 0 ? `Retrying (${retryCount})...` : 'Loading...'
				if (cachingStatus) cachingStatus.innerText = 'Caching CSS...'

				for (let i = 0; i < EXTERNAL_CSS_URL.length; i++) {
					let assetKey = EXTERNAL_CSS_URL[i]
					let url = matchUrlWithAdmin[1] + 'assets/' + matchUrlWithAdmin[2] + '?key=' + encodeURIComponent(assetKey)

					this.PrintDebugLog(`Fetching asset ${i + 1}/${EXTERNAL_CSS_URL.length}:`, assetKey)

					if (cachingStatus) {
						cachingStatus.innerText = `Caching... (${i + 1}/${EXTERNAL_CSS_URL.length})`
					}

					const response = await fetch(url, {
						headers: {
							'content-type': 'application/json; charset=utf-8',
							Accept: 'application/json',
							'X-Requested-With': 'XMLHttpRequest',
							'X-CSRF-Token': this.#GetCSRFToken(),
						},
					})

					if (!response.ok) {
						this.PrintDebugLog('HTTP error for asset:', assetKey, 'Status:', response.status)
						throw new Error('HTTP Error')
					}

					const rawText = await response.text()
					let cssContent = ''

					try {
						const data = JSON.parse(rawText)
						cssContent = data.content || data.value || (data.asset ? data.asset.value : '')
					} catch (e) {
						cssContent = rawText
						this.PrintDebugLog('JSON parse failed, using raw text for:', assetKey)
					}

					if (cssContent && typeof cssContent === 'string') {
						this.PrintDebugLog(`Parsing CSS content for ${assetKey}, length:`, cssContent.length)
						this.#ParseSCSSWithStack(cssContent, this.#externalCssClasses, this.#externalCssParentChildMap)
					}
				}

				// Serialize Map for storage
				const serializedMap = {}
				for (const [key, valSet] of Object.entries(this.#externalCssParentChildMap)) {
					serializedMap[key] = Array.from(valSet)
				}

				const dataToSave = {
					flat: [...this.#externalCssClasses],
					relations: serializedMap,
				}

				this.#storage.setItem(this.Site_name, JSON.stringify(dataToSave))
				this.#externalCssParentChildMap = Object.fromEntries(Object.entries(serializedMap).map(([k, v]) => [k, new Set(v)]))

				this.PrintDebugLog('External CSS fetch complete:', {
					classes: this.#externalCssClasses.size,
					relations: Object.keys(this.#externalCssParentChildMap).length,
				})

				if (cachingStatus) {
					cachingStatus.innerText = `✓ Cached ${this.#externalCssClasses.size} classes`
					setTimeout(() => {
						cachingStatus.style.opacity = '0'
						setTimeout(() => cachingStatus.remove(), 500)
					}, 3000)
				}
			} catch (e) {
				this.PrintDebugLog('Error fetching CSS:', e.message)

				const cachingStatus = document.getElementById('csscaching')
				if (cachingStatus) {
					cachingStatus.innerText = '✗ CSS caching error'
					setTimeout(() => {
						cachingStatus.style.opacity = '0'
						setTimeout(() => cachingStatus.remove(), 500)
					}, 3000)
				}

				if (retryCount < MAX_RETRIES) {
					this.PrintDebugLog(`Retrying fetch (${retryCount + 1}/${MAX_RETRIES})`)
					setTimeout(() => this.#FetchExternalCSS(forceUpdate, retryCount + 1), 2000)
					return
				}
			} finally {
				const btn = document.getElementById('btn-refresh-css')
				if (btn) btn.innerText = 'Update Class Cache'
				this.PrintDebugLog('External CSS fetch process completed')
			}
		}

		/**
		 * Finds parent tag classes by scanning backwards from cursor position
		 * @private
		 * @returns {Array<string>} Array of parent class names
		 */
		#FindParentTagClass() {
			this.PrintDebugLog('Finding parent tag classes')

			if (!this.CodeMirrorEditor) {
				console.error('Cannot find CodeMirror editor')
				return []
			}

			const cursor = this.CodeMirrorEditor.getCursor()
			const doc = this.CodeMirrorEditor.getDoc()

			this.PrintDebugLog('Starting search from line:', cursor.line)

			// Scan backwards up to 50 lines
			for (let i = cursor.line; i >= Math.max(0, cursor.line - 50); i--) {
				let text = doc.getLine(i)
				this.PrintDebugLog(`Checking line ${i}:`, text.substring(0, 50) + '...')

				// For current line, only consider text before cursor
				if (i === cursor.line) {
					const textBeforeCursor = text.slice(0, cursor.ch)
					const lastOpenTag = textBeforeCursor.lastIndexOf('<')
					const lastCloseTag = textBeforeCursor.lastIndexOf('>')

					if (lastOpenTag > lastCloseTag) {
						this.PrintDebugLog('Currently inside tag, skipping line')
						continue
					}
				}

				// Skip closing tags and self-closing tags
				if (/<\//.test(text) || /\/>/.test(text)) {
					this.PrintDebugLog('Skipping closing/self-closing tag')
					continue
				}

				// Find class attribute (supports multiline)
				const classMatch = text.match(/class\s*=\s*["']([^"']+)["']/i)
				if (classMatch) {
					const classes = classMatch[1].split(/\s+/).filter((c) => c.trim().length > 0)
					if (classes.length > 0) {
						this.PrintDebugLog('Found parent classes:', classes)
						return classes
					}
				}
			}

			this.PrintDebugLog('No parent classes found')
			return []
		}

		/**
		 * Updates local cached data when file is saved
		 * @private
		 * @param {Set<string>} scannedLocalClasses - Newly scanned local classes
		 */
		#UpdateLocalCachedDataWhenSaveFile(scannedLocalClasses) {
			this.PrintDebugLog('Updating local cached data with', scannedLocalClasses?.size || 0, 'classes')

			if (!scannedLocalClasses || scannedLocalClasses.size === 0) return

			const cachedData = this.#storage.getItem(this.Site_name)
			if (cachedData) {
				try {
					const parsedData = JSON.parse(cachedData)
					if (parsedData.flat && Array.isArray(parsedData.flat)) {
						const tmpSet = new Set(parsedData.flat)
						const beforeSize = tmpSet.size

						// Merge newly scanned classes
						scannedLocalClasses.forEach((cls) => tmpSet.add(cls))
						parsedData.flat = Array.from(tmpSet)

						this.PrintDebugLog(`Added ${tmpSet.size - beforeSize} new classes to cache`)

						// Update relationship maps
						const serializedMap = {}
						const mergedMap = this.#MergeParentChildMaps()

						for (const [key, valSet] of Object.entries(mergedMap)) {
							serializedMap[key] = Array.from(valSet)
						}

						parsedData.relations = serializedMap
						this.#storage.setItem(this.Site_name, JSON.stringify(parsedData))

						// Update runtime global variable for immediate suggestions
						scannedLocalClasses.forEach((cls) => this.#externalCssClasses.add(cls))

						this.PrintDebugLog(`Updated ${scannedLocalClasses.size} new classes in cache`)
					}
				} catch (e) {
					console.error('[All-in-One] Error updating local cache:', e)
				}
			}
		}

		/**
		 * Handles Ctrl+S keyboard shortcut for saving and cache updates
		 * @private
		 */
		#HandleCtrlS() {
			this.PrintDebugLog('Setting up Ctrl+S handler')

			if (!this.CodeMirrorEditor) {
				console.error('Cannot find CodeMirror editor')
				return
			}

			let btn_save = document.getElementById('save-button')
			const existingKeys = this.CodeMirrorEditor.getOption('extraKeys') || {}
			const newKeys = {
				...existingKeys,
				'Ctrl-S': () => {
					this.PrintDebugLog('Ctrl+S pressed, scanning and saving')
					try {
						const scanned = this.ScanLocalCSS()
						this.PrintDebugLog(`Scanned ${scanned.size} classes`)
						this.#UpdateLocalCachedDataWhenSaveFile(scanned)
					} catch (e) {
						console.error('Error scan and save current css class')
					} finally {
						btn_save?.click()
					}
				},
			}
			this.CodeMirrorEditor.setOption('extraKeys', newKeys)
			this.PrintDebugLog('Ctrl+S handler configured')
		}

		/**
		 * Creates manual cache update button in UI
		 * @private
		 */
		#CreateUpdateButton() {
			this.PrintDebugLog('Creating update button')

			if (document.getElementById('btn-refresh-css')) {
				this.PrintDebugLog('Update button already exists')
				return
			}

			let btn
			const divEl = document.querySelector('.template-editor-titlebar__actions')

			if (!divEl) {
				btn = document.createElement('button')
				btn.id = 'btn-refresh-css'
				btn.innerText = 'Update Class Cache'
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
				this.PrintDebugLog('Created floating update button')
			} else {
				divEl.insertAdjacentHTML('afterbegin', '<span class="ui-button ui-button--transparent ui-button--size-small" href="javascript:void(0);" id="btn-refresh-css">Update Class Cache</span>')
				this.PrintDebugLog('Added update button to titlebar')
			}

			btn = divEl ? divEl.querySelector('#btn-refresh-css') : document.getElementById('btn-refresh-css')
			if (!btn) {
				this.PrintDebugLog('Failed to find or create update button')
				return
			}

			btn.addEventListener('click', (e) => {
				e.preventDefault()
				this.PrintDebugLog('Update button clicked')
				this.#FetchExternalCSS(true)
			})

			this.PrintDebugLog('Update button created and configured')
		}

		/**
		 * Merges external and local parent-child maps
		 * @private
		 * @returns {Object} Merged parent-child map
		 */
		#MergeParentChildMaps() {
			this.PrintDebugLog('Merging parent-child maps')

			const merged = {}
			const mergeSet = (source) => {
				for (const parent in source) {
					if (!merged[parent]) merged[parent] = new Set()
					if (source[parent] && source[parent].forEach) {
						const beforeSize = merged[parent].size
						source[parent].forEach((c) => merged[parent].add(c))
						this.PrintDebugLog(`Added ${merged[parent].size - beforeSize} children to parent: ${parent}`)
					}
				}
			}

			mergeSet(this.#externalCssParentChildMap)
			mergeSet(this.#localCssParentChildMap)

			this.PrintDebugLog('Merged map contains', Object.keys(merged).length, 'parents')
			return merged
		}

		/**
		 * Provides class name hints for HTML context (class attribute)
		 * @returns {Object|null} Hint object for CodeMirror or null if not in class attribute context
		 */
		GetClassHintsForHTML() {
			this.PrintDebugLog('=== HTML Class Hint Debug ===')

			if (this.CheckIntelligentStatus() === false) {
				this.PrintDebugLog('Intelligent status check failed')
				return null
			}

			const cursor = this.CodeMirrorEditor.getCursor()
			const token = this.CodeMirrorEditor.getTokenAt(cursor)
			const line = this.CodeMirrorEditor.getLine(cursor.line)
			const beforeCursor = line.slice(0, cursor.ch)

			this.PrintDebugLog('Cursor position:', { line: cursor.line, ch: cursor.ch })
			this.PrintDebugLog('Token info:', token)
			this.PrintDebugLog('Line content:', line)
			this.PrintDebugLog('Text before cursor:', beforeCursor)

			// Check if in class attribute context
			const inClassAttr = /class\s*=\s*["'][^"']*$/.test(beforeCursor) || (token.type === 'string' && /class\s*=\s*["']/.test(beforeCursor))

			this.PrintDebugLog('In class attribute context:', inClassAttr)

			if (!inClassAttr) {
				this.PrintDebugLog('Not in class attribute, skipping hints')
				return null
			}

			this.PrintDebugLog('✓ Detected class attribute context')

			// Extract word to complete
			let wordToComplete = ''
			let startPos = cursor.ch

			const classMatch = beforeCursor.match(/class\s*=\s*(["'])/)
			if (classMatch) {
				const quotePos = beforeCursor.lastIndexOf(classMatch[1])
				const afterQuote = beforeCursor.slice(quotePos + 1)
				const words = afterQuote.split(/\s+/)
				wordToComplete = words[words.length - 1] || ''
				startPos = cursor.ch - wordToComplete.length

				this.PrintDebugLog('Word to complete:', wordToComplete)
				this.PrintDebugLog('Start position:', startPos)
			}

			// Find parent classes
			const parentClasses = this.#FindParentTagClass()
			this.PrintDebugLog('Parent classes found:', parentClasses)

			// Find child classes based on parent relationships
			let childClasses = new Set()
			const mergedMap = this.#MergeParentChildMaps()
			parentClasses.forEach((pClass) => {
				if (mergedMap[pClass]) {
					const before = childClasses.size
					mergedMap[pClass].forEach((child) => childClasses.add(child))
					this.PrintDebugLog(`Added ${childClasses.size - before} children for parent: ${pClass}`)
				}
			})

			const all = [...this.#externalCssClasses, ...this.#localCssClasses]
			this.PrintDebugLog('Total available classes:', all.length)

			let priorityList = []
			let normalList = []
			const searchLower = wordToComplete.toLowerCase()

			// Filter and categorize classes
			all.forEach((cls) => {
				const clsLower = cls.toLowerCase()
				const isChild = childClasses.has(cls)

				if (isChild) {
					if (searchLower === '' || clsLower.includes(searchLower)) {
						priorityList.push(cls)
					}
				} else {
					if (clsLower.startsWith(searchLower)) {
						normalList.push(cls)
					} else if (searchLower.length > 2 && clsLower.includes(searchLower)) {
						normalList.push(cls)
					}
				}
			})

			this.PrintDebugLog('Priority classes:', priorityList.length)
			this.PrintDebugLog('Normal classes:', normalList.length)

			// Sort and limit results
			priorityList.sort((a, b) => a.length - b.length)
			normalList.sort((a, b) => a.length - b.length)

			let resultList = [...new Set([...priorityList, ...normalList])]
			this.PrintDebugLog('Unique classes after merging:', resultList.length)

			if (resultList.length === 0) {
				this.PrintDebugLog('No matching classes found')
				return null
			}

			if (resultList.length > 50) {
				this.PrintDebugLog('Limiting results to 50 from', resultList.length)
				resultList.length = 50
			}

			// Format hints for CodeMirror
			const processedList = resultList.map((cls) => {
				const isPriority = childClasses.has(cls)
				return {
					text: cls,
					displayText: isPriority ? `★ ${cls}` : cls,
					className: isPriority ? 'CodeMirror-hint-priority' : '',
				}
			})

			this.PrintDebugLog('Returning', processedList.length, 'hints')

			return {
				list: processedList,
				from: this.CodeMirror_Global_Object.Pos(cursor.line, startPos),
				to: this.CodeMirror_Global_Object.Pos(cursor.line, cursor.ch),
			}
		}

		// ===== CSS PSEUDO INTELLISENSE =====
		isInsideFunctionSelector(line, cursor) {
			const before = line.slice(0, cursor.ch)

			// tìm ":not(" gần nhất
			const lastNot = before.lastIndexOf(':not(')
			if (lastNot === -1) return false

			// kiểm tra có đóng ")" chưa
			const afterNot = before.slice(lastNot)
			const open = (afterNot.match(/\(/g) || []).length
			const close = (afterNot.match(/\)/g) || []).length

			return open > close
		}
		GetPseudoHints(cursor, token, line) {
			const pseudoClasses = [
				'active', 'checked', 'disabled', 'empty', 'enabled',
				'first-child', 'first-of-type', 'focus', 'hover',
				'last-child', 'last-of-type', 'link', 'not',
				'nth-child', 'nth-of-type', 'only-child',
				'only-of-type', 'required', 'root', 'target',
				'valid', 'visited'
			]

			const pseudoElements = [
				'after', 'before', 'first-letter', 'first-line',
				'marker', 'selection', 'placeholder'
			]

			const beforeCursor = line.slice(0, cursor.ch)

			const match = beforeCursor.match(/(:{1,2})([a-zA-Z-]*)$/)
			if (!match) return null

			const typedColons = match[1]; // Lấy prefix mà user đã gõ (":" hoặc "::")
			const raw = match[2].toLowerCase()
			const colonCount = typedColons.length

			const insideNot = this.isInsideFunctionSelector(line, cursor)

			let list = []

			// Fix lỗi undefined name: Dựa vào số dấu ":" user gõ để quyết định danh sách tìm kiếm
			if (colonCount === 2) {
				list = pseudoElements
			} else if (colonCount === 1) {
				list = pseudoClasses
			} else {
				return null
			}

			const matched = list.filter(p => p.startsWith(raw))
			if (matched.length === 0) return null

			// Tính toán trước vị trí Start bắt đầu thay thế (Bao trùm cả dấu : user đã gõ)
			const startCh = cursor.ch - raw.length - colonCount;

			return {
				list: matched.map(name => ({
					text: name,
					displayText: colonCount === 2 ? `::${name}` : `:${name}`,
					className: 'CodeMirror-hint-pseudo',
					hint: (cm) => {
						const from = {
							line: cursor.line,
							ch: startCh // Lùi về trước cả dấu : hoặc ::
						}

						const to = {
							line: cursor.line,
							ch: cursor.ch
						}

						const isElement = pseudoElements.includes(name)
						// Quyết định prefix theo TYPE chuẩn, tự động sửa lỗi cho user
						const correctPrefix = isElement ? '::' : ':'

						// Thay thế toàn bộ ":no" thành ":not" (hoặc "::after")
						cm.replaceRange(correctPrefix + name, from, to)
					}
				})),
				from: this.CodeMirror_Global_Object.Pos(cursor.line, startCh),
				to: this.CodeMirror_Global_Object.Pos(cursor.line, cursor.ch)
			}
		}

		/**
		 * Provides hints for CSS/SCSS context (classes, variables, functions)
		 * @returns {Object|null} Hint object for CodeMirror
		 */
		GetCssScssHints() {
			this.PrintDebugLog('=== CSS/SCSS Hint Debug ===')

			if (this.CheckIntelligentStatus() === false) {
				this.PrintDebugLog('Intelligent status check failed')
				return null
			}

			const cursor = this.CodeMirrorEditor.getCursor()
			const token = this.CodeMirrorEditor.getTokenAt(cursor)
			const line = this.CodeMirrorEditor.getLine(cursor.line)
			const startChar = line.charAt(token.start)

			this.PrintDebugLog('Token:', token)
			this.PrintDebugLog('Start character:', startChar)
			this.PrintDebugLog('Line content:', line)

			let word = token.string
			let start = token.start

			// CASE 1: SCSS Variables ($)
			if (word.startsWith('$') || startChar === '$' || token.type === 'variable-2') {
				this.PrintDebugLog('SCSS variable context detected')

				if (!word.startsWith('$') && startChar === '$') {
					word = '$' + word
					start = token.start
					this.PrintDebugLog('Adjusted word for $ context:', word)
				}

				// Get all variables
				const allVars = [...this.#localScssVariables]
				this.PrintDebugLog('Available variables:', allVars.length)

				const matched = allVars.filter((v) => v.startsWith(word))
				this.PrintDebugLog('Matched variables:', matched.length)

				if (matched.length > 0) {
					return {
						list: matched.map((v) => ({
							text: v,
							displayText: v,
							className: 'CodeMirror-hint-scss-var',
						})),
						from: this.CodeMirror_Global_Object.Pos(cursor.line, start),
						to: this.CodeMirror_Global_Object.Pos(cursor.line, cursor.ch),
					}
				}
			}

			// CASE 1.5: CSS Custom Properties (--var-name)
			const twoCharsBefore = cursor.ch >= 2 ? line.substring(cursor.ch - 2, cursor.ch) : ''
			const isCssCustomProp = word.startsWith('--') || twoCharsBefore === '--' || (word.startsWith('-') && line.charAt(token.start - 1) === '-')

			if (isCssCustomProp) {
				this.PrintDebugLog('CSS Custom Property context detected')

				// Adjust word to include full -- prefix
				let searchWord = word
				let searchStart = start

				if (!word.startsWith('--')) {
					if (word.startsWith('-') && line.charAt(token.start - 1) === '-') {
						searchWord = '-' + word
						searchStart = token.start - 1
					} else if (twoCharsBefore === '--') {
						searchWord = '--'
						searchStart = cursor.ch - 2
					}
				}
				this.PrintDebugLog('Search word for CSS vars:', searchWord)

				// Get all CSS custom properties from variables cache
				const allVars = [...this.#localScssVariables]
				const cssVars = allVars.filter((v) => v.startsWith('--'))
				this.PrintDebugLog('Available CSS custom properties:', cssVars.length)

				const matched = cssVars.filter((v) => v.startsWith(searchWord))
				this.PrintDebugLog('Matched CSS custom properties:', matched.length)

				if (matched.length > 0) {
					return {
						list: matched.map((v) => ({
							text: v,
							displayText: v,
							className: 'CodeMirror-hint-css-var',
						})),
						from: this.CodeMirror_Global_Object.Pos(cursor.line, searchStart),
						to: this.CodeMirror_Global_Object.Pos(cursor.line, cursor.ch),
					}
				}
			}

			// CASE 2: CSS Pseudo-class / pseudo-element (:, ::)
			const pseudoHints = this.GetPseudoHints(cursor, token, line)
			if (pseudoHints) {
				this.PrintDebugLog('Using pseudo hints')
				return pseudoHints
			}

			// CASE 2.5: SCSS Directives (@)
			if (word.startsWith('@') || startChar === '@' || token.type === 'def') {
				this.PrintDebugLog('SCSS directive context detected')

				let search = word.startsWith('@') ? word : '@' + word
				this.PrintDebugLog('Searching for directive:', search)

				const matched = this.#scssBuiltIns.filter((item) => item.startsWith('@') && item.startsWith(search))
				this.PrintDebugLog('Matched directives:', matched.length)

				if (matched.length > 0) {
					return {
						list: matched,
						from: this.CodeMirror_Global_Object.Pos(cursor.line, start),
						to: this.CodeMirror_Global_Object.Pos(cursor.line, cursor.ch),
					}
				}
			}

			// CASE 3: CSS Class Selectors (.)
			const isClassSelector = word.startsWith('.') || (token.type === 'error' && /^[\w-]+$/.test(word) && line.charAt(start - 1) === '.') || (word.trim() === '' && line.charAt(cursor.ch - 1) === '.')

			this.PrintDebugLog('Class selector context:', isClassSelector)

			if (isClassSelector) {
				let cleanWord = word
				let cleanStart = start

				if (cleanWord.startsWith('.')) {
					cleanWord = cleanWord.slice(1)
					cleanStart++
					this.PrintDebugLog('Cleaned word (removed .):', cleanWord)
				} else if (line.charAt(start - 1) === '.') {
					cleanStart = start
					this.PrintDebugLog('Dot before word, keeping position')
				} else if (cleanWord.trim() === '') {
					cleanStart = cursor.ch
					this.PrintDebugLog('Empty word after dot')
				}

				const all = [...this.#externalCssClasses, ...this.#localCssClasses]
				this.PrintDebugLog('Available classes:', all.length)

				const matched = all
					.filter((c) => c.toLowerCase().startsWith(cleanWord.toLowerCase()))
					.sort((a, b) => a.length - b.length)
					.slice(0, 50)

				this.PrintDebugLog('Matched classes:', matched.length)

				if (matched.length > 0) {
					return {
						list: matched.map((c) => ({
							text: c,
							displayText: `.${c}`,
							className: 'CodeMirror-hint-css-selector',
						})),
						from: this.CodeMirror_Global_Object.Pos(cursor.line, cleanStart),
						to: this.CodeMirror_Global_Object.Pos(cursor.line, cursor.ch),
					}
				}
			}

			// CASE 4: SCSS Functions & Native Values
			this.PrintDebugLog('Falling back to native CSS hints')

			const nativeHintFunc = CodeMirror.hint.css || CodeMirror.hint.anyword
			let options = {}
			let nativeResult = nativeHintFunc(this.CodeMirrorEditor, options)

			if (!nativeResult || !Array.isArray(nativeResult.list)) {
				this.PrintDebugLog('No native hints available')
				nativeResult = {
					list: [],
					from: this.CodeMirror_Global_Object.Pos(cursor.line, start),
					to: this.CodeMirror_Global_Object.Pos(cursor.line, cursor.ch),
				}
			} else {
				this.PrintDebugLog('Native hints available:', nativeResult.list.length)
			}

			// Filter SCSS functions (not starting with @)
			const matchedScssFuncs = this.#scssBuiltIns.filter((item) => !item.startsWith('@') && item.startsWith(word))
			this.PrintDebugLog('Matched SCSS functions:', matchedScssFuncs.length)

			if (matchedScssFuncs.length > 0) {
				// Format SCSS function hints
				const scssHints = matchedScssFuncs.map((f) => ({
					text: f + '()',
					displayText: f,
					className: 'CodeMirror-hint-scss-func',
				}))

				// Merge with native hints
				let mergedList = [...scssHints]
				if (nativeResult.list) {
					mergedList = mergedList.concat(nativeResult.list)
				}

				// Remove duplicates
				const seen = new Set()
				nativeResult.list = mergedList.filter((item) => {
					const key = item.text || item
					if (seen.has(key)) return false
					seen.add(key)
					return true
				})

				this.PrintDebugLog('Total hints after merging:', nativeResult.list.length)
			}

			return nativeResult
		}

		/**
		 * Scans current file for CSS classes and SCSS variables
		 * @returns {Set|null} Set of local CSS classes or null if status check fails
		 */
		ScanLocalCSS() {
			this.PrintDebugLog('=== Scanning Local CSS ===')

			if (this.CheckIntelligentStatus() === false) {
				this.PrintDebugLog('Status check failed, cannot scan')
				return null
			}

			const content = this.CodeMirrorEditor.getValue()
			this.PrintDebugLog('Content length:', content.length)

			// Clear previous data
			const beforeLocalClasses = this.#localCssClasses.size
			const beforeLocalVars = this.#localScssVariables.size

			this.#localCssClasses.clear()
			this.#localScssVariables.clear()
			this.#localCssParentChildMap = {}

			this.PrintDebugLog('Cleared previous local data')

			// Parse current content
			this.#ParseSCSSWithStack(content, this.#localCssClasses, this.#localCssParentChildMap, this.#localScssVariables)

			this.PrintDebugLog('Scan complete:', {
				localClasses: this.#localCssClasses.size,
				localVariables: this.#localScssVariables.size,
				localRelations: Object.keys(this.#localCssParentChildMap).length,
				classesAdded: this.#localCssClasses.size - beforeLocalClasses,
				varsAdded: this.#localScssVariables.size - beforeLocalVars,
			})

			return this.#localCssClasses
		}

		/**
		 * Checks if current context is CSS/SCSS (either file type or style block)
		 * @returns {boolean} True if in CSS context
		 */
		checkFileTypeOrBlockIsCSSContext() {
			this.PrintDebugLog('Checking CSS context')

			if (this.CheckIntelligentStatus() === false) {
				this.PrintDebugLog('Status check failed')
				return false
			}

			this.CurrentFileType = this.GetCurrentFileType()
			this.PrintDebugLog('Current file type:', this.CurrentFileType)

			if (this.CurrentFileType === 'css' || this.CurrentFileType === 'scss') {
				this.PrintDebugLog('CSS file type detected')
				return true
			}

			const cursor = this.CodeMirrorEditor.getCursor()
			const token = this.CodeMirrorEditor.getTokenAt(cursor)
			const inner = CodeMirror.innerMode(this.CodeMirrorEditor.getMode(), token.state)

			this.PrintDebugLog('Inner mode:', inner.mode.name)

			if (inner.mode.name === 'css' || inner.mode.name === 'text/x-scss') {
				this.PrintDebugLog('CSS mode detected')
				return true
			}

			// Check for style tag context
			let state = token.state
			while (state) {
				if (state.tagName === 'style') {
					this.PrintDebugLog('Inside style tag')
					return true
				}
				if (state.context && state.context.tagName === 'style') {
					this.PrintDebugLog('Inside style context')
					return true
				}
				if (state.htmlState) state = state.htmlState
				else if (state.localState) state = state.localState
				else break
			}

			this.PrintDebugLog('Not in CSS context')
			return false
		}

		/**
		 * Initializes CSS hints system
		 * @private
		 */
		#InitCSSHints() {
			this.PrintDebugLog('=== Initializing CSS Hints ===')

			// Add custom CSS styles
			if (!document.getElementById('custom_intelligent_css')) {
				document.head.insertAdjacentHTML('beforeend', `<style id="custom_intelligent_css">${this.#hintStyles}</style>`)
				this.PrintDebugLog('Added custom CSS styles')
			}

			// Create caching status element
			if (!document.getElementById('csscaching')) {
				document.body.insertAdjacentHTML('beforeend', `<div style="position: fixed;bottom: 0;z-index: 999;background: #08f;right: 4px;color: #fff;padding: 2px 10px;transition:opacity 0.5s;" id="csscaching">Initializing...</div>`)
				this.PrintDebugLog('Created caching status element')
			}

			const cachingStatus = document.getElementById('csscaching')

			// Monitor asset list for changes
			this.OnElementFound('#asset-list-container li a', function () {
				if (cachingStatus) cachingStatus.innerText = 'Waiting for CSS caching...'
			})

			// Load cached data
			const cachedData = this.#storage.getItem(this.Site_name)
			if (cachedData) {
				try {
					const parsed = JSON.parse(cachedData)
					this.PrintDebugLog('Loaded cached data, parsing...')

					if (parsed.flat) {
						const before = this.#externalCssClasses.size
						parsed.flat.forEach((c) => this.#externalCssClasses.add(c))
						this.PrintDebugLog(`Added ${this.#externalCssClasses.size - before} classes from cache`)
					}

					if (parsed.relations) {
						const before = Object.keys(this.#externalCssParentChildMap).length
						for (const key in parsed.relations) {
							this.#externalCssParentChildMap[key] = new Set(parsed.relations[key])
						}
						this.PrintDebugLog(`Added ${Object.keys(this.#externalCssParentChildMap).length - before} relations from cache`)
					}

					if (cachingStatus) {
						cachingStatus.innerText = `✓ Loaded ${this.#externalCssClasses.size} classes`
						setTimeout(() => {
							cachingStatus.style.opacity = '0'
							setTimeout(() => cachingStatus.remove(), 500)
						}, 3000)
					}

					this.PrintDebugLog('Cache load successful')
				} catch (e) {
					this.PrintDebugLog('Cache parse error, fetching fresh:', e.message)
					this.#FetchExternalCSS(true)
				}
			} else {
				this.PrintDebugLog('No cache found, fetching fresh')
				this.#FetchExternalCSS(true)
			}

			// Create UI elements
			this.#CreateUpdateButton()

			if (this.#enableHandler_CTR_S) {
				this.PrintDebugLog('Enabling Ctrl+S handler')
				this.#HandleCtrlS()
			}

			// Initial scan
			setTimeout(() => {
				this.PrintDebugLog('Performing initial local CSS scan')
				this.ScanLocalCSS()
			}, 800)

			this.Status = true
			this.PrintDebugLog('CSS IntelliSense initialization complete')
		}

		/**
		 * Sets up automatic scanning when typing with debouncing
		 * @private
		 * @param {number} timeout - Debounce timeout in milliseconds (default: 3000)
		 */
		#AutoScanOnTyping(timeout = 3000) {
			this.PrintDebugLog('Setting up auto-scan with timeout:', timeout)

			let debounceTimer
			let lastContentHash = ''

			this.#changeHandler = this.CodeMirrorEditor.on('change', () => {
				clearTimeout(debounceTimer)

				debounceTimer = setTimeout(() => {
					const content = this.CodeMirrorEditor.getValue()
					const hash = content.length + content.slice(0, 50)

					if (hash !== lastContentHash) {
						this.PrintDebugLog('Content changed, scanning...')
						lastContentHash = hash
						this.ScanLocalCSS()
					} else {
						this.PrintDebugLog('Content unchanged, skipping scan')
					}
				}, timeout)
			})

			this.PrintDebugLog('Auto-scan handler configured')
		}
	}
	// #endregion IntelligentCSS

	// #region ==================== MODULE 5: IntelligentJS ====================
	/* ========================== JS Inteligent ==============================*/
	class IntelligentJS extends BaseIntelligent {
		// private variable
		#jsSymbols = {
			global: {
				variables: new Map(),
				functions: new Map(),
				objects: new Map(),
				classes: new Map(),
			},
			scopes: new Map(),
			imports: new Map(),
		}

		#astCache = null
		#lastParsedContent = ''
		#parseTimestamp = 0

		// Type-specific methods
		// prettier-ignore
		#typeSpecificMethods = {
			string: ['charAt', 'charCodeAt', 'concat', 'endsWith', 'includes', 'indexOf', 'lastIndexOf', 'localeCompare', 'match', 'matchAll', 'normalize', 'padEnd', 'padStart', 'repeat', 'replace', 'replaceAll', 'search', 'slice', 'split', 'startsWith', 'substring', 'substr', 'toLowerCase', 'toUpperCase', 'trim', 'trimStart', 'trimEnd', 'length'],
			array: ['at', 'concat', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex', 'flat', 'flatMap', 'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse', 'shift', 'slice', 'some', 'sort', 'splice', 'unshift', 'values', 'length'],
			number: ['toExponential', 'toFixed', 'toLocaleString', 'toPrecision', 'toString', 'valueOf'],
			object: ['hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toString', 'valueOf'],
			date: ['getDate', 'getDay', 'getFullYear', 'getHours', 'getMilliseconds', 'getMinutes', 'getMonth', 'getSeconds', 'getTime', 'setDate', 'setFullYear', 'setHours', 'toDateString', 'toISOString', 'toJSON', 'toString'],
			promise: ['then', 'catch', 'finally'],
			map: ['clear', 'delete', 'entries', 'forEach', 'get', 'has', 'keys', 'set', 'values', 'size'],
			set: ['add', 'clear', 'delete', 'entries', 'forEach', 'has', 'keys', 'values', 'size'],
			regexp: ['exec', 'test', 'toString', 'source', 'global', 'ignoreCase', 'multiline', 'lastIndex'],
		}
		// prettier-ignore
		#jQueryMethods = ['hasClass', 'remove', 'empty', 'clone', 'find', 'children', 'parent', 'parents', 'closest', 'siblings', 'next', 'prev', 'on', 'off', 'one', 'trigger', 'click', 'focus', 'blur', 'change', 'submit', 'show', 'hide', 'toggle', 'fadeIn', 'fadeOut', 'slideDown', 'slideUp', 'animate', 'each', 'map', 'filter', 'width', 'height', 'offset', 'scrollTop', 'scrollLeft']

		// prettier-ignore
		#jsBuiltIns = {
			Array: ['from', 'isArray', 'of'],
			Object: ['assign', 'create', 'keys', 'values', 'entries', 'freeze', 'seal'],
			String: ['fromCharCode', 'fromCodePoint'],
			Number: ['isNaN', 'isFinite', 'isInteger', 'parseFloat', 'parseInt'],
			Math: ['abs', 'ceil', 'floor', 'round', 'max', 'min', 'random', 'sqrt', 'pow'],
			Date: ['now', 'parse', 'UTC'],
			JSON: ['parse', 'stringify'],
			console: ['log', 'warn', 'error', 'info', 'debug', 'table'],
			document: ['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'createElement', 'addEventListener'],
			window: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'alert', 'confirm', 'prompt', 'fetch'],
			Promise: ['all', 'allSettled', 'any', 'race', 'resolve', 'reject'],
			Swiper: ['slideTo', 'slideNext', 'slidePrev', 'update', 'destroy', 'on', 'off'],
		}

		constructor(CodeMirror_Global_Object_input, editor_input, options = {}, debug = false) {
			super(CodeMirror_Global_Object_input, editor_input, options, debug)
			this.#jsBuiltIns = {
				...this.#jsBuiltIns,
				$: this.#jQueryMethods,
				jQuery: this.#jQueryMethods,
			}
			this.Fail_mess = 'Intelligent JS feature failed to install.'
			if (this.CodeMirrorEditor) {
				this.Status = true
				setTimeout(() => this.ScanLocalJS(), 500)
			}
		}

		/**
		 * Resets all scope tracking data structures.
		 * Clears global variables, functions, classes, objects, scopes, and imports.
		 * @private
		 */
		#ResetScope() {
			this.PrintDebugLog('Resetting all scope data')
			this.#jsSymbols.global.variables.clear()
			this.#jsSymbols.global.functions.clear()
			this.#jsSymbols.global.classes.clear()
			this.#jsSymbols.global.objects.clear()
			this.#jsSymbols.scopes.clear()
			this.#jsSymbols.imports.clear()
			this.PrintDebugLog('Scope reset complete')
		}

		/**
		 * Infers the type of a value from its AST initialization node.
		 * @private
		 * @param {Object} initNode - AST node representing the initializer
		 * @returns {string} Inferred type (e.g., 'string', 'array', 'object', 'function')
		 */
		#InferTypeFromInit(initNode) {
			if (!initNode) {
				this.PrintDebugLog('No init node provided, returning unknown')
				return 'unknown'
			}

			this.PrintDebugLog('Inferring type from node type:', initNode.type)

			switch (initNode.type) {
				case 'Literal':
					if (initNode.value === null) return 'null'
					if (typeof initNode.value === 'string') return 'string'
					if (typeof initNode.value === 'number') return 'number'
					if (typeof initNode.value === 'boolean') return 'boolean'
					if (initNode.regex) return 'regexp'
					return 'unknown'
				case 'ArrayExpression':
					return 'array'
				case 'ObjectExpression':
					return 'object'
				case 'ArrowFunctionExpression':
				case 'FunctionExpression':
					return 'function'
				case 'NewExpression':
					if (initNode.callee && initNode.callee.name) {
						const name = initNode.callee.name.toLowerCase()
						if (name === 'array') return 'array'
						if (name === 'object') return 'object'
						if (name === 'date') return 'date'
						if (name === 'regexp') return 'regexp'
						if (name === 'map') return 'map'
						if (name === 'set') return 'set'
						if (name === 'promise') return 'promise'
						return name
					}
					return 'object'
				case 'CallExpression':
					if (initNode.callee) {
						const callee = this.#GetCalleeString(initNode.callee)
						if (callee.includes('Promise')) return 'promise'
						if (callee.includes('Array')) return 'array'
						if (callee === '$' || callee === 'jQuery') return 'jquery'
					}
					return 'unknown'
				case 'TemplateLiteral':
					return 'string'
				default:
					return 'unknown'
			}
		}

		/**
		 * Extracts the full callee string from a CallExpression node.
		 * Handles both Identifier and MemberExpression nodes.
		 * @private
		 * @param {Object} calleeNode - AST callee node
		 * @returns {string} Full callee string (e.g., 'obj.method')
		 */
		#GetCalleeString(calleeNode) {
			if (!calleeNode) return ''
			if (calleeNode.type === 'Identifier') return calleeNode.name
			if (calleeNode.type === 'MemberExpression') {
				const obj = this.#GetCalleeString(calleeNode.object)
				const prop = calleeNode.property.name || ''
				return obj + '.' + prop
			}
			return ''
		}

		/**
		 * Extracts properties from an ObjectExpression AST node.
		 * Identifies methods vs properties and infers their types.
		 * @private
		 * @param {Object} node - AST ObjectExpression node
		 * @returns {Map} Map of property names to their info objects
		 */
		#ExtractObjectProperties(node) {
			this.PrintDebugLog('Extracting object properties')
			const props = new Map()
			if (!node || node.type !== 'ObjectExpression') return props

			node.properties.forEach((prop) => {
				if (!prop.key) return
				const key = prop.key.name || prop.key.value
				if (!key) return

				let valueInfo = {
					type: 'property',
					inferredType: 'unknown',
				}

				if (prop.value) {
					if (prop.value.type === 'FunctionExpression' || prop.value.type === 'ArrowFunctionExpression') {
						valueInfo.type = 'method'
						valueInfo.inferredType = 'function'
					} else if (prop.value.type === 'Literal') {
						valueInfo.inferredType = typeof prop.value.value
					} else if (prop.value.type === 'ObjectExpression') {
						valueInfo.inferredType = 'object'
					} else if (prop.value.type === 'ArrayExpression') {
						valueInfo.inferredType = 'array'
					} else {
						valueInfo.inferredType = this.#InferTypeFromInit(prop.value)
					}
				}

				props.set(key, valueInfo)
				this.PrintDebugLog('Extracted property:', key, 'type:', valueInfo.inferredType)
			})

			this.PrintDebugLog('Total properties extracted:', props.size)
			return props
		}

		/**
		 * Parses JavaScript content using Acorn parser.
		 * Handles Liquid/Twig template syntax by replacing with valid JS placeholders.
		 * @private
		 * @param {string} content - JavaScript content to parse
		 * @returns {Object|null} AST tree or null if parsing fails
		 */
		#ParseJSWithAcorn(content) {
			this.PrintDebugLog('Starting JS parse with content length:', content.length)
			try {
				// Pre-process Liquid/Twig syntax before parsing
				let cleanContent = content

				// Process {% if ... %} blocks - replace with valid JS equivalents
				cleanContent = cleanContent.replace(/\{%\s*if\s+[^%]+%\}/g, (match) => {
					return '/* LIQUID_IF */ if (true) {' // Maintain block structure
				})

				cleanContent = cleanContent.replace(/\{%\s*elsif\s+[^%]+%\}/g, (match) => {
					return '} /* LIQUID_ELSIF */ else if (true) {'
				})

				cleanContent = cleanContent.replace(/\{%\s*else\s*%\}/g, (match) => {
					return '} /* LIQUID_ELSE */ else {'
				})

				cleanContent = cleanContent.replace(/\{%\s*endif\s*%\}/g, (match) => {
					return '} /* LIQUID_ENDIF */'
				})

				// Process {% for ... %} loops
				cleanContent = cleanContent.replace(/\{%\s*for\s+[^%]+%\}/g, (match) => {
					return '/* LIQUID_FOR */ for (let i = 0; i < 1; i++) {'
				})

				cleanContent = cleanContent.replace(/\{%\s*endfor\s*%\}/g, (match) => {
					return '} /* LIQUID_ENDFOR */'
				})

				// Process other Liquid tags (assign, capture, etc.)
				cleanContent = cleanContent.replace(/\{%\s*assign\s+([a-zA-Z_$][\w$]*)\s*=\s*[^%]+%\}/g, (match, varName) => {
					return `/* LIQUID_ASSIGN */ var ${varName} = null;`
				})

				// Process {{ ... }} - output variables (replace with string literal to preserve position)
				cleanContent = cleanContent.replace(/\{\{[^}]+\}\}/g, (match) => {
					return '""/* LIQUID_OUTPUT */'
				})

				// Process remaining tags (include, render, etc.)
				cleanContent = cleanContent.replace(/\{%[^%]*%\}/g, (match) => {
					return `/* LIQUID_TAG: ${match.slice(0, 20)}... */`
				})

				this.PrintDebugLog('[JS Parse] Liquid syntax cleaned, parsing AST...')

				const ast = acorn.parse(cleanContent, {
					ecmaVersion: 2022,
					sourceType: 'module',
					locations: true,
					allowReturnOutsideFunction: true,
					allowImportExportEverywhere: true,
					allowHashBang: true,
				})
				this.#astCache = ast
				this.#lastParsedContent = content

				this.PrintDebugLog('[JS Parse] AST parsed successfully, nodes:', ast.body?.length || 0)

				return ast
			} catch (e) {
				this.PrintDebugLog('[JS Parse] Error:', e.message)
				this.PrintDebugLog('[JS Parse] Error position:', e.pos)
				this.PrintDebugLog('[JS Parse] Error location:', e.loc)

				if (e.loc) {
					const lines = content.split('\n')
					const errorLine = e.loc.line - 1
					const contextStart = Math.max(0, errorLine - 2)
					const contextEnd = Math.min(lines.length, errorLine + 3)

					this.PrintDebugLog('[JS Parse] Code context around error:')
					for (let i = contextStart; i < contextEnd; i++) {
						const marker = i === errorLine ? '>>> ' : '    '
						this.PrintDebugLog(`${marker}${i + 1}: ${lines[i]}`)
					}
				}

				return null
			}
		}

		#ExtractSymbolsFromAST(ast) {
			const self = this
			let scopeCounter = 0

			const createScopeId = () => `scope_${scopeCounter++}`
			const getCurrentScope = (ancestors) => {
				for (let i = ancestors.length - 1; i >= 0; i--) {
					if (ancestors[i]._scopeId) return ancestors[i]._scopeId
				}
				return 'global'
			}

			acorn.walk.ancestor(ast, {
				ImportDeclaration(node) {
					node.specifiers.forEach((spec) => {
						const name = spec.local.name
						const from = node.source.value
						self.#jsSymbols.imports.set(name, { from, type: spec.type })
						self.#jsSymbols.global.variables.set(name, {
							type: 'import',
							line: node.loc.start.line,
							inferredType: 'module',
						})
					})
				},

				VariableDeclaration(node, ancestors) {
					const scope = getCurrentScope(ancestors)

					node.declarations.forEach((declarator) => {
						if (declarator.id.type === 'Identifier') {
							const varName = declarator.id.name
							const inferredType = self.#InferTypeFromInit(declarator.init)

							const info = {
								type: node.kind,
								line: node.loc.start.line,
								inferredType: inferredType,
							}

							if (declarator.init) {
								if (declarator.init.type === 'ObjectExpression') {
									const props = self.#ExtractObjectProperties(declarator.init)
									self.#jsSymbols.global.objects.set(varName, props)
								} else if (declarator.init.type === 'FunctionExpression' || declarator.init.type === 'ArrowFunctionExpression') {
									const params = declarator.init.params.map((p) => (p.type === 'Identifier' ? p.name : '...'))
									self.#jsSymbols.global.functions.set(varName, {
										params,
										line: node.loc.start.line,
										isAsync: declarator.init.async || false,
									})
								} else if (declarator.init.type === 'NewExpression' && declarator.init.callee) {
									const className = declarator.init.callee.name
									if (self.#jsBuiltIns[className]) {
										const methods = new Map()
										self.#jsBuiltIns[className].forEach((method) => {
											methods.set(method, { type: 'method', inferredType: 'function' })
										})
										self.#jsSymbols.global.objects.set(varName, methods)
									}
								}
							}

							if (scope === 'global') {
								self.#jsSymbols.global.variables.set(varName, info)
							} else {
								if (!self.#jsSymbols.scopes.has(scope)) {
									self.#jsSymbols.scopes.set(scope, {
										parent: 'global',
										variables: new Map(),
										functions: new Map(),
									})
								}
								self.#jsSymbols.scopes.get(scope).variables.set(varName, info)
							}
						}
					})
				},

				FunctionDeclaration(node) {
					const funcName = node.id ? node.id.name : null
					if (funcName) {
						const params = node.params.map((p) => (p.type === 'Identifier' ? p.name : '?'))

						self.#jsSymbols.global.functions.set(funcName, {
							params,
							line: node.loc.start.line,
							isAsync: node.async || false,
						})

						const scopeId = createScopeId()
						node._scopeId = scopeId
						self.#jsSymbols.scopes.set(scopeId, {
							parent: 'global',
							name: funcName,
							variables: new Map(),
							functions: new Map(),
						})

						params.forEach((p) => {
							self.#jsSymbols.scopes.get(scopeId).variables.set(p, {
								type: 'param',
								line: node.loc.start.line,
							})
						})
					}
				},

				ClassDeclaration(node) {
					if (node.id) {
						const className = node.id.name
						const methods = new Set()
						const properties = new Set()

						node.body.body.forEach((method) => {
							if (method.key && method.key.type === 'Identifier') {
								const name = method.key.name
								if (method.kind === 'method' || method.kind === 'constructor') {
									methods.add(name)
								} else {
									properties.add(name)
								}
							}
						})

						self.#jsSymbols.global.classes.set(className, { methods, properties })

						const combined = new Map()
						methods.forEach((m) => combined.set(m, { type: 'method', inferredType: 'function' }))
						properties.forEach((p) => combined.set(p, { type: 'property', inferredType: 'unknown' }))
						self.#jsSymbols.global.objects.set(className, combined)
					}
				},

				AssignmentExpression(node) {
					if (node.left.type === 'MemberExpression' && node.left.object.type === 'Identifier' && node.left.property.type === 'Identifier') {
						const objName = node.left.object.name
						const propName = node.left.property.name

						if (!self.#jsSymbols.global.objects.has(objName)) {
							self.#jsSymbols.global.objects.set(objName, new Map())
						}

						const inferredType = self.#InferTypeFromInit(node.right)
						self.#jsSymbols.global.objects.get(objName).set(propName, {
							type: 'property',
							inferredType: inferredType,
						})
					}
				},
			})
		}

		/**
		 * Fallback regex-based scanner for when Acorn parsing fails.
		 * Extracts variables using regex patterns on cleaned content.
		 * @private
		 * @param {string} content - JavaScript content to scan
		 */
		#FallbackRegexScan(content) {
			this.PrintDebugLog('Using fallback regex scan for content length:', content.length)
			// Remove Liquid/template syntax for cleaner parsing
			const clean = content.replace(/\{%[\s\S]*?%\}/g, ' ').replace(/\{\{[\s\S]*?}\}/g, ' ')

			const lines = clean.split('\n')

			lines.forEach((line, lineNum) => {
				const varMatches = line.matchAll(/(?:let|const|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(.+?)(?:;|$)/g)
				for (const match of varMatches) {
					const name = match[1]
					const value = match[2].trim()

					let inferredType = 'unknown'
					if (value.startsWith('[')) inferredType = 'array'
					else if (value.startsWith('{')) inferredType = 'object'
					else if (value.startsWith("'") || value.startsWith('"')) inferredType = 'string'
					else if (/^\d+/.test(value)) inferredType = 'number'
					else if (value === 'true' || value === 'false') inferredType = 'boolean'

					this.#jsSymbols.global.variables.set(name, {
						type: 'variable',
						line: lineNum + 1,
						inferredType: inferredType,
					})
					this.PrintDebugLog('Regex found variable:', name, 'type:', inferredType)
				}
			})

			// Add built-in objects to symbol table
			Object.keys(this.#jsBuiltIns).forEach((name) => {
				this.#jsSymbols.global.variables.set(name, { type: 'builtin', line: 0 })
			})
			this.PrintDebugLog('Fallback scan complete, variables:', this.#jsSymbols.global.variables.size)
		}

		/**
		 * Scans the current JavaScript file and extracts symbols.
		 * Uses Acorn parser if possible, falls back to regex scanning.
		 * @returns {null} Returns null if status check fails
		 */
		ScanLocalJS() {
			this.PrintDebugLog('=== Scanning Local JS ===')
			if (!this.CheckIntelligentStatus()) {
				this.PrintDebugLog('Status check failed, cannot scan')
				return null
			}

			const content = this.CodeMirrorEditor.getValue()
			this.PrintDebugLog('Content length:', content.length)

			// Skip if content unchanged and cache exists
			if (content === this.#lastParsedContent && this.#astCache) {
				this.PrintDebugLog('Content unchanged, using cached AST')
				return
			}

			this.#ResetScope()

			const ast = this.#ParseJSWithAcorn(content)
			if (ast) {
				this.#ExtractSymbolsFromAST(ast)
				// Log extraction results for debugging
				this.PrintDebugLog('[JS Symbols] Variables:', this.#jsSymbols.global.variables.size)
				this.PrintDebugLog('[JS Symbols] Functions:', this.#jsSymbols.global.functions.size)
				this.PrintDebugLog('[JS Symbols] Objects:', this.#jsSymbols.global.objects.size)
				this.PrintDebugLog('[JS Symbols] Classes:', this.#jsSymbols.global.classes.size)
			} else {
				this.PrintDebugLog('AST parse failed, using fallback regex scan')
				this.#FallbackRegexScan(content)
			}
		}

		/**
		 * Provides JavaScript hints based on current cursor context.
		 * Handles object property access, jQuery methods, and normal identifiers.
		 * @returns {Object|null} Hint object for CodeMirror or null if no hints available
		 */
		getJsHints() {
			this.PrintDebugLog('=== Getting JS Hints ===')
			if (!this.CheckIntelligentStatus()) return null
			const cursor = this.CodeMirrorEditor.getCursor()
			const token = this.CodeMirrorEditor.getTokenAt(cursor)
			const line = this.CodeMirrorEditor.getLine(cursor.line)
			const textBefore = line.slice(0, cursor.ch)
			let hints = []
			let start = token.start
			let word = token.string || ''

			// CASE 1: Object property access - supports "obj." (nothing typed after dot)
			const objMatch = textBefore.match(/([a-zA-Z_$][\w$]*)\.([a-zA-Z_$][\w$]*)?\s*$/)
			if (objMatch) {
				const objName = objMatch[1]
				const partialProp = objMatch[2] || '' // Allow empty (just typed dot)
				start = cursor.ch - partialProp.length

				this.PrintDebugLog('[JS Hints] Object access detected:', objName, 'partial:', partialProp)

				// User-defined objects
				if (this.#jsSymbols.global.objects.has(objName)) {
					const props = this.#jsSymbols.global.objects.get(objName)
					this.PrintDebugLog('[JS Hints] Found user object:', objName, 'props:', props)
					props.forEach((propInfo, name) => {
						if (name.toLowerCase().startsWith(partialProp.toLowerCase())) {
							hints.push({
								text: name,
								displayText: propInfo.type === 'method' ? `${name}()` : name,
								className: 'CodeMirror-hint-property',
							})
						}
					})
				}

				// Type-specific methods - Check if variable has inferred type
				if (this.#jsSymbols.global.variables.has(objName)) {
					const varInfo = this.#jsSymbols.global.variables.get(objName)
					const inferredType = varInfo.inferredType
					this.PrintDebugLog('[JS Hints] Variable type:', objName, '=', inferredType)

					if (this.#typeSpecificMethods[inferredType]) {
						this.#typeSpecificMethods[inferredType].forEach((method) => {
							if (method.toLowerCase().startsWith(partialProp.toLowerCase())) {
								hints.push({
									text: method,
									displayText: method,
									className: 'CodeMirror-hint-builtin',
								})
							}
						})
						this.PrintDebugLog('[JS Hints] Added type-specific methods for:', inferredType)
					}
				}

				// Built-in objects
				if (this.#jsBuiltIns[objName]) {
					this.PrintDebugLog('[JS Hints] Found built-in:', objName)
					this.#jsBuiltIns[objName].forEach((prop) => {
						if (prop.toLowerCase().startsWith(partialProp.toLowerCase())) {
							hints.push({
								text: prop,
								displayText: prop,
								className: 'CodeMirror-hint-builtin',
							})
						}
					})
				}

				// Remove duplicates
				const seen = new Set()
				hints = hints.filter((h) => {
					if (seen.has(h.text)) return false
					seen.add(h.text)
					return true
				})

				this.PrintDebugLog('[JS Hints] Total hints found:', hints.length)

				if (hints.length > 0) {
					return {
						list: hints.slice(0, 50),
						from: this.CodeMirror_Global_Object.Pos(cursor.line, start),
						to: this.CodeMirror_Global_Object.Pos(cursor.line, cursor.ch),
					}
				}
			}

			// CASE 2: jQuery - Same pattern as object access
			const jqMatch = textBefore.match(/(?:\$\([^)]*\)|\$)\.([a-zA-Z_$][\w$]*)?\s*$/)
			if (jqMatch) {
				const partialMethod = jqMatch[1] || '' // Allow empty (just typed dot)
				start = cursor.ch - partialMethod.length
				hints = this.#jQueryMethods
					.filter((m) => m.toLowerCase().startsWith(partialMethod.toLowerCase()))
					.map((m) => ({
						text: m,
						displayText: `${m}()`,
						className: 'CodeMirror-hint-builtin',
					}))
				if (hints.length > 0) {
					return {
						list: hints.slice(0, 30),
						from: this.CodeMirror_Global_Object.Pos(cursor.line, start),
						to: this.CodeMirror_Global_Object.Pos(cursor.line, cursor.ch),
					}
				}
			}

			// CASE 3: Normal identifier (unchanged logic)
			if (/^[a-zA-Z_$][\w$]*$/.test(word) || word === '') {
				const allHints = new Map()
				this.#jsSymbols.global.variables.forEach((info, name) => {
					if (name.toLowerCase().startsWith(word.toLowerCase())) {
						allHints.set(name, {
							text: name,
							displayText: name,
							className: 'CodeMirror-hint-global',
							priority: 2,
						})
					}
				})
				this.#jsSymbols.global.functions.forEach((info, name) => {
					if (name.toLowerCase().startsWith(word.toLowerCase())) {
						allHints.set(name, {
							text: name,
							displayText: `${name}(${info.params.join(', ')})`,
							className: 'CodeMirror-hint-global',
							priority: 2,
						})
					}
				})
				Object.keys(this.#jsBuiltIns).forEach((name) => {
					if (name.toLowerCase().startsWith(word.toLowerCase())) {
						if (!allHints.has(name)) {
							allHints.set(name, {
								text: name,
								displayText: name,
								className: 'CodeMirror-hint-builtin',
								priority: 3,
							})
						}
					}
				})
				hints = Array.from(allHints.values())
					.sort((a, b) => {
						if (a.priority !== b.priority) return a.priority - b.priority
						return a.text.localeCompare(b.text)
					})
					.slice(0, 50)
				if (hints.length > 0) {
					return {
						list: hints,
						from: this.CodeMirror_Global_Object.Pos(cursor.line, token.start),
						to: this.CodeMirror_Global_Object.Pos(cursor.line, token.end),
					}
				}
			}

			return null
		}

		checkFileTypeOrBlockIsJSContext() {
			if (!this.CheckIntelligentStatus()) return false

			this.CurrentFileType = this.GetCurrentFileType()
			if (this.CurrentFileType === 'javascript' || this.CurrentFileType === 'js') return true

			const cursor = this.CodeMirrorEditor.getCursor()
			const token = this.CodeMirrorEditor.getTokenAt(cursor)

			const isInScript = token.type && (token.type.includes('javascript') || token.type.includes('js') || (token.state.localState && token.state.localState.mode && token.state.localState.mode.name === 'javascript'))

			if (!isInScript) {
				let state = token.state
				while (state) {
					if (state.tagName === 'script' && !state.scriptType) {
						return true
					}
					state = state.htmlState || state.localState || null
				}
			}

			return isInScript || false
		}
	}
	// #endregion IntelligentJS

	// #region ==================== MODULE 6: SapoWebIntelligent ====================
	/* ========================== Main Inteligent ==============================*/
	/**
	 * SapoWebIntelligent - Main orchestrator class for Sapo theme editor IntelliSense
	 * Coordinates CSS, JS hints and CodeMirror integration
	 * @extends BaseIntelligent
	 */
	class SapoWebIntelligent extends BaseIntelligent {
		#FileTabListClass = '.theme-editor-tabs'

		/** @type {IntelligentCSS} CSS IntelliSense handler */
		IntelligentCSS = null
		/** @type {IntelligentJS} JS IntelliSense handler */
		IntelligentJS = null
		/** @type {IntelligentHTML} HTML IntelliSense handler */
		IntelligentHTML = null

		/**
		 * Initializes SapoWebIntelligent with CSS and JS handlers
		 * @param {Object} CodeMirror_Global_Object_input - Global CodeMirror object
		 * @param {Object} CodeMirror - CodeMirror editor instance
		 * @param {Object} options - Configuration options
		 * @param {string} options.site_name - Site name identifier
		 * @param {boolean} debug - Enable debug mode
		 */
		constructor(CodeMirror_Global_Object_input, CodeMirror, options = {}, debug = false) {
			super(CodeMirror_Global_Object_input, CodeMirror, options, debug)
			this.Debug = debug
			this.Site_name = options.site_name || 'unknown'
			if (CodeMirror) {
				this.CodeMirrorEditor = CodeMirror
				this.Status = true
				this.PrintDebugLog('CodeMirror_Global_Object', this.CodeMirror_Global_Object, 'CodeMirror', CodeMirror)
				this.IntelligentCSS = new IntelligentCSS(this.CodeMirror_Global_Object, this.CodeMirrorEditor, { site_name: this.Site_name }, this.Debug)
				this.IntelligentJS = new IntelligentJS(this.CodeMirror_Global_Object, this.CodeMirrorEditor, {}, this.Debug)
				this.IntelligentHTML = new IntelligentHTML(this.CodeMirror_Global_Object, this.CodeMirrorEditor, {}, this.Debug)
				this.#ApplyConfigToCodeMirror()
			}
		}

		#ScanLocalVariableToCache() {
			if (!this.Status) return
			this.CurrentFileType = this.GetCurrentFileType()
			if (this.CurrentFileType === 'css' || this.CurrentFileType === 'scss') {
				this.IntelligentCSS.ScanLocalCSS()
				this.PrintDebugLog('Scanning CSS classes on current file...')
			}
			if (this.CurrentFileType === 'javascript' || this.CurrentFileType === 'js') {
				this.IntelligentJS.ScanLocalJS()
				this.PrintDebugLog('Scanning JS on current file...')
			}
		}

		/**
		 * Determines the appropriate hint function based on current editor context.
		 * Priority order: HTML class attribute > JS context > CSS context > HTML > fallback
		 * @private
		 * @returns {Object} Object containing hint function
		 */
		#GetTypeHintsIntelliSense() {
			const cm = this.CodeMirrorEditor
			const cursor = cm.getCursor()
			const token = cm.getTokenAt(cursor)
			const line = cm.getLine(cursor.line)
			const beforeCursor = line.slice(0, cursor.ch)
			const inner = this.CodeMirror_Global_Object.innerMode(cm.getMode(), token.state)

			try {
				// 1. HTML CLASS ATTRIBUTE (highest priority)
				// Detect when inside class="" or class=''
				const inClassAttr = /class\s*=\s*["'][^"']*$/.test(beforeCursor) || (token.type === 'string' && /class\s*=\s*["']/.test(beforeCursor))

				if (inClassAttr) {
					this.PrintDebugLog('Detected CLASS attribute context')
					const htmlClassHints = this.IntelligentCSS.GetClassHintsForHTML()
					if (htmlClassHints && htmlClassHints.list?.length) {
						return { hints: () => htmlClassHints }
					}
				}

				// 2. JS CONTEXT
				if (this.IntelligentJS.checkFileTypeOrBlockIsJSContext()) {
					const jsHints = this.IntelligentJS.getJsHints()
					if (jsHints && jsHints.list?.length) {
						return { hints: () => jsHints }
					}
					return { hints: this.CodeMirror_Global_Object.hint.javascript }
				}

				// 3. CSS CONTEXT
				if (this.IntelligentCSS.checkFileTypeOrBlockIsCSSContext()) {
					return { hints: this.IntelligentCSS.GetCssScssHints.bind(this.IntelligentCSS) }
				}

				// 4. HTML CONTEXT
				if (inner.mode.name === 'xml' || inner.mode.name === 'htmlmixed') {
					this.PrintDebugLog('In HTML mode, checking for tag/word context')

					// 4a. Check if typing a new HTML tag (after < or start of word)
					const htmlTagHints = this.IntelligentHTML.GetHtmlTagHints()
					if (htmlTagHints && htmlTagHints.list?.length) {
						this.PrintDebugLog('HTML tag/word context detected, using auto-expansion hints')
						return { hints: () => htmlTagHints }
					}

					// 4b. Fallback to standard HTML hints (for attributes, etc.)
					this.PrintDebugLog('Using standard HTML hints')
					return { hints: this.CodeMirror_Global_Object.hint.html }
				}

				// 5. Fallback
				return { hints: this.CodeMirror_Global_Object.hint.anyword }
			} catch (e) {
				console.error('GetTypeHintsIntelliSense error:', e)
				return { hints: this.CodeMirror_Global_Object.hint.anyword }
			}
		}

		/**
		 * Updates hints function and displays hints popup.
		 * Validates hint results before showing and falls back to anyword if needed.
		 * @private
		 */
		#UpdateCurrentCodeMirrorHintsThenShowHints() {
			const hintsData = this.#GetTypeHintsIntelliSense()
			const cm = this.CodeMirrorEditor

			const options = {
				completeSingle: false,
				closeCharacters: /[\s()\[\]{};:>,]/,
				alignWithWord: true,
			}

			try {
				this.PrintDebugLog('Showing hints with:', hintsData.hints)

				// Call hint function to check result first
				if (typeof hintsData.hints === 'function') {
					const hintFunc = hintsData.hints

					// Try getting hint results
					let result
					try {
						result = hintFunc(cm, options)
					} catch (e) {
						console.error('Hint function error:', e)
						result = null
					}

					this.PrintDebugLog('Hint result:', result)

					// Check result
					if (result && result.list && result.list.length > 0) {
						this.PrintDebugLog('Found', result.list.length, 'hints, showing...')
						this.CodeMirror_Global_Object.showHint(cm, hintFunc, options)
					} else {
						this.PrintDebugLog('No hints found, result:', result)

						// If HTML hint has no results, try anyword fallback
						if (hintFunc === this.CodeMirror_Global_Object.hint.html || hintFunc === this.CodeMirror_Global_Object.hint.xml) {
							this.PrintDebugLog('Trying anyword fallback...')
							this.CodeMirror_Global_Object.showHint(cm, this.CodeMirror_Global_Object.hint.anyword, options)
						}
					}
				} else {
					console.warn('hints is not a function:', typeof hintsData.hints)
					this.CodeMirror_Global_Object.showHint(cm, this.CodeMirror_Global_Object.hint.anyword, options)
				}
			} catch (e) {
				console.error('showHint failed:', e)
				console.warn('Fallback to anyword')
				this.CodeMirror_Global_Object.showHint(cm, this.CodeMirror_Global_Object.hint.anyword, options)
			}
		}

		#ApplyConfigToCodeMirror() {
			this.#UpdateExtraKey()
			this.#OnInputRead()
			this.#OnCursorActivity()
			this.#OnBlur()
			this.#OnFocus()
			this.#OnChangeFile()
			this.PrintDebugLog('Applied all configurations to CodeMirror editor')
		}

		#UpdateExtraKey() {
			// Update extraKeys
			const existingKeys = this.CodeMirrorEditor.getOption('extraKeys') || {}
			const newKeys = {
				...existingKeys,
				'Ctrl-Space': () => {
					this.#UpdateCurrentCodeMirrorHintsThenShowHints()
				},
			}
			this.CodeMirrorEditor.setOption('extraKeys', newKeys)
			this.PrintDebugLog("Updated CodeMirror extraKeys for 'Ctrl-Space'")
		}
		/**
		 * Sets up file change observer to trigger rescanning when switching files.
		 * Watches for tab class changes in the theme editor.
		 * @private
		 */
		#OnChangeFile() {
			// Observe CodeMirror tab container for file changes
			const observer = new MutationObserver((mutations) => {
				if (mutations.length == 0) return
				this.#ScanLocalVariableToCache()
			})
			this.OnElementFound(this.#FileTabListClass, (tabList_el) => {
				observer.observe(tabList_el, {
					attributes: true, // Watch for attribute changes
					attributeFilter: ['class'], // Only watch class attribute
					childList: false,
					subtree: true,
				})
			})
			this.PrintDebugLog('Started observing CodeMirror code changes for file type detection')
		}
		/**
		 * Sets up inputRead handler for automatic hint triggering.
		 * Triggers hints on various input characters with configurable delays.
		 * @private
		 */
		#OnInputRead() {
			this.CodeMirrorEditor.on('inputRead', (editor, change) => {
				this.PrintDebugLog('InputRead triggered:', change.text[0], 'origin:', change.origin)

				// Detect HTML tag opening with '<'
				if (change.origin === '+input' && change.text[0] === '<') {
					this.PrintDebugLog('< detected, showing hints in 50ms')
					setTimeout(() => {
						this.PrintDebugLog('Executing showHint after < detection')
						this.#UpdateCurrentCodeMirrorHintsThenShowHints()
					}, 50)
					return
				}

				// Detect class attribute opening with '=' after 'class'
				const cursor = editor.getCursor()
				const line = editor.getLine(cursor.line)
				const beforeCursor = line.slice(0, cursor.ch)

				// Detect: class="" or class=''
				if (change.text[0] === '"' || change.text[0] === "'") {
					if (/class\s*=\s*$/.test(beforeCursor.slice(0, -1))) {
						this.PrintDebugLog('class=" detected, showing hints')
						setTimeout(() => {
							this.#UpdateCurrentCodeMirrorHintsThenShowHints()
						}, 50)
						return
					}
				}

				// Extended trigger characters: space, quotes, etc.
				const validTrigger = /[a-zA-Z0-9_\.\-\$#@\s"'=]/
				if (change.origin === '+input' && change.text[0] && validTrigger.test(change.text[0])) {
					const char = change.text[0]
					const delay = char === '.' || char === '$' || char === '@' || char === '"' || char === "'" || char === '=' || char === '<' ? 10 : 20

					this.PrintDebugLog('Valid trigger char:', char, 'delay:', delay)
					setTimeout(() => {
						this.#UpdateCurrentCodeMirrorHintsThenShowHints()
					}, delay)
				}
			})
			this.PrintDebugLog('Set up inputRead handler for IntelliSense triggering')
		}

		#OnCursorActivity() {
			this.CodeMirrorEditor._wasInJsBlock = false
			this.CodeMirrorEditor._wasInCssBlock = false
			const self = this
			this.CodeMirrorEditor.on('cursorActivity', function OnCursorActivityHandler(instance) {
				// Scan when in JS block
				const inJS = self.IntelligentJS.checkFileTypeOrBlockIsJSContext()
				instance._wasInJsBlock = inJS

				// Scan when in CSS block
				const inCSS = self.IntelligentCSS.checkFileTypeOrBlockIsCSSContext()
				instance._wasInCssBlock = inCSS

				self.PrintDebugLog('CursorActivity - In JS Block:', inJS)
				self.PrintDebugLog('CursorActivity - In CSS Block:', inCSS)
			})
			this.PrintDebugLog('Set up cursorActivity handler for context-aware scanning')
		}

		#OnBlur() {
			// Update: Local Variable/Class on leave file
			const self2 = this
			this.CodeMirrorEditor.on('blur', function OnBlurHandler() {
				if (self2.CurrentFileType === 'css' || self2.CurrentFileType === 'scss') {
					// only apply with CSS/SCSS files
					self2.IntelligentCSS.ScanLocalCSS()
					self2.PrintDebugLog('Scanning CSS classes on leave file...')
				}
			})
			this.PrintDebugLog('Set up blur handler for full scan on editor blur')
		}

		#OnFocus() {
			this.CodeMirrorEditor.on('focus', () => {
				if (this.IntelligentJS.checkFileTypeOrBlockIsJSContext()) {
					this.#ScanLocalVariableToCache()
				}
			})
		}
	}
	// #endregion SapoWebIntelligent

	// #region ==================== MODULE 7: Initializer ====================
	/**
	 * Entry point - Initializes IntelliSense when CodeMirror element is found
	 */
	const SITE_NAME = window.location.host
	if (!window.__loaded) {
		window.__loaded = true
		onElementFound('.CodeMirror', function (CodeMirrorEl) {
			// console.log('CodeMirrorEl loaded', CodeMirrorEl)
			new SapoWebIntelligent(CodeMirror, CodeMirrorEl.CodeMirror, { site_name: SITE_NAME }, false)
		})
	}
	// #endregion Initializer
})()
