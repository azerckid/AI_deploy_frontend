import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { Plus, SendHorizonal, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../lib/utils";
import type { Route } from "./+types/_index";

const PAGE_TITLE = "Nomad Agents";

type Author = "user" | "assistant";

interface ConversationSummary {
  id: string;
  title: string;
  lead: string;
  updatedAt: string;
}

interface LoaderData {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
}

interface ActionData {
  ok: boolean;
  message: string;
  method: string;
}

interface Message {
  id: string;
  author: Author;
  content: string;
  createdAt: string;
  isDraft?: boolean;
}

const SAMPLE_THREADS: Record<string, Message[]> = {
  c1: [
    {
      id: "c1-m1",
      author: "user",
      content: "서울과 뉴욕의 시차를 비교해서 오늘 일정 추천해 줘.",
      createdAt: "2025-11-08T07:12:00Z",
    },
    {
      id: "c1-m2",
      author: "assistant",
      content:
        "서울은 UTC+9, 뉴욕은 UTC-5라서 시차가 14시간이에요. 오전 9시 화상 회의를 원한다면 뉴욕 기준 전날 오후 7시에 맞춰야 합니다.",
      createdAt: "2025-11-08T07:12:12Z",
    },
    {
      id: "c1-m3",
      author: "assistant",
      content:
        "오늘 우선순위는 1) 제품 발표 자료 검토, 2) 고객 인터뷰 준비, 3) 팀 회고 안건 정리 순으로 제안드릴게요.",
      createdAt: "2025-11-08T07:12:40Z",
    },
  ],
  c2: [
    {
      id: "c2-m1",
      author: "assistant",
      content:
        "지난주 사용자 피드백 48건을 요약했고, 상위 3개 요구사항을 중심으로 Q1 전략 초안을 만들었습니다.",
      createdAt: "2025-11-07T23:31:00Z",
    },
    {
      id: "c2-m2",
      author: "assistant",
      content:
        "다음 액션: 1) 우선순위 A 기능의 스코프 확정, 2) 베타 사용자 대상 설문 구성, 3) 재무팀과 예산 조율.",
      createdAt: "2025-11-07T23:31:45Z",
    },
  ],
  c3: [
    {
      id: "c3-m1",
      author: "assistant",
      content:
        "다음 미팅에서 나올 만한 질문 6가지를 예상하고, 각각에 대한 답변 포인트를 정리했습니다.",
      createdAt: "2025-11-06T15:19:00Z",
    },
  ],
};

const DEMO_RESPONSES: Record<string, string> = {
  c1: "온보딩 체크리스트 초안의 링크를 업데이트했고, 사전 준비 자료를 표로 정리해 두었습니다.",
  c2: "전략 브리핑용 10장 분량의 슬라이드 초안을 준비했습니다. 확인 후 수정 요청 주세요.",
  c3: "영업 자료에 최신 경쟁사 비교 수치를 반영했습니다. 최종 검토 후 공유드릴게요.",
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: PAGE_TITLE },
    { name: "description", content: "Collaborative agent chat workspace." },
  ];
}

export function loader({}: Route.LoaderArgs): LoaderData {
  return {
    conversations: [
      {
        id: "c1",
        title: "팀 온보딩 체크리스트",
        lead: "핵심 문서와 일정 정리를 도와드릴게요.",
        updatedAt: "2025-11-08T06:45:00Z",
      },
      {
        id: "c2",
        title: "프로덕트 전략 브리핑",
        lead: "최근 사용자 피드백을 요약하고 전략을 제안했습니다.",
        updatedAt: "2025-11-07T23:30:00Z",
      },
      {
        id: "c3",
        title: "영업 미팅 준비",
        lead: "경쟁사 대비 장점과 예상 질문 리스트를 생성했습니다.",
        updatedAt: "2025-11-06T15:18:00Z",
      },
    ],
    activeConversationId: "c1",
  } satisfies LoaderData;
}

export async function action({ request }: Route.ActionArgs): Promise<ActionData> {
  return {
    ok: false,
    message: "Not implemented",
    method: request.method,
  } satisfies ActionData;
}

