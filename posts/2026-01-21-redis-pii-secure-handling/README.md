# How to Handle PII in Redis Securely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PII, Security, Data Protection, Compliance, Tokenization, Data Masking

Description: A comprehensive guide to securely handling Personally Identifiable Information (PII) in Redis, covering data masking, tokenization, encryption, access controls, and compliance best practices.

---

Handling Personally Identifiable Information (PII) in Redis requires careful consideration of security, compliance, and data protection requirements. This guide covers strategies for storing, accessing, and protecting PII data in Redis applications.

## Understanding PII Categories

### Common PII Types

```
+------------------+---------------------------+------------------+
| Category         | Examples                  | Sensitivity      |
+------------------+---------------------------+------------------+
| Direct PII       | SSN, Passport, Driver ID  | High             |
| Contact Info     | Email, Phone, Address     | Medium-High      |
| Financial        | Credit Card, Bank Account | High             |
| Health           | Medical Records, Insurance| Very High        |
| Biometric        | Fingerprints, Face ID     | Very High        |
| Demographic      | DOB, Gender, Ethnicity    | Medium           |
| Online Identity  | IP Address, Device ID     | Medium           |
+------------------+---------------------------+------------------+
```

## Data Classification System

### Implementing Data Classification

```javascript
// dataClassification.js
const PIIClassification = {
  HIGHLY_SENSITIVE: {
    level: 5,
    encryption: 'required',
    retention: 'minimal',
    logging: 'audit',
    fields: ['ssn', 'passport_number', 'drivers_license', 'biometric_data']
  },
  SENSITIVE: {
    level: 4,
    encryption: 'required',
    retention: 'limited',
    logging: 'audit',
    fields: ['credit_card', 'bank_account', 'health_record', 'tax_id']
  },
  PERSONAL: {
    level: 3,
    encryption: 'recommended',
    retention: 'standard',
    logging: 'standard',
    fields: ['email', 'phone', 'address', 'date_of_birth', 'full_name']
  },
  IDENTIFIABLE: {
    level: 2,
    encryption: 'optional',
    retention: 'extended',
    logging: 'minimal',
    fields: ['ip_address', 'device_id', 'cookie_id', 'user_agent']
  },
  PUBLIC: {
    level: 1,
    encryption: 'none',
    retention: 'unlimited',
    logging: 'none',
    fields: ['username', 'display_name', 'public_profile']
  }
};

class PIIClassifier {
  constructor() {
    this.fieldMap = new Map();

    // Build reverse lookup map
    for (const [category, config] of Object.entries(PIIClassification)) {
      for (const field of config.fields) {
        this.fieldMap.set(field, { category, ...config });
      }
    }
  }

  classify(fieldName) {
    const normalized = fieldName.toLowerCase().replace(/[-_]/g, '_');
    return this.fieldMap.get(normalized) || PIIClassification.PUBLIC;
  }

  requiresEncryption(fieldName) {
    const classification = this.classify(fieldName);
    return classification.encryption === 'required';
  }

  getRetentionPolicy(fieldName) {
    const classification = this.classify(fieldName);
    return classification.retention;
  }

  requiresAuditLogging(fieldName) {
    const classification = this.classify(fieldName);
    return classification.logging === 'audit';
  }
}

module.exports = { PIIClassification, PIIClassifier };
```

## Tokenization

### Token-Based PII Storage

