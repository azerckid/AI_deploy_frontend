const DEFAULT_API_BASE_URL = "https://deployment-backend-production-2db3.up.railway.app";

function resolveBaseUrl(): string {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_AGENT_API_URL) {
        return import.meta.env.VITE_AGENT_API_URL as string;
    }

    if (typeof window !== "undefined") {
        const runtimeEnv = (window as Window & { __env__?: Record<string, string> }).__env__;
        if (runtimeEnv?.VITE_AGENT_API_URL) {
            return runtimeEnv.VITE_AGENT_API_URL;
        }
    }

    return DEFAULT_API_BASE_URL;
}

const BASE_URL = resolveBaseUrl().replace(/\/$/, "");

export interface StreamMessageOptions {
    conversationId: string;
    question: string;
    signal?: AbortSignal;
    onChunk: (delta: string) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
}

export async function streamMessage({
    conversationId,
    question,
    signal,
    onChunk,
    onComplete,
    onError,
}: StreamMessageOptions): Promise<void> {
    try {
        const response = await fetch(`${BASE_URL}/conversations/${conversationId}/message-stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ question }),
            signal,
        });

        if (!response.ok || !response.body) {
            throw new Error(`Stream failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }

            const text = decoder.decode(value, { stream: true });
            if (text) {
                onChunk(text);
            }
        }

        onComplete();
    } catch (error) {
        if (signal?.aborted) {
            return;
        }

        const err = error instanceof Error ? error : new Error("Unknown streaming error");
        onError(err);
    }
}
