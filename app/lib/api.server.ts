const DEFAULT_API_BASE_URL = "https://deployment-backend-production-2db3.up.railway.app";

function resolveBaseUrl(): string {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_AGENT_API_URL) {
        return import.meta.env.VITE_AGENT_API_URL as string;
    }

    if (typeof process !== "undefined" && process.env?.VITE_AGENT_API_URL) {
        return process.env.VITE_AGENT_API_URL;
    }

    return DEFAULT_API_BASE_URL;
}

const BASE_URL = resolveBaseUrl().replace(/\/$/, "");

interface ApiErrorBody {
    message?: string;
}

function buildError(response: Response, fallbackMessage?: string): Error {
    const error = new Error(fallbackMessage ?? `Backend request failed: ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    return error;
}

async function assertOk(response: Response): Promise<void> {
    if (response.ok) {
        return;
    }

    let details: ApiErrorBody | undefined;
    try {
        details = (await response.json()) as ApiErrorBody;
    } catch (error) {
        // ignore JSON parse failures, keep default message
    }

    const message = details?.message;
    throw buildError(response, message);
}

export interface CreateConversationResponse {
    conversation_id: string;
}

export interface CreateMessageInput {
    question: string;
}

export interface CreateMessageOutput {
    answer: string;
}

export async function createConversation(): Promise<CreateConversationResponse> {
    const response = await fetch(`${BASE_URL}/conversations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });

    await assertOk(response);

    const body = (await response.json()) as ApiErrorBody | CreateConversationResponse;

    if (!("conversation_id" in body)) {
        throw new Error("Backend response did not include conversation_id");
    }

    return body;
}

export async function createMessage(
    conversationId: string,
    payload: CreateMessageInput
): Promise<CreateMessageOutput> {
    const response = await fetch(`${BASE_URL}/conversations/${conversationId}/message`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    await assertOk(response);

    const body = (await response.json()) as ApiErrorBody | CreateMessageOutput;
    if (!("answer" in body)) {
        throw new Error("Backend response did not include answer field");
    }

    return body;
}
