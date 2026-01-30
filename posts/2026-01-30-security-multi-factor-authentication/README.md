# How to Implement Multi-Factor Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Security, Authentication, MFA, Identity

Description: Add multi-factor authentication to applications with TOTP, WebAuthn, and backup codes for enhanced account security.

---

Passwords alone are not enough. Data breaches expose millions of credentials every year, and attackers use credential stuffing to compromise accounts across services. Multi-factor authentication (MFA) adds a critical layer of defense by requiring users to prove their identity through multiple independent factors.

This guide walks through implementing MFA in your application, covering TOTP (Time-based One-Time Passwords), WebAuthn/passkeys, and backup codes. You will learn how to generate secrets, verify codes, handle enrollment flows, and build recovery mechanisms.

## Understanding MFA Factors

Authentication factors fall into three categories:

| Factor Type | Description | Examples |
|-------------|-------------|----------|
| Something you know | Information only the user knows | Password, PIN, security questions |
| Something you have | Physical device the user possesses | Phone, hardware key, smart card |
| Something you are | Biometric characteristics | Fingerprint, face recognition, voice |

True MFA requires factors from at least two different categories. A password plus a TOTP code from a phone app combines "something you know" with "something you have."

### Common MFA Methods Comparison

| Method | Security Level | User Experience | Phishing Resistant |
|--------|---------------|-----------------|---------------------|
| SMS OTP | Low | Good | No |
| TOTP (Authenticator App) | Medium | Good | No |
| Push Notification | Medium | Excellent | Partial |
| WebAuthn/Passkeys | High | Excellent | Yes |
| Hardware Security Keys | High | Moderate | Yes |

SMS-based OTP has known vulnerabilities including SIM swapping and SS7 protocol attacks. Use it only as a fallback option, not as the primary MFA method.

## TOTP Implementation

TOTP generates time-based codes using a shared secret and the current timestamp. The algorithm is defined in RFC 6238 and works with authenticator apps like Google Authenticator, Authy, and 1Password.

### How TOTP Works

1. Server generates a random secret key during enrollment
2. User adds the secret to their authenticator app (via QR code or manual entry)
3. App and server both compute codes using: `TOTP = HOTP(secret, floor(time / 30))`
4. Codes change every 30 seconds and are valid for a short window

### Generating TOTP Secrets

The secret must be cryptographically random and stored securely. Here is a Node.js implementation using the `otplib` library.

```javascript
// Install dependencies: npm install otplib qrcode

const { authenticator } = require('otplib');
const QRCode = require('qrcode');

// Configure TOTP settings
// Step size of 30 seconds is the standard, window allows for clock drift
authenticator.options = {
  step: 30,        // Time step in seconds
  window: 1,       // Allow codes from 1 step before/after current time
  digits: 6        // Length of generated codes
};

/**
 * Generate a new TOTP secret for a user
 * The secret should be stored encrypted in your database
 */
function generateTotpSecret() {
  // Generates a base32-encoded random secret
  const secret = authenticator.generateSecret(20);
  return secret;
}

/**
 * Create the otpauth:// URI for authenticator apps
 * This URI contains all info needed to set up TOTP
 */
function createTotpUri(secret, userEmail, issuer) {
  return authenticator.keyuri(userEmail, issuer, secret);
}

// Example usage
const secret = generateTotpSecret();
const uri = createTotpUri(secret, 'user@example.com', 'MyApp');

console.log('Secret:', secret);
console.log('URI:', uri);
// Output: otpauth://totp/MyApp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyApp
```

### Generating QR Codes

Users scan QR codes to add accounts to their authenticator apps. Generate the QR code from the otpauth URI.

```javascript
const QRCode = require('qrcode');

/**
 * Generate a QR code as a data URL for display in HTML
 * Returns a base64-encoded PNG image
 */
async function generateQrCodeDataUrl(otpauthUri) {
  try {
    const dataUrl = await QRCode.toDataURL(otpauthUri, {
      errorCorrectionLevel: 'M',  // Medium error correction
      type: 'image/png',
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw error;
  }
}

/**
 * Generate QR code as SVG string for better scalability
 */
async function generateQrCodeSvg(otpauthUri) {
  return await QRCode.toString(otpauthUri, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2
  });
}

// API endpoint example
app.get('/api/mfa/setup', async (req, res) => {
  const user = await getAuthenticatedUser(req);

  // Generate new secret for user
  const secret = generateTotpSecret();
  const uri = createTotpUri(secret, user.email, 'MyApp');
  const qrCode = await generateQrCodeDataUrl(uri);

  // Store secret temporarily until user confirms enrollment
  await storeTemporaryMfaSecret(user.id, secret);

  res.json({
    qrCode,           // Data URL for img src
    secret,           // For manual entry
    uri               // For apps that accept URI directly
  });
});
```

