"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Upload,
  RotateCcw,
  Send,
  FileText,
  Sparkles,
  Trash2,
  Plus,
  MessageSquare,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  Loader2,
  RefreshCw,
  Cloud,
  Database,
  BrainCircuit,
  Bot,
  User,
  CheckCircle2,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  pdfContextUrl?: string;
  pdfName?: string;
  error?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
  pdfUrl?: string;
  pdfName?: string;
}

export default function ClaudeRAGApp() {
  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Backend configuration state
  const [backendUrl, setBackendUrl] = useState<string>("http://localhost:5000");
  const [cloudName, setCloudName] = useState<string>("drxliiejo");
  const [uploadPreset, setUploadPreset] = useState<string>("nexentia");
  const [backendHealth, setBackendHealth] = useState<"online" | "offline" | "checking">("checking");

  // App UI state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [isAsking, setIsAsking] = useState<boolean>(false);

  // Active document state
  const [activePdfName, setActivePdfName] = useState<string | null>(null);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [activePdfSize, setActivePdfSize] = useState<string | null>(null);

  // Chat sessions & active messages
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);

  // Notifications / Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to trigger toast
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Check backend health
  const checkBackendHealth = async () => {
    setBackendHealth("checking");
    try {
      const res = await fetch(`${backendUrl}/health`, { method: "GET" });
      if (res.ok) {
        setBackendHealth("online");
      } else {
        setBackendHealth("offline");
      }
    } catch {
      setBackendHealth("offline");
    }
  };

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  // Load chat history & settings from localStorage
  useEffect(() => {
    const savedBackend = localStorage.getItem("rag_backend_url");
    if (savedBackend) setBackendUrl(savedBackend);

    const savedCloud = localStorage.getItem("rag_cloud_name");
    if (savedCloud) setCloudName(savedCloud);

    const savedSessions = localStorage.getItem("rag_sessions");
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages || []);
          if (parsed[0].pdfUrl) {
            setActivePdfUrl(parsed[0].pdfUrl);
            setActivePdfName(parsed[0].pdfName || "Uploaded Document.pdf");
          }
        } else {
          createNewChat();
        }
      } catch (e) {
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  // Save sessions to local storage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("rag_sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  // Update current session's messages
  useEffect(() => {
    if (!currentSessionId) return;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          const firstUserMsg = messages.find((m) => m.sender === "user");
          let title = s.title;
          if (firstUserMsg && s.title === "New Chat") {
            title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? "..." : "");
          }
          return {
            ...s,
            title,
            messages,
            pdfUrl: activePdfUrl || s.pdfUrl,
            pdfName: activePdfName || s.pdfName,
          };
        }
        return s;
      })
    );
  }, [messages, activePdfUrl, activePdfName]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAsking]);

  // Create new chat session
  const createNewChat = () => {
    const newId = "session_" + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: "New Chat",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages([]);
  };

  // Select existing session
  const selectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    if (session.pdfUrl) {
      setActivePdfUrl(session.pdfUrl);
      setActivePdfName(session.pdfName || "Uploaded PDF");
    }
  };

  // Delete chat session
  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    localStorage.setItem("rag_sessions", JSON.stringify(remaining));

    if (currentSessionId === sessionId) {
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
        setMessages(remaining[0].messages || []);
      } else {
        createNewChat();
      }
    }
    showToast("Chat session deleted", "info");
  };

  // Auto adjust textarea height
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuery(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Handle PDF Upload to Cloudinary and backend
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showToast("Please select a valid PDF file.", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Step 1/2: Uploading PDF to Cloudinary (Cloud: " + cloudName + ")...");

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("cloud_name", cloudName);

      // Call our Next.js API upload route (which proxies to Cloudinary)
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || "Failed to upload file to Cloudinary.");
      }

      const cloudinaryUrl = uploadData.url;
      const formattedSize = (file.size / (1024 * 1024)).toFixed(2) + " MB";

      setActivePdfName(file.name);
      setActivePdfUrl(cloudinaryUrl);
      setActivePdfSize(formattedSize);

      setUploadProgress("Step 2/2: Ingesting into Flask RAG & vector index...");

      // Send Cloudinary URL to Flask Backend /pdf route
      const pdfBackendRes = await fetch(`${backendUrl}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cloudinaryUrl }),
      });

      const pdfBackendData = await pdfBackendRes.json();

      if (!pdfBackendRes.ok) {
        throw new Error(pdfBackendData.message || pdfBackendData.error || "Backend failed to process PDF");
      }

      // Append confirmation message in chat
      const systemNotice: Message = {
        id: "msg_" + Date.now(),
        sender: "ai",
        text: `📄 **Document successfully loaded!**\n\n- **File Name**: \`${file.name}\`\n- **Cloudinary URL**: [View PDF](${cloudinaryUrl})\n- **Status**: Extracted text, computed embeddings, and indexed vectors into Pinecone.\n\nAsk any question about this document below!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        pdfContextUrl: cloudinaryUrl,
        pdfName: file.name,
      };

      setMessages((prev) => [...prev, systemNotice]);
      showToast("PDF uploaded to Cloudinary and vector database updated!", "success");
    } catch (err: any) {
      console.error("Upload error:", err);
      showToast(err.message || "Failed to process PDF file.", "error");

      const errorMsg: Message = {
        id: "msg_" + Date.now(),
        sender: "ai",
        text: `⚠️ **Upload Failed**: ${err.message}\n\nPlease verify that your Flask backend is running on \`${backendUrl}\` and Cloudinary cloud name is \`${cloudName}\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Reset action (calls POST /reset on Flask backend and clears all frontend state)
  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all data? This will clear all chat messages, active PDF data, and backend vector index.")) {
      return;
    }

    try {
      showToast("Resetting vector index and clearing all data...", "info");
      const res = await fetch(`${backendUrl}/reset`, {
        method: "POST",
      });

      const data = await res.json();

      // Completely clear all frontend data
      setMessages([]);
      setActivePdfName(null);
      setActivePdfUrl(null);
      setActivePdfSize(null);
      setInputQuery("");
      setSessions([]);
      setCurrentSessionId("");
      localStorage.removeItem("rag_chat_sessions");

      if (res.ok) {
        showToast("System reset complete! All chat history and PDF data cleared.", "success");
      } else {
        showToast("Frontend data cleared. Backend note: " + (data.message || "Reset done"), "info");
      }
    } catch (err: any) {
      // Even if backend network fails, clear frontend state as requested
      setMessages([]);
      setActivePdfName(null);
      setActivePdfUrl(null);
      setActivePdfSize(null);
      setInputQuery("");
      setSessions([]);
      setCurrentSessionId("");
      localStorage.removeItem("rag_chat_sessions");
      showToast("Frontend data cleared successfully.", "success");
    }
  };

  // Submit Question to Flask Backend /question
  const handleSendQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const query = inputQuery.trim();
    if (!query || isAsking) return;

    // User Message
    const userMsg: Message = {
      id: "user_" + Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsAsking(true);

    try {
      const res = await fetch(`${backendUrl}/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ques: query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Error generating response from RAG system");
      }

      // Backend returns `{ "responce": "..." }`
      const aiResponseText = data.responce || data.response || data.ans || "No response content received.";

      const aiMsg: Message = {
        id: "ai_" + Date.now(),
        sender: "ai",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("Error asking question:", err);
      const errorMsg: Message = {
        id: "ai_" + Date.now(),
        sender: "ai",
        text: `❌ **Error querying RAG system**: ${err.message}\n\nPlease check if your Flask API server is active on \`${backendUrl}\`.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      showToast(err.message || "Failed to fetch response.", "error");
    } finally {
      setIsAsking(false);
    }
  };

  // Copy text helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Copied to clipboard!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Save Settings
  const handleSaveSettings = () => {
    localStorage.setItem("rag_backend_url", backendUrl);
    localStorage.setItem("rag_cloud_name", cloudName);
    setSettingsOpen(false);
    showToast("Settings saved successfully!", "success");
    checkBackendHealth();
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === "dark" ? "dark bg-[#181816] text-[#ecebe6]" : "bg-[#faf8f5] text-[#2b2a27]"}`}>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all duration-300 transform translate-y-0 ${
            toast.type === "success"
              ? "bg-emerald-900/90 border-emerald-700 text-emerald-100"
              : toast.type === "error"
              ? "bg-rose-900/90 border-rose-700 text-rose-100"
              : "bg-[#282724] border-[#44423d] text-amber-200"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400" />}
          {toast.type === "info" && <Sparkles className="w-5 h-5 text-amber-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hidden File Input for PDF */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="application/pdf,.pdf"
        className="hidden"
      />

      {/* LEFT SIDEBAR (Clean & Uncluttered) */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0 -translate-x-full md:w-0"
        } transition-all duration-300 flex flex-col h-full border-r ${
          theme === "dark" ? "bg-[#1e1e1b] border-[#2e2d28]" : "bg-[#f3f0e9] border-[#e2dcd0]"
        } relative z-20 shrink-0 overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#da7756] via-amber-500 to-violet-600 flex items-center justify-center text-white shadow-lg animate-pulse-glow">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h1 className="font-brand font-bold text-base tracking-tight leading-none bg-gradient-to-r from-foreground via-amber-200 to-[#da7756] bg-clip-text text-transparent">
                Nexentia RAG
              </h1>
              <p className="text-[10px] text-muted font-mono tracking-wider">PDF INTELLIGENCE</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-secondary"
            title="Collapse Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#da7756] to-amber-600 hover:from-[#c66444] hover:to-amber-700 text-white font-medium text-xs shadow-lg transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Active PDF Card */}
        {activePdfName && (
          <div className="mx-3 my-2 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/25 text-xs flex flex-col gap-1.5 animate-scale-in">
            <div className="flex items-center justify-between text-amber-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Active Document
              </span>
            </div>
            <p className="font-medium truncate text-foreground/90">{activePdfName}</p>
            {activePdfSize && <p className="text-[10px] text-muted">Size: {activePdfSize}</p>}
          </div>
        )}

        {/* Recent Conversations */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          <div className="px-3 py-1 text-[10px] font-semibold text-muted font-mono tracking-wider uppercase">
            Conversations
          </div>
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted italic">No chats yet</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => selectSession(s)}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  s.id === currentSessionId
                    ? theme === "dark"
                      ? "bg-[#2c2b27] text-white shadow-sm"
                      : "bg-[#e8e4da] text-black"
                    : "hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{s.title || "Untitled Chat"}</span>
                </div>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 rounded transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-inherit flex items-center justify-between bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                backendHealth === "online"
                  ? "bg-emerald-500 animate-pulse"
                  : backendHealth === "checking"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />
            <span className="text-[11px] font-mono text-muted">
              {backendHealth === "online" ? "RAG Server Ready" : "Connecting..."}
            </span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-secondary"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* TOP BAR / NAVIGATION */}
        <header
          className={`h-14 border-b ${
            theme === "dark" ? "bg-[#181816]/90 border-[#2e2d28]" : "bg-[#faf8f5]/90 border-[#e5e0d3]"
          } backdrop-blur-md px-4 flex items-center justify-between z-10 shrink-0`}
        >
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl border border-inherit hover:bg-black/5 dark:hover:bg-white/5 text-secondary cursor-pointer"
                title="Open Sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="font-serif-claude text-lg font-semibold tracking-tight">Claude AI Assistant</span>
              {activePdfName && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/15 text-amber-500 border border-amber-500/30 truncate max-w-[150px]">
                  {activePdfName}
                </span>
              )}
            </div>
          </div>

          {/* TOP RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-2">
            {/* UPLOAD MY DATA BUTTON */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#da7756] hover:bg-[#c66444] active:scale-95 text-white font-medium text-xs shadow-md transition-all duration-150 disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{isUploading ? "Uploading..." : "Upload My Data"}</span>
            </button>

            {/* RESET BUTTON */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-inherit hover:bg-rose-500/10 hover:border-rose-500/40 text-rose-400 hover:text-rose-300 text-xs font-medium transition-all active:scale-95 cursor-pointer"
              title="Reset backend vector database and clear context"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Data</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl border border-inherit hover:bg-black/5 dark:hover:bg-white/5 text-secondary"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* UPLOADING STATUS OVERLAY BANNER */}
        {isUploading && (
          <div className="bg-[#da7756] text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-inner animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{uploadProgress}</span>
            </div>
            <span className="text-[10px] font-mono opacity-90">Cloudinary: {cloudName}</span>
          </div>
        )}

        {/* CHAT MESSAGES / WORKSPACE AREA */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex justify-center">
          <div className="w-full max-w-3xl flex flex-col justify-between min-h-full">
            {messages.length === 0 ? (
              /* CLEAN ANIMATED DASHBOARD HERO STATE */
              <div className="my-auto flex flex-col items-center text-center space-y-6 py-12 animate-scale-in">
                <div className="w-16 h-16 rounded-2xl bg-[#da7756]/15 border border-[#da7756]/30 flex items-center justify-center text-[#da7756] shadow-xl animate-float">
                  <Sparkles className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-md">
                  <h2 className="font-serif-claude text-2xl md:text-3xl font-semibold tracking-tight">
                    How can I help analyze your PDF?
                  </h2>
                  <p className="text-xs text-secondary leading-relaxed">
                    Upload your document to analyze, extract insights, and get instant answers based directly on your data.
                  </p>
                </div>

                {/* ESSENTIAL ACTION CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-xl pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-2xl border border-dashed border-[#da7756]/40 hover:border-[#da7756] bg-black/5 dark:bg-white/5 hover:bg-[#da7756]/10 text-left transition-all duration-200 transform hover:-translate-y-1 cursor-pointer group"
                  >
                    <Upload className="w-5 h-5 text-[#da7756] mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-medium text-xs text-foreground mb-0.5 group-hover:text-[#da7756]">Upload PDF</h3>
                    <p className="text-[11px] text-secondary">Index document for Q&A</p>
                  </button>

                  <button
                    onClick={() => {
                      setInputQuery("Summarize the key findings and main insights in this document.");
                      textareaRef.current?.focus();
                    }}
                    className="p-4 rounded-2xl border border-inherit hover:border-[#da7756]/50 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-left transition-all duration-200 transform hover:-translate-y-1 cursor-pointer group"
                  >
                    <BrainCircuit className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-medium text-xs text-foreground mb-0.5 group-hover:text-amber-500">Summarize</h3>
                    <p className="text-[11px] text-secondary">Get document summary</p>
                  </button>

                  <button
                    onClick={() => {
                      setInputQuery("List all important numbers, statistics, and dates mentioned in the text.");
                      textareaRef.current?.focus();
                    }}
                    className="p-4 rounded-2xl border border-inherit hover:border-[#da7756]/50 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-left transition-all duration-200 transform hover:-translate-y-1 cursor-pointer group"
                  >
                    <Database className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-medium text-xs text-foreground mb-0.5 group-hover:text-emerald-500">Extract Data</h3>
                    <p className="text-[11px] text-secondary">Find key metrics & numbers</p>
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE MESSAGES LIST */
              <div className="space-y-6 pb-24">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col animate-scale-in ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      {msg.sender === "ai" ? (
                        <>
                          <div className="w-6 h-6 rounded-md bg-[#da7756] flex items-center justify-center text-white">
                            <Sparkles className="w-3.5 h-3.5 fill-current" />
                          </div>
                          <span className="font-medium text-xs font-serif-claude">Claude Assistant</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-xs text-secondary">You</span>
                          <div className="w-6 h-6 rounded-md bg-zinc-700 flex items-center justify-center text-white">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        </>
                      )}
                      <span className="text-[10px] text-muted">{msg.timestamp}</span>
                    </div>

                    {/* Message Bubble Box */}
                    <div
                      className={`relative group max-w-2xl rounded-2xl p-4 transition-all shadow-sm ${
                        msg.sender === "user"
                          ? theme === "dark"
                            ? "bg-[#2c2b27] border border-[#3e3c36] text-[#f4f3ee]"
                            : "bg-[#e8e4da] border border-[#d6cfc0] text-[#22211f]"
                          : msg.error
                          ? "bg-rose-950/30 border border-rose-800/50 text-rose-200"
                          : theme === "dark"
                          ? "bg-[#22221f] border border-[#33322d] text-[#ecebe6]"
                          : "bg-white border border-[#e5e0d3] text-[#2b2a27]"
                      }`}
                    >
                      {/* Markdown content */}
                      <div className="prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      </div>

                      {/* PDF Context tag if attached */}
                      {msg.pdfName && (
                        <div className="mt-3 pt-2.5 border-t border-inherit flex items-center justify-between text-xs text-amber-500/90 font-mono">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            {msg.pdfName}
                          </span>
                          {msg.pdfContextUrl && (
                            <a
                              href={msg.pdfContextUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-1 text-[11px]"
                            >
                              Cloudinary Link <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Action toolbar for AI messages */}
                      {msg.sender === "ai" && (
                        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-inherit opacity-75 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(msg.text, msg.id)}
                            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted hover:text-foreground text-xs flex items-center gap-1"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* IS ASKING / LOADING INDICATOR */}
                {isAsking && (
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-6 h-6 rounded-md bg-[#da7756] flex items-center justify-center text-white animate-pulse">
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <span className="font-medium text-xs font-serif-claude">Claude Assistant</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-[#da7756] animate-spin" />
                      <span className="text-xs text-secondary font-mono animate-pulse">
                        Searching Pinecone vectors & querying Llama 3.3 70B...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* INPUT FORM CONTAINER (Fixed at bottom) */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 ${
            theme === "dark" ? "bg-gradient-to-t from-[#181816] via-[#181816]/95 to-transparent" : "bg-gradient-to-t from-[#faf8f5] via-[#faf8f5]/95 to-transparent"
          } flex justify-center z-20`}
        >
          <div className="w-full max-w-3xl">
            <form
              onSubmit={handleSendQuestion}
              className={`relative flex items-end gap-2 p-2.5 rounded-2xl border shadow-xl transition-all ${
                theme === "dark"
                  ? "bg-[#22221f] border-[#383732] focus-within:border-[#da7756]"
                  : "bg-white border-[#e5e0d3] focus-within:border-[#da7756]"
              }`}
            >
              {/* Attachment / Upload button inside input bar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 rounded-xl text-secondary hover:text-[#da7756] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                title="Upload PDF to Cloudinary"
              >
                <Upload className="w-5 h-5" />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputQuery}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendQuestion();
                  }
                }}
                placeholder={
                  activePdfName
                    ? `Ask a question about ${activePdfName}...`
                    : "Upload a PDF or ask questions about your document..."
                }
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm px-1 py-1 max-h-48 text-foreground placeholder:text-muted"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputQuery.trim() || isAsking}
                className="p-2 rounded-xl bg-[#da7756] hover:bg-[#c66444] active:scale-95 disabled:opacity-30 disabled:hover:bg-[#da7756] text-white transition-all duration-150 cursor-pointer shrink-0"
                title="Send Question"
              >
                {isAsking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>

            <div className="flex items-center justify-between mt-2 px-2 text-[11px] text-muted font-mono">
              <span className="flex items-center gap-1">
                <Cloud className="w-3 h-3 text-[#da7756]" /> Cloudinary: {cloudName}
              </span>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl space-y-5 ${
              theme === "dark" ? "bg-[#22221f] border-[#383732]" : "bg-white border-[#e5e0d3]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#da7756]" />
                <h3 className="font-semibold text-base font-serif-claude">Backend & Cloud Settings</h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Flask API URL */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Flask RAG Backend URL</label>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                  className="w-full px-3 py-2 rounded-xl border border-inherit bg-black/5 dark:bg-white/5 outline-none focus:border-[#da7756] font-mono"
                />
                <p className="text-[11px] text-muted">Endpoints target: /pdf, /question, /reset, /health</p>
              </div>

              {/* Cloudinary Name */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Cloudinary Cloud Name</label>
                <input
                  type="text"
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  placeholder="drxliiejo"
                  className="w-full px-3 py-2 rounded-xl border border-inherit bg-black/5 dark:bg-white/5 outline-none focus:border-[#da7756] font-mono"
                />
                <p className="text-[11px] text-muted">PDF uploads are sent to api.cloudinary.com/v1_1/{cloudName}/auto/upload</p>
              </div>

              {/* Cloudinary Upload Preset */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground block">Upload Preset (Unsigned)</label>
                <input
                  type="text"
                  value={uploadPreset}
                  onChange={(e) => setUploadPreset(e.target.value)}
                  placeholder="ml_default"
                  className="w-full px-3 py-2 rounded-xl border border-inherit bg-black/5 dark:bg-white/5 outline-none focus:border-[#da7756] font-mono"
                />
                <p className="text-[11px] text-muted">Default is ml_default</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-inherit">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 rounded-xl border border-inherit text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl bg-[#da7756] hover:bg-[#c66444] text-white text-xs font-medium shadow-md"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
