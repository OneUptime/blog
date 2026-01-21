# How to Implement GDPR Right to Erasure with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GDPR, Right to Erasure, Data Deletion, Compliance, Privacy, Data Subject Rights

Description: A comprehensive guide to implementing GDPR Article 17 Right to Erasure in Redis applications, covering data discovery, deletion workflows, audit trails, and compliance verification.

---

The GDPR Right to Erasure (Article 17), also known as the "right to be forgotten," requires organizations to delete personal data upon request. This guide covers implementing a compliant erasure system with Redis.

## Understanding the Right to Erasure

### When Erasure is Required

```
+--------------------------------+----------------------------------------+
| Condition                      | Erasure Required                       |
+--------------------------------+----------------------------------------+
| Consent withdrawn              | Yes, if consent was basis              |
| Data no longer necessary       | Yes                                    |
| Unlawful processing            | Yes                                    |
| Legal obligation               | Yes                                    |
| Data subject objects           | Yes (unless legitimate grounds exist)  |
| Child's data (online services) | Yes                                    |
+--------------------------------+----------------------------------------+
```

### Exceptions (When Erasure May Be Refused)

```
- Freedom of expression and information
- Legal obligation compliance
- Public health purposes
- Archiving in public interest
- Legal claims establishment/defense
```

## Data Discovery System

### Building a Data Map

```javascript
// dataDiscovery.js
const Redis = require('ioredis');

class DataDiscoveryService {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);

    // Define all patterns where user data might be stored
    this.dataPatterns = {
      // Direct user data
      user_profile: {
        pattern: 'user:{userId}',
        contains_pii: true,
        retention_required: false
      },
      user_settings: {
        pattern: 'settings:{userId}',
        contains_pii: false,
        retention_required: false
      },

      // Sessions and authentication
      sessions: {
        pattern: 'session:*:{userId}:*',
        contains_pii: true,
        retention_required: false
      },
      auth_tokens: {
        pattern: 'token:{userId}:*',
        contains_pii: false,
        retention_required: false
      },

      // Activity data
      activity_log: {
        pattern: 'activity:{userId}:*',
        contains_pii: true,
        retention_required: false
      },
      search_history: {
        pattern: 'search:{userId}:*',
        contains_pii: true,
        retention_required: false
      },

      // Orders and transactions
      orders: {
        pattern: 'order:*:user:{userId}',
        contains_pii: true,
        retention_required: true,
        retention_reason: 'Tax and accounting requirements',
        retention_period: '7 years'
      },

      // Communications
      messages: {
        pattern: 'message:*:{userId}:*',
        contains_pii: true,
        retention_required: false
      },
      notifications: {
        pattern: 'notification:{userId}:*',
        contains_pii: false,
        retention_required: false
      },

      // Analytics (may need anonymization)
      analytics: {
        pattern: 'analytics:user:{userId}:*',
        contains_pii: true,
        retention_required: false,
        anonymize_instead: true
      },

      // Consent records (must retain)
      consent: {
        pattern: 'consent:{userId}:*',
        contains_pii: true,
        retention_required: true,
        retention_reason: 'GDPR compliance - consent records',
        retention_period: '3 years after consent withdrawn'
      },

      // Audit logs (must retain)
      audit_logs: {
        pattern: 'audit:user:{userId}:*',
        contains_pii: true,
        retention_required: true,
        retention_reason: 'GDPR compliance - audit trail',
        retention_period: '6 years'
      }
    };
  }

  async discoverUserData(userId) {
    const discovery = {
      userId,
      timestamp: new Date().toISOString(),
      categories: {},
      summary: {
        totalKeys: 0,
        deletableKeys: 0,
        retainedKeys: 0,
        anonymizeKeys: 0
      }
    };

    for (const [category, config] of Object.entries(this.dataPatterns)) {
      const pattern = config.pattern.replace('{userId}', userId);
      const keys = await this.findKeys(pattern);

      discovery.categories[category] = {
        pattern,
        keyCount: keys.length,
        keys: keys.slice(0, 100), // Limit for report
        containsPII: config.contains_pii,
        retentionRequired: config.retention_required,
        retentionReason: config.retention_reason,
        anonymizeInstead: config.anonymize_instead || false
      };

      discovery.summary.totalKeys += keys.length;

      if (config.retention_required) {
        discovery.summary.retainedKeys += keys.length;
      } else if (config.anonymize_instead) {
        discovery.summary.anonymizeKeys += keys.length;
      } else {
        discovery.summary.deletableKeys += keys.length;
      }
    }

    return discovery;
  }

  async findKeys(pattern) {
    const keys = [];
    let cursor = '0';

    do {
      const [newCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        1000
      );
      cursor = newCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys;
  }

  // Also check sorted sets and lists for user references
  async findUserReferences(userId) {
    const references = [];

    // Check common sorted sets
    const sortedSets = [
      'leaderboard',
      'active_users',
      'recent_logins'
    ];

    for (const setKey of sortedSets) {
      const score = await this.redis.zscore(setKey, userId);
      if (score !== null) {
        references.push({
          type: 'sorted_set',
          key: setKey,
          member: userId
        });
      }
    }

    // Check common sets
    const sets = [
      'premium_users',
      'newsletter_subscribers',
      'beta_users'
    ];

    for (const setKey of sets) {
      const isMember = await this.redis.sismember(setKey, userId);
      if (isMember) {
        references.push({
          type: 'set',
          key: setKey,
          member: userId
        });
      }
    }

    return references;
  }
}

module.exports = DataDiscoveryService;
```

