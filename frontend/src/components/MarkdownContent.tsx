import { marked } from "marked";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

const renderer = new marked.Renderer();

renderer.html = () => "";

marked.setOptions({
  async: false,
  breaks: true,
  gfm: true,
  renderer
});

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const html = marked.parse(content || "") as string;

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function truncateAtSentence(text: string, limit = 300) {
  const normalized = text.trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  const sentenceBoundary = normalized.lastIndexOf(".", limit);
  if (sentenceBoundary >= 0) {
    return `${normalized.slice(0, sentenceBoundary + 1)}...`;
  }

  const safeBoundary = normalized.lastIndexOf(" ", limit);
  if (safeBoundary >= 0) {
    return `${normalized.slice(0, safeBoundary)}...`;
  }

  return `${normalized.slice(0, limit)}...`;
}
