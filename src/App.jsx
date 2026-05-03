import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Sparkle, 
  MonitorPlay, 
  Image as ImageIcon, 
  ArrowRight, 
  CheckCircle,
  Copy,
  CaretRight,
  ClipboardText,
  Warning,
  Clock,
  Trash,
  MagnifyingGlass,
  YoutubeLogo,
  ArrowLeft,
  X,
  FadersHorizontal,
  Layout,
  MagicWand,
  PencilSimple,
  Hash,
  Queue,
  List,
  ChatCircleText
} from '@phosphor-icons/react';
import { NICHES, RATIOS } from './constants';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

// --- Utilities ---
function cn(...inputs) {
  try {
    return twMerge(clsx(inputs));
  } catch (e) {
    return inputs.filter(Boolean).join(' ');
  }
}

// --- Components ---

const CopyButton = ({ text, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest whitespace-nowrap",
        copied 
          ? "bg-green-500/20 text-green-500 border border-green-500/30" 
          : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/5"
      )}
    >
      {copied ? <CheckCircle weight="bold" className="w-3.5 h-3.5" /> : <Copy weight="bold" className="w-3.5 h-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="space-y-1 mb-8">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 min-w-[40px] rounded-2xl bg-[#F56600]/10 flex items-center justify-center text-[#F56600]">
        <Icon weight="duotone" className="w-6 h-6" />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
    </div>
    {subtitle && <p className="text-white/40 text-sm ml-0 md:ml-13">{subtitle}</p>}
  </div>
);

// --- Main Application ---

