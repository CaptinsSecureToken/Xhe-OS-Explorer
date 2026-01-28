import React, { useState, useEffect } from 'react';
import { Channel, Pulse, Identity } from '@/kernel/kernel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Hash, Plus, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export const ChannelBrowser = ({ currentIdentity, onChannelActivity }) => {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelPulses, setChannelPulses] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [identityMap, setIdentityMap] = useState({});

  useEffect(() => {
    loadChannels();
    loadIdentities();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      loadChannelPulses(selectedChannel.id);
    }
  }, [selectedChannel]);

  const loadChannels = async () => {
    const allChannels = await Channel.getAll();
    setChannels(allChannels);
  };

  const loadIdentities = async () => {
    const identities = await Identity.getAll();
    const map = {};
    identities.forEach(id => {
      map[id.id] = id;
    });
    setIdentityMap(map);
  };

  const loadChannelPulses = async (channelId) => {
    const pulses = await Channel.getPulses(channelId);
    setChannelPulses(pulses);
  };

  const handleCreateChannel = async () => {
    if (!currentIdentity || !newChannelName.trim()) return;

    setIsCreating(true);
    try {
      const channel = await Channel.create(
        newChannelName.trim(),
        newChannelDescription.trim(),
        currentIdentity.id
      );
      await loadChannels();
      setSelectedChannel(channel);
      setNewChannelName('');
      setNewChannelDescription('');
      if (onChannelActivity) onChannelActivity();
    } catch (error) {
      console.error('Failed to create channel:', error);
      alert('Failed to create channel: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinChannel = async (channel) => {
    if (!currentIdentity) return;

    try {
      await Channel.join(channel.id, currentIdentity.id);
      await loadChannels();
      setSelectedChannel(await Channel.getById(channel.id));
      if (onChannelActivity) onChannelActivity();
    } catch (error) {
      console.error('Failed to join channel:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const truncate = (str, len = 12) => {
    if (!str || str.length <= len) return str;
    return `${str.substring(0, len)}...`;
  };

  const isMember = (channel) => {
    return currentIdentity && channel.members.includes(currentIdentity.id);
  };

  return (
    <Card className="border border-border rounded-sm" data-testid="channel-browser">
      <div className="border-b border-border bg-slate-50/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-accent" />
              <h3 className="text-xl font-bold font-mono tracking-tight">
                Channels
              </h3>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              MULTI_IDENTITY_CONTEXTS
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-sm" data-testid="create-channel-btn">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm">
              <DialogHeader>
                <DialogTitle className="font-mono">Create Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-xs font-mono uppercase text-muted-foreground">
                    Channel Name
                  </Label>
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="general, announcements, etc."
                    className="rounded-sm mt-1"
                    data-testid="channel-name-input"
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono uppercase text-muted-foreground">
                    Description
                  </Label>
                  <Textarea
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="What is this channel for?"
                    className="rounded-sm mt-1"
                    data-testid="channel-description-input"
                  />
                </div>
                <Button
                  onClick={handleCreateChannel}
                  disabled={isCreating || !newChannelName.trim() || !currentIdentity}
                  className="w-full rounded-sm"
                  data-testid="create-channel-submit"
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Create Channel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border h-[500px]">
        {/* Channel List */}
        <div className="col-span-1">
          <div className="px-4 py-2 border-b border-border bg-slate-50/50">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              ALL_CHANNELS ({channels.length})
            </div>
          </div>
          <ScrollArea className="h-[calc(500px-40px)]">
            {channels.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="text-xs font-mono">No channels yet</div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors duration-100 ${
                      selectedChannel?.id === channel.id ? 'bg-accent/10' : ''
                    }`}
                    data-testid={`channel-item-${channel.name}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <div className="font-mono font-medium text-sm">{channel.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      <span>{channel.members.length} members</span>
                    </div>
                    {!isMember(channel) && (
                      <Badge variant="outline" className="text-[10px] mt-1 rounded-sm">
                        Not joined
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Channel Content */}
        <div className="col-span-2">
          {selectedChannel ? (
            <>
              <div className="px-4 py-3 border-b border-border bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-lg">
                      #{selectedChannel.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedChannel.description || 'No description'}
                    </div>
                  </div>
                  {!isMember(selectedChannel) && (
                    <Button
                      size="sm"
                      onClick={() => handleJoinChannel(selectedChannel)}
                      className="rounded-sm"
                      data-testid="join-channel-btn"
                    >
                      Join
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[calc(500px-73px)]">
                {channelPulses.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Hash className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <div className="text-sm font-mono">No activity yet</div>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {channelPulses.map((pulse) => (
                      <div key={pulse.id} className="p-4" data-testid={`channel-pulse-${pulse.id}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-mono">
                            {identityMap[pulse.identityId]?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1">
                              <div className="font-mono font-semibold text-sm">
                                {identityMap[pulse.identityId]?.name || 'Unknown'}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {formatTimestamp(pulse.timestamp)}
                              </div>
                              <Badge variant="outline" className="text-[10px] rounded-sm">
                                {pulse.type}
                              </Badge>
                            </div>
                            {pulse.payload && (
                              <div className="text-sm">
                                {typeof pulse.payload === 'object' ? (
                                  pulse.payload.content || JSON.stringify(pulse.payload)
                                ) : (
                                  pulse.payload
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Hash className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <div className="text-sm font-mono">Select a channel</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
