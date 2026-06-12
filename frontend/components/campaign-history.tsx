'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase-client';
import { CampaignDocument } from '../types';

interface CampaignHistoryProps {
  activeCampaignId: string | null;
  onSelectCampaign: (id: string | null) => void;
  onShowPersonaCreator: () => void;
  activeView: 'campaign-create' | 'persona-create' | 'campaign-view';
}

function extractTimeFromId(id: string): number {
  const parts = id.split('-');
  if (parts.length >= 2) {
    const ts = parseInt(parts[1], 10);
    if (!isNaN(ts)) return ts;
  }
  return 0;
}

export default function CampaignHistory({ 
  activeCampaignId, 
  onSelectCampaign, 
  onShowPersonaCreator,
  activeView 
}: CampaignHistoryProps) {
  const [campaigns, setCampaigns] = useState<CampaignDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Query campaigns collection (max 50)
    const q = query(collection(db, 'campaigns'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CampaignDocument[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CampaignDocument);
      });

      // Sort chronologically using created_at timestamp or parsing campaign_id timestamp
      list.sort((a, b) => {
        const timeA = (a as any).created_at?.toMillis() || extractTimeFromId(a.campaign_id);
        const timeB = (b as any).created_at?.toMillis() || extractTimeFromId(b.campaign_id);
        return timeB - timeA;
      });

      setCampaigns(list);
    }, (error) => {
      console.error("Error subscribing to campaign history:", error);
    });

    return () => unsubscribe();
  }, []);

  const filteredCampaigns = campaigns.filter(c => {
    const idMatch = c.campaign_id.toLowerCase().includes(searchQuery.toLowerCase());
    const promptMatch = (c as any).prompt?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        c.workflow_options?.runResearch?.toString().includes(searchQuery.toLowerCase());
    return idMatch || promptMatch;
  });

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'bg-emerald-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'QUEUED':
        return 'bg-blue-500 animate-pulse';
      case 'RESEARCHING':
      case 'COPYWRITING':
        return 'bg-amber-500 animate-pulse';
      default:
        return 'bg-zinc-650';
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
      
      {/* Create New Campaign Button */}
      <button
        onClick={() => onSelectCampaign(null)}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all mb-2.5 ${
          activeCampaignId === null && activeView === 'campaign-create'
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 shadow-lg shadow-emerald-500/10 border border-emerald-500/20'
            : 'bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-350'
        }`}
      >
        + Create New Campaign
      </button>

      {/* Create AI Persona Button */}
      <button
        onClick={onShowPersonaCreator}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all mb-4 flex items-center justify-center gap-2 ${
          activeView === 'persona-create'
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 shadow-lg shadow-emerald-500/10 border border-emerald-500/20'
            : 'bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-350'
        }`}
      >
        <span>👤</span> Create AI Brand Persona
      </button>

      <div className="border-t border-zinc-850 my-2" />

      {/* History List Header */}
      <div className="space-y-3 mb-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Campaign History ({campaigns.length})
        </h3>
        
        {/* Search filter */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter campaigns..."
          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-xs font-medium">
            {searchQuery ? 'No matching campaigns' : 'No history found'}
          </div>
        ) : (
          filteredCampaigns.map((c) => {
            const isActive = activeCampaignId === c.campaign_id && activeView === 'campaign-view';
            const promptSnippet = (c as any).prompt || 'No brief summary available';
            
            return (
              <button
                key={c.campaign_id}
                onClick={() => onSelectCampaign(c.campaign_id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                  isActive
                    ? 'bg-zinc-950 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.05)]'
                    : 'bg-zinc-950/40 border-zinc-850 hover:bg-zinc-950/80 hover:border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[10px] font-mono font-bold tracking-tight truncate max-w-[150px] ${
                    isActive ? 'text-emerald-400' : 'text-zinc-400'
                  }`}>
                    {c.campaign_id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusColorClass(c.status)}`} />
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold font-sans">
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-350 line-clamp-2 leading-relaxed">
                  {promptSnippet}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
