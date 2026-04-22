import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function makeApiClient(token?: string): AxiosInstance {
  const instance = axios.create({
    baseURL: API_URL,
    timeout: 30_000,
  });

  if (token) {
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  return instance;
}

export interface InMeetingMessage {
  meeting_message_id: string;
  meeting_id: string;
  case_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  sender_type: 'human' | 'ai_agent';
  recipient_id: string | null;
  content: string;
  mentions: Array<{ user_id: string; display_name?: string }>;
  message_type: string;
  related_action_item_id: string | null;
  read_at: string | null;
  created_at: string | null;
}

export interface ListMessagesResponse {
  success: boolean;
  message: string;
  messages: InMeetingMessage[];
  total: number;
  limit: number;
  offset: number;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  data: InMeetingMessage;
}

export async function listMeetingMessages(
  client: AxiosInstance,
  meetingId: string
): Promise<InMeetingMessage[]> {
  const { data } = await client.get<ListMessagesResponse>(
    `/api/meetings/${meetingId}/messages`,
    { params: { limit: 200, offset: 0 } }
  );
  return data.messages;
}

export async function sendMeetingMessage(
  client: AxiosInstance,
  meetingId: string,
  content: string
): Promise<InMeetingMessage> {
  const { data } = await client.post<SendMessageResponse>(
    `/api/meetings/${meetingId}/messages`,
    {
      content,
      recipient_id: null,
      message_type: 'general',
      mentions: [],
    }
  );
  return data.data;
}