## Erasure Request Processing

### Request Queue System

```javascript
// erasureRequestQueue.js
const Redis = require('ioredis');

class ErasureRequestQueue {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
    this.queueKey = 'gdpr:erasure:requests';
    this.processingKey = 'gdpr:erasure:processing';
  }

  async submitRequest(request) {
    const requestId = `erasure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const erasureRequest = {
      id: requestId,
      userId: request.userId,
      email: request.email,
      reason: request.reason,
      verificationMethod: request.verificationMethod,
      verifiedAt: request.verifiedAt,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      metadata: JSON.stringify(request.metadata || {})
    };

    // Store request
    await this.redis.hset(`erasure:request:${requestId}`, erasureRequest);

    // Add to processing queue
    await this.redis.lpush(this.queueKey, requestId);

    // Log submission
    await this.logEvent(requestId, 'submitted', { userId: request.userId });

    return requestId;
  }

  async getNextRequest() {
    const requestId = await this.redis.brpoplpush(
      this.queueKey,
      this.processingKey,
      0
    );

    if (!requestId) return null;

    const request = await this.redis.hgetall(`erasure:request:${requestId}`);

    if (request) {
      await this.updateStatus(requestId, 'processing');
    }

    return request;
  }

  async updateStatus(requestId, status, details = {}) {
    await this.redis.hset(`erasure:request:${requestId}`, {
      status,
      updatedAt: new Date().toISOString(),
      ...details
    });

    await this.logEvent(requestId, 'status_change', { status, details });
  }

  async completeRequest(requestId, result) {
    await this.updateStatus(requestId, 'completed', {
      completedAt: new Date().toISOString(),
      result: JSON.stringify(result)
    });

    // Remove from processing
    await this.redis.lrem(this.processingKey, 1, requestId);

    // Store in completed index
    await this.redis.zadd('erasure:completed', Date.now(), requestId);
  }

  async failRequest(requestId, error) {
    await this.updateStatus(requestId, 'failed', {
      error: error.message,
      failedAt: new Date().toISOString()
    });

    // Move back to queue for retry
    await this.redis.lrem(this.processingKey, 1, requestId);
    await this.redis.lpush('erasure:failed', requestId);
  }

  async getRequestStatus(requestId) {
    return this.redis.hgetall(`erasure:request:${requestId}`);
  }

  async logEvent(requestId, event, data) {
    const logEntry = {
      requestId,
      event,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush(`erasure:log:${requestId}`, JSON.stringify(logEntry));
    await this.redis.lpush('gdpr:erasure:audit', JSON.stringify(logEntry));
  }
}

