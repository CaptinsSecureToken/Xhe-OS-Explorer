import React, { useState } from 'react';
import { Pulse } from '@/kernel/kernel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Radio, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const PULSE_TYPES = [
  { value: 'message', label: 'Message', description: 'General communication' },
  { value: 'intent', label: 'Intent', description: 'Declared intention' },
  { value: 'claim', label: 'Claim', description: 'Assert a fact' },
  { value: 'event', label: 'Event', description: 'Record an occurrence' },
  { value: 'data', label: 'Data', description: 'Arbitrary data payload' }
];

export const PulseCreator = ({ currentIdentity, onPulseCreated }) => {
  const [type, setType] = useState('message');
  const [content, setContent] = useState('');
  const [metadata, setMetadata] = useState('');
  const [isEmitting, setIsEmitting] = useState(false);

  const handleEmit = async () => {
    if (!currentIdentity) {
      alert('Please select an identity first');
      return;
    }

    if (!content.trim()) {
      alert('Pulse content cannot be empty');
      return;
    }

    setIsEmitting(true);
    try {
      let metadataObj = {};
      if (metadata.trim()) {
        try {
          metadataObj = JSON.parse(metadata);
        } catch (e) {
          metadataObj = { raw: metadata };
        }
      }

      const pulse = await Pulse.emit(
        currentIdentity.id,
        type,
        { content: content.trim() },
        metadataObj
      );

      if (onPulseCreated) {
        await onPulseCreated(pulse);
      }

      setContent('');
      setMetadata('');
      setType('message');
    } catch (error) {
      console.error('Failed to emit pulse:', error);
      alert('Failed to emit pulse: ' + error.message);
    } finally {
      setIsEmitting(false);
    }
  };

  return (
    <Card className="border border-border rounded-sm" data-testid="pulse-creator">
      <div className="border-b border-border bg-slate-50/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-accent" />
          <h3 className="text-xl font-bold font-mono tracking-tight">
            Emit Pulse
          </h3>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
          IMMUTABLE_EVENT_BROADCAST
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-xs font-mono uppercase text-muted-foreground">
            Pulse Type
          </Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="rounded-sm mt-1" data-testid="pulse-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              {PULSE_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value} className="font-mono">
                  <div>
                    <div className="font-medium">{pt.label}</div>
                    <div className="text-xs text-muted-foreground">{pt.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-mono uppercase text-muted-foreground">
            Content
          </Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pulse payload..."
            className="rounded-sm mt-1 font-mono text-sm min-h-[120px]"
            data-testid="pulse-content-input"
          />
        </div>

        <div>
          <Label className="text-xs font-mono uppercase text-muted-foreground">
            Metadata (JSON, optional)
          </Label>
          <Input
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            placeholder='{"key": "value"}'
            className="rounded-sm mt-1 font-mono text-xs"
            data-testid="pulse-metadata-input"
          />
        </div>

        <Button
          onClick={handleEmit}
          disabled={isEmitting || !currentIdentity?.id || !content.trim()}
          className="w-full rounded-sm bg-accent hover:bg-accent/90"
          data-testid="emit-pulse-btn"
        >
          <Zap className="h-4 w-4 mr-2" />
          {isEmitting ? 'Emitting...' : 'Emit Pulse'}
        </Button>

        {!currentIdentity?.id && (
          <div className="text-xs text-center text-muted-foreground font-mono">
            Create an identity to emit pulses
          </div>
        )}
      </div>
    </Card>
  );
};