```javascript
// tokenization.js
const crypto = require('crypto');
const Redis = require('ioredis');

class PIITokenizer {
  constructor(redisUrl, encryptionKey) {
    this.redis = new Redis(redisUrl);
    this.encryptionKey = crypto.scryptSync(encryptionKey, 'pii-salt', 32);
    this.tokenPrefix = 'token:';
    this.vaultPrefix = 'vault:';
  }

  generateToken() {
    return `tok_${crypto.randomBytes(16).toString('hex')}`;
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return {
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      data: encrypted
    };
  }

  decrypt(encrypted) {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async tokenize(piiValue, metadata = {}) {
    // Check if already tokenized
    const existingToken = await this.findExistingToken(piiValue);
    if (existingToken) {
      return existingToken;
    }

    const token = this.generateToken();
    const encrypted = this.encrypt(piiValue);

    const vaultEntry = {
      ...encrypted,
      type: metadata.type || 'generic',
      createdAt: new Date().toISOString(),
      accessCount: 0,
      lastAccessed: null,
      metadata: JSON.stringify(metadata)
    };

    // Store in vault with encryption
    await this.redis.hset(`${this.vaultPrefix}${token}`, vaultEntry);

    // Create hash index for deduplication
    const hash = crypto.createHash('sha256').update(piiValue).digest('hex');
    await this.redis.set(`${this.tokenPrefix}hash:${hash}`, token);

    return token;
  }

  async detokenize(token, options = {}) {
    const { audit = true, requester = 'system' } = options;

    const vaultKey = `${this.vaultPrefix}${token}`;
    const vaultEntry = await this.redis.hgetall(vaultKey);

    if (!vaultEntry || !vaultEntry.data) {
      throw new Error('Token not found or expired');
    }

    // Update access tracking
    if (audit) {
      await this.redis.hset(vaultKey, {
        accessCount: parseInt(vaultEntry.accessCount || 0) + 1,
        lastAccessed: new Date().toISOString()
      });

      // Log access
      await this.logAccess(token, requester);
    }

    return this.decrypt({
      iv: vaultEntry.iv,
      authTag: vaultEntry.authTag,
      data: vaultEntry.data
    });
  }

  async findExistingToken(piiValue) {
    const hash = crypto.createHash('sha256').update(piiValue).digest('hex');
    return this.redis.get(`${this.tokenPrefix}hash:${hash}`);
  }

  async deleteToken(token) {
    const vaultKey = `${this.vaultPrefix}${token}`;
    const vaultEntry = await this.redis.hgetall(vaultKey);

    if (!vaultEntry || !vaultEntry.data) {
      return false;
    }

    // Get original value to remove hash index
    const piiValue = this.decrypt({
      iv: vaultEntry.iv,
      authTag: vaultEntry.authTag,
      data: vaultEntry.data
    });

    const hash = crypto.createHash('sha256').update(piiValue).digest('hex');

    // Remove both token and hash index
    await this.redis.del(vaultKey);
    await this.redis.del(`${this.tokenPrefix}hash:${hash}`);

    await this.logDeletion(token);
    return true;
  }

  async logAccess(token, requester) {
    const logEntry = {
      token,
      action: 'detokenize',
      requester,
      timestamp: new Date().toISOString(),
      ip: process.env.REQUEST_IP || 'unknown'
    };

    await this.redis.lpush('audit:pii:access', JSON.stringify(logEntry));
    await this.redis.ltrim('audit:pii:access', 0, 99999); // Keep last 100k entries
  }

  async logDeletion(token) {
    const logEntry = {
      token,
      action: 'delete',
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('audit:pii:deletion', JSON.stringify(logEntry));
  }
}

module.exports = PIITokenizer;
```

### Using Tokenization

```javascript
// usage example
const PIITokenizer = require('./tokenization');

async function example() {
  const tokenizer = new PIITokenizer(
    'redis://localhost:6379',
    process.env.PII_ENCRYPTION_KEY
  );

  // Tokenize SSN
  const ssnToken = await tokenizer.tokenize('123-45-6789', {
    type: 'ssn',
    userId: 'user123'
  });

  console.log('SSN Token:', ssnToken); // tok_a1b2c3d4e5f6...

  // Store user with token instead of actual SSN
  await redis.hset('user:123', {
    name: 'John Doe',
    email: 'john@example.com',
    ssn_token: ssnToken // Store token, not actual SSN
  });

  // Retrieve actual SSN when needed (with audit)
  const actualSSN = await tokenizer.detokenize(ssnToken, {
    audit: true,
    requester: 'admin@company.com'
  });
}
```

## Data Masking

### Field-Level Masking