module.exports = ErasureRequestQueue;
```

### Erasure Executor

```javascript
// erasureExecutor.js
const Redis = require('ioredis');
const DataDiscoveryService = require('./dataDiscovery');
const ErasureRequestQueue = require('./erasureRequestQueue');

class ErasureExecutor {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
    this.discovery = new DataDiscoveryService(redisUrl);
    this.queue = new ErasureRequestQueue(redisUrl);
  }

  async processRequest(request) {
    const { id: requestId, userId } = request;
    const results = {
      requestId,
      userId,
      startedAt: new Date().toISOString(),
      actions: [],
      deleted: [],
      retained: [],
      anonymized: [],
      errors: []
    };

    try {
      // Step 1: Discover all user data
      await this.queue.logEvent(requestId, 'discovery_started', { userId });
      const discovery = await this.discovery.discoverUserData(userId);
      results.discovery = discovery.summary;

      // Step 2: Process each category
      for (const [category, info] of Object.entries(discovery.categories)) {
        await this.queue.logEvent(requestId, 'processing_category', { category });

        for (const key of info.keys) {
          try {
            if (info.retentionRequired) {
              // Mark as retained with reason
              results.retained.push({
                key,
                category,
                reason: info.retentionReason
              });
              results.actions.push({
                action: 'retained',
                key,
                reason: info.retentionReason
              });
            } else if (info.anonymizeInstead) {
              // Anonymize instead of delete
              await this.anonymizeData(key, userId);
              results.anonymized.push({ key, category });
              results.actions.push({ action: 'anonymized', key });
            } else {
              // Delete the data
              await this.deleteData(key);
              results.deleted.push({ key, category });
              results.actions.push({ action: 'deleted', key });
            }
          } catch (error) {
            results.errors.push({
              key,
              error: error.message
            });
          }
        }
      }

      // Step 3: Remove user references from collections
      await this.queue.logEvent(requestId, 'removing_references', { userId });
      const references = await this.discovery.findUserReferences(userId);

      for (const ref of references) {
        try {
          if (ref.type === 'sorted_set') {
            await this.redis.zrem(ref.key, ref.member);
          } else if (ref.type === 'set') {
            await this.redis.srem(ref.key, ref.member);
          }
          results.actions.push({
            action: 'removed_reference',
            key: ref.key,
            type: ref.type
          });
        } catch (error) {
          results.errors.push({
            reference: ref,
            error: error.message
          });
        }
      }

      // Step 4: Generate completion certificate
      results.completedAt = new Date().toISOString();
      results.certificate = await this.generateCertificate(results);

      // Complete the request
      await this.queue.completeRequest(requestId, results);

      return results;

    } catch (error) {
      results.error = error.message;
      await this.queue.failRequest(requestId, error);
      throw error;
    }
  }

  async deleteData(key) {
    // Backup before deletion (for audit)
    const keyType = await this.redis.type(key);
    let backup;

    switch (keyType) {
      case 'string':
        backup = await this.redis.get(key);
        break;
      case 'hash':
        backup = await this.redis.hgetall(key);
        break;
      case 'list':
        backup = await this.redis.lrange(key, 0, -1);
        break;
      case 'set':
        backup = await this.redis.smembers(key);
        break;
      case 'zset':
        backup = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
        break;
    }

    // Store backup for 30 days (in case of disputes)
    const backupKey = `erasure:backup:${key}:${Date.now()}`;
    await this.redis.set(backupKey, JSON.stringify({
      originalKey: key,
      type: keyType,
      data: backup,
      erasedAt: new Date().toISOString()
    }));
    await this.redis.expire(backupKey, 30 * 24 * 3600);

    // Delete the original
    await this.redis.del(key);
  }

  async anonymizeData(key, userId) {
    const keyType = await this.redis.type(key);

    if (keyType === 'hash') {
      const data = await this.redis.hgetall(key);
      const anonymized = this.anonymizeObject(data, userId);
      await this.redis.del(key);
      await this.redis.hset(key, anonymized);
    } else if (keyType === 'string') {
      const data = await this.redis.get(key);
      try {
        const parsed = JSON.parse(data);
        const anonymized = this.anonymizeObject(parsed, userId);
        await this.redis.set(key, JSON.stringify(anonymized));
      } catch {
        // Not JSON, delete instead
        await this.redis.del(key);
      }
    }
  }

  anonymizeObject(obj, userId) {
    const anonymized = { ...obj };
    const piiFields = [
      'email', 'name', 'first_name', 'last_name',
      'phone', 'address', 'ip_address', 'user_agent'
    ];

    for (const field of piiFields) {
      if (anonymized[field]) {
        anonymized[field] = '[ANONYMIZED]';
      }
    }

    // Replace user ID with anonymous ID
    if (anonymized.user_id === userId) {
      anonymized.user_id = `anon_${Date.now()}`;
    }

    anonymized._anonymized_at = new Date().toISOString();

    return anonymized;
  }

  async generateCertificate(results) {
    const certificate = {
      certificateId: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId: results.requestId,
      userId: results.userId,
      issuedAt: new Date().toISOString(),
      summary: {
        keysDeleted: results.deleted.length,
        keysAnonymized: results.anonymized.length,
        keysRetained: results.retained.length,
        errors: results.errors.length
      },
      retainedData: results.retained.map(r => ({
        category: r.category,
        reason: r.reason
      })),
      processingTime: new Date(results.completedAt) - new Date(results.startedAt)
    };

    // Store certificate
    await this.redis.hset(
      `erasure:certificate:${certificate.certificateId}`,
      {
        ...certificate,
        retainedData: JSON.stringify(certificate.retainedData),
        summary: JSON.stringify(certificate.summary)
      }
    );

    // Index by user for lookup
    await this.redis.sadd(
      `erasure:certificates:user:${results.userId}`,
      certificate.certificateId
    );

    return certificate;
  }
}

