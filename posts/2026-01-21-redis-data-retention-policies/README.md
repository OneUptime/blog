# How to Implement Data Retention Policies in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Retention, TTL, Compliance, Automated Cleanup, Data Lifecycle, Policy Management

Description: A comprehensive guide to implementing data retention policies in Redis, covering TTL management, automated cleanup strategies, compliance-driven retention, and best practices for data lifecycle management.

---

Data retention policies are essential for compliance, cost management, and system performance. This guide covers implementing robust data retention strategies in Redis, from simple TTL-based expiration to complex compliance-driven policies.

## Understanding Data Retention

### Retention Policy Considerations

```
+------------------+------------------------------------------+
| Factor           | Consideration                            |
+------------------+------------------------------------------+
| Legal/Compliance | GDPR, HIPAA, SOX, industry regulations   |
| Business Need    | Analytics, audit, customer support       |
| Cost             | Storage costs, memory usage              |
| Performance      | Impact of large datasets on operations   |
| Security         | Risk of holding sensitive data           |
+------------------+------------------------------------------+
```

### Common Retention Periods

```
+----------------------+------------------+------------------------+
| Data Type            | Typical Period   | Reason                 |
+----------------------+------------------+------------------------+
| Session data         | 24 hours - 7 days| User experience        |
| Cache data           | 5 min - 24 hours | Performance            |
| Rate limiting        | 1 min - 1 hour   | Security               |
| Login history        | 90 days          | Security audit         |
| Transaction data     | 7 years          | Tax/accounting         |
| Audit logs           | 7 years          | Compliance             |
| Marketing preferences| 3 years          | GDPR consent           |
| User profiles        | Account lifetime | Service provision      |
+----------------------+------------------+------------------------+
```

## TTL-Based Retention

### Basic TTL Management

```javascript
// ttlManager.js
const Redis = require('ioredis');

class TTLManager {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);

    // Default TTLs by data type (in seconds)
    this.defaultTTLs = {
      session: 24 * 3600,           // 24 hours
      cache: 3600,                  // 1 hour
      rate_limit: 60,               // 1 minute
      temp_data: 300,               // 5 minutes
      user_preference: 30 * 24 * 3600, // 30 days
      audit_log: 7 * 365 * 24 * 3600,  // 7 years
      no_expiry: -1                 // Never expires
    };
  }

  // Set with automatic TTL based on key prefix
  async setWithRetention(key, value, dataType = null) {
    const inferredType = dataType || this.inferDataType(key);
    const ttl = this.defaultTTLs[inferredType] || this.defaultTTLs.cache;

    if (ttl === -1) {
      // No expiry
      await this.redis.set(key, JSON.stringify(value));
    } else {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    }

    // Track for retention reporting
    await this.trackKey(key, inferredType, ttl);

    return { key, ttl, dataType: inferredType };
  }

  // Hash set with retention
  async hsetWithRetention(key, data, dataType = null) {
    const inferredType = dataType || this.inferDataType(key);
    const ttl = this.defaultTTLs[inferredType] || this.defaultTTLs.cache;

    // Store data
    const flatData = {};
    for (const [field, value] of Object.entries(data)) {
      flatData[field] = typeof value === 'object' ? JSON.stringify(value) : value;
    }
    await this.redis.hset(key, flatData);

    // Set TTL if needed
    if (ttl !== -1) {
      await this.redis.expire(key, ttl);
    }

    await this.trackKey(key, inferredType, ttl);

    return { key, ttl, dataType: inferredType };
  }

  inferDataType(key) {
    const prefixes = {
      'session:': 'session',
      'cache:': 'cache',
      'rate:': 'rate_limit',
      'temp:': 'temp_data',
      'pref:': 'user_preference',
      'audit:': 'audit_log',
      'user:': 'no_expiry',
      'config:': 'no_expiry'
    };

    for (const [prefix, type] of Object.entries(prefixes)) {
      if (key.startsWith(prefix)) {
        return type;
      }
    }

    return 'cache'; // Default
  }

  async trackKey(key, dataType, ttl) {
    const expiryTime = ttl === -1 ? -1 : Date.now() + (ttl * 1000);

    // Store in sorted set for tracking
    await this.redis.zadd(
      `retention:tracking:${dataType}`,
      expiryTime,
      key
    );
  }

  // Check and refresh TTL
  async refreshTTL(key, dataType = null) {
    const inferredType = dataType || this.inferDataType(key);
    const ttl = this.defaultTTLs[inferredType];

    if (ttl && ttl !== -1) {
      await this.redis.expire(key, ttl);
      return { key, newTTL: ttl };
    }

    return { key, newTTL: null };
  }

  // Get remaining TTL
  async getRemainingTTL(key) {
    const ttl = await this.redis.ttl(key);

    if (ttl === -2) {
      return { exists: false, ttl: null };
    }

    if (ttl === -1) {
      return { exists: true, ttl: 'no_expiry' };
    }

    return {
      exists: true,
      ttl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
    };
  }
}

module.exports = TTLManager;
```

