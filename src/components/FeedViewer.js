import React, { useState, useEffect } from 'react';
import { Pulse, Identity } from '@/kernel/kernel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Shield, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export const FeedViewer = ({ currentIdentity, refreshTrigger }) => {
  const [pulses, setPulses] = useState([]);
  const [identityMap, setIdentityMap] = useState({});

  useEffect(() => {
    loadPulses();
    loadIdentities();
  }, [currentIdentity, refreshTrigger]);

  const loadPulses = async () => {
    if (!currentIdentity) {
      setPulses([]);
      return;
    }

    try {
      const identityPulses = await Pulse.getByIdentity(currentIdentity.id);
      setPulses(identityPulses);
    } catch (error) {
      console.error('Failed to load pulses:', error);
    }
  };

  const loadIdentities = async () => {
    const identities = await Identity.getAll();
    const map = {};
    identities.forEach(id => {
      map[id.id] = id;
    });
    setIdentityMap(map);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const truncate = (str, len = 50) => {
    if (!str || str.length <= len) return str;
    return `${str.substring(0, len)}...`;
  };

  const getPulseColor = (type) => {
    const colors = {
      message: 'bg-blue-100 text-blue-800 border-blue-200',
      intent: 'bg-purple-100 text-purple-800 border-purple-200',
      claim: 'bg-green-100 text-green-800 border-green-200',
      event: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      data: 'bg-gray-100 text-gray-800 border-gray-200',
      'slip.sent': 'bg-red-100 text-red-800 border-red-200',
      'slip.received': 'bg-green-100 text-green-800 border-green-200',
      'slip.minted': 'bg-orange-100 text-orange-800 border-orange-200',
      'channel.created': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'channel.joined': 'bg-cyan-100 text-cyan-800 border-cyan-200'
    };
    return colors[type] || colors.data;
  };

  return (
    <Card className="border border-border rounded-sm" data-testid="feed-viewer">
      <div className="border-b border-border bg-slate-50/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold font-mono tracking-tight">Feed</h3>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              PULSE_TIMELINE · {pulses.length} EVENTS
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[500px]">
        {pulses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <div className="text-sm font-mono">No pulses yet</div>
            <div className="text-xs mt-1">Emit your first pulse to see it here</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pulses.map((pulse) => (
              <div key={pulse.id} className="p-4 hover:bg-muted/30 transition-colors duration-100" data-testid={`pulse-item-${pulse.id}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`font-mono text-[10px] rounded-sm ${getPulseColor(pulse.type)}`}>
                      {pulse.type}
                    </Badge>
                    <div className="text-xs font-mono text-muted-foreground">
                      {truncate(pulse.id, 12)}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(pulse.timestamp)}
                  </div>
                </div>

                {pulse.payload && (
                  <div className="mb-2">
                    {typeof pulse.payload === 'object' ? (
                      <div className="bg-muted/50 p-2 rounded-sm">
                        <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                          {JSON.stringify(pulse.payload, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-sm">{pulse.payload}</div>
                    )}
                  </div>
                )}

                {pulse.metadata && Object.keys(pulse.metadata).length > 0 && (
                  <div className="text-xs text-muted-foreground font-mono mb-2">
                    <div className="text-[10px] uppercase tracking-wider mb-1">METADATA</div>
                    <div className="bg-muted/30 p-2 rounded-sm">
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(pulse.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span className="text-[10px]">SIGNED</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{identityMap[pulse.identityId]?.name || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