module.exports = ErasureExecutor;
```

## Verification System

### Identity Verification Before Erasure

```javascript
// verificationService.js
const Redis = require('ioredis');
const crypto = require('crypto');

class ErasureVerificationService {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
  }

  async initiateVerification(userId, email) {
    const verificationId = crypto.randomBytes(16).toString('hex');
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    const verification = {
      id: verificationId,
      userId,
      email,
      code: verificationCode,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      attempts: 0,
      maxAttempts: 3
    };

    await this.redis.hset(`erasure:verification:${verificationId}`, verification);
    await this.redis.expire(`erasure:verification:${verificationId}`, 24 * 3600);

    // Send verification email (implementation depends on email service)
    await this.sendVerificationEmail(email, verificationCode, verificationId);

    return {
      verificationId,
      message: 'Verification code sent to email',
      expiresAt: verification.expiresAt
    };
  }

  async verify(verificationId, code) {
    const verification = await this.redis.hgetall(`erasure:verification:${verificationId}`);

    if (!verification || !verification.id) {
      return { verified: false, error: 'Verification not found or expired' };
    }

    if (new Date(verification.expiresAt) < new Date()) {
      return { verified: false, error: 'Verification expired' };
    }

    const attempts = parseInt(verification.attempts) + 1;
    await this.redis.hset(`erasure:verification:${verificationId}`, 'attempts', attempts);

    if (attempts > parseInt(verification.maxAttempts)) {
      await this.redis.hset(`erasure:verification:${verificationId}`, 'status', 'blocked');
      return { verified: false, error: 'Too many attempts' };
    }

    if (verification.code !== code) {
      return {
        verified: false,
        error: 'Invalid code',
        attemptsRemaining: parseInt(verification.maxAttempts) - attempts
      };
    }

    // Mark as verified
    await this.redis.hset(`erasure:verification:${verificationId}`, {
      status: 'verified',
      verifiedAt: new Date().toISOString()
    });

    return {
      verified: true,
      userId: verification.userId,
      verifiedAt: new Date().toISOString()
    };
  }

  async sendVerificationEmail(email, code, verificationId) {
    // Implementation depends on your email service
    console.log(`Sending erasure verification to ${email}: ${code}`);

    // Log for audit
    await this.redis.lpush('audit:erasure:verification_sent', JSON.stringify({
      email,
      verificationId,
      timestamp: new Date().toISOString()
    }));
  }
}

