import React, { useState, useEffect } from 'react';
import { Slip, Identity } from '@/kernel/kernel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Coins, ArrowRight, Send } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

export const SlipManager = ({ currentIdentity, onSlipTransferred }) => {
  const [identities, setIdentities] = useState([]);
  const [slips, setSlips] = useState([]);
  const [toIdentityId, setToIdentityId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    loadIdentities();
    loadSlips();
  }, [currentIdentity?.id]);

  const loadIdentities = async () => {
    const ids = await Identity.getAll();
    setIdentities(ids.filter(id => id.id !== currentIdentity?.id));
  };

  const loadSlips = async () => {
    if (!currentIdentity) {
      setSlips([]);
      return;
    }
    const identitySlips = await Slip.getByIdentity(currentIdentity.id);
    setSlips(identitySlips);
  };

  const handleMint = async () => {
    if (!currentIdentity) return;

    try {
      await Slip.mint(currentIdentity.id, 100, 'Initial mint');
      await loadSlips();
      if (onSlipTransferred) onSlipTransferred();
    } catch (error) {
      console.error('Failed to mint slips:', error);
    }
  };

  const handleTransfer = async () => {
    if (!currentIdentity || !toIdentityId || !amount) {
      alert('Please fill all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Invalid amount');
      return;
    }

    if (amountNum > currentIdentity.slipBalance) {
      alert('Insufficient balance');
      return;
    }

    setIsTransferring(true);
    try {
      await Slip.transfer(currentIdentity.id, toIdentityId, amountNum, reason.trim());
      await loadSlips();
      setToIdentityId('');
      setAmount('');
      setReason('');
      if (onSlipTransferred) {
        await onSlipTransferred();
      }
    } catch (error) {
      console.error('Failed to transfer slips:', error);
      alert('Transfer failed: ' + error.message);
    } finally {
      setIsTransferring(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const truncate = (str, len = 12) => {
    if (!str || str.length <= len) return str;
    return `${str.substring(0, len)}...`;
  };

  return (
    <Card className="border border-border rounded-sm" data-testid="slip-manager">
      <div className="border-b border-border bg-slate-50/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-accent" />
              <h3 className="text-xl font-bold font-mono tracking-tight">
                Slips
              </h3>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              VALUE_ACCOUNTING
            </div>
          </div>
          {currentIdentity && currentIdentity.slipBalance === 0 && (
            <Button
              size="sm"
              onClick={handleMint}
              className="rounded-sm"
              data-testid="mint-slips-btn"
            >
              <Coins className="h-4 w-4 mr-1" />
              Mint 100
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {currentIdentity && (
          <div className="bg-muted/30 p-4 rounded-sm border border-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              CURRENT_BALANCE
            </div>
            <div className="text-3xl font-bold font-mono">
              {currentIdentity.slipBalance}
            </div>
          </div>
        )}

        {currentIdentity && currentIdentity.slipBalance > 0 && identities.length > 0 && (
          <div className="border border-border rounded-sm p-4 space-y-3">
            <div className="text-sm font-mono font-semibold">Transfer Slips</div>
            
            <div>
              <Label className="text-xs font-mono uppercase text-muted-foreground">
                To Identity
              </Label>
              <Select value={toIdentityId} onValueChange={setToIdentityId}>
                <SelectTrigger className="rounded-sm mt-1" data-testid="slip-recipient-select">
                  <SelectValue placeholder="Select recipient..." />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  {identities.map((identity) => (
                    <SelectItem key={identity.id} value={identity.id} className="font-mono">
                      {identity.name} ({truncate(identity.id)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-mono uppercase text-muted-foreground">
                Amount
              </Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="1"
                className="rounded-sm mt-1"
                data-testid="slip-amount-input"
              />
            </div>

            <div>
              <Label className="text-xs font-mono uppercase text-muted-foreground">
                Reason (optional)
              </Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Payment for..."
                className="rounded-sm mt-1"
                data-testid="slip-reason-input"
              />
            </div>

            <Button
              onClick={handleTransfer}
              disabled={isTransferring || !toIdentityId || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > currentIdentity.slipBalance}
              className="w-full rounded-sm"
              data-testid="transfer-slips-btn"
            >
              <Send className="h-4 w-4 mr-2" />
              {isTransferring ? 'Transferring...' : 'Transfer'}
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
            TRANSACTION_HISTORY
          </div>
          <ScrollArea className="h-[200px]">
            {slips.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <div className="text-xs font-mono">No transactions yet</div>
              </div>
            ) : (
              <div className="space-y-2">
                {slips.map((slip) => (
                  <div
                    key={slip.id}
                    className="border border-border rounded-sm p-3 hover:bg-muted/30 transition-colors duration-100"
                    data-testid={`slip-item-${slip.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {slip.fromIdentityId === currentIdentity.id ? (
                          <span className="text-xs font-mono text-red-600">SENT</span>
                        ) : (
                          <span className="text-xs font-mono text-green-600">RECEIVED</span>
                        )}
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatTimestamp(slip.timestamp)}
                        </span>
                      </div>
                      <div className="font-mono font-bold">
                        {slip.fromIdentityId === currentIdentity.id ? '-' : '+'}
                        {slip.amount}
                      </div>
                    </div>
                    {slip.reason && (
                      <div className="text-xs text-muted-foreground">{slip.reason}</div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-2">
                      <span>{truncate(slip.fromIdentityId)}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{truncate(slip.toIdentityId)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </Card>
  );
};