```javascript
// dataMasking.js
class PIIMasker {
  constructor() {
    this.maskingRules = {
      ssn: (value) => this.maskSSN(value),
      credit_card: (value) => this.maskCreditCard(value),
      email: (value) => this.maskEmail(value),
      phone: (value) => this.maskPhone(value),
      address: (value) => this.maskAddress(value),
      date_of_birth: (value) => this.maskDOB(value),
      name: (value) => this.maskName(value)
    };
  }

  mask(fieldName, value) {
    const normalizedField = fieldName.toLowerCase().replace(/[-_]/g, '_');
    const maskFunc = this.maskingRules[normalizedField];

    if (maskFunc) {
      return maskFunc(value);
    }
    return value;
  }

  maskSSN(ssn) {
    if (!ssn) return null;
    // Show only last 4 digits: ***-**-1234
    return `***-**-${ssn.slice(-4)}`;
  }

  maskCreditCard(card) {
    if (!card) return null;
    // Show only last 4 digits: ****-****-****-1234
    const cleaned = card.replace(/\D/g, '');
    return `****-****-****-${cleaned.slice(-4)}`;
  }

  maskEmail(email) {
    if (!email) return null;
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';

    const maskedLocal = local.length > 2
      ? `${local[0]}***${local.slice(-1)}`
      : '***';

    return `${maskedLocal}@${domain}`;
  }

  maskPhone(phone) {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    return `***-***-${cleaned.slice(-4)}`;
  }

  maskAddress(address) {
    if (!address) return null;
    // Show only city/state portion
    const parts = address.split(',');
    if (parts.length >= 2) {
      return `***, ${parts.slice(-2).join(',')}`;
    }
    return '*** (address)';
  }

  maskDOB(dob) {
    if (!dob) return null;
    // Show only year
    const date = new Date(dob);
    return `**/**/****`;
  }

  maskName(name) {
    if (!name) return null;
    const parts = name.split(' ');
    return parts.map(part =>
      part.length > 1 ? `${part[0]}***` : '*'
    ).join(' ');
  }

  // Mask object fields based on user access level
  maskObject(obj, accessLevel = 'basic') {
    const accessLevels = {
      full: [], // No masking
      admin: ['ssn', 'credit_card'],
      standard: ['ssn', 'credit_card', 'date_of_birth'],
      basic: ['ssn', 'credit_card', 'date_of_birth', 'phone', 'address'],
      public: ['ssn', 'credit_card', 'date_of_birth', 'phone', 'address', 'email', 'name']
    };

    const fieldsToMask = accessLevels[accessLevel] || accessLevels.public;
    const masked = { ...obj };

    for (const [key, value] of Object.entries(obj)) {
      const normalizedKey = key.toLowerCase().replace(/[-_]/g, '_');
      if (fieldsToMask.includes(normalizedKey)) {
        masked[key] = this.mask(key, value);
      }
    }

    return masked;
  }
}

module.exports = PIIMasker;
```

### Masked Redis Client

```javascript
// maskedRedisClient.js
const Redis = require('ioredis');
const PIIMasker = require('./dataMasking');

class MaskedRedisClient {
  constructor(redisUrl, options = {}) {
    this.redis = new Redis(redisUrl);
    this.masker = new PIIMasker();
    this.defaultAccessLevel = options.defaultAccessLevel || 'basic';
  }

  async getUser(userId, options = {}) {
    const { accessLevel = this.defaultAccessLevel, mask = true } = options;

    const user = await this.redis.hgetall(`user:${userId}`);

    if (!user || Object.keys(user).length === 0) {
      return null;
    }

    if (mask) {
      return this.masker.maskObject(user, accessLevel);
    }

    return user;
  }

  async searchUsers(pattern, options = {}) {
    const { accessLevel = this.defaultAccessLevel, mask = true, limit = 100 } = options;

    const users = [];
    let cursor = '0';

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `user:*${pattern}*`,
        'COUNT',
        100
      );
      cursor = newCursor;

      for (const key of keys) {
        if (users.length >= limit) break;

        const user = await this.redis.hgetall(key);
        if (mask) {
          users.push(this.masker.maskObject(user, accessLevel));
        } else {
          users.push(user);
        }
      }
    } while (cursor !== '0' && users.length < limit);

    return users;
  }

  // Export data with masking for analytics
  async exportMaskedData(keyPattern, options = {}) {
    const { accessLevel = 'public' } = options;
    const maskedRecords = [];

    let cursor = '0';
    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        keyPattern,
        'COUNT',
        1000
      );
      cursor = newCursor;

      for (const key of keys) {
        const data = await this.redis.hgetall(key);
        maskedRecords.push({
          key,
          data: this.masker.maskObject(data, accessLevel)
        });
      }
    } while (cursor !== '0');

    return maskedRecords;
  }
}

module.exports = MaskedRedisClient;
```