## Policy-Based Retention

### Retention Policy Engine

```javascript
// retentionPolicyEngine.js
const Redis = require('ioredis');

class RetentionPolicyEngine {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
    this.policies = new Map();
  }

  // Define retention policies
  definePolicy(name, config) {
    const policy = {
      name,
      keyPattern: config.keyPattern,
      retentionPeriod: config.retentionPeriod, // in seconds
      retentionType: config.retentionType || 'delete', // delete, archive, anonymize
      condition: config.condition || null, // Optional function for conditional retention
      archiveDestination: config.archiveDestination || null,
      enabled: config.enabled !== false,
      createdAt: new Date().toISOString()
    };

    this.policies.set(name, policy);

    // Store in Redis for persistence
    this.redis.hset('retention:policies', name, JSON.stringify(policy));

    return policy;
  }

  // Load policies from Redis
  async loadPolicies() {
    const stored = await this.redis.hgetall('retention:policies');

    for (const [name, policyStr] of Object.entries(stored)) {
      const policy = JSON.parse(policyStr);
      this.policies.set(name, policy);
    }

    return this.policies;
  }

  // Apply retention policy to a key when storing
  async applyPolicyOnStore(key, value, policyName = null) {
    const policy = policyName
      ? this.policies.get(policyName)
      : this.findMatchingPolicy(key);

    if (!policy || !policy.enabled) {
      // No policy - use default behavior
      await this.redis.set(key, JSON.stringify(value));
      return { key, policy: null };
    }

    // Store with TTL
    if (policy.retentionPeriod > 0) {
      await this.redis.setex(key, policy.retentionPeriod, JSON.stringify(value));
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }

    // Store retention metadata
    await this.storeRetentionMetadata(key, policy);

    return { key, policy: policy.name, retentionPeriod: policy.retentionPeriod };
  }

  findMatchingPolicy(key) {
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      const pattern = new RegExp(
        policy.keyPattern.replace(/\*/g, '.*').replace(/\?/g, '.')
      );

      if (pattern.test(key)) {
        return policy;
      }
    }
    return null;
  }

  async storeRetentionMetadata(key, policy) {
    const metadata = {
      key,
      policy: policy.name,
      createdAt: Date.now(),
      expiresAt: policy.retentionPeriod > 0
        ? Date.now() + (policy.retentionPeriod * 1000)
        : null,
      retentionType: policy.retentionType
    };

    // Add to retention tracking
    if (metadata.expiresAt) {
      await this.redis.zadd(
        `retention:expires:${policy.name}`,
        metadata.expiresAt,
        key
      );
    }

    await this.redis.hset(`retention:meta:${key}`, metadata);
  }

  // Process expired data according to policies
  async processExpiredData() {
    const results = {
      processed: 0,
      deleted: 0,
      archived: 0,
      anonymized: 0,
      errors: []
    };

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      const expiredKeys = await this.getExpiredKeys(policy.name);

      for (const key of expiredKeys) {
        try {
          await this.handleExpiredKey(key, policy, results);
          results.processed++;
        } catch (error) {
          results.errors.push({ key, error: error.message });
        }
      }
    }

    return results;
  }

  async getExpiredKeys(policyName) {
    const now = Date.now();

    return this.redis.zrangebyscore(
      `retention:expires:${policyName}`,
      0,
      now
    );
  }

  async handleExpiredKey(key, policy, results) {
    switch (policy.retentionType) {
      case 'delete':
        await this.deleteKey(key, policy);
        results.deleted++;
        break;

      case 'archive':
        await this.archiveKey(key, policy);
        results.archived++;
        break;

      case 'anonymize':
        await this.anonymizeKey(key, policy);
        results.anonymized++;
        break;

      default:
        await this.deleteKey(key, policy);
        results.deleted++;
    }
  }

  async deleteKey(key, policy) {
    // Log deletion
    await this.logRetentionAction(key, policy.name, 'deleted');

    // Remove from tracking
    await this.redis.zrem(`retention:expires:${policy.name}`, key);
    await this.redis.del(`retention:meta:${key}`);

    // Delete the actual key
    await this.redis.del(key);
  }

  async archiveKey(key, policy) {
    // Get data
    const data = await this.redis.get(key);
    const keyType = await this.redis.type(key);

    let archiveData;
    switch (keyType) {
      case 'string':
        archiveData = await this.redis.get(key);
        break;
      case 'hash':
        archiveData = await this.redis.hgetall(key);
        break;
      case 'list':
        archiveData = await this.redis.lrange(key, 0, -1);
        break;
      case 'set':
        archiveData = await this.redis.smembers(key);
        break;
      case 'zset':
        archiveData = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
        break;
    }

    // Store in archive
    const archiveKey = `${policy.archiveDestination || 'archive'}:${key}:${Date.now()}`;
    await this.redis.hset(archiveKey, {
      originalKey: key,
      type: keyType,
      data: JSON.stringify(archiveData),
      archivedAt: new Date().toISOString(),
      policy: policy.name
    });

    // Log and cleanup
    await this.logRetentionAction(key, policy.name, 'archived', archiveKey);
    await this.redis.zrem(`retention:expires:${policy.name}`, key);
    await this.redis.del(`retention:meta:${key}`);
    await this.redis.del(key);
  }

  async anonymizeKey(key, policy) {
    const keyType = await this.redis.type(key);

    if (keyType === 'hash') {
      const data = await this.redis.hgetall(key);
      const anonymized = this.anonymizeData(data);
      await this.redis.del(key);
      await this.redis.hset(key, anonymized);
    }

    // Remove from tracking but keep the key
    await this.redis.zrem(`retention:expires:${policy.name}`, key);
    await this.redis.hset(`retention:meta:${key}`, 'anonymized', 'true');

    await this.logRetentionAction(key, policy.name, 'anonymized');
  }

  anonymizeData(data) {
    const sensitiveFields = [
      'email', 'name', 'phone', 'address', 'ssn',
      'credit_card', 'ip_address', 'user_agent'
    ];

    const anonymized = { ...data };

    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = '[ANONYMIZED]';
      }
    }

    anonymized._anonymized_at = new Date().toISOString();

    return anonymized;
  }

  async logRetentionAction(key, policyName, action, details = null) {
    const log = {
      key,
      policy: policyName,
      action,
      details,
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('retention:log', JSON.stringify(log));
    await this.redis.ltrim('retention:log', 0, 99999);
  }
}

module.exports = RetentionPolicyEngine;
```

