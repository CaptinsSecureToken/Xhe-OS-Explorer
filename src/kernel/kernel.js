/**
 * Xhe-OS Core Kernel
 * Deterministic coordination primitives: Identity, Pulses, Slips, Feeds, Channels, Semantic Addressing
 */

import { db, STORES } from './db';

// ============================================================================
// IDENTITY MANAGEMENT
// ============================================================================

export class Identity {
  static async create(name) {
    // Generate keypair using Web Crypto API
    const keypair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign', 'verify']
    );

    // Export public key
    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keypair.publicKey);
    const publicKeyHex = Identity._bufferToHex(publicKeyBuffer);

    // Export private key
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keypair.privateKey);
    const privateKeyHex = Identity._bufferToHex(privateKeyBuffer);

    // Create identity ID from public key hash
    const id = await Identity._hashString(publicKeyHex);

    const identity = {
      id,
      name,
      publicKey: publicKeyHex,
      privateKey: privateKeyHex, // In production, this should be encrypted or stored securely
      createdAt: Date.now(),
      slipBalance: 0,
      pulseCount: 0
    };

    await db.add(STORES.IDENTITIES, identity);
    return identity;
  }

  static async getAll() {
    return await db.getAll(STORES.IDENTITIES);
  }

  static async getById(id) {
    return await db.get(STORES.IDENTITIES, id);
  }

  static async updateBalance(identityId, amount) {
    const identity = await Identity.getById(identityId);
    if (!identity) throw new Error('Identity not found');
    
    identity.slipBalance += amount;
    await db.update(STORES.IDENTITIES, identity);
    return identity;
  }

  static async incrementPulseCount(identityId) {
    const identity = await Identity.getById(identityId);
    if (!identity) throw new Error('Identity not found');
    
    identity.pulseCount += 1;
    await db.update(STORES.IDENTITIES, identity);
    return identity;
  }

  static _bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static _hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  }

  static async _hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Identity._bufferToHex(hashBuffer).substring(0, 16);
  }
}

// ============================================================================
// PULSE SYSTEM (Immutable Events)
// ============================================================================

export class Pulse {
  static async emit(identityId, type, payload, metadata = {}) {
    const identity = await Identity.getById(identityId);
    if (!identity) throw new Error('Identity not found');

    const pulse = {
      id: await Pulse._generateId(),
      identityId,
      type,
      payload,
      metadata,
      timestamp: Date.now(),
      signature: null
    };

    // Sign the pulse
    const dataToSign = JSON.stringify({
      id: pulse.id,
      identityId: pulse.identityId,
      type: pulse.type,
      payload: pulse.payload,
      timestamp: pulse.timestamp
    });

    pulse.signature = await Pulse._sign(dataToSign, identity.privateKey);

    // Store pulse
    await db.add(STORES.PULSES, pulse);

    // Increment identity pulse count
    await Identity.incrementPulseCount(identityId);

    return pulse;
  }

  static async getAll() {
    const pulses = await db.getAll(STORES.PULSES);
    return pulses.sort((a, b) => b.timestamp - a.timestamp);
  }

  static async getByIdentity(identityId) {
    const pulses = await db.getByIndex(STORES.PULSES, 'identityId', identityId);
    return pulses.sort((a, b) => b.timestamp - a.timestamp);
  }

  static async getByType(type) {
    const pulses = await db.getByIndex(STORES.PULSES, 'type', type);
    return pulses.sort((a, b) => b.timestamp - a.timestamp);
  }

  static async verify(pulse) {
    const identity = await Identity.getById(pulse.identityId);
    if (!identity) return false;

    const dataToVerify = JSON.stringify({
      id: pulse.id,
      identityId: pulse.identityId,
      type: pulse.type,
      payload: pulse.payload,
      timestamp: pulse.timestamp
    });

    return await Pulse._verify(dataToVerify, pulse.signature, identity.publicKey);
  }

  static async _generateId() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    return Identity._bufferToHex(randomBytes.buffer);
  }

  static async _sign(data, privateKeyHex) {
    const privateKeyBuffer = Identity._hexToBuffer(privateKeyHex);
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const signatureBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      dataBuffer
    );

    return Identity._bufferToHex(signatureBuffer);
  }

  static async _verify(data, signatureHex, publicKeyHex) {
    try {
      const publicKeyBuffer = Identity._hexToBuffer(publicKeyHex);
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      );

      const signatureBuffer = Identity._hexToBuffer(signatureHex);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      return await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signatureBuffer,
        dataBuffer
      );
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  }
}

// ============================================================================
// SLIP SYSTEM (Value Accounting)
// ============================================================================