export default function IndexRoute({ loaderData }: Route.ComponentProps) {
  const data = useMemo(
    () => (loaderData as LoaderData | undefined) ?? { conversations: [], activeConversationId: null },
    [loaderData]
  );

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    data.activeConversationId ?? data.conversations[0]?.id ?? null
  );
  const [messages, setMessages] = useState<Message[]>(() => seedThread(data.activeConversationId));
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    setMessages(seedThread(activeConversationId));
    setIsStreaming(false);
    setDraft("");
  }, [activeConversationId]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!activeConversationId) {
      toast.error("대화를 먼저 선택하세요.");
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.warning("메시지를 입력해 주세요.");
      return;
    }

    const nowIso = new Date().toISOString();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      author: "user",
      content: trimmed,
      createdAt: nowIso,
    };
    const placeholderId = `draft-${Date.now()}`;
    const draftMessage: Message = {
      id: placeholderId,
      author: "assistant",
      content: "응답 생성 중...",
      createdAt: nowIso,
      isDraft: true,
    };

    setMessages((prev) => [...prev, userMessage, draftMessage]);
    setDraft("");
    setIsStreaming(true);

    const canned = DEMO_RESPONSES[activeConversationId] ?? "현재는 데모 응답입니다.";
    // TODO: Replace canned response with streaming call to the backend agent API.
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === placeholderId
            ? {
                ...message,
                content: canned,
                createdAt: new Date().toISOString(),
                isDraft: false,
              }
            : message
        )
      );
      setIsStreaming(false);
      toast.success("데모 응답이 도착했습니다.");
    }, 1000);
  }, [activeConversationId, draft]);

  const handleDraftKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[320px_1fr]">
      <aside className="border-r bg-muted/20">
        <SidebarHeader count={data.conversations.length} />
        <Separator />
        <ScrollArea className="h-[320px] lg:h-[calc(100vh-116px)] px-2">
          <div className="space-y-1 py-2">
            {data.conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onSelect={handleSelectConversation}
              />
            ))}
          </div>
        </ScrollArea>
      </aside>

      <section className="flex min-h-0 flex-col">
        <ChatHeader title={getActiveTitle(data.conversations, activeConversationId)} />
        <Separator />
        <ChatMessages messages={messages} isStreaming={isStreaming} />
        <Separator />
        <ChatComposer
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={handleSubmit}
          onDraftKeyDown={handleDraftKeyDown}
          isStreaming={isStreaming}
        />
      </section>
    </main>
  );
}

function SidebarHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Conversations</p>
        <p className="text-sm font-medium text-foreground">총 {count}건</p>
      </div>
      <Button size="sm" className="gap-2">
        <Plus className="h-4 w-4" /> 새 대화
      </Button>
    </div>
  );
}

function ConversationListItem({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "w-full rounded-md border border-transparent px-4 py-3 text-left transition hover:border-border hover:bg-background",
        isActive && "border-border bg-background shadow-sm"
      )}
    >
      <p className="text-sm font-medium text-foreground line-clamp-1">{conversation.title}</p>
      <p className="text-xs text-muted-foreground line-clamp-2">{conversation.lead}</p>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        업데이트 {formatRelativeTime(conversation.updatedAt)}
      </p>
    </button>
  );
}

function ChatHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-8 py-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Active thread</p>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="gap-1">
          <Sparkles className="h-4 w-4" /> 요약 보기
        </Button>
        <Button variant="outline" size="sm">
          기록 내보내기
        </Button>
      </div>
    </div>
  );
}

function ChatMessages({ messages, isStreaming }: { messages: Message[]; isStreaming: boolean }) {
  return (
    <Card className="mx-4 mb-6 flex h-full flex-1 flex-col overflow-hidden border-none bg-transparent shadow-none lg:mx-8">
      <CardContent className="h-full space-y-4 overflow-hidden p-0">
        <ScrollArea className="min-h-[40vh] pr-4 lg:h-[calc(100vh-280px)]">
          <div className="space-y-4 pb-6">
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
            {isStreaming && messages.length > 0 && <TypingIndicator />}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isAssistant = message.author === "assistant";
  return (
    <div className={cn("flex gap-3", isAssistant ? "justify-start" : "justify-end")}>
      {isAssistant && (
        <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-primary/10 text-center text-sm font-semibold leading-8 text-primary">
          AI
        </div>
      )}
      <div
        className={cn(
          "max-w-xl rounded-2xl border px-4 py-3 text-sm leading-6",
          isAssistant
            ? "bg-card text-foreground"
            : "bg-primary text-primary-foreground",
          message.isDraft && "border-dashed text-muted-foreground"
        )}
      >
        <p>{message.content}</p>
        <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
      {!isAssistant && (
        <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-primary text-center text-sm font-semibold leading-8 text-primary-foreground">
          You
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
      응답 생성 중...
    </div>
  );
}

function ChatComposer({
  draft,
  onDraftChange,
  onSubmit,
  onDraftKeyDown,
  isStreaming,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onDraftKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isStreaming: boolean;
}) {
  return (
    <form
      className="flex flex-col gap-3 px-4 py-6 lg:px-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Textarea
        rows={4}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={onDraftKeyDown}
        disabled={isStreaming}
        placeholder="질문을 입력하고 Shift+Enter로 줄바꿈, Enter로 전송하세요."
        className="min-h-[120px]"
      />
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          OpenAI Agents와 연결 예정 — 현재는 디자인 목업 상태입니다.
        </p>
        <Button type="submit" className="gap-2" disabled={isStreaming}>
          <SendHorizonal className="h-4 w-4" />
          {isStreaming ? "전송 중" : "전송"}
        </Button>
      </div>
    </form>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      아직 메시지가 없습니다. 오른쪽 입력창에서 대화를 시작해 보세요.
    </div>
  );
}

function seedThread(conversationId: string | null): Message[] {
  if (!conversationId) {
    return [];
  }
  return [...(SAMPLE_THREADS[conversationId] ?? [])];
}

function getActiveTitle(conversations: ConversationSummary[], id: string | null) {
  if (!id) {
    return "대화를 선택하세요";
  }
  return conversations.find((conversation) => conversation.id === id)?.title ?? "대화를 선택하세요";
}

function formatRelativeTime(iso: string) {
  const formatter = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
  const then = new Date(iso);
  const now = new Date();
  const diffMs = then.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (!Number.isFinite(diffMinutes)) {
    return "방금 전";
  }
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}