### Verifying TOTP Codes

When users submit a code, verify it against the stored secret. The verification includes a time window to account for clock drift.

```javascript
const { authenticator } = require('otplib');

/**
 * Verify a TOTP code submitted by the user
 * Returns true if the code is valid
 */
function verifyTotpCode(secret, userCode) {
  // Sanitize input, remove spaces and ensure string type
  const cleanCode = String(userCode).replace(/\s/g, '');

  // Verify with 1-step window (allows codes from previous/next 30s period)
  return authenticator.verify({
    token: cleanCode,
    secret: secret
  });
}

/**
 * Verify code with replay attack protection
 * Tracks used codes to prevent reuse within the time window
 */
async function verifyTotpCodeSecure(userId, secret, userCode) {
  const cleanCode = String(userCode).replace(/\s/g, '');

  // Check if code was already used (prevents replay attacks)
  const codeKey = `totp:${userId}:${cleanCode}`;
  const wasUsed = await redis.get(codeKey);

  if (wasUsed) {
    return { valid: false, error: 'Code already used' };
  }

  // Verify the code
  const isValid = authenticator.verify({
    token: cleanCode,
    secret: secret
  });

  if (isValid) {
    // Mark code as used for 90 seconds (3 time steps)
    await redis.setex(codeKey, 90, 'used');
    return { valid: true };
  }

  return { valid: false, error: 'Invalid code' };
}

// Verification endpoint
app.post('/api/mfa/verify', async (req, res) => {
  const { code } = req.body;
  const user = await getAuthenticatedUser(req);

  // Get the user's stored secret (decrypt if encrypted at rest)
  const secret = await getUserMfaSecret(user.id);

  if (!secret) {
    return res.status(400).json({ error: 'MFA not configured' });
  }

  const result = await verifyTotpCodeSecure(user.id, secret, code);

  if (result.valid) {
    // Issue session token or mark session as MFA-verified
    await markSessionMfaVerified(req.session.id);
    return res.json({ success: true });
  }

  // Rate limit failed attempts
  await incrementFailedMfaAttempts(user.id);

  return res.status(401).json({ error: result.error || 'Invalid code' });
});
```

## Backup Codes Implementation

Backup codes provide account recovery when users lose access to their primary MFA device. Generate a set of single-use codes during MFA enrollment.

### Generating Backup Codes

```javascript
const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * Generate a set of backup codes
 * Returns both plain codes (to show user) and hashed codes (to store)
 */
async function generateBackupCodes(count = 10) {
  const codes = [];
  const hashedCodes = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    // Using crypto.randomBytes for cryptographic randomness
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Format as XXXX-XXXX for readability
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(formattedCode);

    // Hash the code before storing
    // Use bcrypt with cost factor of 10
    const hash = await bcrypt.hash(formattedCode, 10);
    hashedCodes.push({
      hash,
      used: false,
      createdAt: new Date()
    });
  }

  return { codes, hashedCodes };
}

/**
 * Store backup codes for a user
 * Only store the hashed versions
 */
async function storeBackupCodes(userId, hashedCodes) {
  await db.collection('users').updateOne(
    { _id: userId },
    {
      $set: {
        'mfa.backupCodes': hashedCodes,
        'mfa.backupCodesGeneratedAt': new Date()
      }
    }
  );
}

// Endpoint to generate backup codes during MFA setup
app.post('/api/mfa/backup-codes/generate', async (req, res) => {
  const user = await getAuthenticatedUser(req);

  // Require MFA verification before generating new codes
  if (!req.session.mfaVerified) {
    return res.status(403).json({ error: 'MFA verification required' });
  }

  const { codes, hashedCodes } = await generateBackupCodes(10);
  await storeBackupCodes(user.id, hashedCodes);

  // Return plain codes only once, user must save them
  res.json({
    codes,
    warning: 'Save these codes securely. They will not be shown again.'
  });
});
```

