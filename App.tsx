
import React, { useState, useRef } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  SparklesIcon, 
  ArrowDownTrayIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  PhotoIcon,
  SwatchIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { BatchItem, GlobalConfig, WordReplacement } from './types';
import { rewriteDescription, editImage } from './services/geminiService';

const App: React.FC = () => {
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    colorCombination: 'Modern Blue & White',
    textColor: 'Electric Blue',
    targetFaceDescription: 'A professional young athlete',
    wordReplacements: []
  });
  
  const [newFind, setNewFind] = useState('');
  const [newReplace, setNewReplace] = useState('');
  
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (batch.length + files.length > 20) {
      alert("Maximum batch size is 20 images.");
      e.target.value = '';
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newItem: BatchItem = {
          id: Math.random().toString(36).substr(2, 9),
          originalImage: event.target?.result as string,
          originalDescription: '',
          status: 'pending'
        };
        setBatch(prev => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const addReplacement = () => {
    if (!newFind.trim() || !newReplace.trim()) return;
    setGlobalConfig(prev => ({
      ...prev,
      wordReplacements: [...prev.wordReplacements, { find: newFind.trim(), replace: newReplace.trim() }]
    }));
    setNewFind('');
    setNewReplace('');
  };

  const removeReplacement = (index: number) => {
    setGlobalConfig(prev => ({
      ...prev,
      wordReplacements: prev.wordReplacements.filter((_, i) => i !== index)
    }));
  };

  const removeItem = (id: string) => {
    setBatch(prev => prev.filter(item => item.id !== id));
  };

  const updateItemDescription = (id: string, text: string) => {
    setBatch(prev => prev.map(item => item.id === id ? { ...item, originalDescription: text } : item));
  };

  const processSingleItem = async (id: string) => {
    const item = batch.find(i => i.id === id);
    if (!item) return;

    setBatch(prev => prev.map(i => i.id === id ? { ...i, status: 'processing' } : i));

    try {
      const [editedImg, rewrittenTxt] = await Promise.all([
        editImage(item.originalImage, globalConfig),
        rewriteDescription(item.originalDescription)
      ]);

      setBatch(prev => prev.map(i => i.id === id ? {
        ...i,
        editedImage: editedImg,
        rewrittenDescription: rewrittenTxt,
        status: 'completed'
      } : i));
    } catch (error: any) {
      console.error("Item process failed", error);
      setBatch(prev => prev.map(i => i.id === id ? { ...i, status: 'error' } : i));
    }
  };

  const processAll = async () => {
    setIsProcessingAll(true);
    // Process sequentially to be safe with rate limits
    for (const item of batch) {
      if (item.status !== 'completed') {
        await processSingleItem(item.id);
      }
    }
    setIsProcessingAll(false);
  };

  const downloadImage = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `fan_fc_img_${index + 1}.png`;
    a.click();
  };

  const downloadAllImages = () => {
    const completedItems = batch.filter(i => i.status === 'completed');
    if (completedItems.length === 0) return;
    
    completedItems.forEach((item, idx) => {
      setTimeout(() => {
        downloadImage(item.editedImage!, idx);
      }, idx * 300);
    });
  };

  const downloadAllDescriptions = () => {
    const completedItems = batch.filter(i => i.status === 'completed');
    if (completedItems.length === 0) return;

    let text = "BATCH DESCRIPTIONS MAPPING\n";
    text += "===========================\n\n";
    completedItems.forEach((item, idx) => {
      text += `Image #${idx + 1} (fan_fc_img_${idx + 1}.png)\n`;
      text += `Description: ${item.rewrittenDescription || 'N/A'}\n`;
      text += `---------------------------\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_descriptions_mapping.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allCompleted = batch.length > 0 && batch.every(i => i.status === 'completed');

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500">
            Batch Studio
          </h1>
          <p className="text-slate-400 text-lg">Batch redesign images, swap faces, and rewrite hooks.</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold transition-all"
          >
            <PlusIcon className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            Add Images
          </button>
          <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          
          {batch.length > 0 && (
            <button 
              onClick={processAll}
              disabled={isProcessingAll}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shadow-xl ${
                isProcessingAll 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
              }`}
            >
              {isProcessingAll ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
              {isProcessingAll ? 'Processing Batch...' : 'Redesign Batch'}
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-4">
          <div className="glass-panel p-8 rounded-3xl sticky top-8 border-white/5 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <SwatchIcon className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold">Studio Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div className="group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 group-focus-within:text-blue-400 transition-colors">
                  Person/Face Swap Style
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    value={globalConfig.targetFaceDescription}
                    onChange={(e) => setGlobalConfig(prev => ({ ...prev, targetFaceDescription: e.target.value }))}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 pl-12 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="e.g. A young male gamer"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 group-focus-within:text-blue-400 transition-colors">
                  Target Text Color
                </label>
                <input 
                  type="text" 
                  value={globalConfig.textColor}
                  onChange={(e) => setGlobalConfig(prev => ({ ...prev, textColor: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  placeholder="e.g. Electric Blue"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 group-focus-within:text-blue-400 transition-colors">
                  Color Combination
                </label>
                <input 
                  type="text" 
                  value={globalConfig.colorCombination}
                  onChange={(e) => setGlobalConfig(prev => ({ ...prev, colorCombination: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  placeholder="e.g. Neon Purple & Silver"
                />
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-slate-300">Text Redirection</h3>
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Find word"
                    value={newFind}
                    onChange={(e) => setNewFind(e.target.value)}
                    className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                  <input 
                    type="text" 
                    placeholder="Replace with"
                    value={newReplace}
                    onChange={(e) => setNewReplace(e.target.value)}
                    className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                  <button 
                    onClick={addReplacement}
                    className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {globalConfig.wordReplacements.map((rep, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs">
                      <span className="text-purple-300 font-bold">{rep.find}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-white font-bold">{rep.replace}</span>
                      <button onClick={() => removeReplacement(idx)} className="text-slate-500 hover:text-red-400 transition-colors ml-1">
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {batch.some(i => i.status === 'completed') && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <button 
                  onClick={downloadAllImages}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-black transition-all transform hover:-translate-y-1 shadow-lg shadow-white/10"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Download All Images
                </button>
                <button 
                  onClick={downloadAllDescriptions}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all border border-white/5"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  Download Mapped Descriptions
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="lg:col-span-8">
          {batch.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 glass-panel rounded-[2.5rem] border-dashed border-2 border-white/10">
              <div className="p-8 bg-slate-800/50 rounded-full mb-8">
                <PhotoIcon className="w-16 h-16 text-slate-600" />
              </div>
              <p className="text-3xl text-slate-400 font-black">Upload your batch</p>
              <p className="text-slate-600 mt-4 text-center max-w-sm px-6">
                Up to 20 images. We'll swap faces, change colors, replace text, and write hooks for all of them at once.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {batch.map((item, index) => (
                <div key={item.id} className={`group glass-panel rounded-3xl overflow-hidden transition-all duration-500 border border-white/5 ${
                  item.status === 'completed' ? 'shadow-2xl shadow-blue-500/5 border-blue-500/20' : ''
                }`}>
                  <div className="relative aspect-video bg-slate-950">
                    <img 
                      src={item.editedImage || item.originalImage} 
                      alt={`Image ${index + 1}`} 
                      className={`w-full h-full object-cover transition-opacity duration-700 ${item.status === 'processing' ? 'opacity-40' : 'opacity-100'}`}
                    />
                    
                    <div className="absolute top-4 left-4">
                      <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black text-white tracking-widest border border-white/10 uppercase">
                        #{index + 1}
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.status === 'completed' && (
                        <button 
                          onClick={() => downloadImage(item.editedImage!, index)}
                          className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl backdrop-blur-md transition-all shadow-lg"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-xl backdrop-blur-md transition-all shadow-lg"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {item.status === 'processing' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                          <span className="text-[10px] font-black text-blue-400 animate-pulse tracking-widest uppercase">Redesigning...</span>
                        </div>
                      </div>
                    )}
                    
                    {item.status === 'completed' && (
                      <div className="absolute bottom-4 left-4">
                         <div className="bg-blue-500 text-white px-3 py-1 rounded-full shadow-2xl flex items-center gap-2 text-[10px] font-bold">
                            <CheckCircleIcon className="w-4 h-4" />
                            SUCCESS
                         </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 space-y-5">
                    <div className="space-y-4">
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Original Context</label>
                        <textarea
                          placeholder="What's happening in this photo?"
                          value={item.originalDescription}
                          onChange={(e) => updateItemDescription(item.id, e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500/30 transition-all resize-none h-20"
                        />
                      </div>

                      {item.rewrittenDescription && (
                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">AI Redesigned Description</p>
                          <p className="text-sm text-slate-200 leading-relaxed font-medium italic">
                            "{item.rewrittenDescription}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                       <div className="flex gap-2 items-center">
                         <span className={`w-2 h-2 rounded-full ${item.status === 'completed' ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : item.status === 'processing' ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`}></span>
                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                           {item.status === 'completed' ? 'READY' : item.status === 'processing' ? 'WORKING' : 'PENDING'}
                         </span>
                       </div>
                       <div className="flex gap-4">
                        <button 
                          onClick={() => processSingleItem(item.id)}
                          disabled={item.status === 'processing'}
                          className="text-xs font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                          {item.status === 'completed' ? 'Redesign Again' : 'Redesign Single'}
                          <ArrowPathIcon className={`w-4 h-4 ${item.status === 'processing' ? 'animate-spin' : ''}`} />
                        </button>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
