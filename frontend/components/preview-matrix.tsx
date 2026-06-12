'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { OmnichannelCampaignBundle } from '../types';
import MediaGeneratorPanel from './media-generator-panel';

interface PreviewMatrixProps {
  variants?: OmnichannelCampaignBundle;
  campaignId: string;
  mediaOutputs?: any;
  personaImages?: string[]; // GCS URLs for the AI Brand Persona
}

export default function PreviewMatrix({ variants, campaignId, mediaOutputs, personaImages }: PreviewMatrixProps) {
  // Set default active tab to 'linkedin' (hiding 'blog')
  const [activeTab, setActiveTab] = useState<'linkedin' | 'facebook' | 'pinterest' | 'instagram' | 'shorts'>('linkedin');
  const [copied, setCopied] = useState(false);

  if (!variants) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Removed 'blog' from the tabs list to hide it in the UI navigation header
  const tabs = [
    { id: 'linkedin', label: 'LinkedIn Card' },
    { id: 'facebook', label: 'Facebook Update' },
    { id: 'pinterest', label: 'Pinterest Composition' },
    { id: 'instagram', label: 'Instagram Carousel' },
    { id: 'shorts', label: 'Shorts & Reels Script' },
  ] as const;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative">
      {/* Interactive Tabs Header */}
      <div className="flex border-b border-zinc-800 bg-zinc-950 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 outline-none ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-400 bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-250 hover:bg-zinc-900/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Tab 2: LinkedIn Narrative Card */}
        {activeTab === 'linkedin' && variants.linkedin_post && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Professional Narrative Post</span>
              <button
                onClick={() => handleCopy(variants.linkedin_post.narrative)}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/20"
              >
                {copied ? 'Copied!' : 'Copy Post'}
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-6 text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed">
              {variants.linkedin_post.narrative}
            </div>

            <div className="bg-zinc-950/40 border border-zinc-850/60 rounded-xl p-4 space-y-1">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Visual Styling Prompt</h4>
              <p className="text-xs text-zinc-300 leading-relaxed italic">
                {variants.linkedin_post.visual_prompt}
              </p>
            </div>

            {/* Media Generator */}
            <div className="mt-8 border-t border-zinc-900 pt-6">
              <MediaGeneratorPanel 
                postType="linkedin" 
                defaultPrompt={variants.linkedin_post.visual_prompt} 
                campaignId={campaignId}
                mediaOutputs={mediaOutputs}
                brandPersonaImages={personaImages}
              />
            </div>

            {/* Automated Social Publishing Console */}
            <div className="mt-6 border-t border-zinc-900 pt-6">
              <div className="bg-zinc-950/20 border border-zinc-850 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-200">Automated Social Publishing Console</h4>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-zinc-500 font-mono">Integration Ready</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Instantly dispatch this professional narrative post and generated banner to your connected LinkedIn feed.
                  </p>
                </div>
                <button
                  onClick={() => alert('Auto-Publishing to LinkedIn... (Integration Pending)')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-500/15"
                >
                  <span>🚀</span> Auto-Publish to LinkedIn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Facebook Update */}
        {activeTab === 'facebook' && variants.facebook_post && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Community Narrative Post</span>
              <button
                onClick={() => handleCopy(variants.facebook_post.narrative)}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/20"
              >
                {copied ? 'Copied!' : 'Copy Post'}
              </button>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-6 text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed">
              {variants.facebook_post.narrative}
            </div>

            <div className="bg-zinc-950/40 border border-zinc-850/60 rounded-xl p-4 space-y-1">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Visual Styling Prompt</h4>
              <p className="text-xs text-zinc-300 leading-relaxed italic">
                {variants.facebook_post.visual_prompt}
              </p>
            </div>

            {/* Media Generator */}
            <div className="mt-8 border-t border-zinc-900 pt-6">
              <MediaGeneratorPanel 
                postType="facebook" 
                defaultPrompt={variants.facebook_post.visual_prompt} 
                campaignId={campaignId}
                mediaOutputs={mediaOutputs}
                brandPersonaImages={personaImages}
              />
            </div>

            {/* Automated Social Publishing Console */}
            <div className="mt-6 border-t border-zinc-900 pt-6">
              <div className="bg-zinc-950/20 border border-zinc-850 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-200">Automated Social Publishing Console</h4>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-zinc-500 font-mono">Integration Ready</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Queue this narrative update and media asset directly to your brand's connected Facebook Page.
                  </p>
                </div>
                <button
                  onClick={() => alert('Auto-Publishing to Facebook Page... (Integration Pending)')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-500/15"
                >
                  <span>🚀</span> Auto-Publish to Facebook
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Pinterest Visual Composition Prompt */}
        {activeTab === 'pinterest' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Pinterest Graphic Prompt</span>
              <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 text-zinc-250 text-sm leading-relaxed italic">
                {variants.pinterest_prompt}
              </div>
              <button
                onClick={() => handleCopy(variants.pinterest_prompt)}
                className="w-full bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-350 text-xs font-semibold py-2.5 rounded-xl transition-colors"
              >
                Copy Prompt Text
              </button>
            </div>

            {/* Media Generator (Unified Graphic Viewport) */}
            <div className="mt-8 border-t border-zinc-900 pt-6">
              <MediaGeneratorPanel 
                postType="pinterest" 
                defaultPrompt={variants.pinterest_prompt} 
                campaignId={campaignId}
                mediaOutputs={mediaOutputs}
                brandPersonaImages={personaImages}
              />
            </div>

            {/* Automated Social Publishing Console */}
            <div className="mt-6 border-t border-zinc-900 pt-6">
              <div className="bg-zinc-950/20 border border-zinc-850 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-200">Automated Social Publishing Console</h4>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-zinc-500 font-mono">Integration Ready</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Publish this visual composition pin and graphic asset directly to your target Pinterest Board.
                  </p>
                </div>
                <button
                  onClick={() => alert('Pinning to Pinterest Board... (Integration Pending)')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-500/15"
                >
                  <span>🚀</span> Pin to Pinterest Board
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Instagram Carousel */}
        {activeTab === 'instagram' && variants.instagram_carousal && (
          <div className="space-y-6">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Instagram Slides Sequence</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {variants.instagram_carousal.map((slide, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">
                        Slide {idx + 1}
                      </span>
                    </div>
                    <p className="text-zinc-200 text-xs leading-relaxed mb-4">{slide.slide_text}</p>
                  </div>
                  <div className="border-t border-zinc-900/60 pt-3">
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase block mb-1">Visual Prompt</span>
                    <p className="text-[10px] text-zinc-400 italic leading-snug">{slide.visual_prompt}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Media Generator (Carousel Slides Adaptation) */}
            <div className="mt-8 border-t border-zinc-900 pt-6">
              <MediaGeneratorPanel 
                postType="instagram" 
                defaultPrompt={variants.instagram_carousal[0]?.visual_prompt || ''} 
                slides={variants.instagram_carousal}
                campaignId={campaignId}
                mediaOutputs={mediaOutputs}
                brandPersonaImages={personaImages}
              />
            </div>

            {/* Automated Social Publishing Console */}
            <div className="mt-6 border-t border-zinc-900 pt-6">
              <div className="bg-zinc-950/20 border border-zinc-850 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-200">Automated Social Publishing Console</h4>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-zinc-500 font-mono">Integration Ready</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Schedule and publish this multi-slide copy slide deck and generated carousel images directly to your Instagram profile.
                  </p>
                </div>
                <button
                  onClick={() => alert('Publishing Instagram Carousel... (Integration Pending)')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-500/15"
                >
                  <span>🚀</span> Publish Instagram Carousel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Shorts & Reels Script */}
        {activeTab === 'shorts' && variants.shorts_reels_script && (
          <div className="space-y-6">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Shorts / Reels Timed Script Frame</span>
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase font-semibold tracking-wider">
                    <th className="p-4 w-24">Timing</th>
                    <th className="p-4 w-1/2">Voiceover Script</th>
                    <th className="p-4">Visual Storyboard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {variants.shorts_reels_script.map((frame, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-emerald-400">{frame.timestamp}</td>
                      <td className="p-4 text-zinc-200 leading-relaxed whitespace-pre-wrap">{frame.voiceover}</td>
                      <td className="p-4 text-zinc-400 leading-relaxed italic">{frame.visual_description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Media Generator */}
            <div className="mt-8 border-t border-zinc-900 pt-6">
              <MediaGeneratorPanel 
                postType="shorts" 
                defaultPrompt={variants.shorts_reels_script[0]?.visual_description || ''} 
                campaignId={campaignId}
                mediaOutputs={mediaOutputs}
                brandPersonaImages={personaImages}
              />
            </div>

            {/* Automated Social Publishing Console */}
            <div className="mt-6 border-t border-zinc-900 pt-6">
              <div className="bg-zinc-950/20 border border-zinc-850 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-200">Automated Social Publishing Console</h4>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-zinc-500 font-mono">Integration Ready</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Upload this synchronized narration storyboard and video assets directly to your YouTube channel and Instagram Reels.
                  </p>
                </div>
                <button
                  onClick={() => alert('Posting to YouTube Shorts & IG Reels... (Integration Pending)')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-500/15"
                >
                  <span>🚀</span> Post to Shorts & Reels
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
