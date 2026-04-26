/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Terminal, 
  Globe, 
  Zap, 
  Smile, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Cpu,
  Lock,
  ChevronRight,
  BrainCircuit,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  ListRestart,
  Video,
  Play,
  Settings,
  Download,
  Mic,
  MicOff,
  Menu,
  MoreVertical,
  X,
  History
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Persona, Message, LANGUAGES, ChatHistory } from './types';
import { chat, generateImage, generateVideo, detectLanguage } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Extend global window for AI Studio API
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [persona, setPersona] = useState<Persona>(Persona.CLASSIC);
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('es');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [hasVideoKey, setHasVideoKey] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  
  // Cycle thinking states
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTyping) {
      interval = setInterval(() => {
        setThinkingIndex((prev) => (prev + 1) % 5);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isTyping]);

  const THINKING_LABELS = [
    "Sequencing Neural Vectors",
    "Optimizing Output Parity",
    "Semantic Hash Mapping",
    "Aligning Logical Heuristics",
    "Synthesizing Natural Context"
  ];
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('astrix_chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistories(parsed);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Sync current chat to its history record
  useEffect(() => {
    if (messages.length > 0) {
      const chatId = currentChatId || Date.now().toString();
      if (!currentChatId) setCurrentChatId(chatId);

      const firstUserMsg = messages.find(m => m.role === 'user')?.content || 'New Conversation';
      const title = firstUserMsg.substring(0, 30) + (firstUserMsg.length > 30 ? '...' : '');

      const updatedHistories = histories.filter(h => h.id !== chatId);
      const currentRecord: ChatHistory = {
        id: chatId,
        title,
        messages,
        persona,
        timestamp: Date.now()
      };

      const finalHistories = [currentRecord, ...updatedHistories];
      setHistories(finalHistories);
      localStorage.setItem('astrix_chats', JSON.stringify(finalHistories));
    }
  }, [messages]);

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setInput('');
  };

  const loadChat = (h: ChatHistory) => {
    setMessages(h.messages);
    setPersona(h.persona);
    setCurrentChatId(h.id);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = histories.filter(h => h.id !== id);
    setHistories(updated);
    localStorage.setItem('astrix_chats', JSON.stringify(updated));
    if (currentChatId === id) {
      startNewChat();
    }
  };

  const clearAllHistory = () => {
    if (window.confirm("Are you sure you want to clear all chat history? This cannot be undone.")) {
      setHistories([]);
      localStorage.removeItem('astrix_chats');
      startNewChat();
    }
  };

  // Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        
        // Voice Commands
        if (transcript.includes("start new chat") || transcript.includes("clear messages")) {
          startNewChat();
          return;
        }
        if (transcript.includes("switch to classic mode")) { setPersona(Persona.CLASSIC); return; }
        
        setInput(event.results[0][0].transcript);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Check for video key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasVideoKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleConnectVideo = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasVideoKey(true);
    }
  };

  // Language detection logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (input.trim().length > 10 && !isTranslating) {
        setIsDetecting(true);
        try {
          const lang = await detectLanguage(input);
          if (lang && lang.toLowerCase() !== 'english') {
            setDetectedLang(lang);
            setShowSuggestion(true);
          } else {
            setShowSuggestion(false);
          }
        } catch (e) {
          console.error("Language detection failed", e);
        } finally {
          setIsDetecting(false);
        }
      } else {
        setShowSuggestion(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [input, isTranslating]);

  const enableTranslationForDetected = () => {
    if (detectedLang) {
      setTargetLang(detectedLang);
      setIsTranslating(true);
      setShowSuggestion(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isGeneratingImage, isGeneratingVideo]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || isGeneratingImage || isGeneratingVideo) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    
    // Heuristic for image generation
    const isImageRequest = /\b(generate|create|make|show|draw)\b.*\b(image|picture|photo|illustration|art)\b/i.test(currentInput);
    // Heuristic for video generation
    const isVideoRequest = /\b(generate|create|make|show|motion|animate)\b.*\b(video|movie|clip|animation)\b/i.test(currentInput);

    if (isVideoRequest) {
      if (!hasVideoKey) {
        setMessages(prev => [...prev, {
          role: 'model',
          content: "Neural Video Engine requires a specialized API key. Please connect it in the settings sidebar to proceed.",
          timestamp: Date.now()
        }]);
        return;
      }

      setIsGeneratingVideo(true);
      try {
        const videoUrl = await generateVideo(currentInput, (process.env as any).API_KEY);
        const aiMessage: Message = {
          role: 'model',
          content: `VEO output generated for: "${currentInput}"`,
          videoUrl: videoUrl || undefined,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, {
          role: 'model',
          content: "Video synthesis failed. Ensure you have a paid API key from a Google Cloud project.",
          timestamp: Date.now()
        }]);
      } finally {
        setIsGeneratingVideo(false);
      }
      return;
    }

    if (isImageRequest) {
      setIsGeneratingImage(true);
      try {
        const imageUrl = await generateImage(currentInput);
        const aiMessage: Message = {
          role: 'model',
          content: `Visualization manifested: "${currentInput}"`,
          imageUrl: imageUrl || undefined,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, {
          role: 'model',
          content: "Neural interface failed to manifest the visualization. Please retry.",
          timestamp: Date.now()
        }]);
      } finally {
        setIsGeneratingImage(false);
      }
      return;
    }

    setIsTyping(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await chat(currentInput, history, persona, targetLang, isTranslating);

      const aiMessage: Message = {
        role: 'model',
        content: response || 'Neural disconnect detected. Please retry.',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-white/20 overflow-hidden relative">
      {/* Mobile Top Bar */}
      <div className="lg:hidden h-14 w-full flex items-center justify-between px-4 bg-black/60 backdrop-blur-lg border-b border-white/5 z-50 fixed top-0 left-0">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-zinc-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold tracking-tight text-white uppercase italic">SHIRBHATE::CORE</span>
        <button 
          onClick={() => setIsControlsOpen(true)}
          className="p-2 text-zinc-400 hover:text-white"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Left Sidebar: Navigation & History */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 glass-panel flex flex-col z-50 transform lg:translate-x-0 transition-transform duration-300 lg:relative",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white flex items-center justify-center rounded-lg shadow-lg">
              <div className="w-4 h-4 bg-black rotate-45"></div>
            </div>
            <span className="text-xl font-bold tracking-tight text-white uppercase italic">SHIRBHATE::CORE</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-4 mb-6">
          <button 
            onClick={startNewChat}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all flex items-center justify-between group"
          >
            New Conversation
            <Plus className="w-4 h-4 opacity-40 group-hover:opacity-70 transition-opacity" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between px-3 mb-2 mt-4">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">History</div>
            {histories.length > 0 && (
              <button 
                onClick={clearAllHistory}
                className="text-[9px] text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-tight font-bold"
              >
                Clear All
              </button>
            )}
          </div>
          {histories.map((h) => (
            <div 
              key={h.id} 
              onClick={() => loadChat(h)}
              className={cn(
                "p-3 rounded-lg text-sm transition-all cursor-pointer group flex items-center justify-between",
                currentChatId === h.id ? "bg-white/5 border border-white/5 text-white" : "hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
              )}
            >
              <span className="truncate flex-1">{h.title}</span>
              <button 
                onClick={(e) => deleteChat(e, h.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-xs">AI</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">SHIRBHATE OS v4.0</div>
              <div className="text-[10px] text-zinc-500">Master Interface</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden pt-14 lg:pt-0">
        {/* Header (Desktop Only) */}
        <header className="hidden lg:flex h-16 border-b border-white/5 items-center justify-between px-8 bg-black/10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">Focus:</span>
            <span className="text-sm font-medium text-zinc-200 capitalize">Neural Interface</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse"></div>
            <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Engine Active</span>
          </div>
        </header>

        {/* Chat Feed */}
        <div ref={scrollRef} className="flex-1 p-4 md:p-8 space-y-8 overflow-y-auto custom-scrollbar bg-grid-white/[0.02] scroll-smooth">
          {messages.length === 0 && !isTyping && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-8">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10"
              >
                <Cpu className="w-8 h-8 text-zinc-400" />
              </motion.div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight text-white">SHIRBHATE::CORE Consciousness Bridge</h2>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  System initialized using higher-order heuristics. <br/>
                  <span className="text-zinc-300">Awaiting vector input...</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                {["Explain cold fusion", "The Fermi Paradox", "Mars atmospheric data", "Simulated reality theory"].map(q => (
                  <button 
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="p-4 text-left bg-white/5 border border-white/5 rounded-2xl text-xs text-zinc-400 hover:bg-white/10 hover:text-white hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      {q}
                      <ArrowRight className="w-3 h-3 translate-x-[-4px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((message, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-6 max-w-4xl",
                  message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div className={cn(
                  "w-8 h-8 shrink-0 rounded flex items-center justify-center text-[10px] font-bold shadow-sm",
                  message.role === 'user' ? "bg-zinc-800 text-zinc-300" : "bg-white text-black"
                )}>
                  {message.role === 'user' ? "ME" : <div className="w-4 h-4 bg-black rotate-45" />}
                </div>
                <div className={cn(
                  "flex flex-col gap-2 min-w-0 flex-1",
                  message.role === 'user' ? "items-end text-right" : "items-start"
                )}>
                  <div className={cn(
                    "p-5 rounded-2xl text-sm leading-relaxed frosted-card",
                    message.role === 'user' ? "bg-white/5 border-white/5 shadow-inner" : "w-full"
                  )}>
                    {message.imageUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-lg relative group/media">
                        <img 
                          src={message.imageUrl} 
                          alt="Generated" 
                          className="w-full h-auto object-cover max-h-[400px]"
                          referrerPolicy="no-referrer"
                        />
                        <a 
                          href={message.imageUrl} 
                          download={`astrix-gen-${Date.now()}.png`}
                          className="absolute bottom-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover/media:opacity-100 transition-opacity border border-white/10 hover:bg-black/80"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                    {message.videoUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black relative group/media">
                        <video 
                          src={message.videoUrl} 
                          controls
                          className="w-full h-auto max-h-[400px]"
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white/70 flex items-center gap-1.5 border border-white/5 opacity-0 group-hover/media:opacity-100 transition-opacity">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          VEO 1080P
                        </div>
                        <a 
                          href={message.videoUrl} 
                          download={`astrix-video-${Date.now()}.mp4`}
                          className="absolute bottom-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover/media:opacity-100 transition-opacity border border-white/10 hover:bg-black/80 z-20"
                          title="Download Video"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600 px-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {(isTyping || isGeneratingImage || isGeneratingVideo) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="flex gap-6 mr-auto"
            >
              <div className={cn(
                "w-8 h-8 rounded shrink-0 flex items-center justify-center shadow-lg transition-colors duration-500",
                "bg-white"
              )}>
                <div className="w-4 h-4 bg-black rotate-45 animate-spin duration-[3000ms]" />
              </div>
              <div className={cn(
                "frosted-card p-5 w-72 space-y-4 border-l-2 transition-all duration-500 shadow-2xl",
                "border-l-white/20"
              )}>
                 <div className="flex items-center gap-3 text-white/40 text-[10px] font-mono uppercase tracking-widest">
                    {isGeneratingImage && <ImageIcon className="w-3 h-3 animate-pulse text-blue-400" />}
                    {isGeneratingVideo && <Video className="w-3 h-3 animate-pulse text-cyan-400" />}
                    {!isGeneratingImage && !isGeneratingVideo && (
                      <div className="flex gap-1.5 items-center">
                        <motion.span 
                          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className={cn(
                            "w-1.5 h-1.5 rounded-sm",
                            "bg-white"
                          )}
                        />
                        <motion.span 
                          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                          className={cn(
                            "w-1.5 h-1.5 rounded-sm",
                            "bg-white"
                          )}
                        />
                        <motion.span 
                          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                          className={cn(
                            "w-1.5 h-1.5 rounded-sm",
                            "bg-white"
                          )}
                        />
                      </div>
                    )}
                    <span className="font-bold flex-1">
                      {isGeneratingImage ? "Synthesizing Image" : 
                       isGeneratingVideo ? "Compiling Neural Frames" : 
                       THINKING_LABELS[thinkingIndex]}
                    </span>
                 </div>
                 <div className="space-y-2">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                          className={cn(
                            "h-full transition-colors duration-500",
                            isGeneratingVideo ? "bg-cyan-500" :
                            "bg-white/20"
                          )}
                          animate={{ 
                            x: ["-100%", "100%"],
                            opacity: [0.4, 0.8, 0.4]
                          }}
                          transition={{ 
                            duration: isGeneratingVideo ? 2.5 : 1.5 - (thinkingIndex * 0.1), 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                       />
                    </div>
                    {isGeneratingVideo ? (
                      <p className="text-[9px] text-cyan-500/60 font-mono italic animate-pulse">
                        Sourcing high-fidelity vector streams from VEO...
                      </p>
                    ) : (
                      <p className="text-[9px] text-zinc-500 font-mono italic">
                        {"Syncing with master node SHIRBHATE::CORE..."}
                      </p>
                    )}
                 </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Suggestion Banner */}
        <AnimatePresence>
          {showSuggestion && detectedLang && !isTranslating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-8 mb-4"
            >
              <div className="max-w-3xl mx-auto flex items-center justify-between p-3 px-5 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                    <Globe className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest block">Neural Detection</span>
                    <p className="text-xs text-zinc-300">Detected <span className="text-white font-bold">{detectedLang}</span>. Enable real-time translation?</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowSuggestion(false)}
                    className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    DISMISS
                  </button>
                  <button 
                    onClick={enableTranslationForDetected}
                    className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                  >
                    ENABLE
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="p-4 md:p-8 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition duration-1000"></div>
            <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-3 md:p-4 flex flex-col gap-3 shadow-2xl backdrop-blur-md">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={`Ask SHIRBHATE...`}
                className="bg-transparent border-none text-base md:text-sm text-zinc-200 placeholder:text-zinc-600 outline-none resize-none h-auto min-h-[40px] max-h-[120px] w-full custom-scrollbar py-1"
              />
              <div className="flex items-center justify-between border-t border-white/5 pt-2">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMessages([])}
                    className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={toggleVoice}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-white/5 text-zinc-500"
                    )}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors">
                    <Smile className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    input.trim() && !isTyping 
                      ? "bg-white text-black hover:bg-zinc-200 shadow-lg active:scale-95" 
                      : "bg-white/5 text-zinc-600 cursor-not-allowed"
                  )}
                >
                  Send Neural Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar: Controls */}
      <aside className={cn(
        "fixed inset-y-0 right-0 w-72 glass-panel flex flex-col p-6 z-50 transform lg:translate-x-0 transition-transform duration-300 lg:relative",
        isControlsOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex justify-between items-center mb-8">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Neural Engines</label>
          <button 
            onClick={() => setIsControlsOpen(false)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-8">
          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4 shadow-inner">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Video className={cn("w-3.5 h-3.5", hasVideoKey ? "text-cyan-400" : "text-zinc-600")} />
                <span className="text-xs text-zinc-400">VEO Integration</span>
              </div>
              {hasVideoKey ? (
                <div className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[9px] text-cyan-400 font-bold">LINKED</div>
              ) : (
                <button 
                  onClick={handleConnectVideo}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[9px] text-white font-bold transition-all"
                >
                  CONNECT
                </button>
              )}
            </div>
            {!hasVideoKey && (
              <p className="text-[9px] text-zinc-500 leading-tight">
                Video generation requires a paid Google Cloud project API key.
              </p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-4 block">Real-Time Translation</label>
          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Neural Gateway</span>
              <button 
                onClick={() => setIsTranslating(!isTranslating)}
                className={cn(
                  "w-8 h-4 rounded-full relative transition-colors duration-200",
                  isTranslating ? "bg-cyan-500" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                  isTranslating ? "right-1" : "left-1"
                )} />
              </button>
            </div>
            {isTranslating && (
              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-zinc-300 outline-none focus:border-white/20 transition-all appearance-none"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.name}>{l.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-auto">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 shadow-lg">
            <div className="text-xs font-bold mb-1 text-white">Neural Load</div>
            <div className="text-[10px] text-zinc-500 mb-3 font-mono">Stream: {isTyping ? "ENCRYPTING" : "STABLE"}</div>
            <div className="w-full bg-black/50 h-1.5 rounded-full mb-1 overflow-hidden">
              <motion.div 
                className="h-full bg-white"
                initial={{ width: "30%" }}
                animate={{ width: isTyping ? "90%" : "30%" }}
                transition={{ duration: 1 }}
              />
            </div>
            <div className="text-[9px] text-right text-zinc-400 font-mono tracking-tighter">
              NODES ACTIVE: 4,096
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebars */}
      <AnimatePresence>
        {(isSidebarOpen || isControlsOpen) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setIsSidebarOpen(false); setIsControlsOpen(false); }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <style>{`
        .shadow-glow { box-shadow: 0 0 10px rgba(6, 182, 212, 0.3); }
        .bg-grid-white { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='white' stroke-opacity='0.05'%3E%3Cpath d='M0 .5H31.5V32' /%3E%3C/svg%3E"); }
      `}</style>
    </div>
  );
}
