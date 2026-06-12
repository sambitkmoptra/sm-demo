'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SlideItem {
  slide_text?: string;
  visual_prompt?: string;
}

interface MediaGeneratorPanelProps {
  postType: 'linkedin' | 'facebook' | 'pinterest' | 'instagram' | 'shorts';
  defaultPrompt: string;
  slides?: SlideItem[];
  campaignId: string;
  mediaOutputs?: {
    linkedin?: string;
    facebook?: string;
    pinterest?: string;
    instagram?: {
      [key: string]: string;
    };
    shorts?: string;
  };
  brandPersonaImages?: string[]; // AI Brand Persona GCS references
}

export default function MediaGeneratorPanel({ 
  postType, 
  defaultPrompt, 
  slides,
  campaignId,
  mediaOutputs,
  brandPersonaImages = []
}: MediaGeneratorPanelProps) {
  const [productImage, setProductImage] = useState<string | null>(null);
  const [personaImages, setPersonaImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedAssets, setGeneratedAssets] = useState<{ [key: number]: string }>({});
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [availablePersonas, setAvailablePersonas] = useState<any[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');

  const productInputRef = useRef<HTMLInputElement>(null);
  const personaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch personas for Acme Sports brand to allow real-time switcher override
    let active = true;
    const fetchPersonas = async () => {
      try {
        const response = await fetch('/api/personas?brand_name=Acme Sports');
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setAvailablePersonas(data.personas || []);
          }
        }
      } catch (err) {
        console.error('Error loading personas in media panel:', err);
      }
    };
    fetchPersonas();
    return () => {
      active = false;
    };
  }, []);

  const getActivePersonaImages = (): string[] => {
    if (selectedPersonaId === 'default') {
      return brandPersonaImages;
    }
    if (selectedPersonaId === 'none') {
      return [];
    }
    const found = availablePersonas.find(p => p.persona_id === selectedPersonaId);
    return found ? (found.images as string[]) : [];
  };

  const activeBrandPersonaImages = getActivePersonaImages();

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProductImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handlePersonaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPersonaImages(prev => [...prev, event.target?.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveProduct = () => {
    setProductImage(null);
    if (productInputRef.current) productInputRef.current.value = '';
    setGeneratedAssets({});
    setError(null);
  };

  const handleRemovePersona = (index: number) => {
    setPersonaImages(prev => prev.filter((_, i) => i !== index));
    if (personaImages.length === 1 && personaInputRef.current) {
      personaInputRef.current.value = '';
    }
  };

  const steps = [
    'Analyzing product silhouettes and texture maps...',
    'Extracting influencer persona facial embeddings...',
    'Synthesizing pose angles and diffusion constraints...',
    'Running gemini-3.1-flash-image canvas rendering...',
    'Finalizing resolution and color grading...'
  ];

  const hasSlides = postType === 'instagram' && slides && slides.length > 0;
  const targetIndex = hasSlides ? activeSlideIndex : 0;
  
  // Resolve the visual asset dynamically:
  // 1. Check local generated state cache
  // 2. Check if Firestore contains a saved URL for this post/slide
  const activeAsset = (generatedAssets[targetIndex] || (
    hasSlides 
      ? mediaOutputs?.instagram?.[activeSlideIndex]
      : (mediaOutputs?.[postType] as string)
  ) || undefined) as string | undefined;

  const currentPrompt = hasSlides 
    ? (slides[activeSlideIndex]?.visual_prompt || 'No visual prompt specified for this slide') 
    : defaultPrompt;

  const handleGenerate = async () => {
    if (!productImage) return;
    setIsGenerating(true);
    setGenerationStep(0);
    setError(null);

    // Dynamic loader steps interval
    const interval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev >= steps.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    try {
      // Prioritize manually uploaded influencer images; fallback to GCS brand persona URLs
      const targetPersonaImages = personaImages.length > 0 ? personaImages : activeBrandPersonaImages;

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: currentPrompt,
          product_image: productImage,
          persona_images: targetPersonaImages,
          aspect_ratio: postType === 'pinterest' ? '9:16' : postType === 'shorts' ? '9:16' : '1:1',
          campaign_id: campaignId,
          post_type: postType,
          slide_index: hasSlides ? activeSlideIndex : undefined
        }),
      });

      const data = await response.json();
      
      clearInterval(interval);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedAssets(prev => ({
        ...prev,
        [targetIndex]: data.public_url || `data:image/jpeg;base64,${data.generated_image_b64}`
      }));
    } catch (err: any) {
      console.error('Image Generation API Error:', err);
      setError(err.message || 'An unexpected error occurred during generation.');
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const isVideo = postType === 'shorts';

  return (
    <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-6 space-y-6">
      
      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-center">
          <span className="text-red-400 text-xs font-bold font-mono">!</span>
          <p className="text-xs text-red-300 font-semibold">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">Creative Media Production Console</h4>
          <p className="text-xs text-zinc-500 mt-1">
            {hasSlides 
              ? `Generate multi-slide carousel graphics (${slides.length} slides total) using product references.`
              : `Generate customized ${isVideo ? 'portrait video assets' : 'post graphics'} using product references.`}
          </p>
        </div>
        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          {postType === 'instagram' ? 'Carousel Mode' : isVideo ? 'Video Mode' : 'Image Mode'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Side: Upload controls */}
        <div className="space-y-5">
          {/* Product Image Input (Required) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Product Image <span className="text-emerald-500">*</span>
              </label>
              {productImage && (
                <button onClick={handleRemoveProduct} className="text-[10px] text-red-400 hover:underline">
                  Remove
                </button>
              )}
            </div>
            
            {!productImage ? (
              <div 
                onClick={() => productInputRef.current?.click()}
                className="border border-dashed border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900/10 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer min-h-[120px]"
              >
                <span className="text-2xl">📦</span>
                <span className="text-xs font-medium text-zinc-400">Select or Drag Product Image</span>
                <span className="text-[9px] text-zinc-500">PNG, JPG up to 10MB (Required)</span>
                <input 
                  type="file" 
                  ref={productInputRef}
                  onChange={handleProductUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="relative border border-zinc-800 rounded-xl overflow-hidden aspect-video bg-zinc-950 flex items-center justify-center group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={productImage} alt="Product" className="max-h-full object-contain max-w-full p-2" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-zinc-300 font-semibold">Product Reference Active</span>
                </div>
              </div>
            )}
          </div>

          {/* Influencer/Persona Image Input (Optional) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Influencer / Persona Reference <span className="text-zinc-650">(Optional)</span>
              </label>
              
              {/* Persona Switcher Dropdown */}
              <select
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 hover:border-zinc-750 rounded-lg px-2.5 py-1 text-zinc-300 text-xs focus:outline-none focus:border-emerald-500 transition-colors w-fit max-w-[180px]"
              >
                <option value="default">Campaign Default</option>
                <option value="none">None (Manual Upload)</option>
                {availablePersonas.map((p) => (
                  <option key={p.persona_id} value={p.persona_id}>
                    {p.name} ({p.clothing_style})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
              <div 
                onClick={() => personaInputRef.current?.click()}
                className="border border-dashed border-zinc-800 hover:border-emerald-500/40 transition-all rounded-xl w-16 h-16 flex flex-col items-center justify-center gap-1 cursor-pointer bg-zinc-900/10"
              >
                <span className="text-lg">👤</span>
                <span className="text-[8px] text-zinc-500 font-semibold">Add Angle</span>
                <input 
                  type="file" 
                  ref={personaInputRef}
                  onChange={handlePersonaUpload} 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                />
              </div>

              {/* Manually uploaded custom angles */}
              {personaImages.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Persona ${idx}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => handleRemovePersona(idx)} 
                    className="absolute -top-1 -right-1 bg-red-600/80 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Saved AI Brand Persona Reference fallback */}
              {personaImages.length === 0 && activeBrandPersonaImages && activeBrandPersonaImages.map((imgUrl, idx) => (
                <div key={`brand-persona-${idx}`} className="relative w-16 h-16 border border-emerald-500/40 rounded-xl overflow-hidden bg-zinc-950 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt={`AI Brand Persona Angle ${idx}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[9px] text-emerald-400 font-bold">AI Model</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal">
              {activeBrandPersonaImages.length > 0 && personaImages.length === 0
                ? "Active: AI Brand Persona references pre-loaded above. Add custom files to override."
                : "Provide face/pose profile images (different angles) to blend a simulated model persona with the product."}
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={!productImage || isGenerating}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-emerald-500/15"
          >
            {isGenerating 
              ? 'Synthesizing Creative Models...' 
              : activeAsset 
                ? `Regenerate ${hasSlides ? `Slide ${activeSlideIndex + 1} Image` : isVideo ? 'Post Video' : 'Post Image'}`
                : `Generate ${hasSlides ? `Slide ${activeSlideIndex + 1} Image` : isVideo ? 'Post Video' : 'Post Image'}`}
          </button>
        </div>

        {/* Right Side: Output visual viewport */}
        <div className="flex flex-col h-full min-h-[300px] bg-zinc-950 border border-zinc-900 rounded-xl p-5 items-center justify-center relative overflow-hidden">
          
          {/* Default state */}
          {!isGenerating && !activeAsset && (
            <div className="text-center space-y-2 text-zinc-650 max-w-[280px]">
              <span className="text-4xl block">✨</span>
              <p className="text-xs font-semibold text-zinc-400">Creative Production Preview</p>
              <p className="text-[10px] leading-relaxed">
                Provide a product reference image and trigger generation to render the output campaign creative.
              </p>
            </div>
          )}

          {/* Generating Loading State */}
          {isGenerating && (
            <div className="text-center space-y-4 max-w-[280px] z-10">
              <div className="flex justify-center">
                <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-15" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-emerald-400 animate-pulse">Running Generation Pipeline</p>
                <p className="text-[10px] text-zinc-400 min-h-[30px] transition-all duration-300">
                  {steps[generationStep]}
                </p>
              </div>
              
              {/* Fake progress bar */}
              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${((generationStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Generated Result placeholder */}
          {!isGenerating && activeAsset && (
            <div className="w-full h-full flex flex-col justify-between items-center relative z-10 py-2">
              
              {/* Carousel Slide Selector if Instagram */}
              {hasSlides && (
                <div className="flex gap-1.5 mb-3 flex-wrap justify-center max-w-full">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSlideIndex(idx)}
                      className={`px-2.5 py-1 text-[9px] font-bold rounded-md border transition-all ${
                        activeSlideIndex === idx
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-450 hover:text-zinc-300'
                      }`}
                    >
                      Slide {idx + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Blended image overlay */}
              <div className={`relative bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 ${
                postType === 'pinterest' ? 'w-48 h-64 border-red-500/20' : isVideo ? 'w-48 h-64' : 'w-64 h-48'
              }`}>
                {/* Generated image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeAsset} alt="Generated Creative" className="w-full h-full object-cover absolute inset-0" />
                
                <div className="absolute top-3 left-3 bg-black/60 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider text-emerald-400 font-bold border border-emerald-500/20 backdrop-blur-sm">
                  {postType === 'pinterest' ? 'Pinterest Pin' : hasSlides ? `Instagram Slide ${activeSlideIndex + 1}` : isVideo ? 'Shorts Render' : 'Social Banner'}
                </div>

                <a 
                  href={activeAsset}
                  download={`creative-${postType}-${hasSlides ? activeSlideIndex + 1 : '1'}.jpg`}
                  className="absolute bottom-3 right-3 w-6 h-6 bg-zinc-900/80 hover:bg-zinc-900 rounded border border-zinc-850 flex items-center justify-center text-xs text-zinc-300 hover:text-white transition-colors"
                  title="Download Image"
                >
                  ↓
                </a>
              </div>

              <span className="text-[10px] text-zinc-400 font-medium mt-3">
                {hasSlides ? `Slide ${activeSlideIndex + 1} generated successfully.` : 'Creative output generated successfully!'}
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-zinc-950 pointer-events-none" />
        </div>

      </div>
    </div>
  );
}
