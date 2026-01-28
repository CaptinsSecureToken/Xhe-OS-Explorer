import React, { useState, useEffect } from 'react';
import '@/App.css';
import { initializeKernel } from '@/kernel/kernel';
import { IdentityManager } from '@/components/IdentityManager';
import { PulseCreator } from '@/components/PulseCreator';
import { FeedViewer } from '@/components/FeedViewer';
import { SlipManager } from '@/components/SlipManager';
import { ChannelBrowser } from '@/components/ChannelBrowser';
import { Identity } from '@/kernel/kernel';
import { Terminal, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function App() {
  const [kernelInitialized, setKernelInitialized] = useState(false);
  const [currentIdentity, setCurrentIdentity] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeKernel();
        setKernelInitialized(true);
        toast.success('Xhe-OS Kernel Initialized', {
          description: 'Deterministic coordination primitives ready'
        });
      } catch (error) {
        console.error('Failed to initialize kernel:', error);
        toast.error('Kernel initialization failed');
      }
    };
    init();
  }, []);

  const handleIdentityChange = async (identity) => {
    if (!identity) {
      setCurrentIdentity(null);
      return;
    }
    // Refresh identity data to get latest balances
    try {
      const refreshed = await Identity.getById(identity.id);
      setCurrentIdentity(refreshed || identity);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to refresh identity:', error);
      setCurrentIdentity(identity);
    }
  };

  const handleRefresh = async () => {
    setRefreshTrigger(prev => prev + 1);
    if (currentIdentity) {
      try {
        const refreshed = await Identity.getById(currentIdentity.id);
        if (refreshed) {
          setCurrentIdentity(refreshed);
        }
      } catch (error) {
        console.error('Failed to refresh current identity:', error);
      }
    }
  };

  if (!kernelInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Terminal className="h-16 w-16 mx-auto mb-4 text-accent animate-pulse" />
          <div className="font-mono text-xl font-bold">Initializing Xhe-OS Kernel...</div>
          <div className="text-sm text-muted-foreground mt-2">
            Loading coordination primitives
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="xhe-os-dashboard">
      <Toaster />
      
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-mono tracking-tight">Xhe-OS</h1>
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Browser-Native Coordination Kernel
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  STATUS
                </div>
                <div className="text-sm font-mono font-semibold text-green-600">
                  OPERATIONAL
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Info Banner */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-6 py-3">
          <Alert className="border-none bg-transparent p-0">
            <Info className="h-4 w-4 text-accent" />
            <AlertDescription className="text-xs font-mono">
              <strong>100% Client-Side</strong> · All data stored locally in IndexedDB · 
              Deterministic · Auditable · Sovereign
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Main Dashboard */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Identity & Slips */}
          <div className="col-span-4 space-y-6">
            <IdentityManager
              currentIdentity={currentIdentity}
              onIdentityChange={handleIdentityChange}
            />
            <SlipManager
              currentIdentity={currentIdentity}
              onSlipTransferred={handleRefresh}
            />
          </div>

          {/* Middle Column - Pulse Creator & Feed */}
          <div className="col-span-4 space-y-6">
            <PulseCreator
              currentIdentity={currentIdentity}
              onPulseCreated={handleRefresh}
            />
            <FeedViewer
              currentIdentity={currentIdentity}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Right Column - Channels */}
          <div className="col-span-4">
            <ChannelBrowser
              currentIdentity={currentIdentity}
              onChannelActivity={handleRefresh}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-12">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div>
              Iconoclast Sovereign Network · Local-First Computing
            </div>
            <div>
              Kernel v1.0.0 · No Servers · No Trust Required
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
