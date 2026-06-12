'use client';

import React from 'react';
import { CampaignDocument, CampaignLog } from '../types';

interface ProgressTimelineProps {
  campaign: CampaignDocument | null;
}

export default function ProgressTimeline({ campaign }: ProgressTimelineProps) {
  if (!campaign) return null;

  const { status, progress, logs = [] } = campaign;

  const stages = [
    { id: 'QUEUED', label: 'Initializing', description: 'Triggering multi-agent environment.' },
    { id: 'RESEARCHING', label: 'Web Research', description: 'Google Search & Social Media trend.' },
    { id: 'COPYWRITING', label: 'Grounded Copywriting', description: 'Ingesting guidelines & writing omnichannel copy.' },
    { id: 'PENDING_REVIEW', label: 'Staged for Review', description: 'Rendering structured output bundle.' },
  ];

  const getStageStatus = (stageId: string) => {
    if (status === 'FAILED') return 'failed';

    const currentIndex = stages.findIndex(s => s.id === status);
    const stageIndex = stages.findIndex(s => s.id === stageId);

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Decorative side accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full" />

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          Pipeline Progress Tracking
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
            ID: {campaign.campaign_id}
          </span>
        </h3>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full uppercase text-xs tracking-wider ${status === 'PENDING_REVIEW' ? 'bg-emerald-500/10 text-emerald-400' :
            status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
              'bg-blue-500/10 text-blue-400 animate-pulse'
          }`}>
          {status === 'PENDING_REVIEW' ? 'Pending Review' : status}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-zinc-400 font-semibold">
          <span>Overall Completion</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline stages */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {stages.map((stage) => {
          const stageStatus = getStageStatus(stage.id);
          return (
            <div
              key={stage.id}
              className={`p-4 rounded-xl border transition-all duration-300 relative ${stageStatus === 'completed' ? 'bg-zinc-950/40 border-emerald-500/20' :
                  stageStatus === 'active' ? 'bg-zinc-950 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.05)]' :
                    stageStatus === 'failed' && status === stage.id ? 'bg-zinc-950 border-red-500/50' :
                      'bg-zinc-950/20 border-zinc-850 opacity-40'
                }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {stageStatus === 'completed' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500 flex items-center justify-center text-emerald-400 text-xs font-bold">
                    ✓
                  </div>
                )}
                {stageStatus === 'active' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950 text-xs font-bold animate-pulse">
                    ●
                  </div>
                )}
                {stageStatus === 'upcoming' && (
                  <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500 text-xs">
                    ○
                  </div>
                )}
                {stageStatus === 'failed' && (
                  <div className="w-5 h-5 rounded-full bg-red-500/15 border border-red-500 flex items-center justify-center text-red-400 text-xs font-bold">
                    !
                  </div>
                )}
                <span className={`text-sm font-semibold ${stageStatus === 'active' ? 'text-emerald-400' :
                    stageStatus === 'completed' ? 'text-zinc-300' : 'text-zinc-500'
                  }`}>
                  {stage.label}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{stage.description}</p>
            </div>
          );
        })}
      </div>

      {/* Log Terminal console */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Live Agent Log Console</h4>
        <div className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-4 font-mono text-xs text-zinc-300 h-40 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {logs.map((log: CampaignLog, idx: number) => (
            <div key={idx} className="flex gap-2">
              <span className="text-emerald-500">[{log.step}]</span>
              <span className="text-zinc-400">{log.message}</span>
            </div>
          ))}
          {status !== 'PENDING_REVIEW' && status !== 'FAILED' && (
            <div className="flex gap-2 animate-pulse text-zinc-500">
              <span>[SYSTEM]</span>
              <span>Awaiting agent response...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