## Access Control for PII

### Role-Based PII Access

```javascript
// piiAccessControl.js
const Redis = require('ioredis');

class PIIAccessControl {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
    this.rolePermissions = {
      admin: {
        canAccess: ['*'],
        canExport: true,
        canDelete: true,
        accessLevel: 'full'
      },
      compliance: {
        canAccess: ['*'],
        canExport: true,
        canDelete: true,
        accessLevel: 'full'
      },
      support: {
        canAccess: ['email', 'phone', 'name', 'address'],
        canExport: false,
        canDelete: false,
        accessLevel: 'standard'
      },
      developer: {
        canAccess: [],
        canExport: false,
        canDelete: false,
        accessLevel: 'public' // Only masked data
      },
      analytics: {
        canAccess: [],
        canExport: true,
        canDelete: false,
        accessLevel: 'public' // Aggregated/masked only
      }
    };
  }

  async checkAccess(userId, role, piiField, action = 'read') {
    const permissions = this.rolePermissions[role];

    if (!permissions) {
      await this.logAccessDenied(userId, role, piiField, action);
      return { allowed: false, reason: 'Invalid role' };
    }

    const canAccessField = permissions.canAccess.includes('*') ||
                          permissions.canAccess.includes(piiField);

    if (action === 'read' && !canAccessField) {
      await this.logAccessDenied(userId, role, piiField, action);
      return {
        allowed: false,
        reason: 'Field access not permitted',
        accessLevel: permissions.accessLevel
      };
    }

    if (action === 'export' && !permissions.canExport) {
      await this.logAccessDenied(userId, role, piiField, action);
      return { allowed: false, reason: 'Export not permitted' };
    }

    if (action === 'delete' && !permissions.canDelete) {
      await this.logAccessDenied(userId, role, piiField, action);
      return { allowed: false, reason: 'Delete not permitted' };
    }

    await this.logAccessGranted(userId, role, piiField, action);
    return {
      allowed: true,
      accessLevel: permissions.accessLevel
    };
  }

  async logAccessDenied(userId, role, piiField, action) {
    const entry = {
      userId,
      role,
      piiField,
      action,
      result: 'denied',
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('audit:pii:access_denied', JSON.stringify(entry));
    await this.redis.ltrim('audit:pii:access_denied', 0, 99999);

    // Alert on suspicious patterns
    const recentDenials = await this.countRecentDenials(userId, 3600);
    if (recentDenials > 10) {
      await this.alertSuspiciousActivity(userId, recentDenials);
    }
  }

  async logAccessGranted(userId, role, piiField, action) {
    const entry = {
      userId,
      role,
      piiField,
      action,
      result: 'granted',
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('audit:pii:access_granted', JSON.stringify(entry));
    await this.redis.ltrim('audit:pii:access_granted', 0, 99999);
  }

  async countRecentDenials(userId, seconds) {
    const cutoff = Date.now() - (seconds * 1000);
    const entries = await this.redis.lrange('audit:pii:access_denied', 0, 1000);

    return entries.filter(entry => {
      const parsed = JSON.parse(entry);
      return parsed.userId === userId &&
             new Date(parsed.timestamp).getTime() > cutoff;
    }).length;
  }

  async alertSuspiciousActivity(userId, denialCount) {
    const alert = {
      type: 'suspicious_pii_access',
      userId,
      denialCount,
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('alerts:security', JSON.stringify(alert));
    console.warn('SECURITY ALERT:', alert);
  }

  getAccessLevel(role) {
    const permissions = this.rolePermissions[role];
    return permissions ? permissions.accessLevel : 'public';
  }
}

module.exports = PIIAccessControl;
```