export default function App() {
  const [stage, setStage] = useState('browse'); // 'browse' | 'configure' | 'result' | 'history'
  const [selectedNiche, setSelectedNiche] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [sceneCount, setSceneCount] = useState(3);
  
  // Suggestion Modal State
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [suggestionContext, setSuggestionContext] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const [ratio, setRatio] = useState('9:16');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [roadmap, setRoadmap] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('timelapse_dojo_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (newItem) => {
    const updated = [newItem, ...history];
    setHistory(updated);
    localStorage.setItem('timelapse_dojo_history', JSON.stringify(updated));
  };

  const generateAiSuggestions = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return;
    
    setIsSuggestionModalOpen(false);
    setIsSuggesting(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Generate 5 creative, trending, and visually dramatic project subjects for the niche: ${selectedNiche.name}. 
        
        ${suggestionContext ? `USER CONTEXT: ${suggestionContext}` : ''}
        
        CRITICAL CRITERIA:
        - Subjects MUST be perfect for FIXED-CAMERA TIMELAPSE or HYPERLAPSE videos.
        - Focus on DRAMATIC VISUAL TRANSFORMATION (e.g., from raw/ruined to luxury/perfection).
        - Each subject should have clear, satisfying stages of evolution that are visually distinct.
        - Avoid subjects that are too static or lack a clear "before and after" narrative.
        
        Return ONLY a JSON array of strings: ["subject1", "subject2", "subject3", "subject4", "subject5"]
      `;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { response_mime_type: "application/json" }
      });
      const data = JSON.parse(response.text.replace(/```json|```/gi, '').trim());
      setAiSuggestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
      setSuggestionContext('');
    }
  };

  const generateRoadmap = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError("API Key Missing");
      return;
    }
    const finalSubject = isCustomMode ? customSubject : selectedOption;
    if (!finalSubject) {
      setError("Select a subject first");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const imageCount = sceneCount + 1;
      
      const prompt = `
        As an Architectural Restoration AI, generate an evolution roadmap for ${selectedNiche.name}: ${finalSubject}.
        
        Project Configuration:
        - Total Scenes: ${sceneCount}
        - Image Prompts Needed: ${imageCount}
        - Video Prompts Needed: ${sceneCount}
        - Aspect Ratio: ${ratio}
        
        Additional Instructions: ${additionalInfo || "N/A"}
        
        Requirements:
        1. IMAGE PROMPTS (${imageCount} items): 
           - MANDATORY: Sertakan teks "${ratio} aspect ratio" secara eksplisit di awal setiap prompt.
           - CONTINUITY: Maintain a static camera angle from a corner of the space. Identical geometry and perspective.
           - NO PEOPLE or workers in the images.
           - Stage 0: Initial state based on damage context (hancur, lumut, pecah).
           - Stage 3 & 4: Focus on aesthetics, luxury materials, and perfect lighting.
           
        2. VIDEO PROMPTS (${sceneCount} items): 
           - STYLE: Hyperlapse transformation.
           - CAMERA: No camera movement. Fixed framing. No zoom.
           - CONTENT: Describe workers in PPE gear performing the actual labor (pouring, grinding, cleaning).
           - AUDIO: NO music. Only immersive ASMR sounds relevant to the scene.
           - Mandatory Suffix: "Smooth timelapse transformation, fast motion with fixed camera framing, no skipped construction steps. No cuts. No transitions. No subtitles. No captions."
           
        3. SOCIAL MEDIA:
           - Title, Description, and Tags (CSV).
        
        Return ONLY a JSON object:
        {
          "title": "...",
          "description": "...",
          "tags": "...",
          "imagePrompts": ["...", "..."],
          "videoPrompts": ["...", "..."]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { response_mime_type: "application/json" }
      });

      const data = JSON.parse(response.text.replace(/```json|```/gi, '').trim());
      const newHistoryItem = { id: Date.now(), date: new Date().toLocaleDateString(), niche: selectedNiche.name, subject: finalSubject, ...data };
      setRoadmap(data);
      saveToHistory(newHistoryItem);
      setStage('result');
      window.scrollTo(0, 0);
    } catch (err) {
      setError("Generation failed. Check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredNiches = NICHES.filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-[#fafafa] selection:bg-[#F56600]/30 selection:text-white relative overflow-x-hidden">
      <div className="grain" />
      
      {/* --- Navigation --- */}
      <nav className="fixed top-0 left-0 right-0 z-[80] px-4 md:px-8 py-4 md:py-6 flex items-center justify-between pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="pointer-events-auto cursor-pointer"
          onClick={() => {
            setStage('browse');
            window.scrollTo(0, 0);
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-[40px] rounded-2xl bg-white text-[#5A125A] flex items-center justify-center font-black text-xl italic tracking-tighter shadow-[0_0_20px_rgba(90,18,90,0.3)]">
              TD
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] leading-none text-[#FFD700]">Timelapse</div>
              <div className="text-[10px] font-medium text-white/30 uppercase tracking-[0.3em]">Dojo . Evolution</div>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button onClick={() => setStage('history')} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl liquid-glass flex items-center justify-center text-white/60 hover:text-[#FFD700] hover:bg-white/5 transition-all">
            <Clock weight="bold" className="w-5 h-5" />
          </button>
          {stage !== 'browse' && (
            <button onClick={() => setStage('browse')} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl liquid-glass flex items-center justify-center text-white/60 hover:text-[#F56600] hover:bg-white/5 transition-all">
              <Layout weight="bold" className="w-5 h-5" />
            </button>
          )}
        </div>
      </nav>

      {/* --- Main --- */}
      <main className="relative z-10 pt-24 md:pt-32 pb-20 px-4 md:px-8 max-w-[1600px] mx-auto">
        <AnimatePresence mode="wait">
          
          {/* STAGE: BROWSE */}
          {stage === 'browse' && (
            <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12 md:space-y-16">
              <div className="max-w-4xl">
                <motion.div>
                  <span className="label-text">Select Niche</span>
                  <h1 className="text-5xl md:text-8xl lg:text-9xl font-extrabold tracking-[-0.04em] leading-[0.9] md:leading-[0.85]">
                    Architectural <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F56600] to-[#FFD700]">Evolution.</span>
                  </h1>
                </motion.div>
                
                <div className="mt-8 md:mt-12 relative max-w-xl group">
                  <MagnifyingGlass className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-[#F56600] transition-colors" />
                  <input type="text" placeholder="Search restoration niches..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-[2rem] pl-16 pr-8 py-5 md:py-6 text-base md:text-lg focus:outline-none focus:bg-white/[0.05] focus:border-[#F56600]/20 transition-all placeholder:text-white/10" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
                {filteredNiches.map((n, idx) => (
                  <motion.div
                    key={n.id}
                    layoutId={n.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => { setSelectedNiche(n); setSelectedOption(n.options[0]); setStage('configure'); window.scrollTo(0, 0); }}
                    className={cn(
                      "niche-card group min-h-[300px] md:min-h-[400px]",
                      n.id === 'InteriorRenovation' ? "border-[#5A125A]/20" : "border-[#9E2A00]/20"
                    )}
                  >
                    <div className="absolute top-6 right-6 md:top-8 md:right-8 w-12 h-12 rounded-full border border-white/10 flex items-center justify-center opacity-100 group-hover:bg-white group-hover:text-black transition-all">
                      <ArrowRight weight="bold" className="w-5 h-5" />
                    </div>
                    <div className="space-y-4">
                      <div className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit",
                        n.id === 'InteriorRenovation' ? "bg-[#5A125A]/20 text-[#5A125A]" : "bg-[#9E2A00]/20 text-[#9E2A00]"
                      )}>
                        {n.id}
                      </div>
                      <h3 className="text-4xl md:text-5xl font-bold leading-tight group-hover:text-white transition-colors">{n.name}</h3>
                      <p className="text-sm md:text-base text-white/40 leading-relaxed max-w-md">{n.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STAGE: CONFIGURE */}
          {stage === 'configure' && (
            <motion.div key="configure" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr] gap-12">
              <div className="space-y-8 md:space-y-12">
                <button onClick={() => setStage('browse')} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"><ArrowLeft weight="bold" className="w-4 h-4" />Back to explore</button>
                <SectionHeader icon={FadersHorizontal} title="Configure Evolution" subtitle={`${selectedNiche.name}`} />

                <div className="space-y-10">
                  <section className="space-y-6">
                    <h3 className="label-text">Number of Scenes</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
                        <button type="button" onClick={() => setSceneCount(Math.max(1, sceneCount - 1))} className="w-12 h-12 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center font-bold text-xl">-</button>
                        <input type="number" value={sceneCount} onChange={(e) => setSceneCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 bg-transparent text-center font-bold text-2xl focus:outline-none" />
                        <button type="button" onClick={() => setSceneCount(Math.min(20, sceneCount + 1))} className="w-12 h-12 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center font-bold text-xl">+</button>
                      </div>
                      <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest leading-tight">
                        Generating <br /> <span className="text-white text-sm">{sceneCount + 1}</span> Images <br /> <span className="text-white text-sm">{sceneCount}</span> Videos
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="label-text m-0">Target Subject</h3>
                      <div className="flex gap-2">
                        <button onClick={() => setIsSuggestionModalOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F56600]/10 text-[#F56600] text-[10px] font-bold uppercase tracking-widest border border-[#F56600]/20 hover:bg-[#F56600]/20 transition-all"><MagicWand weight="bold" className={cn("w-3 h-3", isSuggesting && "animate-spin")} />AI Suggest</button>
                        <button onClick={() => setIsCustomMode(!isCustomMode)} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all", isCustomMode ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10")}><PencilSimple weight="bold" className="w-3 h-3" />Manual</button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-3">
                      {!isCustomMode ? (
                        selectedNiche.options.map((opt) => (
                          <button key={opt} onClick={() => setSelectedOption(opt)} className={cn("px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl border text-xs md:text-sm font-bold transition-all", selectedOption === opt ? "bg-white text-black border-white" : "bg-white/5 border-white/10 hover:border-white/30 text-white/60")}>{opt}</button>
                        ))
                      ) : (
                        <input type="text" placeholder="Type custom subject..." value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} className="input-field" autoFocus />
                      )}
                      {aiSuggestions.map((opt) => (
                        <button key={opt} onClick={() => setSelectedOption(opt)} className={cn("px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-[#FFD700]/20 text-xs md:text-sm font-bold transition-all relative group", selectedOption === opt ? "bg-[#FFD700] text-black border-[#FFD700]" : "bg-[#FFD700]/5 text-[#FFD700]/60 hover:border-[#FFD700]/40")}><Sparkle weight="fill" className="absolute -top-1 -right-1 w-3 h-3 opacity-20" />{opt}</button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="label-text">Damage & Aesthetic Detail</h3>
                    <textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} placeholder="Describe damage (moss, cracks) or luxury materials (marble, gold)..." className="input-field min-h-[120px] resize-none" />
                  </section>

                  <button onClick={generateRoadmap} disabled={isGenerating} className={cn("btn-primary w-full h-20 text-xl flex items-center justify-center gap-3", isGenerating ? "opacity-50" : "bg-gradient-to-r from-[#F56600] to-[#FFD700] text-black border-none")}>
                    {isGenerating ? <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <>Synthesize Evolution <ArrowRight weight="bold" className="w-6 h-6" /></>}
                  </button>
                </div>
              </div>

              <div className="lg:pt-20">
                <div className="liquid-glass p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] space-y-8 lg:sticky lg:top-32">
                  <motion.div layoutId={selectedNiche.id} className="space-y-4">
                    <div className={cn("text-[10px] font-bold uppercase tracking-widest", selectedNiche.id === 'InteriorRenovation' ? "text-[#5A125A]" : "text-[#9E2A00]")}>{selectedNiche.id}</div>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter leading-none">{selectedNiche.name}</h2>
                    <p className="text-xs md:text-sm text-white/40 leading-relaxed">{selectedNiche.description}</p>
                  </motion.div>
                  <div className="pt-8 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-center"><span className="text-white/30 font-bold uppercase tracking-widest text-[10px]">Format</span><span className="font-bold">{ratio}</span></div>
                    <div className="flex justify-between items-center"><span className="text-white/30 font-bold uppercase tracking-widest text-[10px]">Engine</span><span className="font-bold text-[#F56600]">Gemini 3.1</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STAGE: RESULT */}
          {stage === 'result' && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-16">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                  <button onClick={() => setStage('configure')} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"><ArrowLeft weight="bold" className="w-4 h-4" />Re-configure</button>
                  <h1 className="text-4xl md:text-7xl font-extrabold tracking-tighter leading-none">{roadmap?.title}</h1>
                </div>
                <button className="btn-primary bg-[#9E2A00] text-white border-none flex items-center justify-center gap-2 h-16 w-full md:w-auto px-12 rounded-2xl">
                  <YoutubeLogo weight="fill" className="w-6 h-6" />
                  Post Evolution
                </button>
              </div>

              <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
                <div className="w-full space-y-12">
                  <SectionHeader icon={ImageIcon} title="Visual Roadmap" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roadmap?.imagePrompts.map((prompt, idx) => (
                      <div key={idx} className={cn("liquid-glass p-8 rounded-[2rem] space-y-6 group", (idx === 0 || idx === roadmap.imagePrompts.length - 1) ? "md:col-span-2 border-[#FFD700]/20" : "")}>
                        <div className="flex justify-between items-center">
                          <span className={cn("label-text m-0", idx === 0 ? "text-[#9E2A00]" : idx === roadmap.imagePrompts.length - 1 ? "text-[#FFD700]" : "")}>
                            {idx === 0 ? "START (FOUNDATION)" : idx === roadmap.imagePrompts.length - 1 ? "FINAL MASTERPIECE" : `FRAME 0${idx}`}
                          </span>
                          <CopyButton text={prompt} label="Copy" />
                        </div>
                        <p className="text-xl font-medium leading-relaxed group-hover:text-[#F56600] transition-colors">{prompt}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full space-y-12">
                  <div className="liquid-glass p-8 rounded-[2rem] bg-white/[0.02] space-y-6">
                    <SectionHeader icon={YoutubeLogo} title="Shorts Content" />
                    <div className="space-y-6">
                      <div className="space-y-2"><span className="label-text">Title</span><div className="flex justify-between gap-4"><p className="text-xl font-bold">{roadmap?.title}</p><CopyButton text={roadmap?.title} /></div></div>
                      <div className="space-y-2"><span className="label-text">Description</span><div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-white/40 whitespace-pre-wrap">{roadmap?.description}</div><CopyButton text={roadmap?.description} label="Copy Desc" /></div>
                      <div className="space-y-2"><span className="label-text">Tags</span><div className="p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-white/20 break-all">{roadmap?.tags}</div><CopyButton text={roadmap?.tags} label="Copy Tags" /></div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <SectionHeader icon={MonitorPlay} title="Video Scripts" />
                    {roadmap?.videoPrompts.map((v, i) => (
                      <div key={i} className="prompt-box group border-[#F56600]/10 p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-bold text-[#F56600] uppercase">Scene 0{i + 1}</span><CopyButton text={v} /></div>
                        <p className="text-sm text-white/60 group-hover:text-white transition-colors">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL */}
      <AnimatePresence>
        {isSuggestionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSuggestionModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg liquid-glass p-8 md:p-10 rounded-[3rem] space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700]"><MagicWand weight="duotone" className="w-7 h-7" /></div>
                <h2 className="text-3xl font-bold tracking-tight text-white">AI Suggestion</h2>
              </div>
              <textarea value={suggestionContext} onChange={(e) => setSuggestionContext(e.target.value)} placeholder="E.g. Focus on post-apocalyptic, or futuristic neon..." className="input-field min-h-[150px] text-base" />
              <div className="flex gap-3">
                <button onClick={generateAiSuggestions} className="btn-primary flex-1 h-16 bg-[#FFD700] text-black font-bold border-none">Generate Ideas</button>
                <button onClick={() => { setSuggestionContext(''); generateAiSuggestions(); }} className="h-16 px-8 rounded-2xl bg-white/5 border border-white/10 text-white/60">Skip</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