### Policy Configuration Examples

```javascript
// setupPolicies.js
const RetentionPolicyEngine = require('./retentionPolicyEngine');

async function setupPolicies() {
  const engine = new RetentionPolicyEngine(process.env.REDIS_URL);

  // Session data - delete after 24 hours
  engine.definePolicy('session_retention', {
    keyPattern: 'session:*',
    retentionPeriod: 24 * 3600,
    retentionType: 'delete'
  });

  // Cache data - delete after 1 hour
  engine.definePolicy('cache_retention', {
    keyPattern: 'cache:*',
    retentionPeriod: 3600,
    retentionType: 'delete'
  });

  // User activity - anonymize after 90 days
  engine.definePolicy('activity_retention', {
    keyPattern: 'activity:*',
    retentionPeriod: 90 * 24 * 3600,
    retentionType: 'anonymize'
  });

  // Transaction data - archive after 7 years
  engine.definePolicy('transaction_retention', {
    keyPattern: 'transaction:*',
    retentionPeriod: 7 * 365 * 24 * 3600,
    retentionType: 'archive',
    archiveDestination: 'archive:transactions'
  });

  // Login history - delete after 1 year
  engine.definePolicy('login_history_retention', {
    keyPattern: 'login:*',
    retentionPeriod: 365 * 24 * 3600,
    retentionType: 'delete'
  });

  // Rate limiting - short TTL
  engine.definePolicy('rate_limit_retention', {
    keyPattern: 'rate:*',
    retentionPeriod: 60,
    retentionType: 'delete'
  });

  // Temporary data - very short TTL
  engine.definePolicy('temp_retention', {
    keyPattern: 'temp:*',
    retentionPeriod: 300,
    retentionType: 'delete'
  });

  console.log('Retention policies configured:', engine.policies.size);
  return engine;
}

module.exports = setupPolicies;
```

