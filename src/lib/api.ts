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

// ==================== AUTH ====================

export interface AuthUser {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  last_login_at?: string | null;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  // Backend expects OAuth2PasswordRequestForm → application/x-www-form-urlencoded
  // with fields `username` (email) + `password`.
  const body = new URLSearchParams();
  body.set('username', email);
  body.set('password', password);

  const { data } = await axios.post<LoginResponse>(
    `${API_URL}/api/auth/login`,
    body,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30_000,
    }
  );
  return data;
}

export async function getProfile(client: AxiosInstance): Promise<AuthUser> {
  const { data } = await client.get<ProfileResponse>('/api/auth/profile');
  return data.user;
}

// ==================== CASES ====================

export interface CaseListItem {
  case_id: string;
  product_id?: string | null;
  case_number: string;
  status: string;
  device_name: string;
  category: string;
  severity: string;
  patient_impact: string;
  regulatory_reportable: boolean;
  current_phase?: string | null;
  capa_analysis_id?: string | null;
  created_at?: string | null;
}

export interface CaseData {
  case_id: string;
  session_id?: string | null;
  product_id?: string | null;
  case_number: string;
  status: string;
  device_name: string;
  device_model?: string | null;
  batch_number?: string | null;
  serial_number?: string | null;
  category: string;
  description: string;
  incident_date?: string | null;
  incident_location?: string | null;
  patient_impact: string;
  severity: string;
  injury_description?: string | null;
  regulatory_reportable: boolean;
  reportable_justification?: string | null;
  reporter_name?: string | null;
  reporter_email?: string | null;
  reporter_phone?: string | null;
  reporter_role?: string | null;
  reporter_country?: string | null;
  attachments?: unknown[] | null;
  ai_confidence_score?: number | null;
  extraction_notes?: string | null;
  case_type?: string | null;
  case_type_confidence?: number | null;
  signal_severity?: string | null;
  summary_en?: string | null;
  summary_de?: string | null;
  current_phase?: string | null;
  root_cause_analysis_status?: string | null;
  capa_status?: string | null;
  verify_fix_status?: string | null;
  final_report_id?: string | null;
  capa_started_at?: string | null;
  capa_completed_at?: string | null;
  capa_analysis_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CaseListResponse {
  success: boolean;
  message: string;
  cases: CaseListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CaseDetailResponse {
  success: boolean;
  message: string;
  case: CaseData;
  transcript?: Array<{ role: string; content: string; created_at?: string | null }> | null;
}

export async function listCases(
  client: AxiosInstance,
  opts?: {
    status?: string;
    severity?: string;
    issue_type?: string;
    regulatory_reportable?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ cases: CaseListItem[]; total: number }> {
  const { data } = await client.get<CaseListResponse>('/api/cases', {
    params: {
      status: opts?.status,
      severity: opts?.severity,
      issue_type: opts?.issue_type,
      regulatory_reportable: opts?.regulatory_reportable,
      search: opts?.search,
      limit: opts?.limit ?? 50,
      offset: opts?.offset ?? 0,
    },
  });
  return { cases: data.cases, total: data.total };
}

export async function getCaseDetail(
  client: AxiosInstance,
  caseId: string
): Promise<CaseData> {
  const { data } = await client.get<CaseDetailResponse>(`/api/cases/${caseId}`);
  return data.case;
}

export type CaseStatusValue =
  | 'draft'
  | 'linked_to_capa'
  | 'capa_root_cause_done'
  | 'capa_defined'
  | 'capa_resolved'
  | 'qms_audit_pending'
  | 'qms_audited'
  | 'qms_non_compliant'
  | 'closed';

// Allowed status transitions (happy path + recovery). Mirrors
// VALID_CASE_STATUS_TRANSITIONS in the backend (routers/case.py).
export const CASE_STATUS_TRANSITIONS: Record<CaseStatusValue, CaseStatusValue[]> = {
  draft: ['linked_to_capa'],
  linked_to_capa: ['capa_root_cause_done'],
  capa_root_cause_done: ['capa_defined'],
  capa_defined: ['capa_resolved'],
  capa_resolved: ['qms_audit_pending'],
  qms_audit_pending: ['qms_audited', 'qms_non_compliant'],
  qms_audited: ['closed'],
  qms_non_compliant: ['capa_defined'],
  closed: [],
};

export async function updateCaseStatus(
  client: AxiosInstance,
  caseId: string,
  status: CaseStatusValue
): Promise<CaseData> {
  const { data } = await client.put<CaseDetailResponse>(`/api/cases/${caseId}/status`, {
    status,
  });
  return data.case;
}

export async function deleteCase(client: AxiosInstance, caseId: string): Promise<void> {
  await client.delete(`/api/cases/${caseId}`);
}

// ==================== CAPA PHASE ====================

export type CapaPhaseValue = 'root_cause_analysis' | 'capa' | 'verify_fix' | 'completed';

export interface CapaProgressData {
  case_id: string;
  current_phase: string;
  root_cause_analysis_status: string;
  capa_status: string;
  verify_fix_status: string;
  final_report_id?: string | null;
  capa_started_at?: string | null;
  capa_completed_at?: string | null;
  meeting_counts: Record<string, number>;
}

export interface CapaProgressResponse {
  success: boolean;
  message: string;
  data: CapaProgressData;
}

// Happy-path progression between CAPA phases.
export const CAPA_PHASE_PROGRESSION: Record<CapaPhaseValue, CapaPhaseValue | null> = {
  root_cause_analysis: 'capa',
  capa: 'verify_fix',
  verify_fix: 'completed',
  completed: null,
};

export async function getCapaProgress(
  client: AxiosInstance,
  caseId: string
): Promise<CapaProgressData> {
  const { data } = await client.get<CapaProgressResponse>(`/api/cases/${caseId}/capa/progress`);
  return data.data;
}

export async function advanceCapaPhase(
  client: AxiosInstance,
  caseId: string,
  nextPhase: CapaPhaseValue
): Promise<CapaProgressData> {
  const { data } = await client.post<CapaProgressResponse>(
    `/api/cases/${caseId}/capa/advance-phase`,
    { next_phase: nextPhase }
  );
  return data.data;
}

// ==================== MEETINGS ====================

export interface ParticipantSummary {
  participant_id: string;
  user_id: string;
  display_name?: string | null;
  role?: string | null;
  responsibilities?: string | null;
  discussion_points?: string[];
  priority?: string;
  joined_at?: string | null;
  left_at?: string | null;
}

export interface MeetingSummary {
  meeting_id: string;
  case_id: string;
  meeting_type: string;
  sequence_number: number;
  title: string;
  scheduled_at?: string | null;
  status: string;
  participant_count: number;
}

export interface MeetingDetail {
  meeting_id: string;
  case_id: string;
  user_id: string;
  meeting_type: string;
  sequence_number: number;
  title: string;
  agenda?: string | null;
  scheduled_at?: string | null;
  duration_minutes?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  status: string;
  livekit_room_name?: string | null;
  agent_dispatched_at?: string | null;
  participants: ParticipantSummary[];
  has_report: boolean;
  created_at?: string | null;
}

export interface MeetingListResponse {
  success: boolean;
  message: string;
  meetings: MeetingSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface MeetingDetailResponse {
  success: boolean;
  message: string;
  data: MeetingDetail;
}

export interface JoinMeetingResponse {
  success: boolean;
  message: string;
  data: {
    meeting_id: string;
    livekit_url: string;
    livekit_room_name: string;
    token: string;
    participant_identity: string;
    participant_display_name: string;
  };
}

export async function listMeetings(
  client: AxiosInstance,
  opts?: { case_id?: string; status?: string; limit?: number; offset?: number }
): Promise<{ meetings: MeetingSummary[]; total: number }> {
  const { data } = await client.get<MeetingListResponse>('/api/meetings/', {
    params: {
      case_id: opts?.case_id,
      status: opts?.status,
      limit: opts?.limit ?? 50,
      offset: opts?.offset ?? 0,
    },
  });
  return { meetings: data.meetings, total: data.total };
}

export async function getMeetingDetail(
  client: AxiosInstance,
  meetingId: string
): Promise<MeetingDetail> {
  const { data } = await client.get<MeetingDetailResponse>(`/api/meetings/${meetingId}`);
  return data.data;
}

export async function joinMeeting(
  client: AxiosInstance,
  meetingId: string
): Promise<JoinMeetingResponse['data']> {
  const { data } = await client.post<JoinMeetingResponse>(`/api/meetings/${meetingId}/join`);
  return data.data;
}

/**
 * Cancel a scheduled meeting. Backend returns a generic BaseResponse on success
 * and a 400 if the meeting is not in `scheduled` status.
 */
export async function deleteMeeting(
  client: AxiosInstance,
  meetingId: string
): Promise<void> {
  await client.delete(`/api/meetings/${meetingId}`);
}

export interface AddParticipantRequest {
  user_id: string;
  discussion_points?: string[];
  priority?: 'high' | 'medium' | 'low';
}

export async function addParticipant(
  client: AxiosInstance,
  meetingId: string,
  payload: AddParticipantRequest
): Promise<void> {
  await client.post(`/api/meetings/${meetingId}/participants`, payload);
}

// ==================== INBOX / DM / VOTE ====================

export type MessageType =
  | 'general'
  | 'meeting_invite'
  | 'vote_reply'
  | 'action_item'
  | 'reminder'
  | 'question'
  | 'status_update';

export interface MessageData {
  meeting_message_id: string;
  meeting_id: string | null;
  case_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  sender_type: 'human' | 'ai_agent';
  recipient_id: string | null;
  content: string;
  mentions: Array<{ user_id: string; display_name?: string }>;
  message_type: string;
  related_action_item_id: string | null;
  related_meeting_vote_id: string | null;
  read_at: string | null;
  created_at: string | null;
}

export interface InboxResponse {
  success: boolean;
  message: string;
  messages: MessageData[];
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  unread_count: number;
}

export async function getInbox(
  client: AxiosInstance,
  opts?: { unread_only?: boolean; message_type?: string; limit?: number; offset?: number }
): Promise<InboxResponse> {
  const { data } = await client.get<InboxResponse>('/api/messages/inbox', {
    params: {
      unread_only: opts?.unread_only ?? false,
      message_type: opts?.message_type,
      limit: opts?.limit ?? 50,
      offset: opts?.offset ?? 0,
    },
  });
  return data;
}

export async function getUnreadCount(client: AxiosInstance): Promise<number> {
  const { data } = await client.get<UnreadCountResponse>('/api/messages/unread-count');
  return data.unread_count;
}

export async function markMessageRead(
  client: AxiosInstance,
  messageId: string
): Promise<void> {
  await client.patch(`/api/messages/${messageId}/read`);
}

export async function getMessagesByCase(
  client: AxiosInstance,
  caseId: string,
  opts?: { limit?: number; offset?: number }
): Promise<InboxResponse> {
  const { data } = await client.get<InboxResponse>(`/api/messages/by-case/${caseId}`, {
    params: { limit: opts?.limit ?? 200, offset: opts?.offset ?? 0 },
  });
  return data;
}

export type VoteDecision = 'yes' | 'no';

export interface CastVoteRequest {
  decision: VoteDecision;
  suggested_time?: string; // ISO 8601 — only honored when decision='no'
  suggestion_text?: string; // optional for YES, REQUIRED for NO
}

export interface MeetingVoteData {
  meeting_vote_id: string;
  meeting_id: string;
  user_id: string;
  decision: VoteDecision;
  suggested_time: string | null;
  suggestion_text: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CastVoteResponse {
  success: boolean;
  message: string;
  data: MeetingVoteData;
  finalized: boolean;
}

export async function voteOnMeetingInvite(
  client: AxiosInstance,
  messageId: string,
  payload: CastVoteRequest
): Promise<CastVoteResponse> {
  const { data } = await client.post<CastVoteResponse>(
    `/api/messages/${messageId}/vote`,
    payload
  );
  return data;
}

// ==================== IN-MEETING CHAT (pre-existing) ====================

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
