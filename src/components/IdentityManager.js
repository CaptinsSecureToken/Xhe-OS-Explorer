import React, { useState, useEffect } from 'react';
import { Identity } from '@/kernel/kernel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Key, User, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const IdentityManager = ({ currentIdentity, onIdentityChange }) => {
  const [identities, setIdentities] = useState([]);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadIdentities();
  }, []);

  const loadIdentities = async () => {
    const ids = await Identity.getAll();
    setIdentities(ids);
    
    // Set first identity as current if none selected
    if (!currentIdentity && ids.length > 0) {
      onIdentityChange(ids[0]);
    } else if (currentIdentity) {
      // Refresh current identity data if it exists
      const refreshed = ids.find(id => id.id === currentIdentity.id);
      if (refreshed && onIdentityChange) {
        onIdentityChange(refreshed);
      }
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    setIsCreating(true);
    try {
      const identity = await Identity.create(newName.trim());
      await loadIdentities();
      onIdentityChange(identity);
      setNewName('');
    } catch (error) {
      console.error('Failed to create identity:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const truncate = (str, len = 8) => {
    if (!str || str.length <= len) return str;
    return `${str.substring(0, len)}...`;
  };

  return (
    <Card className="border border-border rounded-sm" data-testid="identity-manager">
      <div className="border-b border-border bg-slate-50/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              ACTIVE_IDENTITY
            </div>
            <h3 className="text-xl font-bold font-mono tracking-tight mt-1">
              {currentIdentity ? currentIdentity.name : 'No Identity'}
            </h3>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-sm" data-testid="create-identity-btn">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm">
              <DialogHeader>
                <DialogTitle className="font-mono">Create Identity</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-xs font-mono uppercase text-muted-foreground">
                    Identity Name
                  </Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter name..."
                    className="rounded-sm mt-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                    data-testid="identity-name-input"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating || !newName.trim()}
                  className="w-full rounded-sm"
                  data-testid="create-identity-submit"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Generate Keypair
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {currentIdentity && (
        <div className="p-4 space-y-3 bg-muted/30">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              IDENTITY_ID
            </div>
            <div className="font-mono text-sm text-foreground mt-1">
              {truncate(currentIdentity.id, 16)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                SLIP_BALANCE
              </div>
              <div className="font-mono text-lg font-bold mt-1">
                {currentIdentity.slipBalance}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                PULSE_COUNT
              </div>
              <div className="font-mono text-lg font-bold mt-1">
                {currentIdentity.pulseCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {identities.length > 1 && (
        <div className="border-t border-border">
          <div className="px-4 py-2 bg-slate-50/50 border-b border-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              ALL_IDENTITIES ({identities.length})
            </div>
          </div>
          <div className="divide-y divide-border max-h-48 overflow-y-auto">
            {identities.map((identity) => (
              <button
                key={identity.id}
                onClick={() => onIdentityChange(identity)}
                className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors duration-100 flex items-center justify-between ${
                  currentIdentity?.id === identity.id ? 'bg-accent/10' : ''
                }`}
                data-testid={`identity-item-${identity.name}`}
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-mono font-medium text-sm">{identity.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {truncate(identity.id, 12)}
                    </div>
                  </div>
                </div>
                {currentIdentity?.id === identity.id && (
                  <Check className="h-4 w-4 text-accent" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