## Automated Cleanup

### Retention Cleanup Worker

```javascript
// retentionWorker.js
const RetentionPolicyEngine = require('./retentionPolicyEngine');

class RetentionCleanupWorker {
  constructor(redisUrl) {
    this.engine = new RetentionPolicyEngine(redisUrl);
    this.running = false;
    this.intervalMs = 60000; // Run every minute
  }

  async start() {
    await this.engine.loadPolicies();
    this.running = true;

    console.log('Retention cleanup worker started');

    while (this.running) {
      try {
        const results = await this.engine.processExpiredData();

        if (results.processed > 0) {
          console.log('Retention cleanup results:', {
            processed: results.processed,
            deleted: results.deleted,
            archived: results.archived,
            anonymized: results.anonymized,
            errors: results.errors.length
          });
        }
      } catch (error) {
        console.error('Retention cleanup error:', error);
      }

      await this.sleep(this.intervalMs);
    }
  }

  stop() {
    this.running = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run as standalone worker
if (require.main === module) {
  const worker = new RetentionCleanupWorker(process.env.REDIS_URL);
  worker.start();

  process.on('SIGTERM', () => {
    worker.stop();
    process.exit(0);
  });
}

module.exports = RetentionCleanupWorker;
```

### Bulk Cleanup for Large Datasets

```javascript
// bulkCleanup.js
const Redis = require('ioredis');

class BulkRetentionCleanup {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
  }

  // Clean up keys matching pattern older than specified time
  async cleanupOldKeys(pattern, maxAgeSeconds, options = {}) {
    const {
      batchSize = 1000,
      dryRun = false,
      progressCallback = null
    } = options;

    const results = {
      scanned: 0,
      deleted: 0,
      skipped: 0,
      errors: []
    };

    const cutoffTime = Date.now() - (maxAgeSeconds * 1000);
    let cursor = '0';

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        batchSize
      );
      cursor = newCursor;
      results.scanned += keys.length;

      const keysToDelete = [];

      for (const key of keys) {
        try {
          const shouldDelete = await this.shouldDeleteKey(key, cutoffTime);

          if (shouldDelete) {
            keysToDelete.push(key);
          } else {
            results.skipped++;
          }
        } catch (error) {
          results.errors.push({ key, error: error.message });
        }
      }

      if (keysToDelete.length > 0 && !dryRun) {
        await this.redis.del(...keysToDelete);
        results.deleted += keysToDelete.length;
      } else if (dryRun) {
        results.deleted += keysToDelete.length;
      }

      if (progressCallback) {
        progressCallback(results);
      }
    } while (cursor !== '0');

    return results;
  }

  async shouldDeleteKey(key, cutoffTime) {
    // Check if key has retention metadata
    const meta = await this.redis.hgetall(`retention:meta:${key}`);

    if (meta && meta.createdAt) {
      return parseInt(meta.createdAt) < cutoffTime;
    }

    // Fall back to key-based heuristics
    // Extract timestamp from key if present (e.g., session:user123:1234567890)
    const timestampMatch = key.match(/:(\d{10,13})$/);
    if (timestampMatch) {
      const keyTime = parseInt(timestampMatch[1]);
      return keyTime < cutoffTime;
    }

    // Can't determine age - skip
    return false;
  }

  // Clean up entire data type with progress tracking
  async cleanupDataType(dataType, maxAgeSeconds) {
    const patterns = {
      sessions: 'session:*',
      cache: 'cache:*',
      temp: 'temp:*',
      activity: 'activity:*',
      rate_limits: 'rate:*'
    };

    const pattern = patterns[dataType];
    if (!pattern) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    console.log(`Starting cleanup for ${dataType} older than ${maxAgeSeconds}s`);

    const results = await this.cleanupOldKeys(pattern, maxAgeSeconds, {
      progressCallback: (progress) => {
        if (progress.scanned % 10000 === 0) {
          console.log(`Progress: scanned ${progress.scanned}, deleted ${progress.deleted}`);
        }
      }
    });

    console.log(`Cleanup complete:`, results);
    return results;
  }
}

module.exports = BulkRetentionCleanup;
```

