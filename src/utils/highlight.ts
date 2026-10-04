import { createLowlight } from 'lowlight'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import latex from 'highlight.js/lib/languages/latex'
import python from 'highlight.js/lib/languages/python'
import r from 'highlight.js/lib/languages/r'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import type { Element, Root } from 'hast'

const highlighter = createLowlight({ bash, c, cpp, javascript, json, latex, python, r, rust, sql, typescript, xml, yaml })

export function rehypeKalamHighlight() {
  return (tree: Root) => highlightBlocks(tree)
}

function highlightBlocks(parent: Root | Element) {
  for (const node of parent.children) {
    if (node.type !== 'element') continue
    if (node.tagName === 'pre') {
      const code = node.children.find((child): child is Element => child.type === 'element' && child.tagName === 'code')
      const classNames = Array.isArray(code?.properties.className) ? code.properties.className.map(String) : []
      const language = classNames.find((name) => name.startsWith('language-'))?.slice('language-'.length)
      if (code && language && !['plain', 'plaintext', 'text', 'txt'].includes(language)) {
        try {
          code.children = highlighter.highlight(language, textContent(code)).children as Element['children']
          code.properties.className = [...classNames, 'hljs']
        } catch {
          // Unknown language labels remain visible, and the code stays readable as plain text.
        }
      }
    }
    highlightBlocks(node)
  }
}

function textContent(node: Element): string {
  return node.children.map((child) => child.type === 'text' ? child.value : child.type === 'element' ? textContent(child) : '').join('')
}
