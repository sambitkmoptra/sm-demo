'use client';

import React, { useState, useEffect } from 'react';

interface Persona {
  persona_id: string;
  brand_name: string;
  name: string;
  prompt: string;
  gender: string;
  hair_color: string;
  eye_color: string;
  ethnicity: string;
  age: string;
  clothing_style: string;
  description: string;
  images: string[];
  created_at: string;
}

export default function PersonaCreatorForm() {
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create');
  
  const [prompt, setPrompt] = useState('');
  const [gender, setGender] = useState('Female');
  const [ethnicity, setEthnicity] = useState('East Asian');
  const [hairColor, setHairColor] = useState('Black');
  const [eyeColor, setEyeColor] = useState('Brown');
  const [age, setAge] = useState('25-35');
  const [clothingStyle, setClothingStyle] = useState('Athletic Wear');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedPersona, setGeneratedPersona] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savedPersonas, setSavedPersonas] = useState<Persona[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  const steps = [
    'Initializing Persona creative brief...',
    'Synthesizing model personality profile...',
    'Rendering close-up portrait headshot (Angle 1)...',
    'Generating medium studio body profile (Angle 2)...',
    'Composing full-body studio framing (Angle 3)...',
    'Uploading and syncing brand model profiles...'
  ];

  const fetchSavedPersonas = async () => {
    setIsLoadingSaved(true);
    try {
      const response = await fetch('/api/personas?brand_name=Acme Sports');
      if (!response.ok) {
        throw new Error('Failed to fetch saved personas');
      }
      const data = await response.json();
      setSavedPersonas(data.personas || []);
    } catch (err: any) {
      console.error('Failed to load personas:', err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedPersonas();
    }
  }, [activeTab]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGenerationStep(0);
    setGeneratedPersona(null);
    setError(null);

    // Increment loading steps sequentially
    const interval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev >= steps.length - 1) return prev;
        return prev + 1;
      });
    }, 3500); // 3.5 seconds per step roughly mapping to total gen time (approx 20 seconds)

    try {
      const response = await fetch('/api/generate-persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          gender,
          hair_color: hairColor,
          eye_color: eyeColor,
          ethnicity,
          age,
          clothing_style: clothingStyle,
          brand_name: 'Acme Sports',
        }),
      });

      const data = await response.json();
      clearInterval(interval);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to synthesize persona');
      }

      setGeneratedPersona(data.persona);
    } catch (err: any) {
      console.error('Persona Synthesis Error:', err);
      setError(err.message || 'An unexpected error occurred during persona synthesis.');
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setPrompt('');
    setGender('Female');
    setEthnicity('East Asian');
    setHairColor('Black');
    setEyeColor('Brown');
    setAge('25-35');
    setClothingStyle('Athletic Wear');
    setGeneratedPersona(null);
    setError(null);
  };

  const angleLabels = ['Close-up Portrait', 'Medium Studio Shot', 'Full Body Shot'];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-6">
      {/* Top glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          AI Brand Persona Creator
        </h2>
        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
          Grounded Model Studio
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-850 gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2.5 text-xs uppercase tracking-wider font-bold border-b-2 transition-all outline-none ${
            activeTab === 'create'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/10'
          }`}
        >
          Create Model Persona
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-2.5 text-xs uppercase tracking-wider font-bold border-b-2 transition-all outline-none ${
            activeTab === 'saved'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/10'
          }`}
        >
          Saved Brand Personas
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-center">
          <span className="text-red-400 text-xs font-bold font-mono">!</span>
          <p className="text-xs text-red-300 font-semibold">{error}</p>
        </div>
      )}

      {/* TAB 1: CREATE PERSONA */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {!generatedPersona && !isGenerating && (
            <form onSubmit={handleGenerate} className="space-y-6">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generate a consistent AI brand model persona with multiple camera angles. Once saved, this persona can be selected as a reference in campaign briefs, eliminating the need to upload manual influencer and model reference images.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left side parameters */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Non-binary">Non-binary</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ethnicity</label>
                      <select
                        value={ethnicity}
                        onChange={(e) => setEthnicity(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value="East Asian">East Asian</option>
                        <option value="South Asian">South Asian</option>
                        <option value="Caucasian">Caucasian</option>
                        <option value="African American">African American</option>
                        <option value="Hispanic">Hispanic</option>
                        <option value="Middle Eastern">Middle Eastern</option>
                        <option value="Mixed / Other">Mixed / Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Hair Color</label>
                      <select
                        value={hairColor}
                        onChange={(e) => setHairColor(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value="Black">Black</option>
                        <option value="Brown">Brown</option>
                        <option value="Blonde">Blonde</option>
                        <option value="Red">Red</option>
                        <option value="Grey">Grey</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Eye Color</label>
                      <select
                        value={eyeColor}
                        onChange={(e) => setEyeColor(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value="Brown">Brown</option>
                        <option value="Blue">Blue</option>
                        <option value="Green">Green</option>
                        <option value="Hazel">Hazel</option>
                        <option value="Grey">Grey</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Age Group</label>
                      <select
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value="18-25">Young Adult (18-25)</option>
                        <option value="25-35">Adult (25-35)</option>
                        <option value="35-50">Middle Aged (35-50)</option>
                        <option value="50+">Senior (50+)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Default Clothing style</label>
                    <select
                      value={clothingStyle}
                      onChange={(e) => setClothingStyle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="Athletic Wear">Athletic Wear</option>
                      <option value="Casual Chic">Casual Chic</option>
                      <option value="Formal Business">Formal Business</option>
                      <option value="Bohemian">Bohemian</option>
                      <option value="Streetwear">Streetwear</option>
                      <option value="Minimalist">Minimalist</option>
                    </select>
                  </div>
                </div>

                {/* Right side prompts */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base Style Brief & Prompt</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      required
                      rows={6}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none h-44"
                      placeholder="Describe details like facial expression, aesthetic style, or specific brand-aligned characteristics (e.g., cheerful, focused athletic look, fit build, modern sporty vibe)..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 uppercase tracking-wider text-xs"
                  >
                    Synthesize AI Brand Persona
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Loading state */}
          {isGenerating && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto min-h-[300px]">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-lg">👤</span>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-emerald-400 animate-pulse">Running Multimodal Synthesis Pipeline</h4>
                <p className="text-xs text-zinc-400 transition-all duration-300 min-h-[36px]">
                  {steps[generationStep]}
                </p>
              </div>

              <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${((generationStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Success display state */}
          {generatedPersona && !isGenerating && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Header metadata summary */}
              <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">AI Model Persona: {generatedPersona.name}</h3>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">ID: {generatedPersona.persona_id}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-950/20 p-4 border border-zinc-900 rounded-xl">
                    "{generatedPersona.description}"
                  </p>
                </div>
                
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2 text-[11px] h-fit">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block border-b border-zinc-900 pb-1.5 mb-1.5">Model Attributes</span>
                  <div className="flex justify-between"><span className="text-zinc-500">Gender:</span> <span className="text-zinc-300 font-semibold">{generatedPersona.gender}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Ethnicity:</span> <span className="text-zinc-300 font-semibold">{generatedPersona.ethnicity}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Hair Color:</span> <span className="text-zinc-300 font-semibold">{generatedPersona.hair_color}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Eye Color:</span> <span className="text-zinc-300 font-semibold">{generatedPersona.eye_color}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Style Profile:</span> <span className="text-zinc-300 font-semibold">{generatedPersona.clothing_style}</span></div>
                </div>
              </div>

              {/* Three-column rendering gallery */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Multi-Angle Studio Composition</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {generatedPersona.images.map((imgUrl, idx) => (
                    <div key={idx} className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative group">
                      <div className="aspect-[3/4] relative overflow-hidden bg-zinc-900 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt={`${generatedPersona.name} - ${angleLabels[idx]}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute top-3 left-3 bg-black/60 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider text-emerald-400 font-bold border border-emerald-500/20 backdrop-blur-sm">
                          {angleLabels[idx]}
                        </div>
                      </div>
                      <div className="p-3 border-t border-zinc-900 bg-zinc-950/60 flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-semibold">Angle {idx + 1}</span>
                        <a 
                          href={imgUrl} 
                          download={`${generatedPersona.name.toLowerCase()}-angle-${idx + 1}.jpg`}
                          className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          Download ↓
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex gap-4 border-t border-zinc-800 pt-6">
                <button
                  onClick={resetForm}
                  className="px-6 py-3 rounded-xl text-xs font-semibold bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 uppercase tracking-wider transition-colors"
                >
                  ← Create Another Persona
                </button>
                <div className="text-xs text-zinc-500 flex items-center gap-2 ml-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Persona automatically saved in <strong>personas</strong> database collection.</span>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAVED PERSONAS */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Browse all saved virtual AI personas created for the Acme Sports brand campaigns.
          </p>

          {isLoadingSaved ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4 text-center">
              <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-15" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-85" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs text-zinc-500 font-medium">Retrieving synthesized brand profiles...</p>
            </div>
          ) : savedPersonas.length === 0 ? (
            <div className="py-24 border border-dashed border-zinc-850 rounded-2xl flex flex-col items-center justify-center space-y-3 text-center text-zinc-500">
              <span className="text-3xl">👤</span>
              <p className="text-xs font-medium text-zinc-400">No Brand Personas Found</p>
              <p className="text-[10px] max-w-[280px] leading-relaxed">
                Use the "Create Model Persona" tab to generate and register your first consistent AI influencer model.
              </p>
            </div>
          ) : (
            <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
              {savedPersonas.map((p) => (
                <div key={p.persona_id} className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg shadow-inner">
                        👤
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-100 flex items-center gap-2 text-base">
                          {p.name}
                          <span className="text-[10px] font-mono font-normal bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                            {p.clothing_style}
                          </span>
                        </h3>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">ID: {p.persona_id}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-[10px] bg-zinc-900/40 px-3.5 py-2 rounded-xl border border-zinc-850 h-fit">
                      <div className="flex items-center gap-1.5 border-r border-zinc-800 pr-2.5"><span className="text-zinc-500">Gender:</span><span className="text-zinc-300 font-semibold">{p.gender}</span></div>
                      <div className="flex items-center gap-1.5 border-r border-zinc-800 px-2.5"><span className="text-zinc-500">Ethnicity:</span><span className="text-zinc-300 font-semibold">{p.ethnicity}</span></div>
                      <div className="flex items-center gap-1.5 border-r border-zinc-800 px-2.5"><span className="text-zinc-500">Hair:</span><span className="text-zinc-300 font-semibold">{p.hair_color}</span></div>
                      <div className="flex items-center gap-1.5 border-r border-zinc-800 px-2.5"><span className="text-zinc-500">Eyes:</span><span className="text-zinc-300 font-semibold">{p.eye_color}</span></div>
                      <div className="flex items-center gap-1.5 pl-2.5"><span className="text-zinc-500">Age:</span><span className="text-zinc-300 font-semibold">{p.age}</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                    {/* Left text profile */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Personality Vibe</span>
                        <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-900/20 p-4 border border-zinc-900 rounded-xl">
                          "{p.description}"
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Brief Prompt Description</span>
                        <p className="text-[11px] text-zinc-400 leading-normal max-h-[100px] overflow-y-auto scrollbar-none">
                          {p.prompt}
                        </p>
                      </div>
                    </div>

                    {/* Right images profile */}
                    <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                      {p.images && p.images.map((imgUrl, imgIdx) => (
                        <div key={imgIdx} className="bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden shadow-lg flex flex-col group">
                          <div className="aspect-[3/4] relative overflow-hidden bg-zinc-950 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={imgUrl} 
                              alt={`${p.name} - ${angleLabels[imgIdx]}`} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            />
                            <div className="absolute top-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wider text-emerald-400 font-bold border border-emerald-500/10 backdrop-blur-sm">
                              {angleLabels[imgIdx]}
                            </div>
                          </div>
                          <div className="p-2 border-t border-zinc-900 bg-zinc-950/40 flex items-center justify-between text-[10px]">
                            <span className="text-zinc-500 font-bold">Angle {imgIdx + 1}</span>
                            <a 
                              href={imgUrl} 
                              download={`${p.name.toLowerCase()}-angle-${imgIdx + 1}.jpg`}
                              className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5 font-semibold"
                            >
                              Download ↓
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