### Verifying Backup Codes

```javascript
/**
 * Verify a backup code and mark it as used
 * Each backup code can only be used once
 */
async function verifyBackupCode(userId, submittedCode) {
  // Normalize the code format
  const cleanCode = submittedCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const formattedCode = `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;

  const user = await db.collection('users').findOne({ _id: userId });
  const backupCodes = user?.mfa?.backupCodes || [];

  // Find a matching unused code
  for (let i = 0; i < backupCodes.length; i++) {
    const codeEntry = backupCodes[i];

    if (codeEntry.used) continue;

    const matches = await bcrypt.compare(formattedCode, codeEntry.hash);

    if (matches) {
      // Mark code as used
      await db.collection('users').updateOne(
        { _id: userId },
        { $set: { [`mfa.backupCodes.${i}.used`]: true } }
      );

      // Count remaining codes and warn if low
      const remainingCodes = backupCodes.filter(c => !c.used).length - 1;

      return {
        valid: true,
        remainingCodes,
        warning: remainingCodes <= 2
          ? 'Running low on backup codes. Consider generating new ones.'
          : null
      };
    }
  }

  return { valid: false };
}

// Backup code verification endpoint
app.post('/api/mfa/backup-code/verify', async (req, res) => {
  const { code } = req.body;
  const userId = req.session.pendingMfaUserId;

  if (!userId) {
    return res.status(400).json({ error: 'No pending MFA session' });
  }

  const result = await verifyBackupCode(userId, code);

  if (result.valid) {
    await completeMfaLogin(req, userId);
    return res.json({
      success: true,
      remainingCodes: result.remainingCodes,
      warning: result.warning
    });
  }

  await incrementFailedMfaAttempts(userId);
  return res.status(401).json({ error: 'Invalid backup code' });
});
```

## WebAuthn and Passkeys

WebAuthn enables passwordless authentication using platform authenticators (fingerprint, face recognition) or roaming authenticators (hardware security keys). It provides strong phishing resistance because credentials are bound to specific origins.

### WebAuthn Registration

```javascript
// Install: npm install @simplewebauthn/server @simplewebauthn/browser

// Server-side: Registration options generation
const {
  generateRegistrationOptions,
  verifyRegistrationResponse
} = require('@simplewebauthn/server');

const rpName = 'MyApp';
const rpID = 'myapp.com';
const origin = 'https://myapp.com';

/**
 * Generate registration options for a new WebAuthn credential
 */
async function getWebAuthnRegistrationOptions(user) {
  // Get existing credentials to exclude (prevents duplicate registrations)
  const existingCredentials = await getUserWebAuthnCredentials(user.id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name || user.email,
    // Timeout in milliseconds
    timeout: 60000,
    // Exclude existing credentials
    excludeCredentials: existingCredentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: cred.transports
    })),
    // Preferred authenticator type
    authenticatorSelection: {
      // 'platform' for built-in, 'cross-platform' for security keys
      authenticatorAttachment: 'platform',
      // Require user verification (biometric/PIN)
      userVerification: 'preferred',
      // Create a resident credential (discoverable, for passkeys)
      residentKey: 'preferred',
      requireResidentKey: false
    },
    // Supported algorithms in preference order
    supportedAlgorithmIDs: [-7, -257] // ES256, RS256
  });

  // Store challenge for verification
  await storeWebAuthnChallenge(user.id, options.challenge);

  return options;
}

/**
 * Verify registration response from the browser
 */
async function verifyWebAuthnRegistration(user, response) {
  const expectedChallenge = await getWebAuthnChallenge(user.id);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true
  });

  if (verification.verified && verification.registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    // Store the credential
    await storeWebAuthnCredential(user.id, {
      credentialId: Buffer.from(credentialID).toString('base64url'),
      publicKey: Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      transports: response.response.transports || [],
      createdAt: new Date()
    });

    return { success: true };
  }

  return { success: false, error: 'Verification failed' };
}

// Registration endpoint
app.post('/api/webauthn/register/options', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const options = await getWebAuthnRegistrationOptions(user);
  res.json(options);
});

