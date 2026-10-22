import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Mic,
  Send,
  Check,
  CheckCheck,
  ChevronLeft,
  Play,
  Pause,
  Copy,
  Edit3,
  Reply,
  Trash2,
  X,
  Smile,
  Camera,
  MoreVertical,
  Search,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Video,
  Star,
  Pin,
  Info,
  CornerUpRight,
  Share2,
  Film,
  Image as ImageIcon,
  FileText,
  Volume2,
} from 'lucide-react';
import { ChatMessage, Vehicle, ClientContact, Announcement } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface MessagerieScreenProps {
  vehicle?: Vehicle | null;
  announcement?: Announcement | null;
  onBack?: () => void;
}

// WhatsApp standard reaction emojis matching Screenshot 6
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '😆'];

export const MessagerieScreen: React.FC<MessagerieScreenProps> = ({
  vehicle,
  announcement,
  onBack,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);
  const { user, isOwner } = useAuth();

  // Contact list for owner
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Messages in current active conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');

  // Search within chat
  const [searchInChatOpen, setSearchInChatOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Three dots menu
  const [showTopMenu, setShowTopMenu] = useState(false);

  // Attachments picker modal
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice note recording state (Matching Screenshot 7)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);

  // Audio playback state (Matching Screenshot 8 & 6)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  // Context menu & reactions state (Matching Screenshot 6)
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState<ChatMessage | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [infoModalMsg, setInfoModalMsg] = useState<ChatMessage | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Replying & Editing
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);

  // Pinned message
  const pinnedMessage = messages.find((m) => m.isPinned);

  // Scroll anchor
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to ensure a stable persistent device ID for guest clients
  const getClientDeviceId = () => {
    try {
      let id = localStorage.getItem('ndao_client_device_id');
      if (!id) {
        id = 'client-' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('ndao_client_device_id', id);
      }
      return id;
    } catch {
      return 'client-device';
    }
  };

  const clientDeviceId = user ? user.id : getClientDeviceId();
  const clientDisplayName = user ? `${user.prenom} ${user.nom}` : 'Client NDAO\'AUTO';

  // Determine active conversation ID (guaranteed never empty!)
  const activeConvId = isOwner
    ? selectedContact
      ? selectedContact.conversationId
      : 'conv-general'
    : `conv-${clientDeviceId}`;

  // Load Contacts (if owner)
  const fetchContacts = async () => {
    if (!isOwner) return;
    try {
      setLoadingContacts(true);
      const list = await api.getConversations();
      setContacts(list);
      if (list.length > 0 && !selectedContact) {
        setSelectedContact(list[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Load Messages for current conversation
  const fetchMessages = async () => {
    try {
      setLoadingMessages(true);
      const list = await api.getMessages(activeConvId);
      setMessages(list);
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchContacts();
    }
  }, [isOwner]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [selectedContact, activeConvId, isOwner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // -------------------------------------------------------------
  // VOICE RECORDING CONTROLS (Screenshot 7)
  // -------------------------------------------------------------
  const startRecording = () => {
    setIsRecordingVoice(true);
    setIsRecordingPaused(false);
    setRecordingSeconds(0);
    clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const togglePauseRecording = () => {
    if (isRecordingPaused) {
      setIsRecordingPaused(false);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setIsRecordingPaused(true);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    setIsRecordingPaused(false);
    setRecordingSeconds(0);
  };

  const finishRecording = async () => {
    clearInterval(recordingTimerRef.current);
    const duration = Math.max(1, recordingSeconds);
    setIsRecordingVoice(false);
    setIsRecordingPaused(false);
    setRecordingSeconds(0);

    const tempId = 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Optimistic instant message in UI
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConvId,
      senderId: isOwner ? 'owner-ndao' : clientDeviceId,
      senderName: isOwner ? 'MOUHAMED NDAO' : clientDisplayName,
      senderRole: isOwner ? 'owner' : 'client',
      receiverId: isOwner ? (selectedContact?.clientId || 'client') : 'owner-ndao',
      type: 'voice',
      voiceDurationSeconds: duration,
      status: 'sent',
      createdAt: nowTime,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Animate double ticks
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'delivered' } : m))
      );
    }, 800);
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'read' } : m))
      );
    }, 2000);

    try {
      const saved = await api.sendMessage({
        conversationId: activeConvId,
        type: 'voice',
        voiceDurationSeconds: duration,
        senderRole: isOwner ? 'owner' : 'client',
        senderName: optimisticMsg.senderName,
        targetClientId: isOwner ? selectedContact?.clientId : undefined,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m))
      );
      if (isOwner) fetchContacts();
    } catch (err) {
      console.error('Send voice note caught, local message preserved', err);
    }
  };

  // -------------------------------------------------------------
  // SEND TEXT MESSAGE (Instant Optimistic & Offline-First)
  // -------------------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend) return;

    if (editingMsg) {
      setMessages((prev) =>
        prev.map((m) => (m.id === editingMsg.id ? { ...m, text: textToSend, editedAt: 'modifié' } : m))
      );
      setEditingMsg(null);
      setInputText('');
      try {
        await api.editMessage(editingMsg.id, textToSend);
      } catch (err) {
        console.error('Failed to edit message', err);
      }
      return;
    }

    const tempId = 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const replyId = replyingTo?.id;
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // 1. INSTANT optimistic append to UI
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConvId,
      senderId: isOwner ? 'owner-ndao' : clientDeviceId,
      senderName: isOwner ? 'MOUHAMED NDAO' : clientDisplayName,
      senderRole: isOwner ? 'owner' : 'client',
      receiverId: isOwner ? (selectedContact?.clientId || 'client') : 'owner-ndao',
      text: textToSend,
      type: 'text',
      replyToMessageId: replyId,
      status: 'sent',
      createdAt: nowTime,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setReplyingTo(null);

    // 2. Realistic WhatsApp delivery ticks
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'delivered' } : m))
      );
    }, 800);
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'read' } : m))
      );
    }, 2000);

    // 3. Save to localStorage & backend
    try {
      const saved = await api.sendMessage({
        conversationId: activeConvId,
        text: textToSend,
        type: 'text',
        replyToMessageId: replyId,
        senderRole: isOwner ? 'owner' : 'client',
        senderName: optimisticMsg.senderName,
        targetClientId: isOwner ? selectedContact?.clientId : undefined,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m))
      );
      if (isOwner) fetchContacts();
    } catch (err) {
      console.error('Send message caught, local message preserved:', err);
    }
  };

  // -------------------------------------------------------------
  // SEND MEDIA / ATTACHMENT
  // -------------------------------------------------------------
  const handleSendMedia = async (mediaType: 'image' | 'video', mediaUrl: string, caption?: string) => {
    setShowAttachMenu(false);
    const tempId = 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConvId,
      senderId: isOwner ? 'owner-ndao' : clientDeviceId,
      senderName: isOwner ? 'MOUHAMED NDAO' : clientDisplayName,
      senderRole: isOwner ? 'owner' : 'client',
      receiverId: isOwner ? (selectedContact?.clientId || 'client') : 'owner-ndao',
      type: 'media',
      mediaType,
      mediaUrl,
      text: caption || undefined,
      status: 'sent',
      createdAt: nowTime,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'delivered' } : m))
      );
    }, 800);
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'read' } : m))
      );
    }, 2000);

    try {
      const saved = await api.sendMessage({
        conversationId: activeConvId,
        type: 'media',
        mediaType,
        mediaUrl,
        text: caption || undefined,
        senderRole: isOwner ? 'owner' : 'client',
        senderName: optimisticMsg.senderName,
        targetClientId: isOwner ? selectedContact?.clientId : undefined,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m))
      );
      if (isOwner) fetchContacts();
    } catch (err) {
      console.error('Send media caught, local message preserved', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      handleSendMedia(isVideo ? 'video' : 'image', result, file.name);
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // AUDIO PLAYBACK (Screenshot 8 & 6)
  // -------------------------------------------------------------
  const togglePlayAudio = (msgId: string) => {
    if (playingMessageId === msgId) {
      setPlayingMessageId(null);
      setAudioProgress(0);
    } else {
      setPlayingMessageId(msgId);
      setAudioProgress(0);
      let p = 0;
      const interval = setInterval(() => {
        p += 4;
        if (p >= 100) {
          clearInterval(interval);
          setPlayingMessageId(null);
          setAudioProgress(0);
        } else {
          setAudioProgress(p);
        }
      }, 100);
    }
  };

  // -------------------------------------------------------------
  // REACTIONS & MESSAGE CONTEXT ACTIONS (Screenshot 6)
  // -------------------------------------------------------------
  const handleReactToMessage = async (msgId: string, emoji: string) => {
    setSelectedMsgForMenu(null);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m
      )
    );
    try {
      await api.reactToMessage(msgId, emoji);
    } catch (err) {
      console.error('Failed to react to message', err);
    }
  };

  const handleToggleStar = async (msgId: string) => {
    setSelectedMsgForMenu(null);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isStarred: !m.isStarred } : m))
    );
    try {
      await api.toggleStarMessage(msgId);
    } catch (err) {
      console.error('Failed to star message', err);
    }
  };

  const handleTogglePin = async (msgId: string) => {
    setSelectedMsgForMenu(null);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isPinned: !m.isPinned } : m))
    );
    try {
      await api.togglePinMessage(msgId);
    } catch (err) {
      console.error('Failed to pin message', err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    setSelectedMsgForMenu(null);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await api.deleteMessage(id);
    } catch (err: any) {
      console.error('Cannot delete message', err);
    }
  };

  const handleForwardMessage = (msg: ChatMessage) => {
    setSelectedMsgForMenu(null);
    if (msg.text) {
      navigator.clipboard.writeText(msg.text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  // Filtered messages if search is active
  const displayedMessages = chatSearchQuery.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : messages;

  // Filtered contacts
  const filteredContacts = contacts.filter(
    (c) =>
      c.clientName.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.clientPhone.includes(contactSearch)
  );

  return (
    <div className="w-full max-w-5xl mx-auto bg-[#0b141a] border border-[#1f2c34] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[750px] font-['Segoe_UI',Helvetica,Arial,sans-serif]">
      {/* Hidden file input for attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,video/*"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* OWNER CONTACTS SIDEBAR (Only visible if logged in as Owner) */}
      {/* ========================================================================= */}
      {isOwner && (
        <div className="w-full md:w-80 bg-[#111b21] border-r border-[#222d34] flex flex-col h-full shrink-0">
          <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-sm shadow">
                MN
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Mouhamed Ndao</h3>
                <span className="text-[11px] text-emerald-400 font-medium">Propriétaire NDAO'AUTO</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-[#00a884]" />
            </div>
          </div>

          <div className="p-2 border-b border-[#222d34]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un contact client..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full bg-[#202c33] text-xs text-white rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-[#00a884] placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]">
            {loadingContacts && contacts.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Chargement des contacts...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 h-full">
                <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center mb-3 text-slate-300">
                  <MessageSquare className="w-6 h-6 text-[#00a884]" />
                </div>
                <p className="text-xs font-semibold text-slate-300 mb-1">Aucune discussion client</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed">
                  Votre boîte de messagerie est vide. Dès qu'un client vous envoie un message, sa conversation apparaîtra ici.
                </p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedContact?.clientId === contact.clientId;
                return (
                  <button
                    key={contact.clientId}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full text-left p-3 flex items-center gap-3 transition cursor-pointer ${
                      isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-emerald-300 font-bold text-sm shrink-0">
                      {contact.clientName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white truncate">{contact.clientName}</h4>
                        <span className="text-[10px] text-slate-400">{contact.lastMessageTime}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{contact.lastMessageText}</p>
                      <p className="text-[10px] text-emerald-400">{contact.clientPhone}</p>
                    </div>
                    {contact.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#00a884] text-black text-[10px] font-bold flex items-center justify-center">
                        {contact.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHAT MAIN PANEL (Client or Owner active chat) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative">
        {/* WhatsApp Top Navigation Bar (Screenshot 5 & 8: NO CALL ICON!) */}
        <div className="bg-[#202c33] px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-[#2a3942] z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="text-slate-300 hover:text-white p-1 rounded-full transition cursor-pointer"
                title="Retour"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00897b] to-[#00c9a7] flex items-center justify-center text-white font-bold text-sm shadow">
                {isOwner && selectedContact
                  ? selectedContact.clientName.slice(0, 2).toUpperCase()
                  : 'MN'}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#202c33] rounded-full"></span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                <span>
                  {isOwner && selectedContact ? selectedContact.clientName : 'MOUHAMED NDAO'}
                </span>
                {!isOwner && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30 shrink-0">
                    Propriétaire
                  </span>
                )}
              </h2>
              {/* WhatsApp exact subtitle matching Screenshot 8: "en ligne auj. à 08:19" */}
              <p className="text-[11px] text-slate-300 truncate">
                {isOwner && selectedContact
                  ? selectedContact.clientPhone
                  : 'en ligne auj. à 08:19'}
              </p>
            </div>
          </div>

          {/* Action icons (NO CALL ICON! Includes Video, Paperclip, Search, 3-dots) */}
          <div className="flex items-center gap-1 sm:gap-2 text-slate-300">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2 hover:bg-[#2a3942] rounded-full transition text-slate-300 hover:text-white cursor-pointer"
              title="Joindre un document ou média"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                alert('Appel vidéo avec Mouhamed Ndao disponible sur rendez-vous ou via WhatsApp officiel.');
              }}
              className="p-2 hover:bg-[#2a3942] rounded-full transition text-slate-300 hover:text-white cursor-pointer"
              title="Appel vidéo"
            >
              <Video className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSearchInChatOpen(!searchInChatOpen)}
              className="p-2 hover:bg-[#2a3942] rounded-full transition text-slate-300 hover:text-white cursor-pointer"
              title="Rechercher dans la discussion"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => fetchMessages()}
              className="p-2 hover:bg-[#2a3942] rounded-full transition text-[#00a884] cursor-pointer"
              title="Actualiser les messages"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowTopMenu(!showTopMenu)}
                className="p-2 hover:bg-[#2a3942] rounded-full transition text-slate-300 hover:text-white cursor-pointer"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showTopMenu && (
                <div
                  className="absolute right-0 top-10 bg-[#233138] border border-[#2e3f48] shadow-2xl rounded-xl py-2 px-1 text-xs text-white min-w-[200px] z-50 space-y-1"
                  onClick={() => setShowTopMenu(false)}
                >
                  <button
                    onClick={() => setSearchInChatOpen(true)}
                    className="w-full text-left px-3 py-2 hover:bg-[#182229] rounded flex items-center gap-2 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Rechercher</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAttachMenu(true);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#182229] rounded flex items-center gap-2 cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Médias, liens et documents</span>
                  </button>
                  <button
                    onClick={() => fetchMessages()}
                    className="w-full text-left px-3 py-2 hover:bg-[#182229] rounded flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Actualiser</span>
                  </button>
                  <div className="h-[1px] bg-[#2a3942] my-1"></div>
                  <button
                    onClick={() => {
                      if (confirm('Voulez-vous effacer l\'historique local des messages ?')) {
                        setMessages([]);
                      }
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-red-950/60 text-red-400 rounded flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Effacer la discussion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* In-chat search bar toggle */}
        {searchInChatOpen && (
          <div className="bg-[#182229] border-b border-[#222d34] px-4 py-2 flex items-center gap-2 text-xs text-white">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher dans cette discussion..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-white text-xs placeholder-slate-400"
              autoFocus
            />
            {chatSearchQuery && (
              <span className="text-[10px] text-slate-400">
                {displayedMessages.length} résultat(s)
              </span>
            )}
            <button
              onClick={() => {
                setChatSearchQuery('');
                setSearchInChatOpen(false);
              }}
              className="p-1 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pinned Message Banner (Screenshot 6 Pin feature) */}
        {pinnedMessage && (
          <div className="bg-[#182229] border-b border-[#222d34] px-4 py-2 flex items-center justify-between text-xs text-slate-200 z-10 shadow-sm">
            <div className="flex items-center gap-2 truncate">
              <Pin className="w-3.5 h-3.5 text-[#00c9a7] rotate-45 shrink-0" />
              <span className="text-[#00c9a7] font-bold">Message épinglé :</span>
              <span className="truncate opacity-90">{pinnedMessage.text || 'Note vocale ou média'}</span>
            </div>
            <button
              onClick={() => handleTogglePin(pinnedMessage.id)}
              className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 transition cursor-pointer"
            >
              Détacher
            </button>
          </div>
        )}

        {/* Object / Vehicle Context if inquiry */}
        {(vehicle || announcement) && (
          <div className="bg-[#182229]/95 border-b border-[#222d34] px-4 py-2 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-emerald-400">Objet :</span>
              <span className="truncate text-white">
                {vehicle
                  ? `${vehicle.marque} ${vehicle.modele} ${vehicle.annee} (${vehicle.prixFcfa.toLocaleString('fr-FR')} FCFA)`
                  : announcement?.titre}
              </span>
            </div>
            <span className="text-[10px] bg-[#00a884]/20 text-emerald-300 px-2 py-0.5 rounded shrink-0">
              {vehicle?.disponibilite || 'Annonce NDAO\'AUTO'}
            </span>
          </div>
        )}

        {/* Message Stream Area */}
        <div
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 relative"
          style={{
            backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
          onClick={() => setSelectedMsgForMenu(null)}
        >
          {/* Welcome Encrypted banner like WhatsApp */}
          <div className="flex justify-center my-2">
            <span className="bg-[#182229]/90 border border-[#2a3942] text-[11px] text-amber-200/80 px-3 py-1 rounded-lg text-center max-w-md shadow-sm">
              🔒 Messagerie interne sécurisée NDAO'AUTO. Vos échanges avec MOUHAMED NDAO sont confidentiels et directs.
            </span>
          </div>

          {/* Date Separator Pill: Hier / Aujourd'hui (Matching Screenshot 8) */}
          <div className="flex justify-center my-3">
            <span className="bg-[#182229] border border-[#222d34] text-[11px] font-semibold text-slate-300 px-3 py-0.5 rounded-full shadow-sm">
              Aujourd'hui
            </span>
          </div>

          {/* Clean State (NO invented fake messages!) */}
          {displayedMessages.length === 0 && !loadingMessages && (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-slate-400">
              <div className="w-14 h-14 rounded-full bg-[#202c33] flex items-center justify-center mb-3 text-[#00a884]">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {isOwner
                  ? selectedContact
                    ? `Discussion avec ${selectedContact.clientName}`
                    : 'Sélectionnez un contact pour discuter'
                  : 'Discutez directement avec MOUHAMED NDAO'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                {isOwner
                  ? 'Aucun message dans cette conversation.'
                  : 'Posez vos questions sur un véhicule, négociez le prix en FCFA ou envoyez une note vocale.'}
              </p>
            </div>
          )}

          {/* Real Messages List */}
          {displayedMessages.map((msg) => {
            const isMe = isOwner ? msg.senderRole === 'owner' : msg.senderRole === 'client';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative my-1`}
              >
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedMsgForMenu(msg);
                    setMenuPosition({ x: e.clientX, y: e.clientY });
                  }}
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-md transition-all select-none relative ${
                    isMe
                      ? 'bg-[#005c4b] text-white rounded-tr-xs'
                      : 'bg-[#202c33] text-slate-100 rounded-tl-xs'
                  }`}
                >
                  {/* Sender Name if not me in group context */}
                  {!isMe && (
                    <div className="text-[10px] font-bold text-[#00a884] mb-0.5">
                      {msg.senderName}
                    </div>
                  )}

                  {/* Quoted Reply reference if any */}
                  {msg.replyToMessageId && (
                    <div className="mb-1.5 p-1.5 bg-black/25 rounded border-l-2 border-[#00a884] text-[11px] text-slate-300">
                      <span className="font-semibold text-emerald-300 block">Réponse au message</span>
                      <span className="truncate block opacity-80">Message cité</span>
                    </div>
                  )}

                  {/* Photo Media Content */}
                  {msg.type === 'media' && msg.mediaType === 'image' && msg.mediaUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-black/20">
                      <img src={msg.mediaUrl} alt="Média" className="max-h-60 w-auto object-cover rounded-xl" />
                    </div>
                  )}

                  {/* Video Media Content (Matching Screenshot 8) */}
                  {msg.type === 'media' && msg.mediaType === 'video' && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-black/30 relative bg-black/40">
                      {msg.mediaUrl ? (
                        <video
                          src={msg.mediaUrl}
                          controls
                          className="max-h-60 w-auto rounded-xl"
                        />
                      ) : (
                        <div className="w-64 h-36 bg-[#162228] flex items-center justify-center relative rounded-xl">
                          <Film className="w-10 h-10 text-emerald-400 opacity-60" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          </div>
                          <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                            <Film className="w-3 h-3" />
                            0:18
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Voice Note Type (Matching Screenshot 8 & 6) */}
                  {msg.type === 'voice' ? (
                    <div className="flex items-center gap-3 py-1 min-w-[240px] sm:min-w-[270px]">
                      {/* Avatar with small mic badge */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[#1c2d35] flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-600/50">
                          {isMe ? 'MOI' : msg.senderName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00a884] flex items-center justify-center text-black">
                          <Mic className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      {/* Play/Pause Button */}
                      <button
                        onClick={() => togglePlayAudio(msg.id)}
                        className="w-9 h-9 rounded-full bg-[#00a884] text-black flex items-center justify-center hover:scale-105 transition shrink-0 shadow cursor-pointer"
                        title={playingMessageId === msg.id ? 'Pause' : 'Écouter'}
                      >
                        {playingMessageId === msg.id ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      {/* Waveform Visualization & Slider with dot */}
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="relative w-full flex items-center h-5">
                          {/* Simulated SVG Audio Waveform bars */}
                          <div className="w-full flex items-center gap-[2px] h-4">
                            {[12, 18, 24, 14, 8, 20, 26, 30, 16, 10, 22, 28, 14, 18, 22, 12, 16, 24, 28, 14, 10, 18, 22].map(
                              (height, i) => (
                                <div
                                  key={i}
                                  className={`w-[3px] rounded-full transition-all ${
                                    playingMessageId === msg.id &&
                                    (i / 23) * 100 <= audioProgress
                                      ? 'bg-emerald-300'
                                      : 'bg-slate-400/50'
                                  }`}
                                  style={{ height: `${height}%` }}
                                />
                              )
                            )}
                          </div>
                        </div>

                        {/* Duration timer */}
                        <div className="flex items-center justify-between text-[10px] text-slate-300">
                          <span>
                            0:
                            {msg.voiceDurationSeconds
                              ? msg.voiceDurationSeconds.toString().padStart(2, '0')
                              : '06'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed break-words text-sm">{msg.text}</p>
                  )}

                  {/* Metadata: Time + Delivery Status + Star */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-300/80 float-right ml-3">
                    {msg.isStarred && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                    {msg.isPinned && <Pin className="w-3 h-3 text-[#00c9a7] rotate-45" />}
                    {msg.editedAt && <span className="italic mr-1">modifié</span>}
                    <span>{msg.createdAt}</span>
                    {isMe && (
                      <CheckCheck
                        className={`w-3.5 h-3.5 ${
                          msg.status === 'read' ? 'text-[#53bdeb]' : 'text-slate-400'
                        }`}
                      />
                    )}
                  </div>

                  {/* Reaction badge on bottom right of bubble (Matching Screenshot 8 & 6) */}
                  {msg.reaction && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReactToMessage(msg.id, msg.reaction!);
                      }}
                      className="absolute -bottom-2 right-2 bg-[#202c33] border border-[#2a3942] rounded-full px-1.5 py-0.5 text-xs shadow-md flex items-center gap-1 cursor-pointer hover:scale-110 transition"
                      title="Cliquez pour supprimer ou changer la réaction"
                    >
                      <span>{msg.reaction}</span>
                    </div>
                  )}

                  {/* Fast Context trigger button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMsgForMenu(msg);
                      setMenuPosition({ x: e.clientX, y: e.clientY });
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-white rounded-full bg-black/40 hover:bg-black/60 transition cursor-pointer"
                    title="Menu du message"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Replying banner if active */}
        {replyingTo && (
          <div className="bg-[#182229] border-t border-[#222d34] px-4 py-2 flex items-center justify-between text-xs text-slate-300">
            <div className="border-l-2 border-[#00a884] pl-2 truncate">
              <span className="font-semibold text-emerald-400 block">
                Répondre à {replyingTo.senderName}
              </span>
              <span className="truncate block opacity-75">
                {replyingTo.text || (replyingTo.type === 'voice' ? 'Note vocale' : 'Média')}
              </span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editing banner if active */}
        {editingMsg && (
          <div className="bg-[#182229] border-t border-[#222d34] px-4 py-2 flex items-center justify-between text-xs text-amber-300">
            <span>Modification du message</span>
            <button
              onClick={() => {
                setEditingMsg(null);
                setInputText('');
              }}
              className="p-1 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Attachment Options Drawer */}
        {showAttachMenu && (
          <div className="bg-[#1c272e] border-t border-[#2a3942] p-3 grid grid-cols-3 sm:grid-cols-4 gap-2 text-center text-xs text-slate-200">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-[#202c33] hover:bg-[#2a3942] rounded-xl flex flex-col items-center gap-1.5 transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <span className="text-[11px]">Photos & Vidéos</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-[#202c33] hover:bg-[#2a3942] rounded-xl flex flex-col items-center gap-1.5 transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-rose-600/30 text-rose-400 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[11px]">Caméra</span>
            </button>

            {vehicle && (
              <button
                onClick={() =>
                  handleSendMedia(
                    'image',
                    vehicle.images[0] || '/logo.svg',
                    `Fiche Véhicule : ${vehicle.marque} ${vehicle.modele} ${vehicle.annee} — ${vehicle.prixFcfa.toLocaleString('fr-FR')} FCFA`
                  )
                }
                className="p-3 bg-[#202c33] hover:bg-[#2a3942] rounded-xl flex flex-col items-center gap-1.5 transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px]">Fiche Véhicule</span>
              </button>
            )}

            <button
              onClick={() => {
                handleSendMedia(
                  'video',
                  '',
                  'Vidéo de présentation du véhicule par MOUHAMED NDAO'
                );
              }}
              className="p-3 bg-[#202c33] hover:bg-[#2a3942] rounded-xl flex flex-col items-center gap-1.5 transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-sky-600/30 text-sky-400 flex items-center justify-center">
                <Film className="w-5 h-5" />
              </div>
              <span className="text-[11px]">Vidéo Essai</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOTTOM INPUT BAR */}
        {/* ========================================================================= */}
        <div className="bg-[#202c33] px-3 py-2 border-t border-[#2a3942] flex items-center gap-2 shrink-0">
          {isRecordingVoice ? (
            /* Voice Recording Mode (Matching Screenshot 7) */
            <div className="flex-1 flex items-center justify-between bg-[#111b21] px-4 py-2.5 rounded-2xl border border-slate-700/60 shadow-lg">
              {/* Trash icon on the left (Screenshot 7) */}
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-full transition cursor-pointer"
                title="Supprimer / Annuler l'enregistrement"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* Timer & Waveform */}
              <div className="flex items-center gap-3 flex-1 px-4">
                <span className="text-white text-xs font-mono font-bold">
                  0:{recordingSeconds.toString().padStart(2, '0')}
                </span>

                {/* Animated Waveform bars (Screenshot 7) */}
                <div className="flex-1 flex items-center gap-[3px] h-5 overflow-hidden">
                  {[8, 14, 22, 10, 18, 28, 12, 16, 26, 32, 14, 20, 24, 10, 18, 28, 14, 8, 22, 16, 30, 24].map(
                    (val, idx) => (
                      <div
                        key={idx}
                        className={`w-[3px] rounded-full transition-all duration-150 ${
                          isRecordingPaused ? 'bg-slate-600' : 'bg-red-400 animate-pulse'
                        }`}
                        style={{
                          height: isRecordingPaused ? '4px' : `${Math.max(4, (val * (recordingSeconds % 3 + 1)) % 28)}px`,
                        }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Pause / Resume red circle button in center (Screenshot 7) */}
              <button
                type="button"
                onClick={togglePauseRecording}
                className="w-8 h-8 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition cursor-pointer mr-3"
                title={isRecordingPaused ? 'Reprendre' : 'Pause'}
              >
                {isRecordingPaused ? (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                ) : (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                )}
              </button>

              {/* Blue / Green circular send button on right (Screenshot 7) */}
              <button
                type="button"
                onClick={finishRecording}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition transform active:scale-95 cursor-pointer"
                title="Envoyer la note vocale"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          ) : (
            /* Standard Text Mode */
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + '🤝 ');
                }}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-[#2a3942] transition cursor-pointer"
                title="Insérer un émoticône"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-[#2a3942] transition cursor-pointer"
                title="Joindre une photo du véhicule ou document"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  placeholder={
                    isOwner
                      ? `Répondre à ${selectedContact ? selectedContact.clientName : 'Client'}...`
                      : 'Tapez un message...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full bg-[#2a3942] text-white text-sm rounded-2xl pl-4 pr-10 py-2.5 outline-none focus:ring-1 focus:ring-[#00a884] placeholder-slate-400"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
                  title="Prendre une photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {inputText.trim() ? (
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-emerald-400 text-black flex items-center justify-center transition shadow shrink-0 cursor-pointer"
                  title="Envoyer le message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-emerald-400 text-black flex items-center justify-center transition shadow shrink-0 cursor-pointer"
                  title="Maintenir pour enregistrer une note vocale"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MESSAGE CONTEXT MENU & FLOATING REACTION BAR (Matching Screenshot 6) */}
      {/* ========================================================================= */}
      {selectedMsgForMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setSelectedMsgForMenu(null)}
        >
          <div
            className="bg-[#233138] border border-[#2e3f48] shadow-2xl rounded-2xl p-2 text-xs text-white w-72 max-w-full space-y-2 select-none"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: menuPosition ? `${Math.max(10, Math.min(menuPosition.y - 120, window.innerHeight - 380))}px` : 'auto',
            }}
          >
            {/* 1. Floating Reactions Bar on top (Screenshot 6) */}
            <div className="flex items-center justify-between bg-[#111b21] p-1.5 rounded-xl border border-slate-700/60 shadow-inner">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReactToMessage(selectedMsgForMenu.id, emoji)}
                  className="w-8 h-8 rounded-full hover:bg-[#202c33] flex items-center justify-center text-lg hover:scale-125 transition transform cursor-pointer"
                  title={`Réagir avec ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => handleReactToMessage(selectedMsgForMenu.id, '🚗')}
                className="w-7 h-7 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                title="Plus d'émojis"
              >
                +
              </button>
            </div>

            {/* 2. Context Menu Items (Screenshot 6: Reply, Forward, Info, Star, Pin, Delete) */}
            <div className="divide-y divide-[#2a3942]">
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setReplyingTo(selectedMsgForMenu);
                    setSelectedMsgForMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#182229] rounded-lg flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <span className="font-medium text-xs">Reply (Répondre)</span>
                  <Reply className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleForwardMessage(selectedMsgForMenu)}
                  className="w-full text-left px-3 py-2 hover:bg-[#182229] rounded-lg flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <span className="font-medium text-xs">Forward (Transférer)</span>
                  <CornerUpRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setInfoModalMsg(selectedMsgForMenu);
                    setSelectedMsgForMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#182229] rounded-lg flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <span className="font-medium text-xs">Info (Informations)</span>
                  <Info className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleToggleStar(selectedMsgForMenu.id)}
                  className="w-full text-left px-3 py-2 hover:bg-[#182229] rounded-lg flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <span className="font-medium text-xs">
                    {selectedMsgForMenu.isStarred ? 'Retirer des importants' : 'Star (Message important)'}
                  </span>
                  <Star
                    className={`w-4 h-4 ${
                      selectedMsgForMenu.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                    }`}
                  />
                </button>

                <button
                  onClick={() => handleTogglePin(selectedMsgForMenu.id)}
                  className="w-full text-left px-3 py-2 hover:bg-[#182229] rounded-lg flex items-center justify-between text-slate-200 cursor-pointer"
                >
                  <span className="font-medium text-xs">
                    {selectedMsgForMenu.isPinned ? 'Détacher (Unpin)' : 'Pin (Épingler)'}
                  </span>
                  <Pin className="w-4 h-4 text-slate-400 rotate-45" />
                </button>
              </div>

              {/* Author-only actions */}
              <div className="pt-1">
                {(selectedMsgForMenu.senderRole === 'owner' ? isOwner : !isOwner) && (
                  <>
                    <button
                      onClick={() => {
                        setEditingMsg(selectedMsgForMenu);
                        setInputText(selectedMsgForMenu.text || '');
                        setSelectedMsgForMenu(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#182229] rounded-lg flex items-center justify-between text-slate-200 cursor-pointer"
                    >
                      <span className="font-medium text-xs">Modifier</span>
                      <Edit3 className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(selectedMsgForMenu.id)}
                      className="w-full text-left px-3 py-2 hover:bg-red-950/60 rounded-lg flex items-center justify-between text-red-400 cursor-pointer"
                    >
                      <span className="font-medium text-xs">Delete (Supprimer)</span>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Info Modal */}
      {infoModalMsg && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInfoModalMsg(null)}
        >
          <div
            className="bg-[#202c33] border border-[#2a3942] rounded-2xl p-5 max-w-sm w-full text-white shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
              <h3 className="font-bold text-sm">Info du message</h3>
              <button onClick={() => setInfoModalMsg(null)} className="p-1 hover:text-slate-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#111b21] rounded-xl text-xs text-slate-200">
              <p className="font-semibold text-emerald-400 mb-1">{infoModalMsg.senderName}</p>
              <p className="break-words">{infoModalMsg.text || 'Note vocale ou média'}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                  <span>Lu</span>
                </span>
                <span className="text-slate-400">{infoModalMsg.createdAt}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-slate-400" />
                  <span>Distribué</span>
                </span>
                <span className="text-slate-400">{infoModalMsg.createdAt}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copied notification toast */}
      {copiedNotification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#00a884] text-black px-4 py-2 rounded-full font-bold text-xs shadow-2xl animate-bounce flex items-center gap-2">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Message copié pour transfert !</span>
        </div>
      )}
    </div>
  );
};
