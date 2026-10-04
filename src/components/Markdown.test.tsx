import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MarkdownRenderer from './MarkdownRenderer'

describe('Markdown rendering', () => {
  it('sanitises raw HTML and unsafe links while retaining safe markup', () => {
    const { container } = render(
      <MarkdownRenderer content={'<img src=x onerror="alert(1)"><script>alert(1)</script>\n\n[unsafe](javascript:alert(1)) and [safe](https://example.com)'} />,
    )

    expect(container.querySelector('img, script')).toBeNull()
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(container.querySelector('a[href="https://example.com"]')?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders display math and fenced code', async () => {
    const { container } = render(<MarkdownRenderer content={'$$\nE = mc^2\n$$\n\n```ts\nconst answer = 42\n```'} />)
    await waitFor(() => expect(container.querySelector('.katex-display')).not.toBeNull(), { timeout: 5000 })
    expect(container.querySelector('code.language-ts')).not.toBeNull()
    expect(container.querySelector('[aria-label="Copy code block"]')).not.toBeNull()
  })
})