app.post('/api/webauthn/register/verify', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const result = await verifyWebAuthnRegistration(user, req.body);

  if (result.success) {
    res.json({ success: true });
  } else {
    res.status(400).json({ error: result.error });
  }
});
```

### WebAuthn Authentication

```javascript
const {
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');

/**
 * Generate authentication options for WebAuthn login
 */
async function getWebAuthnAuthOptions(user) {
  const credentials = await getUserWebAuthnCredentials(user.id);

  if (credentials.length === 0) {
    throw new Error('No WebAuthn credentials registered');
  }

  const options = await generateAuthenticationOptions({
    rpID,
    timeout: 60000,
    allowCredentials: credentials.map(cred => ({
      id: Buffer.from(cred.credentialId, 'base64url'),
      type: 'public-key',
      transports: cred.transports
    })),
    userVerification: 'preferred'
  });

  await storeWebAuthnChallenge(user.id, options.challenge);

  return options;
}

/**
 * Verify authentication response
 */
async function verifyWebAuthnAuth(user, response) {
  const expectedChallenge = await getWebAuthnChallenge(user.id);
  const credentials = await getUserWebAuthnCredentials(user.id);

  // Find the credential used
  const credential = credentials.find(
    c => c.credentialId === response.id
  );

  if (!credential) {
    return { success: false, error: 'Credential not found' };
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: Buffer.from(credential.credentialId, 'base64url'),
      credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
      counter: credential.counter
    },
    requireUserVerification: true
  });

  if (verification.verified) {
    // Update the counter to prevent replay attacks
    await updateCredentialCounter(
      user.id,
      credential.credentialId,
      verification.authenticationInfo.newCounter
    );

    return { success: true };
  }

  return { success: false, error: 'Verification failed' };
}

// Authentication endpoints
app.post('/api/webauthn/auth/options', async (req, res) => {
  const { email } = req.body;
  const user = await getUserByEmail(email);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    const options = await getWebAuthnAuthOptions(user);
    req.session.pendingWebAuthnUserId = user.id;
    res.json(options);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/webauthn/auth/verify', async (req, res) => {
  const userId = req.session.pendingWebAuthnUserId;

  if (!userId) {
    return res.status(400).json({ error: 'No pending authentication' });
  }

  const user = await getUserById(userId);
  const result = await verifyWebAuthnAuth(user, req.body);

  if (result.success) {
    delete req.session.pendingWebAuthnUserId;
    await createAuthenticatedSession(req, user);
    res.json({ success: true });
  } else {
    res.status(401).json({ error: result.error });
  }
});
```

### Browser-Side WebAuthn

```javascript
// Client-side code using @simplewebauthn/browser
import {
  startRegistration,
  startAuthentication
} from '@simplewebauthn/browser';

/**
 * Register a new WebAuthn credential
 */