export class Slip {
  static async transfer(fromIdentityId, toIdentityId, amount, reason = '') {
    if (amount <= 0) throw new Error('Amount must be positive');

    const fromIdentity = await Identity.getById(fromIdentityId);
    const toIdentity = await Identity.getById(toIdentityId);

    if (!fromIdentity) throw new Error('Source identity not found');
    if (!toIdentity) throw new Error('Destination identity not found');

    if (fromIdentity.slipBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Create slip record
    const slip = {
      id: await Pulse._generateId(),
      fromIdentityId,
      toIdentityId,
      amount,
      reason,
      timestamp: Date.now()
    };

    await db.add(STORES.SLIPS, slip);

    // Update balances
    await Identity.updateBalance(fromIdentityId, -amount);
    await Identity.updateBalance(toIdentityId, amount);

    // Emit pulses for both parties
    await Pulse.emit(fromIdentityId, 'slip.sent', {
      slipId: slip.id,
      to: toIdentityId,
      amount,
      reason
    });

    await Pulse.emit(toIdentityId, 'slip.received', {
      slipId: slip.id,
      from: fromIdentityId,
      amount,
      reason
    });

    return slip;
  }

  static async mint(identityId, amount, reason = 'Genesis mint') {
    if (amount <= 0) throw new Error('Amount must be positive');

    const identity = await Identity.getById(identityId);
    if (!identity) throw new Error('Identity not found');

    const slip = {
      id: await Pulse._generateId(),
      fromIdentityId: 'SYSTEM',
      toIdentityId: identityId,
      amount,
      reason,
      timestamp: Date.now()
    };

    await db.add(STORES.SLIPS, slip);
    await Identity.updateBalance(identityId, amount);

    await Pulse.emit(identityId, 'slip.minted', {
      slipId: slip.id,
      amount,
      reason
    });

    return slip;
  }

  static async getAll() {
    const slips = await db.getAll(STORES.SLIPS);
    return slips.sort((a, b) => b.timestamp - a.timestamp);
  }

  static async getByIdentity(identityId) {
    const sent = await db.getByIndex(STORES.SLIPS, 'fromIdentityId', identityId);
    const received = await db.getByIndex(STORES.SLIPS, 'toIdentityId', identityId);
    const all = [...sent, ...received];
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }
}

// ============================================================================
// CHANNEL SYSTEM (Scoped Multi-Identity Contexts)
// ============================================================================

export class Channel {
  static async create(name, description = '', creatorIdentityId) {
    const id = await Identity._hashString(name);

    const channel = {
      id,
      name,
      description,
      creatorIdentityId,
      members: [creatorIdentityId],
      createdAt: Date.now()
    };

    await db.add(STORES.CHANNELS, channel);

    // Emit pulse
    await Pulse.emit(creatorIdentityId, 'channel.created', {
      channelId: id,
      channelName: name
    });

    return channel;
  }

  static async getAll() {
    return await db.getAll(STORES.CHANNELS);
  }

  static async getById(id) {
    return await db.get(STORES.CHANNELS, id);
  }

  static async join(channelId, identityId) {
    const channel = await Channel.getById(channelId);
    if (!channel) throw new Error('Channel not found');

    if (!channel.members.includes(identityId)) {
      channel.members.push(identityId);
      await db.update(STORES.CHANNELS, channel);

      await Pulse.emit(identityId, 'channel.joined', {
        channelId,
        channelName: channel.name
      });
    }

    return channel;
  }

  static async getPulses(channelId) {
    const channel = await Channel.getById(channelId);
    if (!channel) return [];

    const allPulses = await Pulse.getAll();
    return allPulses.filter(pulse => channel.members.includes(pulse.identityId));
  }
}

// ============================================================================
// SEMANTIC ADDRESSING
// ============================================================================

export class SemanticAddress {
  static async resolve(address) {
    // Simple semantic addressing: resolve by type and identifier
    // Format: "type:identifier" e.g., "identity:alice", "pulse:abc123", "channel:general"
    
    const [type, identifier] = address.split(':');
    
    switch(type) {
      case 'identity': {
        const identities = await Identity.getAll();
        return identities.find(i => i.name.toLowerCase() === identifier.toLowerCase() || i.id === identifier);
      }
      case 'pulse': {
        return await db.get(STORES.PULSES, identifier);
      }
      case 'channel': {
        const channels = await Channel.getAll();
        return channels.find(c => c.name.toLowerCase() === identifier.toLowerCase() || c.id === identifier);
      }
      case 'slip': {
        return await db.get(STORES.SLIPS, identifier);
      }
      default:
        throw new Error(`Unknown address type: ${type}`);
    }
  }

  static create(type, object) {
    switch(type) {
      case 'identity':
        return `identity:${object.name || object.id}`;
      case 'pulse':
        return `pulse:${object.id}`;
      case 'channel':
        return `channel:${object.name || object.id}`;
      case 'slip':
        return `slip:${object.id}`;
      default:
        throw new Error(`Unknown address type: ${type}`);
    }
  }
}

// ============================================================================
// KERNEL INITIALIZATION
// ============================================================================

export async function initializeKernel() {
  await db.init();
  console.log('Xhe-OS Kernel initialized');
}