## Audit Logging

### Comprehensive PII Audit Trail

```javascript
// piiAuditLog.js
const Redis = require('ioredis');

class PIIAuditLogger {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
    this.streamKey = 'audit:pii:stream';
  }

  async log(event) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...event
    };

    // Add to Redis Stream for real-time processing
    await this.redis.xadd(
      this.streamKey,
      '*',
      'data',
      JSON.stringify(entry)
    );

    // Also store in daily sorted set for reporting
    const dayKey = `audit:pii:daily:${new Date().toISOString().split('T')[0]}`;
    await this.redis.zadd(dayKey, Date.now(), JSON.stringify(entry));
    await this.redis.expire(dayKey, 90 * 24 * 3600); // 90 days retention

    return entry.id;
  }

  async logAccess(userId, dataSubjectId, fields, purpose) {
    return this.log({
      type: 'access',
      userId,
      dataSubjectId,
      fields,
      purpose,
      action: 'read'
    });
  }

  async logModification(userId, dataSubjectId, fields, changeType) {
    return this.log({
      type: 'modification',
      userId,
      dataSubjectId,
      fields,
      changeType // create, update, delete
    });
  }

  async logExport(userId, dataSubjectIds, format, purpose) {
    return this.log({
      type: 'export',
      userId,
      dataSubjectCount: dataSubjectIds.length,
      dataSubjectIds: dataSubjectIds.slice(0, 10), // Sample
      format,
      purpose
    });
  }

  async logConsent(dataSubjectId, consentType, granted, source) {
    return this.log({
      type: 'consent',
      dataSubjectId,
      consentType,
      granted,
      source
    });
  }

  async getAuditTrail(options = {}) {
    const {
      startDate,
      endDate,
      userId,
      dataSubjectId,
      type,
      limit = 100
    } = options;

    const startTime = startDate ? new Date(startDate).getTime() : 0;
    const endTime = endDate ? new Date(endDate).getTime() : Date.now();

    // Get from daily sorted sets
    const days = this.getDayRange(startDate, endDate);
    const results = [];

    for (const day of days) {
      const dayKey = `audit:pii:daily:${day}`;
      const entries = await this.redis.zrangebyscore(
        dayKey,
        startTime,
        endTime,
        'LIMIT',
        0,
        limit - results.length
      );

      for (const entry of entries) {
        const parsed = JSON.parse(entry);

        // Apply filters
        if (userId && parsed.userId !== userId) continue;
        if (dataSubjectId && parsed.dataSubjectId !== dataSubjectId) continue;
        if (type && parsed.type !== type) continue;

        results.push(parsed);

        if (results.length >= limit) break;
      }

      if (results.length >= limit) break;
    }

    return results;
  }

  getDayRange(startDate, endDate) {
    const days = [];
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }

    return days;
  }

  async generateComplianceReport(startDate, endDate) {
    const trail = await this.getAuditTrail({
      startDate,
      endDate,
      limit: 100000
    });

    const report = {
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvents: trail.length,
        accessEvents: 0,
        modificationEvents: 0,
        exportEvents: 0,
        consentEvents: 0,
        uniqueDataSubjects: new Set(),
        uniqueUsers: new Set()
      },
      breakdown: {
        byType: {},
        byUser: {},
        byDay: {}
      }
    };

    for (const event of trail) {
      // Summary counts
      if (event.type === 'access') report.summary.accessEvents++;
      if (event.type === 'modification') report.summary.modificationEvents++;
      if (event.type === 'export') report.summary.exportEvents++;
      if (event.type === 'consent') report.summary.consentEvents++;

      if (event.dataSubjectId) {
        report.summary.uniqueDataSubjects.add(event.dataSubjectId);
      }
      if (event.userId) {
        report.summary.uniqueUsers.add(event.userId);
      }

      // Breakdown by type
      report.breakdown.byType[event.type] = (report.breakdown.byType[event.type] || 0) + 1;

      // Breakdown by user
      if (event.userId) {
        report.breakdown.byUser[event.userId] = (report.breakdown.byUser[event.userId] || 0) + 1;
      }

      // Breakdown by day
      const day = event.timestamp.split('T')[0];
      report.breakdown.byDay[day] = (report.breakdown.byDay[day] || 0) + 1;
    }

    // Convert Sets to counts
    report.summary.uniqueDataSubjects = report.summary.uniqueDataSubjects.size;
    report.summary.uniqueUsers = report.summary.uniqueUsers.size;

    return report;
  }
}

module.exports = PIIAuditLogger;
```