async function registerWebAuthn() {
  try {
    // Get options from server
    const optionsResponse = await fetch('/api/webauthn/register/options', {
      method: 'POST',
      credentials: 'include'
    });
    const options = await optionsResponse.json();

    // Trigger browser credential creation
    // This prompts the user for biometric/PIN
    const credential = await startRegistration(options);

    // Send credential to server for verification
    const verifyResponse = await fetch('/api/webauthn/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credential)
    });

    if (!verifyResponse.ok) {
      throw new Error('Registration verification failed');
    }

    return { success: true };
  } catch (error) {
    console.error('WebAuthn registration failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Authenticate using WebAuthn
 */
async function authenticateWebAuthn(email) {
  try {
    // Get authentication options
    const optionsResponse = await fetch('/api/webauthn/auth/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });
    const options = await optionsResponse.json();

    // Trigger browser authentication
    const credential = await startAuthentication(options);

    // Verify with server
    const verifyResponse = await fetch('/api/webauthn/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credential)
    });

    if (!verifyResponse.ok) {
      throw new Error('Authentication failed');
    }

    return { success: true };
  } catch (error) {
    console.error('WebAuthn authentication failed:', error);
    return { success: false, error: error.message };
  }
}
```

## MFA Enrollment Flow

A good enrollment flow guides users through setup while ensuring they can recover access later.

### Enrollment State Machine

```javascript
/**
 * MFA enrollment states
 * Users progress through these states during setup
 */
const MfaEnrollmentState = {
  NOT_STARTED: 'not_started',
  SECRET_GENERATED: 'secret_generated',
  CODE_VERIFIED: 'code_verified',
  BACKUP_CODES_GENERATED: 'backup_codes_generated',
  COMPLETE: 'complete'
};

/**
 * Complete MFA enrollment flow
 */
class MfaEnrollment {
  constructor(userId) {
    this.userId = userId;
  }

  /**
   * Start enrollment, generate TOTP secret
   */
  async start() {
    const secret = generateTotpSecret();
    const uri = createTotpUri(secret, await this.getUserEmail(), 'MyApp');
    const qrCode = await generateQrCodeDataUrl(uri);

    await this.updateEnrollment({
      state: MfaEnrollmentState.SECRET_GENERATED,
      tempSecret: await encrypt(secret),
      startedAt: new Date()
    });

    return { secret, uri, qrCode };
  }

  /**
   * Verify initial code to confirm authenticator is set up correctly
   */
  async verifySetupCode(code) {
    const enrollment = await this.getEnrollment();

    if (enrollment.state !== MfaEnrollmentState.SECRET_GENERATED) {
      throw new Error('Invalid enrollment state');
    }

    const secret = await decrypt(enrollment.tempSecret);
    const isValid = verifyTotpCode(secret, code);

    if (!isValid) {
      return { success: false, error: 'Invalid code. Check your authenticator app.' };
    }

    // Move secret to permanent storage
    await this.updateUser({
      'mfa.totpSecret': enrollment.tempSecret,
      'mfa.totpEnabledAt': new Date()
    });

    await this.updateEnrollment({
      state: MfaEnrollmentState.CODE_VERIFIED,
      tempSecret: null
    });

    return { success: true };
  }

  /**
   * Generate and return backup codes
   */
  async generateBackupCodes() {
    const enrollment = await this.getEnrollment();

    if (enrollment.state !== MfaEnrollmentState.CODE_VERIFIED) {
      throw new Error('Must verify TOTP code first');
    }

    const { codes, hashedCodes } = await generateBackupCodes(10);

    await this.updateUser({
      'mfa.backupCodes': hashedCodes
    });

    await this.updateEnrollment({
      state: MfaEnrollmentState.BACKUP_CODES_GENERATED
    });

    return { codes };
  }

  /**
   * Complete enrollment after user confirms they saved backup codes
   */
  async complete() {
    const enrollment = await this.getEnrollment();

    if (enrollment.state !== MfaEnrollmentState.BACKUP_CODES_GENERATED) {
      throw new Error('Must generate backup codes first');
    }

    await this.updateUser({
      'mfa.enabled': true,
      'mfa.enabledAt': new Date()
    });

    await this.updateEnrollment({
      state: MfaEnrollmentState.COMPLETE,
      completedAt: new Date()
    });

    return { success: true };
  }

  /**
   * Cancel enrollment and clean up
   */
  async cancel() {
    await this.deleteEnrollment();
    return { success: true };
  }
}

// Enrollment API endpoints
app.post('/api/mfa/enroll/start', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const enrollment = new MfaEnrollment(user.id);
  const result = await enrollment.start();
  res.json(result);
});

app.post('/api/mfa/enroll/verify-code', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const enrollment = new MfaEnrollment(user.id);
  const result = await enrollment.verifySetupCode(req.body.code);
  res.json(result);
});

app.post('/api/mfa/enroll/backup-codes', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const enrollment = new MfaEnrollment(user.id);
  const result = await enrollment.generateBackupCodes();
  res.json(result);
});

app.post('/api/mfa/enroll/complete', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const enrollment = new MfaEnrollment(user.id);
  const result = await enrollment.complete();
  res.json(result);
});
```

### Enrollment UI Component

```jsx
// React component for MFA enrollment
import React, { useState } from 'react';

