'use client';

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase-client';
import { CampaignDocument } from '../types';
import CampaignForm from '../components/campaign-form';
import ProgressTimeline from '../components/progress-timeline';
import PreviewMatrix from '../components/preview-matrix';
import CampaignHistory from '../components/campaign-history';
import PersonaCreatorForm from '../components/persona-creator-form';
import LoginScreen from '../components/login-screen';

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignDocument | null>(null);
  const [activeView, setActiveView] = useState<'campaign-create' | 'persona-create' | 'campaign-view'>('campaign-create');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check authentication session on mount
  useEffect(() => {
    const loggedIn = localStorage.getItem('acme_agent_auth');
    if (loggedIn === 'true') {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  // Firestore Real-Time Listener for the selected campaign
  useEffect(() => {
    if (!isAuthenticated || !activeCampaignId) {
      setCampaign(null);
      return;
    }

    const docRef = doc(db, 'campaigns', activeCampaignId);
    
    // Subscribe to real-time changes
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as CampaignDocument;
          setCampaign(data);
          
          // Stop loading spinner once state lands in finished review or failures
          if (data.status === 'PENDING_REVIEW' || data.status === 'FAILED') {
            setIsLoading(false);
          }
        }
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        setError(`Connection error: ${err.message}`);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeCampaignId, isAuthenticated]);

  const handleSelectCampaign = (id: string | null) => {
    setActiveCampaignId(id);
    setError(null);
    if (id === null) {
      setCampaign(null);
      setIsLoading(false);
      setActiveView('campaign-create');
    } else {
      setActiveView('campaign-view');
    }
  };

  const handleTriggerCampaign = async (payload: {
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
  }) => {
    setIsLoading(true);
    setError(null);
    setCampaign(null);
    setActiveCampaignId(payload.campaign_id);
    setActiveView('campaign-view');

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to start campaign generation.');
      }
    } catch (err: any) {
      console.error('Trigger Campaign Error:', err);
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('acme_agent_auth');
    setIsAuthenticated(false);
    setActiveCampaignId(null);
    setCampaign(null);
    setActiveView('campaign-create');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Premium Header */}
        <header className="border-b border-zinc-900 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Omni-Agent Campaign Engine
            </h1>
            <p className="text-sm text-zinc-400 font-medium">
              Real-time multi-agent copywriting synthesis grounded by Vertex RAG & Google Search.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-900 px-3 py-1.5 rounded-lg w-fit">
              <span>Server Sync Status:</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-350">Active Connection</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-center">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold font-mono">!</div>
            <p className="text-xs text-red-300 font-semibold">{error}</p>
          </div>
        )}

        {/* Workspace Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Left Column: Sidebar Campaign History Selector */}
          <div className="lg:col-span-1 h-fit lg:sticky lg:top-8">
            <CampaignHistory 
              activeCampaignId={activeCampaignId} 
              onSelectCampaign={handleSelectCampaign} 
              onShowPersonaCreator={() => {
                setActiveView('persona-create');
                setActiveCampaignId(null);
                setError(null);
              }}
              activeView={activeView}
            />
          </div>

          {/* Right Column: Main Content Workspace */}
          <div className="lg:col-span-3 space-y-8">
            
            {activeView === 'campaign-create' && (
              <section className="transition-all duration-300">
                <CampaignForm onTriggerCampaign={handleTriggerCampaign} isLoading={isLoading} />
              </section>
            )}

            {activeView === 'persona-create' && (
              <section className="transition-all duration-300">
                <PersonaCreatorForm />
              </section>
            )}

            {activeView === 'campaign-view' && (
              <>
                <section className="transition-all duration-300">
                  <ProgressTimeline campaign={campaign} />
                </section>

                {campaign?.status === 'PENDING_REVIEW' && campaign.variants && (
                  <section className="transition-all duration-300">
                    <PreviewMatrix 
                      variants={campaign.variants} 
                      campaignId={campaign.campaign_id}
                      mediaOutputs={campaign.media_outputs}
                      personaImages={campaign.workflow_options?.persona_images}
                    />
                  </section>
                )}
              </>
            )}

          </div>

        </div>
        
      </div>
    </main>
  );
}