## Compliance-Driven Retention

### Regulatory Compliance Manager

```javascript
// complianceRetention.js
const Redis = require('ioredis');

class ComplianceRetentionManager {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);

    // Define compliance requirements
    this.complianceRules = {
      GDPR: {
        personalData: {
          maxRetention: 3 * 365 * 24 * 3600, // 3 years
          requiresConsent: true,
          rightToErasure: true
        },
        consent: {
          minRetention: 3 * 365 * 24 * 3600, // Must keep for 3 years
          rightToErasure: false
        },
        auditLogs: {
          minRetention: 6 * 365 * 24 * 3600, // 6 years
          rightToErasure: false
        }
      },
      HIPAA: {
        phi: {
          minRetention: 6 * 365 * 24 * 3600, // 6 years
          requiresEncryption: true,
          rightToErasure: false
        },
        auditLogs: {
          minRetention: 6 * 365 * 24 * 3600,
          rightToErasure: false
        }
      },
      SOX: {
        financialRecords: {
          minRetention: 7 * 365 * 24 * 3600, // 7 years
          requiresAuditTrail: true
        }
      },
      CCPA: {
        personalData: {
          maxRetention: 12 * 30 * 24 * 3600, // 12 months
          rightToDelete: true,
          rightToKnow: true
        }
      }
    };
  }

  // Check if key can be deleted based on compliance rules
  async canDelete(key, regulations = []) {
    const metadata = await this.getKeyMetadata(key);

    for (const regulation of regulations) {
      const rules = this.complianceRules[regulation];
      if (!rules) continue;

      for (const [dataType, rule] of Object.entries(rules)) {
        if (this.keyMatchesDataType(key, dataType)) {
          // Check minimum retention
          if (rule.minRetention) {
            const age = Date.now() - (metadata.createdAt || 0);
            if (age < rule.minRetention * 1000) {
              return {
                canDelete: false,
                reason: `${regulation} requires minimum retention of ${rule.minRetention}s`,
                remainingTime: (rule.minRetention * 1000) - age
              };
            }
          }

          // Check if deletion is allowed
          if (rule.rightToErasure === false) {
            return {
              canDelete: false,
              reason: `${regulation} does not allow deletion of ${dataType}`
            };
          }
        }
      }
    }

    return { canDelete: true };
  }

  // Check if key must be deleted based on compliance rules
  async mustDelete(key, regulations = []) {
    const metadata = await this.getKeyMetadata(key);

    for (const regulation of regulations) {
      const rules = this.complianceRules[regulation];
      if (!rules) continue;

      for (const [dataType, rule] of Object.entries(rules)) {
        if (this.keyMatchesDataType(key, dataType)) {
          // Check maximum retention
          if (rule.maxRetention) {
            const age = Date.now() - (metadata.createdAt || 0);
            if (age > rule.maxRetention * 1000) {
              return {
                mustDelete: true,
                reason: `${regulation} requires deletion after ${rule.maxRetention}s`,
                overdue: age - (rule.maxRetention * 1000)
              };
            }
          }
        }
      }
    }

    return { mustDelete: false };
  }

  async getKeyMetadata(key) {
    const meta = await this.redis.hgetall(`retention:meta:${key}`);

    return {
      createdAt: meta.createdAt ? parseInt(meta.createdAt) : null,
      dataType: meta.dataType,
      regulations: meta.regulations ? JSON.parse(meta.regulations) : []
    };
  }

  keyMatchesDataType(key, dataType) {
    const patterns = {
      personalData: /^(user|profile|customer):/,
      phi: /^(patient|medical|health):/,
      consent: /^consent:/,
      auditLogs: /^audit:/,
      financialRecords: /^(transaction|payment|invoice):/
    };

    const pattern = patterns[dataType];
    return pattern ? pattern.test(key) : false;
  }

  // Store data with compliance metadata
  async storeWithCompliance(key, data, options = {}) {
    const {
      regulations = [],
      dataType = null,
      ttl = null
    } = options;

    // Calculate appropriate retention based on regulations
    const retentionInfo = this.calculateRetention(dataType, regulations);

    // Store data
    if (retentionInfo.maxRetention) {
      await this.redis.setex(key, retentionInfo.maxRetention, JSON.stringify(data));
    } else {
      await this.redis.set(key, JSON.stringify(data));
    }

    // Store compliance metadata
    await this.redis.hset(`retention:meta:${key}`, {
      createdAt: Date.now(),
      dataType,
      regulations: JSON.stringify(regulations),
      minRetention: retentionInfo.minRetention || 0,
      maxRetention: retentionInfo.maxRetention || -1
    });

    return retentionInfo;
  }

  calculateRetention(dataType, regulations) {
    let minRetention = 0;
    let maxRetention = Infinity;

    for (const regulation of regulations) {
      const rules = this.complianceRules[regulation];
      if (!rules) continue;

      const rule = rules[dataType];
      if (rule) {
        if (rule.minRetention) {
          minRetention = Math.max(minRetention, rule.minRetention);
        }
        if (rule.maxRetention) {
          maxRetention = Math.min(maxRetention, rule.maxRetention);
        }
      }
    }

    // Ensure max >= min
    if (maxRetention < minRetention) {
      console.warn(`Conflicting retention requirements: min=${minRetention}, max=${maxRetention}`);
      maxRetention = minRetention;
    }

    return {
      minRetention: minRetention > 0 ? minRetention : null,
      maxRetention: maxRetention < Infinity ? maxRetention : null
    };
  }

  // Generate compliance report
  async generateComplianceReport(regulations = []) {
    const report = {
      generatedAt: new Date().toISOString(),
      regulations,
      summary: {
        totalKeys: 0,
        compliant: 0,
        mustDelete: 0,
        cannotDelete: 0,
        issues: []
      },
      details: []
    };

    let cursor = '0';

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        '*',
        'COUNT',
        1000
      );
      cursor = newCursor;

      for (const key of keys) {
        // Skip internal keys
        if (key.startsWith('retention:')) continue;

        report.summary.totalKeys++;

        const canDelete = await this.canDelete(key, regulations);
        const mustDelete = await this.mustDelete(key, regulations);

        if (mustDelete.mustDelete) {
          report.summary.mustDelete++;
          report.summary.issues.push({
            key,
            type: 'must_delete',
            reason: mustDelete.reason
          });
        } else if (!canDelete.canDelete) {
          report.summary.cannotDelete++;
        } else {
          report.summary.compliant++;
        }
      }
    } while (cursor !== '0');

    return report;
  }
}

module.exports = ComplianceRetentionManager;
```