function MfaEnrollment() {
  const [step, setStep] = useState('start');
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Step 1: Start enrollment and show QR code
  async function startEnrollment() {
    try {
      const response = await fetch('/api/mfa/enroll/start', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('scan');
    } catch (err) {
      setError('Failed to start enrollment');
    }
  }

  // Step 2: Verify the code from authenticator
  async function handleVerifyCode(e) {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/mfa/enroll/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: verifyCode })
      });
      const data = await response.json();

      if (data.success) {
        setStep('backup');
        await fetchBackupCodes();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Verification failed');
    }
  }

  // Step 3: Get backup codes
  async function fetchBackupCodes() {
    const response = await fetch('/api/mfa/enroll/backup-codes', {
      method: 'POST',
      credentials: 'include'
    });
    const data = await response.json();
    setBackupCodes(data.codes);
  }

  // Step 4: Complete enrollment
  async function completeEnrollment() {
    await fetch('/api/mfa/enroll/complete', {
      method: 'POST',
      credentials: 'include'
    });
    setStep('complete');
  }

  return (
    <div className="mfa-enrollment">
      {step === 'start' && (
        <div>
          <h2>Enable Two-Factor Authentication</h2>
          <p>Add an extra layer of security to your account.</p>
          <button onClick={startEnrollment}>Get Started</button>
        </div>
      )}

      {step === 'scan' && (
        <div>
          <h2>Scan QR Code</h2>
          <p>Scan this code with your authenticator app:</p>
          <img src={qrCode} alt="QR Code for authenticator" />

          <button
            type="button"
            onClick={() => setShowManualEntry(!showManualEntry)}
          >
            Can't scan? Enter manually
          </button>

          {showManualEntry && (
            <div className="manual-entry">
              <p>Enter this code in your authenticator app:</p>
              <code>{secret}</code>
            </div>
          )}

          <form onSubmit={handleVerifyCode}>
            <label>
              Enter the 6-digit code from your app:
              <input
                type="text"
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value)}
                maxLength={6}
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit">Verify</button>
          </form>
        </div>
      )}

      {step === 'backup' && (
        <div>
          <h2>Save Your Backup Codes</h2>
          <p>
            Store these codes somewhere safe. Each code can only be used once
            if you lose access to your authenticator.
          </p>
          <div className="backup-codes">
            {backupCodes.map((code, i) => (
              <code key={i}>{code}</code>
            ))}
          </div>
          <button onClick={() => {
            const text = backupCodes.join('\n');
            navigator.clipboard.writeText(text);
          }}>
            Copy Codes
          </button>
          <button onClick={completeEnrollment}>
            I've saved my backup codes
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div>
          <h2>Two-Factor Authentication Enabled</h2>
          <p>Your account is now protected with 2FA.</p>
        </div>
      )}
    </div>
  );
}
```

## Account Recovery

Recovery flows let users regain access when they lose their MFA device. Balance security with usability.

### Recovery Options

```javascript
/**
 * Recovery flow options from most to least secure
 */
const recoveryMethods = {
  // Most secure: require backup code
  BACKUP_CODE: 'backup_code',

  // Moderately secure: verify trusted device
  TRUSTED_DEVICE: 'trusted_device',

  // Least secure: email with identity verification
  EMAIL_RECOVERY: 'email_recovery'
};

/**
 * Handle account recovery request
 */
async function initiateRecovery(userId, method) {
  const user = await getUserById(userId);

  switch (method) {
    case recoveryMethods.BACKUP_CODE:
      // User enters a backup code, handled separately
      return { method: 'backup_code' };

    case recoveryMethods.TRUSTED_DEVICE:
      // Check if current device is trusted
      return await handleTrustedDeviceRecovery(user);

    case recoveryMethods.EMAIL_RECOVERY:
      // Send recovery email with time-limited token
      return await handleEmailRecovery(user);

    default:
      throw new Error('Invalid recovery method');
  }
}

/**
 * Email-based recovery with additional verification
 */
async function handleEmailRecovery(user) {
  // Generate a secure recovery token
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.collection('recovery_tokens').insertOne({
    userId: user.id,
    tokenHash: await bcrypt.hash(token, 10),
    expiry,
    used: false,
    ipAddress: null, // Set when verifying
    createdAt: new Date()
  });

  // Send recovery email
  await sendEmail({
    to: user.email,
    subject: 'Account Recovery Request',
    template: 'mfa-recovery',
    data: {
      recoveryLink: `https://myapp.com/recover?token=${token}`,
      expiresIn: '15 minutes'
    }
  });

  return {
    method: 'email',
    message: 'Recovery email sent. Check your inbox.'
  };
}