module.exports = ErasureVerificationService;
```

## API Endpoints

### Express.js Routes

```javascript
// routes/gdprErasure.js
const express = require('express');
const router = express.Router();
const ErasureRequestQueue = require('../services/erasureRequestQueue');
const ErasureVerificationService = require('../services/verificationService');
const ErasureExecutor = require('../services/erasureExecutor');
const DataDiscoveryService = require('../services/dataDiscovery');

const queue = new ErasureRequestQueue(process.env.REDIS_URL);
const verification = new ErasureVerificationService(process.env.REDIS_URL);
const executor = new ErasureExecutor(process.env.REDIS_URL);
const discovery = new DataDiscoveryService(process.env.REDIS_URL);

// Step 1: Initiate erasure request
router.post('/erasure/request', async (req, res) => {
  try {
    const { userId, email, reason } = req.body;

    // Start verification process
    const verificationResult = await verification.initiateVerification(userId, email);

    res.json({
      status: 'verification_required',
      verificationId: verificationResult.verificationId,
      message: 'Please check your email for verification code',
      expiresAt: verificationResult.expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Step 2: Verify identity
router.post('/erasure/verify', async (req, res) => {
  try {
    const { verificationId, code, reason } = req.body;

    const result = await verification.verify(verificationId, code);

    if (!result.verified) {
      return res.status(400).json(result);
    }

    // Submit actual erasure request
    const requestId = await queue.submitRequest({
      userId: result.userId,
      verificationMethod: 'email_code',
      verifiedAt: result.verifiedAt,
      reason
    });

    res.json({
      status: 'submitted',
      requestId,
      message: 'Erasure request submitted. You will be notified when complete.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Step 3: Check request status
router.get('/erasure/status/:requestId', async (req, res) => {
  try {
    const status = await queue.getRequestStatus(req.params.requestId);

    if (!status || !status.id) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({
      requestId: status.id,
      status: status.status,
      submittedAt: status.submittedAt,
      completedAt: status.completedAt,
      result: status.result ? JSON.parse(status.result) : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get data subject access (what data do we have)
router.get('/data-subject/access/:userId', async (req, res) => {
  try {
    // Verify user identity first
    const { authorization } = req.headers;
    // ... verify token matches userId

    const data = await discovery.discoverUserData(req.params.userId);

    res.json({
      userId: req.params.userId,
      generatedAt: new Date().toISOString(),
      dataCategories: data.categories,
      summary: data.summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download erasure certificate
router.get('/erasure/certificate/:certificateId', async (req, res) => {
  try {
    const cert = await executor.redis.hgetall(
      `erasure:certificate:${req.params.certificateId}`
    );

    if (!cert || !cert.certificateId) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      ...cert,
      summary: JSON.parse(cert.summary),
      retainedData: JSON.parse(cert.retainedData)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## Background Worker

### Processing Erasure Requests

```javascript
// workers/erasureWorker.js
const ErasureRequestQueue = require('../services/erasureRequestQueue');
const ErasureExecutor = require('../services/erasureExecutor');

class ErasureWorker {
  constructor(redisUrl) {
    this.queue = new ErasureRequestQueue(redisUrl);
    this.executor = new ErasureExecutor(redisUrl);
    this.running = false;
  }

  async start() {
    this.running = true;
    console.log('Erasure worker started');

    while (this.running) {
      try {
        const request = await this.queue.getNextRequest();

        if (request) {
          console.log(`Processing erasure request: ${request.id}`);

          const result = await this.executor.processRequest(request);

          console.log(`Completed erasure request: ${request.id}`, {
            deleted: result.deleted.length,
            retained: result.retained.length,
            anonymized: result.anonymized.length
          });

          // Notify user
          await this.notifyCompletion(request, result);
        }
      } catch (error) {
        console.error('Error processing erasure request:', error);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async notifyCompletion(request, result) {
    // Send completion email
    console.log(`Notifying user ${request.email} of erasure completion`);

    // Implementation depends on email service
    const notification = {
      to: request.email,
      subject: 'Your Data Erasure Request Has Been Completed',
      body: `
        Your data erasure request (${request.id}) has been processed.

        Summary:
        - Data deleted: ${result.deleted.length} records
        - Data anonymized: ${result.anonymized.length} records
        - Data retained (legal requirement): ${result.retained.length} records

        Certificate ID: ${result.certificate.certificateId}

        If you have any questions, please contact our privacy team.
      `
    };

    await this.queue.redis.lpush('email:queue', JSON.stringify(notification));
  }

  stop() {
    this.running = false;
  }
}

// Start worker
if (require.main === module) {
  const worker = new ErasureWorker(process.env.REDIS_URL);
  worker.start();

  process.on('SIGTERM', () => {
    worker.stop();
    process.exit(0);
  });
}

module.exports = ErasureWorker;
```

## Compliance Reporting

### Generating GDPR Reports

```javascript
// reporting/gdprReports.js
const Redis = require('ioredis');

class GDPRReportGenerator {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
  }

  async generateErasureReport(startDate, endDate) {
    const report = {
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      summary: {
        totalRequests: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        avgProcessingTime: 0
      },
      breakdown: {
        byDay: {},
        byOutcome: {},
        retentionReasons: {}
      },
      slaCompliance: {
        within24Hours: 0,
        within72Hours: 0,
        within30Days: 0,
        exceeded30Days: 0
      }
    };

    // Get all requests in period
    const requests = await this.getRequestsInPeriod(startDate, endDate);
    report.summary.totalRequests = requests.length;

    const processingTimes = [];

    for (const request of requests) {
      // Count by status
      report.summary[request.status] = (report.summary[request.status] || 0) + 1;

      // Day breakdown
      const day = request.submittedAt.split('T')[0];
      report.breakdown.byDay[day] = (report.breakdown.byDay[day] || 0) + 1;

      // Processing time
      if (request.completedAt) {
        const processingTime = new Date(request.completedAt) - new Date(request.submittedAt);
        processingTimes.push(processingTime);

        // SLA compliance
        const hours = processingTime / (1000 * 60 * 60);
        if (hours <= 24) report.slaCompliance.within24Hours++;
        else if (hours <= 72) report.slaCompliance.within72Hours++;
        else if (hours <= 720) report.slaCompliance.within30Days++;
        else report.slaCompliance.exceeded30Days++;

        // Retention reasons from result
        if (request.result) {
          const result = JSON.parse(request.result);
          for (const retained of result.retained || []) {
            const reason = retained.reason || 'Unknown';
            report.breakdown.retentionReasons[reason] =
              (report.breakdown.retentionReasons[reason] || 0) + 1;
          }
        }
      }
    }

    // Calculate average processing time
    if (processingTimes.length > 0) {
      const avg = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      report.summary.avgProcessingTime = Math.round(avg / (1000 * 60)); // minutes
    }

    return report;
  }

  async getRequestsInPeriod(startDate, endDate) {
    const requests = [];
    let cursor = '0';

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        'erasure:request:*',
        'COUNT',
        1000
      );
      cursor = newCursor;

      for (const key of keys) {
        const request = await this.redis.hgetall(key);

        if (!request.submittedAt) continue;

        const submitted = new Date(request.submittedAt);
        if (submitted >= new Date(startDate) && submitted <= new Date(endDate)) {
          requests.push(request);
        }
      }
    } while (cursor !== '0');

    return requests;
  }

  async generateComplianceScore() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const report = await this.generateErasureReport(thirtyDaysAgo, new Date().toISOString());

    const score = {
      overall: 0,
      metrics: {}
    };

    // Response time score (max 40 points)
    const responseTimeScore = Math.min(40,
      (report.slaCompliance.within24Hours * 40 +
       report.slaCompliance.within72Hours * 30 +
       report.slaCompliance.within30Days * 20) /
      Math.max(1, report.summary.completed)
    );
    score.metrics.responseTime = responseTimeScore;

    // Completion rate score (max 30 points)
    const completionRate = report.summary.completed /
                          Math.max(1, report.summary.totalRequests);
    score.metrics.completionRate = completionRate * 30;

    // Error rate score (max 30 points)
    const errorRate = report.summary.failed /
                     Math.max(1, report.summary.totalRequests);
    score.metrics.errorRate = (1 - errorRate) * 30;

    score.overall = Math.round(
      score.metrics.responseTime +
      score.metrics.completionRate +
      score.metrics.errorRate
    );

    return score;
  }
}

module.exports = GDPRReportGenerator;
```

## Testing Erasure

### Verification Tests

```javascript
// tests/erasure.test.js
const ErasureExecutor = require('../services/erasureExecutor');
const DataDiscoveryService = require('../services/dataDiscovery');

describe('GDPR Erasure', () => {
  let executor;
  let discovery;

  beforeEach(async () => {
    executor = new ErasureExecutor(process.env.TEST_REDIS_URL);
    discovery = new DataDiscoveryService(process.env.TEST_REDIS_URL);

    // Create test user data
    await createTestUserData('test_user_123');
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  test('should discover all user data', async () => {
    const result = await discovery.discoverUserData('test_user_123');

    expect(result.summary.totalKeys).toBeGreaterThan(0);
    expect(result.categories).toHaveProperty('user_profile');
  });

  test('should delete user data', async () => {
    const request = {
      id: 'test_request_1',
      userId: 'test_user_123'
    };

    const result = await executor.processRequest(request);

    expect(result.deleted.length).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);

    // Verify data is gone
    const postDiscovery = await discovery.discoverUserData('test_user_123');
    expect(postDiscovery.summary.deletableKeys).toBe(0);
  });

  test('should retain legally required data', async () => {
    const request = {
      id: 'test_request_2',
      userId: 'test_user_123'
    };

    const result = await executor.processRequest(request);

    // Should have retained consent and audit records
    expect(result.retained.length).toBeGreaterThan(0);
    expect(result.retained.some(r => r.category === 'consent')).toBe(true);
  });

  test('should generate valid certificate', async () => {
    const request = {
      id: 'test_request_3',
      userId: 'test_user_123'
    };

    const result = await executor.processRequest(request);

    expect(result.certificate).toBeDefined();
    expect(result.certificate.certificateId).toBeDefined();
    expect(result.certificate.summary.keysDeleted).toBeGreaterThan(0);
  });
});

async function createTestUserData(userId) {
  // Create various data types for testing
}

async function cleanupTestData() {
  // Clean up test data
}
```

## Best Practices

```markdown
## GDPR Erasure Checklist

### Preparation
- [ ] Map all data storage locations
- [ ] Document retention requirements
- [ ] Implement data discovery
- [ ] Set up audit logging

### Processing
- [ ] Verify requester identity
- [ ] Process within 30 days (or extend with justification)
- [ ] Handle retention exceptions
- [ ] Anonymize where deletion not possible

### Documentation
- [ ] Generate erasure certificates
- [ ] Maintain audit trail
- [ ] Document retention reasons
- [ ] Store proof of completion

### Verification
- [ ] Verify complete deletion
- [ ] Check all data stores
- [ ] Test backup exclusion
- [ ] Validate anonymization
```

## Conclusion

Implementing GDPR Right to Erasure with Redis requires:

- Comprehensive data discovery across all keys
- Secure identity verification before erasure
- Clear handling of retention exceptions
- Complete audit trail and certificates
- Regular compliance monitoring

By following these patterns, you can build a compliant erasure system that respects data subject rights while maintaining necessary legal records.
