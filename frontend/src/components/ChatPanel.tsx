import { useEffect, useRef, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";
import type { ChatMessage } from "../types";

type ChatPanelProps = {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => Promise<void>;
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-3">
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

export function ChatPanel({ messages, loading, onSend }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const value = input.trim();
    if (!value || loading) return;
    setInput("");
    await onSend(value);
  }

  return (
    <section className="flex flex-col rounded-panel border border-line bg-panel shadow-panel">
      <div className="border-b border-line bg-panel-header px-5 py-3.5">
        <span className="text-base font-semibold text-heading">Research Assistant</span>
        <span className="ml-2 text-sm text-body">Context-aware follow-up</span>
      </div>

      <div className="flex h-[360px] flex-col gap-2 overflow-y-auto bg-panel-subtle px-5 py-4 text-sm">
        {messages.length === 0 ? (
          <p className="text-sm text-caption">
            Ask follow-up questions about the active structure. Gemini retains protein context across the conversation.
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[92%] rounded-control border px-3.5 py-3 ${
                message.role === "user"
                  ? "self-end border-primary/20 bg-primary-light"
                  : "border-line bg-panel"
              }`}
            >
              <div className={`mb-1 text-xs font-medium ${
                message.role === "user" ? "text-primary" : "text-body"
              }`}>
                {message.role === "user" ? "Researcher" : "Assistant"}
              </div>
              {message.role === "user" ? (
                <p className="text-sm leading-relaxed text-heading">{message.content}</p>
              ) : (
                <MarkdownContent
                  content={message.content}
                  className="text-sm leading-relaxed text-body [&_li]:ml-4 [&_li]:list-disc [&_li+li]:mt-1 [&_ol]:pl-5 [&_p+li]:mt-2 [&_p+p]:mt-3 [&_p]:m-0 [&_strong]:font-semibold [&_ul]:pl-5"
                />
              )}
            </div>
          ))
        )}
        {loading ? (
          <div className="max-w-[92%] rounded-control border border-line bg-panel px-3.5 py-3">
            <div className="mb-1 text-xs font-medium text-body">Assistant</div>
            <TypingIndicator />
          </div>
        ) : null}
        <div ref={chatBottomRef} />
      </div>

      <div className="flex gap-2 border-t border-line px-5 py-3.5">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={loading}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder={loading ? "Waiting for response..." : "What binding sites are druggable? Which residues are conserved?"}
          className="flex-1 rounded-control border border-line bg-panel-subtle px-3.5 py-3 text-sm text-heading outline-none placeholder:text-muted-text focus:border-primary focus:shadow-focus"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="rounded-control border border-primary bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:border-line disabled:bg-slate-300 disabled:text-slate-500"
        >
          Send
        </button>
      </div>
    </section>
  );
}