/**
 * Complete recovery and reset MFA
 */
async function completeRecovery(token, ipAddress) {
  // Find and validate token
  const recovery = await db.collection('recovery_tokens').findOne({
    expiry: { $gt: new Date() },
    used: false
  });

  if (!recovery) {
    return { success: false, error: 'Invalid or expired token' };
  }

  const tokenValid = await bcrypt.compare(token, recovery.tokenHash);

  if (!tokenValid) {
    return { success: false, error: 'Invalid token' };
  }

  // Mark token as used
  await db.collection('recovery_tokens').updateOne(
    { _id: recovery._id },
    {
      $set: {
        used: true,
        usedAt: new Date(),
        ipAddress
      }
    }
  );

  // Disable MFA temporarily
  await db.collection('users').updateOne(
    { _id: recovery.userId },
    {
      $set: {
        'mfa.enabled': false,
        'mfa.disabledAt': new Date(),
        'mfa.disabledReason': 'recovery'
      }
    }
  );

  // Log security event
  await logSecurityEvent({
    userId: recovery.userId,
    event: 'mfa_disabled_recovery',
    ipAddress
  });

  // Send notification
  await sendEmail({
    to: await getUserEmail(recovery.userId),
    subject: 'MFA Has Been Disabled',
    template: 'mfa-disabled-alert'
  });

  return {
    success: true,
    message: 'MFA disabled. Please set up MFA again.'
  };
}
```

### Rate Limiting and Brute Force Protection

```javascript
const Redis = require('ioredis');
const redis = new Redis();

/**
 * Rate limiter for MFA attempts
 * Prevents brute force attacks on MFA codes
 */
class MfaRateLimiter {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 5;
    this.windowSeconds = options.windowSeconds || 300; // 5 minutes
    this.lockoutSeconds = options.lockoutSeconds || 1800; // 30 minutes
  }

  /**
   * Check if user is rate limited
   */
  async isLimited(userId) {
    const lockoutKey = `mfa:lockout:${userId}`;
    const isLocked = await redis.get(lockoutKey);

    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey);
      return {
        limited: true,
        retryAfter: ttl,
        message: `Too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`
      };
    }

    return { limited: false };
  }

  /**
   * Record a failed attempt
   */
  async recordFailure(userId) {
    const attemptsKey = `mfa:attempts:${userId}`;

    const attempts = await redis.incr(attemptsKey);

    // Set expiry on first attempt
    if (attempts === 1) {
      await redis.expire(attemptsKey, this.windowSeconds);
    }

    // Trigger lockout if limit exceeded
    if (attempts >= this.maxAttempts) {
      const lockoutKey = `mfa:lockout:${userId}`;
      await redis.setex(lockoutKey, this.lockoutSeconds, 'locked');
      await redis.del(attemptsKey);

      // Log security event
      await logSecurityEvent({
        userId,
        event: 'mfa_lockout_triggered',
        attempts
      });

      return {
        locked: true,
        lockoutSeconds: this.lockoutSeconds
      };
    }

    return {
      locked: false,
      attemptsRemaining: this.maxAttempts - attempts
    };
  }

  /**
   * Clear attempts after successful verification
   */
  async recordSuccess(userId) {
    const attemptsKey = `mfa:attempts:${userId}`;
    await redis.del(attemptsKey);
  }
}

// Usage in verification endpoint
const rateLimiter = new MfaRateLimiter();

app.post('/api/mfa/verify', async (req, res) => {
  const userId = req.session.pendingMfaUserId;

  // Check rate limit first
  const limitCheck = await rateLimiter.isLimited(userId);
  if (limitCheck.limited) {
    return res.status(429).json({
      error: limitCheck.message,
      retryAfter: limitCheck.retryAfter
    });
  }

  const { code } = req.body;
  const secret = await getUserMfaSecret(userId);
  const isValid = verifyTotpCode(secret, code);

  if (isValid) {
    await rateLimiter.recordSuccess(userId);
    await completeMfaLogin(req, userId);
    return res.json({ success: true });
  }

  const failureResult = await rateLimiter.recordFailure(userId);

  if (failureResult.locked) {
    return res.status(429).json({
      error: 'Too many failed attempts. Account temporarily locked.',
      lockoutSeconds: failureResult.lockoutSeconds
    });
  }

  return res.status(401).json({
    error: 'Invalid code',
    attemptsRemaining: failureResult.attemptsRemaining
  });
});
```

## Security Best Practices

### Encrypting Secrets at Rest

```javascript
const crypto = require('crypto');

