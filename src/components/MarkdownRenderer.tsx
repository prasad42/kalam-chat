import { useEffect, useState, type HTMLAttributes } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { Element } from 'hast'
import type { PluggableList } from 'unified'
import { Check, Copy } from 'lucide-react'

const safeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-/]],
  },
}

function CodeBlock({ node, children, ...props }: HTMLAttributes<HTMLPreElement> & { node?: Element }) {
  const child = node?.children.find((element) => element.type === 'element' && element.tagName === 'code')
  const language = child?.type === 'element'
    ? child.properties.className?.toString().split(' ').find((name) => name.startsWith('language-'))?.replace('language-', '')
    : undefined
  const code = extractText(children)

  const [copied, setCopied] = useState(false)
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span>{language || 'code'}</span>
        <button className="code-copy" type="button" onClick={copyCode} aria-label="Copy code block">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre {...props}>{children}</pre>
    </div>
  )
}

function extractText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(extractText).join('')
  if (value && typeof value === 'object' && 'props' in value) {
    return extractText((value as { props?: { children?: unknown } }).props?.children)
  }
  return ''
}

const components: Components = {
  pre: ({ node, children, ...props }) => <CodeBlock node={node as Element | undefined} {...props}>{children}</CodeBlock>,
  a: ({ node: _node, href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
}

export default function MarkdownRenderer({ content }: { content: string }) {
  const [enhancements, setEnhancements] = useState<PluggableList>([])

  useEffect(() => {
    let alive = true
    void Promise.all([import('../utils/highlight'), import('rehype-katex')]).then(([highlight, katex]) => {
      if (alive) setEnhancements([highlight.rehypeKalamHighlight, katex.default])
    }).catch(() => undefined)
    return () => { alive = false }
  }, [])

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeSanitize, safeSchema], ...enhancements]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