## Monitoring and Reporting

### Retention Metrics

```javascript
// retentionMetrics.js
const Redis = require('ioredis');

class RetentionMetrics {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
  }

  // Get retention statistics
  async getStatistics() {
    const stats = {
      timestamp: new Date().toISOString(),
      totalKeys: 0,
      byDataType: {},
      expiringKeys: {
        next1Hour: 0,
        next24Hours: 0,
        next7Days: 0,
        next30Days: 0
      },
      memoryUsage: {}
    };

    // Count keys by data type
    const dataTypes = ['session', 'cache', 'user', 'audit', 'temp'];

    for (const dataType of dataTypes) {
      const count = await this.countKeys(`${dataType}:*`);
      stats.byDataType[dataType] = count;
      stats.totalKeys += count;
    }

    // Count expiring keys
    const now = Date.now();
    stats.expiringKeys.next1Hour = await this.countExpiringKeys(now + 3600000);
    stats.expiringKeys.next24Hours = await this.countExpiringKeys(now + 86400000);
    stats.expiringKeys.next7Days = await this.countExpiringKeys(now + 604800000);
    stats.expiringKeys.next30Days = await this.countExpiringKeys(now + 2592000000);

    // Get memory info
    const memoryInfo = await this.redis.info('memory');
    stats.memoryUsage = this.parseMemoryInfo(memoryInfo);

    return stats;
  }

  async countKeys(pattern) {
    let count = 0;
    let cursor = '0';

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        10000
      );
      cursor = newCursor;
      count += keys.length;
    } while (cursor !== '0');

    return count;
  }

  async countExpiringKeys(beforeTime) {
    let count = 0;

    // Check all retention tracking sets
    const policies = await this.redis.hkeys('retention:policies');

    for (const policy of policies) {
      const expiringCount = await this.redis.zcount(
        `retention:expires:${policy}`,
        0,
        beforeTime
      );
      count += expiringCount;
    }

    return count;
  }

  parseMemoryInfo(info) {
    const lines = info.split('\n');
    const result = {};

    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    }

    return {
      usedMemory: result.used_memory_human,
      usedMemoryPeak: result.used_memory_peak_human,
      usedMemoryDataset: result.used_memory_dataset,
      memFragmentationRatio: result.mem_fragmentation_ratio
    };
  }

  // Generate retention health report
  async generateHealthReport() {
    const stats = await this.getStatistics();

    const report = {
      timestamp: stats.timestamp,
      status: 'healthy',
      issues: [],
      metrics: stats
    };

    // Check for issues
    if (stats.expiringKeys.next1Hour > 10000) {
      report.issues.push({
        severity: 'warning',
        message: `Large number of keys expiring soon: ${stats.expiringKeys.next1Hour}`
      });
    }

    const fragRatio = parseFloat(stats.memoryUsage.memFragmentationRatio);
    if (fragRatio > 1.5) {
      report.issues.push({
        severity: 'warning',
        message: `High memory fragmentation: ${fragRatio}`
      });
    }

    if (report.issues.length > 0) {
      report.status = 'warning';
    }

    return report;
  }
}

module.exports = RetentionMetrics;
```

## Best Practices

```markdown
## Data Retention Best Practices

### Policy Definition
- [ ] Document all data types and their retention requirements
- [ ] Map regulatory requirements to data types
- [ ] Define clear ownership for each data category
- [ ] Review policies annually

### Implementation
- [ ] Use TTL for automatic expiration where possible
- [ ] Implement metadata tracking for complex policies
- [ ] Create automated cleanup processes
- [ ] Test retention logic thoroughly

### Monitoring
- [ ] Track key expiration statistics
- [ ] Monitor cleanup job performance
- [ ] Alert on policy violations
- [ ] Generate regular compliance reports

### Compliance
- [ ] Maintain audit trail of all deletions
- [ ] Handle legal holds appropriately
- [ ] Document exceptions and overrides
- [ ] Regular compliance audits
```

## Conclusion

Implementing data retention policies in Redis requires:

- Clear policy definitions for each data type
- Automated TTL management for simple cases
- Policy engines for complex compliance requirements
- Regular cleanup processes and monitoring
- Comprehensive audit logging

By following these patterns, you can maintain compliance with regulatory requirements while keeping your Redis instance performant and manageable.
