import {
  Vehicle,
  ChatMessage,
  PurchaseOrder,
  RecoveryRequest,
  DashboardStats,
  User,
  Announcement,
  AnnouncementComment,
  ClientContact,
} from '../types';
import { INITIAL_VEHICLES, INITIAL_ANNOUNCEMENTS } from '../data/initialData';

// Web uses same-origin. Android builds set VITE_API_BASE_URL to the public Railway origin.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' && input.startsWith('/') ? `${API_BASE_URL}${input}` : input;
  return fetch(url, init);
};

function getHeaders() {
  const token = localStorage.getItem('ndao_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // -------------------------------------------------------------
  // AUTH
  // -------------------------------------------------------------
  async register(data: {
    nom: string;
    prenom: string;
    telephone: string;
    email?: string;
    password: string;
    acceptTerms: boolean;
  }): Promise<{ message: string; token: string; user: User }> {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur lors de l\'inscription');
    if (json.token) localStorage.setItem('ndao_auth_token', json.token);
    return json;
  },

  async login(identifier: string, password: string): Promise<{ message: string; token: string; user: User }> {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ identifier, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur lors de la connexion');
    if (json.token) localStorage.setItem('ndao_auth_token', json.token);
    return json;
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('ndao_auth_token');
    if (!token) return null;
    try {
      const res = await apiFetch('/api/auth/me', { headers: getHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', headers: getHeaders() });
    } catch (e) {
      console.warn('Logout API failed:', e);
    } finally {
      localStorage.removeItem('ndao_auth_token');
    }
  },

  // Password Recovery Flow
  async requestRecovery(identifier: string): Promise<{ message: string; recoveryId?: string; previewCode?: string }> {
    const res = await apiFetch('/api/auth/recover-request', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ identifier }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur lors de la demande');
    return json;
  },

  async verifyRecoveryCode(recoveryId: string, code: string): Promise<{ message: string; resetToken: string }> {
    const res = await apiFetch('/api/auth/recover-verify', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recoveryId, code }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Code invalide');
    return json;
  },

  async resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
    const res = await apiFetch('/api/auth/recover-reset', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ resetToken, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Impossible de réinitialiser');
    return json;
  },

  // -------------------------------------------------------------
  // VEHICLES
  // -------------------------------------------------------------
  async getVehicles(params?: {
    categorie?: string;
    marque?: string;
    etat?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    statut?: string;
  }): Promise<Vehicle[]> {
    try {
      const query = new URLSearchParams();
      if (params?.categorie && params.categorie !== 'Toutes') query.set('categorie', params.categorie);
      if (params?.marque) query.set('marque', params.marque);
      if (params?.etat) query.set('etat', params.etat);
      if (params?.minPrice) query.set('minPrice', params.minPrice.toString());
      if (params?.maxPrice) query.set('maxPrice', params.maxPrice.toString());
      if (params?.search) query.set('search', params.search);
      if (params?.statut) query.set('statut', params.statut);

      const res = await apiFetch(`/api/vehicles?${query.toString()}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem('ndao_offline_vehicles', JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // Backend unreachable (e.g. running standalone inside Android APK)
    }

    // Resilient offline fallback
    let list: Vehicle[] = INITIAL_VEHICLES;
    try {
      const cached = localStorage.getItem('ndao_offline_vehicles');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch {}

    if (params?.categorie && params.categorie !== 'Toutes') {
      list = list.filter((v) => v.categorie === params.categorie);
    }
    if (params?.marque) {
      list = list.filter((v) => v.marque.toLowerCase().includes(params.marque!.toLowerCase()));
    }
    if (params?.minPrice) {
      list = list.filter((v) => v.prixFcfa >= params.minPrice!);
    }
    if (params?.maxPrice) {
      list = list.filter((v) => v.prixFcfa <= params.maxPrice!);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (v) =>
          v.marque.toLowerCase().includes(q) ||
          v.modele.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async getVehicleById(id: string): Promise<Vehicle> {
    try {
      const res = await apiFetch(`/api/vehicles/${id}`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch {}
    try {
      const cached = localStorage.getItem('ndao_offline_vehicles');
      const list: Vehicle[] = cached ? JSON.parse(cached) : INITIAL_VEHICLES;
      const found = list.find((v) => v.id === id);
      if (found) return found;
    } catch {}
    const fallback = INITIAL_VEHICLES.find((v) => v.id === id);
    if (fallback) return fallback;
    throw new Error('Véhicule introuvable');
  },

  async toggleVehicleLike(id: string, increment: boolean): Promise<number> {
    try {
      const res = await apiFetch(`/api/vehicles/${id}/like`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ increment }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.likes;
      }
    } catch {}
    return 1;
  },

  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    const res = await apiFetch('/api/vehicles', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur d\'ajout du véhicule');
    return json;
  },

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const res = await apiFetch(`/api/vehicles/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur de modification');
    return json;
  },

  async deleteVehicle(id: string): Promise<void> {
    const res = await apiFetch(`/api/vehicles/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Erreur de suppression');
  },

  // -------------------------------------------------------------
  // ANNOUNCEMENTS / PUBLICATIONS DU PROPRIÉTAIRE
  // -------------------------------------------------------------
  async getAnnouncements(): Promise<Announcement[]> {
    try {
      const res = await apiFetch('/api/announcements', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem('ndao_offline_announcements', JSON.stringify(data));
          return data;
        }
      }
    } catch {}
    try {
      const cached = localStorage.getItem('ndao_offline_announcements');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_ANNOUNCEMENTS;
  },

  async createAnnouncement(data: {
    titre: string;
    description: string;
    imageUrl?: string;
    videoUrl?: string;
    prixFcfa?: number;
    categorie?: string;
    vehiculeId?: string;
  }): Promise<Announcement> {
    const res = await apiFetch('/api/announcements', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur de publication');
    return json;
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const res = await apiFetch(`/api/announcements/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Erreur de suppression d\'annonce');
  },

  async likeAnnouncement(id: string, increment: boolean): Promise<number> {
    const res = await apiFetch(`/api/announcements/${id}/like`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ increment }),
    });
    const json = await res.json();
    return json.likes;
  },

  async setAnnouncementInterest(
    id: string,
    interest: 'interesse' | 'pas_interesse'
  ): Promise<{ interessesCount: number; pasInteressesCount: number }> {
    const res = await apiFetch(`/api/announcements/${id}/interest`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ interest }),
    });
    return res.json();
  },

  async getAnnouncementComments(announcementId: string): Promise<AnnouncementComment[]> {
    const res = await apiFetch(`/api/announcements/${announcementId}/comments`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async addAnnouncementComment(
    announcementId: string,
    text: string,
    userName?: string
  ): Promise<AnnouncementComment> {
    const res = await apiFetch(`/api/announcements/${announcementId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, userName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur d\'ajout du commentaire');
    return json;
  },

  // -------------------------------------------------------------
  // MESSAGING (WhatsApp Style - Offline First & Backend Sync)
  // -------------------------------------------------------------
  async getConversations(): Promise<ClientContact[]> {
    try {
      const res = await apiFetch('/api/conversations', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('ndao_offline_conversations', JSON.stringify(data));
        return data;
      }
    } catch {}

    try {
      const cached = localStorage.getItem('ndao_offline_conversations');
      if (cached) return JSON.parse(cached);
    } catch {}

    // Derive from local messages if any
    try {
      const msgsRaw = localStorage.getItem('ndao_offline_messages');
      if (msgsRaw) {
        const msgs: ChatMessage[] = JSON.parse(msgsRaw);
        const map = new Map<string, ClientContact>();
        for (const m of msgs) {
          if (!map.has(m.conversationId)) {
            map.set(m.conversationId, {
              clientId: m.senderId,
              clientName: m.senderName,
              clientPhone: m.senderPhone || 'Client NDAO\'AUTO',
              conversationId: m.conversationId,
              lastMessageText: m.type === 'voice' ? '🎤 Note vocale' : (m.text || 'Média'),
              lastMessageTime: m.createdAt,
              unreadCount: 0,
            });
          }
        }
        return Array.from(map.values());
      }
    } catch {}

    return [];
  },

  async getMessages(conversationId?: string): Promise<ChatMessage[]> {
    try {
      const url = conversationId
        ? `/api/messages?conversationId=${encodeURIComponent(conversationId)}`
        : '/api/messages';
      const res = await apiFetch(url, { headers: getHeaders() });
      if (res.ok) {
        const serverMsgs: ChatMessage[] = await res.json();
        // Merge with local messages to ensure nothing is lost
        const localRaw = localStorage.getItem('ndao_offline_messages');
        const localMsgs: ChatMessage[] = localRaw ? JSON.parse(localRaw) : [];
        const mergedMap = new Map<string, ChatMessage>();
        localMsgs.forEach((m) => mergedMap.set(m.id, m));
        serverMsgs.forEach((m) => mergedMap.set(m.id, m));
        const merged = Array.from(mergedMap.values());
        localStorage.setItem('ndao_offline_messages', JSON.stringify(merged));
        return conversationId ? merged.filter((m) => m.conversationId === conversationId) : merged;
      }
    } catch {
      // Offline / APK standalone mode
    }

    try {
      const raw = localStorage.getItem('ndao_offline_messages');
      if (raw) {
        const list: ChatMessage[] = JSON.parse(raw);
        return conversationId ? list.filter((m) => m.conversationId === conversationId) : list;
      }
    } catch {}

    return [];
  },

  async sendMessage(data: {
    conversationId?: string;
    text?: string;
    type?: 'text' | 'voice' | 'media';
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio';
    voiceDurationSeconds?: number;
    replyToMessageId?: string;
    targetClientId?: string;
    senderRole?: 'owner' | 'client';
    senderName?: string;
  }): Promise<ChatMessage> {
    // Generate a stable client device ID if not already existing
    let clientId = localStorage.getItem('ndao_client_device_id');
    if (!clientId) {
      clientId = 'client-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('ndao_client_device_id', clientId);
    }

    const isOwnerRole = data.senderRole === 'owner';
    const effectiveConvId =
      data.conversationId ||
      (isOwnerRole && data.targetClientId ? `conv-${data.targetClientId}` : `conv-${clientId}`);

    // Create local ChatMessage object immediately
    const newMsg: ChatMessage = {
      id: 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      conversationId: effectiveConvId,
      senderId: isOwnerRole ? 'owner-ndao' : clientId,
      senderName: data.senderName || (isOwnerRole ? 'MOUHAMED NDAO' : 'Client NDAO\'AUTO'),
      senderRole: data.senderRole || 'client',
      receiverId: isOwnerRole ? (data.targetClientId || 'client') : 'owner-ndao',
      text: data.text?.trim(),
      type: data.type || 'text',
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      voiceDurationSeconds: data.voiceDurationSeconds,
      replyToMessageId: data.replyToMessageId,
      status: 'sent',
      createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    // Save locally immediately to guarantee zero message loss
    try {
      const raw = localStorage.getItem('ndao_offline_messages');
      const list: ChatMessage[] = raw ? JSON.parse(raw) : [];
      list.push(newMsg);
      localStorage.setItem('ndao_offline_messages', JSON.stringify(list));
    } catch {}

    // Update conversation summary locally
    try {
      const rawConvs = localStorage.getItem('ndao_offline_conversations');
      const convs: ClientContact[] = rawConvs ? JSON.parse(rawConvs) : [];
      const existing = convs.find((c) => c.conversationId === effectiveConvId);
      const summaryText = newMsg.type === 'voice' ? '🎤 Note vocale' : (newMsg.text || 'Média');
      if (existing) {
        existing.lastMessageText = summaryText;
        existing.lastMessageTime = newMsg.createdAt;
      } else {
        convs.push({
          clientId: newMsg.senderId,
          clientName: newMsg.senderName,
          clientPhone: 'Client NDAO\'AUTO',
          conversationId: effectiveConvId,
          lastMessageText: summaryText,
          lastMessageTime: newMsg.createdAt,
          unreadCount: 0,
        });
      }
      localStorage.setItem('ndao_offline_conversations', JSON.stringify(convs));
    } catch {}

    // Sync to backend if accessible
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...data, conversationId: effectiveConvId }),
      });
      if (res.ok) {
        const serverMsg = await res.json();
        // Update local object with server metadata
        try {
          const raw = localStorage.getItem('ndao_offline_messages');
          if (raw) {
            const list: ChatMessage[] = JSON.parse(raw);
            const idx = list.findIndex((m) => m.id === newMsg.id);
            if (idx !== -1) {
              list[idx] = serverMsg;
              localStorage.setItem('ndao_offline_messages', JSON.stringify(list));
            }
          }
        } catch {}
        return serverMsg;
      }
    } catch {
      // Backend unavailable; local message is already stored and active!
    }

    return newMsg;
  },

  async editMessage(id: string, text: string): Promise<ChatMessage> {
    // Update locally
    let updatedMsg: ChatMessage | null = null;
    try {
      const raw = localStorage.getItem('ndao_offline_messages');
      if (raw) {
        const list: ChatMessage[] = JSON.parse(raw);
        for (const m of list) {
          if (m.id === id) {
            m.text = text;
            m.editedAt = 'modifié';
            updatedMsg = m;
            break;
          }
        }
        localStorage.setItem('ndao_offline_messages', JSON.stringify(list));
      }
    } catch {}

    try {
      const res = await apiFetch(`/api/messages/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ text }),
      });
      if (res.ok) return await res.json();
    } catch {}

    if (updatedMsg) return updatedMsg;
    throw new Error('Message introuvable');
  },

  async deleteMessage(id: string): Promise<void> {
    try {
      const raw = localStorage.getItem('ndao_offline_messages');
      if (raw) {
        const list: ChatMessage[] = JSON.parse(raw);
        const filtered = list.filter((m) => m.id !== id);
        localStorage.setItem('ndao_offline_messages', JSON.stringify(filtered));
      }
    } catch {}

    try {
      await apiFetch(`/api/messages/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
    } catch {}
  },

  async reactToMessage(id: string, emoji: string): Promise<ChatMessage> {
    let updatedMsg: ChatMessage | null = null;
    try {
      const raw = localStorage.getItem('ndao_offline_messages');
      if (raw) {
        const list: ChatMessage[] = JSON.parse(raw);
        for (const m of list) {
          if (m.id === id) {
            m.reaction = m.reaction === emoji ? undefined : emoji;
            updatedMsg = m;
            break;
          }
        }
        localStorage.setItem('ndao_offline_messages', JSON.stringify(list));
      }
    } catch {}

    try {
      const res = await apiFetch(`/api/messages/${id}/react`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) return await res.json();
    } catch {}

    if (updatedMsg) return updatedMsg;
    throw new Error('Message introuvable');
  },

  async toggleStarMessage(id: string): Promise<ChatMessage> {
    let updatedMsg: ChatMessage | null = null;
    try {
      const raw = localStorage.getItem('ndao_offline_messages');
      if (raw) {
        const list: ChatMessage[] = JSON.parse(raw);
        for (const m of list) {
          if (m.id === id) {
            m.isStarred = !m.isStarred;
            updatedMsg = m;
            break;
          }
        }
        localStorage.setItem('ndao_offline_messages', JSON.stringify(list));
      }
    } catch {}

    try {
      const res = await apiFetch(`/api/messages/${id}/star`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    if (updatedMsg) return updatedMsg;
    throw new Error('Message introuvable');
  },

  async togglePinMessage(id: string): Promise<ChatMessage> {
    let updatedMsg: ChatMessage | null = null;
    try {
      const raw = localStorage.getItem('ndao_offline_messages');
      if (raw) {
        const list: ChatMessage[] = JSON.parse(raw);
        for (const m of list) {
          if (m.id === id) {
            m.isPinned = !m.isPinned;
            updatedMsg = m;
            break;
          }
        }
        localStorage.setItem('ndao_offline_messages', JSON.stringify(list));
      }
    } catch {}

    try {
      const res = await apiFetch(`/api/messages/${id}/pin`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {}

    if (updatedMsg) return updatedMsg;
    throw new Error('Message introuvable');
  },

  // -------------------------------------------------------------
  // ORDERS
  // -------------------------------------------------------------
  async getOrders(): Promise<PurchaseOrder[]> {
    const res = await apiFetch('/api/orders', { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async createOrder(data: {
    vehiculeId: string;
    prixProposeFcfa?: number;
    typeDemande: 'Achat direct' | 'Négociation' | 'Demande essai';
    messageClient?: string;
    nom?: string;
    telephone?: string;
  }): Promise<{ message: string; order: PurchaseOrder }> {
    const res = await apiFetch('/api/orders', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur d\'envoi de la commande');
    return json;
  },

  async updateOrderStatus(id: string, statut: PurchaseOrder['statut'], reponseProprietaire?: string): Promise<PurchaseOrder> {
    const res = await apiFetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ statut, reponseProprietaire }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur de mise à jour du statut');
    return json;
  },

  // -------------------------------------------------------------
  // RECOVERY REQUESTS
  // -------------------------------------------------------------
  async getRecoveryRequests(): Promise<RecoveryRequest[]> {
    const res = await apiFetch('/api/recovery-requests', { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async actionRecoveryRequest(id: string, action: 'Autoriser' | 'Refuser'): Promise<RecoveryRequest> {
    const res = await apiFetch(`/api/recovery-requests/${id}/action`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur de traitement de la demande');
    return json;
  },

  // -------------------------------------------------------------
  // STATS
  // -------------------------------------------------------------
  async getStats(): Promise<DashboardStats> {
    const res = await apiFetch('/api/stats', { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur de statistiques');
    return res.json();
  },
};