## Data Minimization

### Implementing Data Minimization

```javascript
// dataMinimization.js
const Redis = require('ioredis');

class PIIMinimizer {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);

    // Define minimum required fields per use case
    this.requiredFields = {
      authentication: ['user_id', 'email', 'password_hash'],
      billing: ['user_id', 'billing_address', 'payment_token'],
      shipping: ['user_id', 'shipping_address', 'phone'],
      support: ['user_id', 'email', 'name'],
      analytics: ['user_id'] // No PII needed for analytics
    };
  }

  // Store only required fields for a use case
  async storeMinimal(key, data, useCase) {
    const required = this.requiredFields[useCase];
    if (!required) {
      throw new Error(`Unknown use case: ${useCase}`);
    }

    const minimalData = {};
    for (const field of required) {
      if (data[field] !== undefined) {
        minimalData[field] = data[field];
      }
    }

    // Add metadata
    minimalData._use_case = useCase;
    minimalData._minimized_at = new Date().toISOString();

    await this.redis.hset(key, minimalData);
    return minimalData;
  }

  // Clean up unnecessary PII from existing records
  async minimizeExisting(keyPattern, useCase) {
    const required = this.requiredFields[useCase];
    let cursor = '0';
    let processed = 0;

    do {
      const [newCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        keyPattern,
        'COUNT',
        100
      );
      cursor = newCursor;

      for (const key of keys) {
        const data = await this.redis.hgetall(key);
        const fieldsToRemove = [];

        for (const field of Object.keys(data)) {
          if (!required.includes(field) && !field.startsWith('_')) {
            fieldsToRemove.push(field);
          }
        }

        if (fieldsToRemove.length > 0) {
          await this.redis.hdel(key, ...fieldsToRemove);
          processed++;
        }
      }
    } while (cursor !== '0');

    return { processed };
  }

  // Anonymize data for analytics
  async anonymizeForAnalytics(key) {
    const data = await this.redis.hgetall(key);

    const anonymized = {
      _anonymized: true,
      _original_key: key,
      _anonymized_at: new Date().toISOString()
    };

    // Keep only non-PII fields and aggregatable data
    const safeFields = ['created_at', 'plan_type', 'country', 'signup_source'];

    for (const field of safeFields) {
      if (data[field]) {
        anonymized[field] = data[field];
      }
    }

    // Create anonymous version
    const anonKey = `analytics:anon:${Date.now()}`;
    await this.redis.hset(anonKey, anonymized);

    return anonKey;
  }
}

module.exports = PIIMinimizer;
```

## Retention and Deletion

### Automated PII Retention