// Use a key from environment variable or key management service
const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY;

/**
 * Encrypt sensitive data before storing
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Return IV + auth tag + ciphertext
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt data retrieved from storage
 */
function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Audit Logging

```javascript
/**
 * Log MFA-related security events
 */
async function logMfaEvent(event) {
  const logEntry = {
    timestamp: new Date(),
    userId: event.userId,
    action: event.action,
    success: event.success,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    metadata: event.metadata || {}
  };

  // Store in database
  await db.collection('security_logs').insertOne(logEntry);

  // Send to SIEM or monitoring service
  if (event.action === 'mfa_disabled' || event.action === 'mfa_lockout') {
    await alertSecurityTeam(logEntry);
  }
}

// Events to log
const mfaEvents = [
  'mfa_enrolled',
  'mfa_verified',
  'mfa_failed',
  'mfa_disabled',
  'mfa_lockout',
  'backup_code_used',
  'backup_codes_regenerated',
  'webauthn_registered',
  'recovery_initiated',
  'recovery_completed'
];
```

## Testing MFA

```javascript
// Unit tests for TOTP verification
const { authenticator } = require('otplib');

describe('TOTP Verification', () => {
  const secret = 'JBSWY3DPEHPK3PXP';

  test('accepts valid current code', () => {
    const code = authenticator.generate(secret);
    expect(verifyTotpCode(secret, code)).toBe(true);
  });

  test('rejects invalid code', () => {
    expect(verifyTotpCode(secret, '000000')).toBe(false);
  });

  test('accepts code with spaces', () => {
    const code = authenticator.generate(secret);
    const spacedCode = code.slice(0, 3) + ' ' + code.slice(3);
    expect(verifyTotpCode(secret, spacedCode)).toBe(true);
  });

  test('handles clock drift within window', () => {
    // Test with codes from adjacent time steps
    authenticator.options = { step: 30, window: 1 };

    const currentTime = Math.floor(Date.now() / 1000);
    const previousStep = Math.floor((currentTime - 30) / 30);

    // This tests the window functionality
    const code = authenticator.generate(secret);
    expect(verifyTotpCode(secret, code)).toBe(true);
  });
});

describe('Backup Codes', () => {
  test('generates correct number of codes', async () => {
    const { codes, hashedCodes } = await generateBackupCodes(10);
    expect(codes).toHaveLength(10);
    expect(hashedCodes).toHaveLength(10);
  });

  test('codes are unique', async () => {
    const { codes } = await generateBackupCodes(10);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(10);
  });

  test('verifies valid backup code', async () => {
    const { codes, hashedCodes } = await generateBackupCodes(10);
    await storeBackupCodes('test-user', hashedCodes);

    const result = await verifyBackupCode('test-user', codes[0]);
    expect(result.valid).toBe(true);
  });

  test('rejects already used code', async () => {
    const { codes, hashedCodes } = await generateBackupCodes(10);
    await storeBackupCodes('test-user', hashedCodes);

    await verifyBackupCode('test-user', codes[0]);
    const result = await verifyBackupCode('test-user', codes[0]);
    expect(result.valid).toBe(false);
  });
});
```

## Summary

Implementing MFA requires careful attention to both security and user experience. Here are the key points:

1. **Use TOTP as the baseline** - It works offline and is supported by all major authenticator apps
2. **Implement backup codes** - Users will lose their devices, have recovery options ready
3. **Add WebAuthn for high-security users** - Passkeys provide the best security and UX combination
4. **Protect against brute force** - Rate limit verification attempts aggressively
5. **Encrypt secrets at rest** - Never store TOTP secrets in plain text
6. **Log everything** - Security events need an audit trail
7. **Test thoroughly** - MFA bugs can lock users out or leave accounts vulnerable

Start with TOTP and backup codes, then add WebAuthn support. Make enrollment straightforward and recovery possible without compromising security.
