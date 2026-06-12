'use client';

import React, { useState, useEffect } from 'react';

interface CampaignFormProps {
  onTriggerCampaign: (payload: {
    campaign_id: string;
    prompt: string;
    brand_kit: {
      brand_name: string;
      data_store_id: string;
      location: string;
    };
    workflow_options: {
      runResearch: boolean;
      runCopywriter: boolean;
      runVisuals: boolean;
      runAuditor: boolean;
      persona_id?: string;
      persona_images?: string[];
    };
  }) => void;
  isLoading: boolean;
}

export default function CampaignForm({ onTriggerCampaign, isLoading }: CampaignFormProps) {
  const [prompt, setPrompt] = useState('');
  const [brandName, setBrandName] = useState('Acme Sports');
  const [dataStoreId, setDataStoreId] = useState('social-media-demo-brand-guidelines_1780609019008');
  const [location, setLocation] = useState('global');
  const [runResearch, setRunResearch] = useState(true);
  const [personas, setPersonas] = useState<any[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('none');

  useEffect(() => {
    let active = true;

    const fetchPersonas = async () => {
      try {
        const response = await fetch(`/api/personas?brand_name=${encodeURIComponent(brandName)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch brand personas');
        }
        const data = await response.json();
        if (active) {
          setPersonas(data.personas || []);
        }
      } catch (error) {
        console.error("Error fetching brand personas:", error);
      }
    };

    fetchPersonas();

    return () => {
      active = false;
    };
  }, [brandName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !brandName.trim() || !dataStoreId.trim()) return;

    // Generate unique campaign ID client-side
    const campaignId = `camp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const selectedPersona = personas.find(p => p.persona_id === selectedPersonaId);
    const personaImages = selectedPersona ? selectedPersona.images : [];

    onTriggerCampaign({
      campaign_id: campaignId,
      prompt: prompt.trim(),
      brand_kit: {
        brand_name: brandName.trim(),
        data_store_id: dataStoreId.trim(),
        location: location.trim(),
      },
      workflow_options: {
        runResearch,
        runCopywriter: true, // Always enabled as a required workflow step
        runVisuals: false,
        runAuditor: false,
        persona_id: selectedPersonaId !== 'none' ? selectedPersonaId : undefined,
        persona_images: personaImages.length > 0 ? personaImages : undefined
      },
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Decorative top ambient glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      
      <h2 className="text-xl font-semibold text-zinc-100 mb-6 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        Campaign Creation Canvas
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand Kit Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              disabled={isLoading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="e.g. Acme Sports"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Vertex AI Data Store ID</label>
            <select
              value={dataStoreId}
              onChange={(e) => setDataStoreId(e.target.value)}
              disabled={isLoading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="social-media-demo-brand-guidelines_1780609019008">
                social-media-demo-brand-guidelines (Default)
              </option>
              <option value="custom-brand-guidelines-manual">
                custom-brand-guidelines-manual
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isLoading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="global">Global</option>
              <option value="us-central1">us-central1</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Model Persona</label>
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              disabled={isLoading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="none">None (Manual Upload)</option>
              {personas.map((p) => (
                <option key={p.persona_id} value={p.persona_id}>
                  {p.name} ({p.clothing_style})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Workflow Options */}
        <div className="flex flex-wrap gap-6 border-y border-zinc-800/60 py-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={runResearch}
              onChange={(e) => setRunResearch(e.target.checked)}
              disabled={isLoading}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-zinc-100 peer-checked:after:border-transparent relative" />
            <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
              Enable Web Research (Google Search)
            </span>
          </label>

          {/* Locked/Required Copywriting Toggle */}
          <label className="flex items-center gap-3 cursor-not-allowed group">
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-emerald-600/50 rounded-full peer after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:rounded-full after:h-4 after:w-4 relative opacity-60" />
            <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-500 transition-colors flex items-center gap-2">
              Enable Copywriting (Omnichannel Bundle)
              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700/50">Required</span>
            </span>
          </label>
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Campaign Brief & Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors h-32 resize-none"
            placeholder="Describe the campaign launch requirements... (e.g. Create a launch campaign for our new slip on running shoes)"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 font-medium py-3 px-4 rounded-xl shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Orchestrating Multi-Agent Pipeline...
            </>
          ) : (
            'Generate Omni-Channel Campaign'
          )}
        </button>
      </form>
    </div>
  );
}