```javascript
// piiRetention.js
const Redis = require('ioredis');

class PIIRetentionManager {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);

    // Retention periods in days
    this.retentionPolicies = {
      session_data: 1,
      login_history: 90,
      user_profile: 365,
      payment_data: 730, // 2 years
      audit_logs: 2555,  // 7 years
      consent_records: 2555
    };
  }

  // Mark data with retention metadata
  async storeWithRetention(key, data, dataType) {
    const retentionDays = this.retentionPolicies[dataType];
    if (!retentionDays) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + retentionDays);

    const storedData = {
      ...data,
      _data_type: dataType,
      _created_at: new Date().toISOString(),
      _expires_at: expiryDate.toISOString()
    };

    await this.redis.hset(key, storedData);

    // Also track in retention index
    await this.redis.zadd(
      `retention:${dataType}`,
      expiryDate.getTime(),
      key
    );

    // Set TTL if short-lived
    if (retentionDays <= 30) {
      await this.redis.expire(key, retentionDays * 24 * 3600);
    }

    return storedData;
  }

  // Run retention cleanup
  async enforceRetention() {
    const results = {
      deleted: 0,
      errors: 0,
      dataTypes: {}
    };

    const now = Date.now();

    for (const dataType of Object.keys(this.retentionPolicies)) {
      const indexKey = `retention:${dataType}`;

      // Get expired keys
      const expiredKeys = await this.redis.zrangebyscore(
        indexKey,
        0,
        now
      );

      for (const key of expiredKeys) {
        try {
          await this.deleteWithAudit(key, 'retention_policy');
          await this.redis.zrem(indexKey, key);
          results.deleted++;
          results.dataTypes[dataType] = (results.dataTypes[dataType] || 0) + 1;
        } catch (error) {
          console.error(`Error deleting ${key}:`, error);
          results.errors++;
        }
      }
    }

    return results;
  }

  async deleteWithAudit(key, reason) {
    // Log deletion before removing
    const data = await this.redis.hgetall(key);

    await this.redis.lpush('audit:pii:deletions', JSON.stringify({
      key,
      reason,
      dataType: data._data_type,
      timestamp: new Date().toISOString()
    }));

    await this.redis.del(key);
  }

  // Handle deletion request (GDPR right to erasure)
  async processErasureRequest(userId, options = {}) {
    const {
      preserveAuditLogs = true,
      preserveConsentRecords = true
    } = options;

    const results = {
      keysDeleted: [],
      keysPreserved: [],
      errors: []
    };

    // Find all keys related to user
    const patterns = [
      `user:${userId}`,
      `user:${userId}:*`,
      `session:${userId}:*`,
      `payment:${userId}:*`
    ];

    for (const pattern of patterns) {
      let cursor = '0';

      do {
        const [newCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = newCursor;

        for (const key of keys) {
          try {
            const data = await this.redis.hgetall(key);
            const dataType = data._data_type;

            // Check if should preserve
            if (preserveAuditLogs && dataType === 'audit_logs') {
              results.keysPreserved.push(key);
              continue;
            }
            if (preserveConsentRecords && dataType === 'consent_records') {
              results.keysPreserved.push(key);
              continue;
            }

            await this.deleteWithAudit(key, 'erasure_request');
            results.keysDeleted.push(key);
          } catch (error) {
            results.errors.push({ key, error: error.message });
          }
        }
      } while (cursor !== '0');
    }

    return results;
  }
}

module.exports = PIIRetentionManager;
```

## Best Practices Checklist

```markdown
## PII Security Checklist

### Data Classification
- [ ] Identify all PII fields in your application
- [ ] Classify PII by sensitivity level
- [ ] Document data flows for PII
- [ ] Implement field-level classification

### Access Control
- [ ] Implement role-based access for PII
- [ ] Use principle of least privilege
- [ ] Audit all PII access attempts
- [ ] Alert on suspicious access patterns

### Encryption & Tokenization
- [ ] Encrypt highly sensitive PII at rest
- [ ] Use tokenization for payment data
- [ ] Implement proper key management
- [ ] Rotate encryption keys regularly

### Data Masking
- [ ] Mask PII in non-production environments
- [ ] Implement view-level masking based on roles
- [ ] Mask PII in logs and error messages
- [ ] Use synthetic data for testing

### Retention & Deletion
- [ ] Define retention policies per data type
- [ ] Implement automated retention enforcement
- [ ] Support data subject deletion requests
- [ ] Maintain deletion audit trails

### Audit & Compliance
- [ ] Log all PII operations
- [ ] Generate compliance reports
- [ ] Conduct regular security audits
- [ ] Train team on PII handling
```

## Conclusion

Securely handling PII in Redis requires:

- Proper data classification and labeling
- Tokenization for highly sensitive data
- Field-level masking based on access levels
- Role-based access controls
- Comprehensive audit logging
- Automated retention enforcement

By implementing these patterns, you can protect PII while maintaining application functionality and meeting compliance requirements.
