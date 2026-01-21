# How to Set Up Redis for HIPAA Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HIPAA, Healthcare, Compliance, PHI, Security, Encryption, Audit

Description: A comprehensive guide to configuring Redis for HIPAA compliance, covering PHI protection, access controls, encryption, audit logging, and best practices for healthcare data handling.

---

HIPAA (Health Insurance Portability and Accountability Act) sets strict requirements for protecting Protected Health Information (PHI). This guide covers how to configure and use Redis in a HIPAA-compliant manner for healthcare applications.

## Understanding HIPAA Requirements

### Key HIPAA Rules

```
+------------------------+------------------------------------------+
| Rule                   | Key Requirements for Redis               |
+------------------------+------------------------------------------+
| Privacy Rule           | Limit PHI access, minimum necessary      |
| Security Rule          | Administrative, physical, technical      |
|                        | safeguards for ePHI                      |
| Breach Notification    | Detect and report breaches               |
| Enforcement Rule       | Penalties for non-compliance             |
+------------------------+------------------------------------------+
```

### Protected Health Information (PHI)

```
PHI Identifiers:
- Names
- Geographic data (smaller than state)
- Dates (except year) related to individual
- Phone numbers
- Fax numbers
- Email addresses
- Social Security numbers
- Medical record numbers
- Health plan beneficiary numbers
- Account numbers
- Certificate/license numbers
- Vehicle identifiers
- Device identifiers
- Web URLs
- IP addresses
- Biometric identifiers
- Full face photographs
- Any unique identifier
```

## Redis Architecture for HIPAA

### Network Isolation

```
                    +------------------+
                    |    Internet      |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   WAF/Firewall   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   Load Balancer  |
                    +--------+---------+
                             |
        +--------------------+--------------------+
        |                    |                    |
+-------v--------+  +--------v-------+  +--------v-------+
| Application    |  | Application    |  | Application    |
| Server (DMZ)   |  | Server (DMZ)   |  | Server (DMZ)   |
+-------+--------+  +--------+-------+  +--------+-------+
        |                    |                    |
        +--------------------+--------------------+
                             |
                    +--------v---------+
                    |  Private Subnet  |
                    |  (No Internet)   |
                    +--------+---------+
                             |
        +--------------------+--------------------+
        |                    |                    |
+-------v--------+  +--------v-------+  +--------v-------+
| Redis Primary  |  | Redis Replica  |  | Redis Replica  |
| (Encrypted)    |  | (Encrypted)    |  | (Encrypted)    |
+----------------+  +----------------+  +----------------+
```

### Redis Configuration for HIPAA

```conf
# redis-hipaa.conf

# Bind to private network only
bind 10.0.0.100

# Require strong authentication
requirepass ${REDIS_PASSWORD}

# TLS Configuration
tls-port 6379
port 0
tls-cert-file /etc/redis/certs/redis.crt
tls-key-file /etc/redis/certs/redis.key
tls-ca-cert-file /etc/redis/certs/ca.crt
tls-auth-clients yes
tls-protocols "TLSv1.2 TLSv1.3"
tls-ciphersuites TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN ""
rename-command KEYS ""

# Persistence (encrypted disk required)
dir /var/lib/redis
dbfilename dump.rdb
appendonly yes
appendfilename "appendonly.aof"

# Memory limits
maxmemory 8gb
maxmemory-policy noeviction

# Logging
loglevel notice
logfile /var/log/redis/redis.log

# Disable saving cleartext passwords
protected-mode yes

# ACL settings
aclfile /etc/redis/users.acl
```

## Access Control Implementation

### Role-Based Access Control

```
# /etc/redis/users.acl

# Admin user - full access with audit
user admin on >StrongPassword123! ~* &* +@all

# Application user - limited to specific key patterns
user healthcare_app on >AppPassword456! ~patient:* ~session:* ~cache:* &* +@read +@write +@set +@list +@hash -@admin -@dangerous

# Read-only analytics user
user analytics on >AnalyticsPass789! ~analytics:* ~reports:* &* +@read -@write -@admin -@dangerous

# Audit service user
user audit_service on >AuditPass321! ~audit:* &* +@write +@read -@admin -@dangerous

# Default - deny everything
user default off
```

### Application-Level Access Control

```javascript
// hipaaAccessControl.js
const Redis = require('ioredis');
const crypto = require('crypto');

class HIPAAAccessControl {
  constructor(config) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      tls: {
        ca: fs.readFileSync(config.tlsCaPath),
        cert: fs.readFileSync(config.tlsCertPath),
        key: fs.readFileSync(config.tlsKeyPath),
        rejectUnauthorized: true
      }
    });

    this.userRoles = new Map();
    this.auditLogger = new HIPAAAuditLogger(this.redis);
  }

  // Define access levels for PHI data types
  accessMatrix = {
    physician: {
      canRead: ['diagnosis', 'treatment', 'medications', 'vitals', 'lab_results', 'demographics'],
      canWrite: ['diagnosis', 'treatment', 'medications', 'notes'],
      canDelete: []
    },
    nurse: {
      canRead: ['vitals', 'medications', 'demographics', 'allergies'],
      canWrite: ['vitals', 'notes'],
      canDelete: []
    },
    admin: {
      canRead: ['demographics', 'insurance', 'billing'],
      canWrite: ['demographics', 'insurance'],
      canDelete: []
    },
    billing: {
      canRead: ['demographics', 'billing', 'insurance'],
      canWrite: ['billing'],
      canDelete: []
    },
    patient: {
      canRead: ['demographics', 'vitals', 'medications', 'appointments'],
      canWrite: [],
      canDelete: []
    }
  };

  async checkAccess(userId, role, patientId, dataType, action) {
    // Verify user has specified role
    const userRole = await this.getUserRole(userId);
    if (userRole !== role) {
      await this.auditLogger.logAccessDenied(userId, patientId, dataType, action, 'role_mismatch');
      return { allowed: false, reason: 'Role mismatch' };
    }

    // Check access matrix
    const permissions = this.accessMatrix[role];
    if (!permissions) {
      await this.auditLogger.logAccessDenied(userId, patientId, dataType, action, 'unknown_role');
      return { allowed: false, reason: 'Unknown role' };
    }

    let allowed = false;
    switch (action) {
      case 'read':
        allowed = permissions.canRead.includes(dataType);
        break;
      case 'write':
        allowed = permissions.canWrite.includes(dataType);
        break;
      case 'delete':
        allowed = permissions.canDelete.includes(dataType);
        break;
    }

    if (allowed) {
      await this.auditLogger.logAccessGranted(userId, patientId, dataType, action);
    } else {
      await this.auditLogger.logAccessDenied(userId, patientId, dataType, action, 'permission_denied');
    }

    return { allowed, reason: allowed ? null : 'Permission denied' };
  }

  async getUserRole(userId) {
    return this.redis.hget(`user:${userId}`, 'role');
  }

  // Minimum necessary access - filter data based on role
  filterPHIByRole(data, role) {
    const permissions = this.accessMatrix[role];
    if (!permissions) return {};

    const filtered = {};
    for (const [key, value] of Object.entries(data)) {
      if (permissions.canRead.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  }
}

module.exports = HIPAAAccessControl;
```

## PHI Encryption

### Encryption Service for PHI

```javascript
// phiEncryption.js
const crypto = require('crypto');

class PHIEncryption {
  constructor(masterKey) {
    // Derive encryption keys from master key
    this.dataKey = crypto.scryptSync(masterKey, 'phi-data-salt', 32);
    this.searchKey = crypto.scryptSync(masterKey, 'phi-search-salt', 32);
    this.algorithm = 'aes-256-gcm';
  }

  // Encrypt PHI data
  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.dataKey, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return {
      version: 1,
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      data: encrypted
    };
  }

  // Decrypt PHI data
  decrypt(encryptedData) {
    if (encryptedData.version !== 1) {
      throw new Error('Unsupported encryption version');
    }

    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const decipher = crypto.createDecipheriv(this.algorithm, this.dataKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  // Create searchable hash (for exact match searches)
  createSearchHash(value) {
    return crypto
      .createHmac('sha256', this.searchKey)
      .update(value.toLowerCase().trim())
      .digest('hex');
  }

  // Encrypt specific PHI fields
  encryptPHIFields(record, phiFields) {
    const encrypted = { ...record };

    for (const field of phiFields) {
      if (record[field]) {
        encrypted[field] = this.encrypt(record[field]);
        encrypted[`${field}_search`] = this.createSearchHash(String(record[field]));
      }
    }

    encrypted._encrypted_at = new Date().toISOString();
    encrypted._phi_fields = phiFields;

    return encrypted;
  }

  // Decrypt specific PHI fields
  decryptPHIFields(record) {
    const decrypted = { ...record };
    const phiFields = record._phi_fields || [];

    for (const field of phiFields) {
      if (record[field] && record[field].version) {
        decrypted[field] = this.decrypt(record[field]);
      }
      delete decrypted[`${field}_search`];
    }

    delete decrypted._encrypted_at;
    delete decrypted._phi_fields;

    return decrypted;
  }
}

module.exports = PHIEncryption;
```

### HIPAA-Compliant Patient Data Storage

```javascript
// patientDataStore.js
const Redis = require('ioredis');
const PHIEncryption = require('./phiEncryption');
const HIPAAAccessControl = require('./hipaaAccessControl');
const HIPAAAuditLogger = require('./hipaaAuditLogger');

class PatientDataStore {
  constructor(config) {
    this.redis = new Redis(config.redis);
    this.encryption = new PHIEncryption(config.masterKey);
    this.accessControl = new HIPAAAccessControl(config);
    this.auditLogger = new HIPAAAuditLogger(this.redis);

    // PHI fields that require encryption
    this.phiFields = [
      'name', 'ssn', 'dob', 'address', 'phone', 'email',
      'medical_record_number', 'diagnosis', 'medications',
      'allergies', 'insurance_id'
    ];
  }

  async storePatientRecord(userId, role, patientId, data) {
    // Check write access
    const access = await this.accessControl.checkAccess(
      userId, role, patientId, 'demographics', 'write'
    );

    if (!access.allowed) {
      throw new Error(`Access denied: ${access.reason}`);
    }

    // Encrypt PHI fields
    const encrypted = this.encryption.encryptPHIFields(data, this.phiFields);

    // Store with metadata
    encrypted._created_by = userId;
    encrypted._created_at = new Date().toISOString();
    encrypted._version = await this.incrementVersion(patientId);

    await this.redis.hset(`patient:${patientId}`, encrypted);

    // Log the write
    await this.auditLogger.logDataWrite(userId, patientId, Object.keys(data));

    return { success: true, version: encrypted._version };
  }

  async getPatientRecord(userId, role, patientId, fields = null) {
    // Determine which data types to check access for
    const dataTypes = this.getDataTypesForFields(fields);

    for (const dataType of dataTypes) {
      const access = await this.accessControl.checkAccess(
        userId, role, patientId, dataType, 'read'
      );

      if (!access.allowed) {
        throw new Error(`Access denied for ${dataType}: ${access.reason}`);
      }
    }

    // Get encrypted data
    let encrypted;
    if (fields) {
      encrypted = await this.redis.hmget(`patient:${patientId}`, ...fields, '_phi_fields');
    } else {
      encrypted = await this.redis.hgetall(`patient:${patientId}`);
    }

    if (!encrypted || Object.keys(encrypted).length === 0) {
      return null;
    }

    // Parse JSON fields
    for (const [key, value] of Object.entries(encrypted)) {
      if (typeof value === 'string' && value.startsWith('{')) {
        try {
          encrypted[key] = JSON.parse(value);
        } catch {}
      }
    }

    // Decrypt PHI
    const decrypted = this.encryption.decryptPHIFields(encrypted);

    // Apply minimum necessary - filter by role
    const filtered = this.accessControl.filterPHIByRole(decrypted, role);

    // Log the read
    await this.auditLogger.logDataRead(userId, patientId, Object.keys(filtered));

    return filtered;
  }

  async searchPatientBySSN(userId, role, ssn) {
    const access = await this.accessControl.checkAccess(
      userId, role, null, 'demographics', 'read'
    );

    if (!access.allowed) {
      throw new Error(`Access denied: ${access.reason}`);
    }

    // Create search hash
    const searchHash = this.encryption.createSearchHash(ssn);

    // Search through patient index
    const patientId = await this.redis.get(`patient:index:ssn:${searchHash}`);

    if (!patientId) {
      await this.auditLogger.logSearch(userId, 'ssn', false);
      return null;
    }

    await this.auditLogger.logSearch(userId, 'ssn', true, patientId);

    return this.getPatientRecord(userId, role, patientId);
  }

  async incrementVersion(patientId) {
    return this.redis.incr(`patient:${patientId}:version`);
  }

  getDataTypesForFields(fields) {
    const fieldToType = {
      name: 'demographics',
      dob: 'demographics',
      address: 'demographics',
      phone: 'demographics',
      ssn: 'demographics',
      diagnosis: 'diagnosis',
      medications: 'medications',
      allergies: 'allergies',
      vitals: 'vitals',
      insurance_id: 'insurance'
    };

    if (!fields) {
      return ['demographics', 'diagnosis', 'medications', 'allergies', 'vitals'];
    }

    const types = new Set();
    for (const field of fields) {
      if (fieldToType[field]) {
        types.add(fieldToType[field]);
      }
    }

    return Array.from(types);
  }
}

module.exports = PatientDataStore;
```

## Comprehensive Audit Logging

### HIPAA Audit Logger

```javascript
// hipaaAuditLogger.js
const Redis = require('ioredis');

class HIPAAAuditLogger {
  constructor(redis) {
    this.redis = redis;
    this.streamKey = 'audit:hipaa:stream';
    this.alertThresholds = {
      accessDeniedPerHour: 10,
      unusualAccessPatterns: true
    };
  }

  async log(event) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...event
    };

    // Add to stream
    await this.redis.xadd(
      this.streamKey,
      '*',
      'data',
      JSON.stringify(entry)
    );

    // Add to daily sorted set
    const dayKey = `audit:hipaa:${new Date().toISOString().split('T')[0]}`;
    await this.redis.zadd(dayKey, Date.now(), JSON.stringify(entry));
    await this.redis.expire(dayKey, 7 * 365 * 24 * 3600); // 7 year retention

    // Check for alert conditions
    await this.checkAlertConditions(entry);

    return entry.id;
  }

  async logAccessGranted(userId, patientId, dataType, action) {
    return this.log({
      eventType: 'PHI_ACCESS',
      result: 'GRANTED',
      userId,
      patientId,
      dataType,
      action,
      workstation: process.env.WORKSTATION_ID,
      application: process.env.APP_NAME
    });
  }

  async logAccessDenied(userId, patientId, dataType, action, reason) {
    return this.log({
      eventType: 'PHI_ACCESS',
      result: 'DENIED',
      userId,
      patientId,
      dataType,
      action,
      reason,
      severity: 'WARNING',
      workstation: process.env.WORKSTATION_ID,
      application: process.env.APP_NAME
    });
  }

  async logDataRead(userId, patientId, fields) {
    return this.log({
      eventType: 'PHI_READ',
      userId,
      patientId,
      fieldsAccessed: fields,
      workstation: process.env.WORKSTATION_ID
    });
  }

  async logDataWrite(userId, patientId, fields) {
    return this.log({
      eventType: 'PHI_WRITE',
      userId,
      patientId,
      fieldsModified: fields,
      workstation: process.env.WORKSTATION_ID
    });
  }

  async logSearch(userId, searchType, found, patientId = null) {
    return this.log({
      eventType: 'PHI_SEARCH',
      userId,
      searchType,
      resultFound: found,
      patientId,
      workstation: process.env.WORKSTATION_ID
    });
  }

  async logLogin(userId, success, ipAddress, userAgent) {
    return this.log({
      eventType: 'LOGIN',
      result: success ? 'SUCCESS' : 'FAILURE',
      userId,
      ipAddress,
      userAgent,
      severity: success ? 'INFO' : 'WARNING'
    });
  }

  async logLogout(userId) {
    return this.log({
      eventType: 'LOGOUT',
      userId,
      workstation: process.env.WORKSTATION_ID
    });
  }

  async logExport(userId, patientIds, format, purpose) {
    return this.log({
      eventType: 'PHI_EXPORT',
      userId,
      patientCount: patientIds.length,
      patientIds: patientIds.slice(0, 10), // Sample for audit
      format,
      purpose,
      severity: 'HIGH',
      workstation: process.env.WORKSTATION_ID
    });
  }

  async logEmergencyAccess(userId, patientId, reason) {
    return this.log({
      eventType: 'EMERGENCY_ACCESS',
      userId,
      patientId,
      reason,
      severity: 'CRITICAL',
      workstation: process.env.WORKSTATION_ID
    });
  }

  async checkAlertConditions(entry) {
    // Check for excessive access denials
    if (entry.result === 'DENIED') {
      const hourKey = `alert:denials:${entry.userId}:${Math.floor(Date.now() / 3600000)}`;
      const count = await this.redis.incr(hourKey);
      await this.redis.expire(hourKey, 3600);

      if (count >= this.alertThresholds.accessDeniedPerHour) {
        await this.createAlert('EXCESSIVE_ACCESS_DENIALS', entry.userId, count);
      }
    }

    // Check for after-hours access
    const hour = new Date().getHours();
    if ((hour < 6 || hour > 22) && entry.eventType === 'PHI_ACCESS') {
      await this.createAlert('AFTER_HOURS_ACCESS', entry.userId, entry);
    }
  }

  async createAlert(type, userId, details) {
    const alert = {
      type,
      userId,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      status: 'new'
    };

    await this.redis.lpush('alerts:hipaa', JSON.stringify(alert));
    console.warn('HIPAA ALERT:', alert);
  }

  async generateAuditReport(startDate, endDate, filters = {}) {
    const report = {
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      summary: {
        totalEvents: 0,
        accessGranted: 0,
        accessDenied: 0,
        logins: 0,
        exports: 0,
        emergencyAccess: 0
      },
      userActivity: {},
      patientAccess: {},
      alerts: []
    };

    const days = this.getDayRange(startDate, endDate);

    for (const day of days) {
      const dayKey = `audit:hipaa:${day}`;
      const entries = await this.redis.zrange(dayKey, 0, -1);

      for (const entryStr of entries) {
        const entry = JSON.parse(entryStr);
        report.summary.totalEvents++;

        // Apply filters
        if (filters.userId && entry.userId !== filters.userId) continue;
        if (filters.patientId && entry.patientId !== filters.patientId) continue;
        if (filters.eventType && entry.eventType !== filters.eventType) continue;

        // Update summary
        if (entry.eventType === 'PHI_ACCESS') {
          if (entry.result === 'GRANTED') report.summary.accessGranted++;
          else report.summary.accessDenied++;
        }
        if (entry.eventType === 'LOGIN') report.summary.logins++;
        if (entry.eventType === 'PHI_EXPORT') report.summary.exports++;
        if (entry.eventType === 'EMERGENCY_ACCESS') report.summary.emergencyAccess++;

        // Track by user
        if (entry.userId) {
          report.userActivity[entry.userId] = report.userActivity[entry.userId] || {
            total: 0,
            accessGranted: 0,
            accessDenied: 0
          };
          report.userActivity[entry.userId].total++;
          if (entry.result === 'GRANTED') report.userActivity[entry.userId].accessGranted++;
          if (entry.result === 'DENIED') report.userActivity[entry.userId].accessDenied++;
        }

        // Track by patient
        if (entry.patientId) {
          report.patientAccess[entry.patientId] = report.patientAccess[entry.patientId] || {
            total: 0,
            users: new Set()
          };
          report.patientAccess[entry.patientId].total++;
          if (entry.userId) {
            report.patientAccess[entry.patientId].users.add(entry.userId);
          }
        }
      }
    }

    // Convert Sets to counts
    for (const patientId of Object.keys(report.patientAccess)) {
      report.patientAccess[patientId].uniqueUsers = report.patientAccess[patientId].users.size;
      delete report.patientAccess[patientId].users;
    }

    return report;
  }

  getDayRange(startDate, endDate) {
    const days = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }

    return days;
  }
}

module.exports = HIPAAAuditLogger;
```

## Emergency Access (Break-Glass)

### Emergency Access Procedure

```javascript
// emergencyAccess.js
const Redis = require('ioredis');
const HIPAAAuditLogger = require('./hipaaAuditLogger');

class EmergencyAccessService {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
    this.auditLogger = new HIPAAAuditLogger(this.redis);
  }

  async requestEmergencyAccess(userId, patientId, reason) {
    // Generate emergency access token
    const token = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const emergencyAccess = {
      token,
      userId,
      patientId,
      reason,
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(), // 4 hours
      status: 'active',
      accessCount: 0
    };

    // Store emergency access
    await this.redis.hset(`emergency:${token}`, emergencyAccess);
    await this.redis.expire(`emergency:${token}`, 4 * 3600);

    // Log emergency access
    await this.auditLogger.logEmergencyAccess(userId, patientId, reason);

    // Create alert for security team
    await this.createEmergencyAlert(emergencyAccess);

    // Notify supervisor
    await this.notifySupervisor(emergencyAccess);

    return {
      token,
      expiresAt: emergencyAccess.expiresAt,
      message: 'Emergency access granted. This access is being logged and monitored.'
    };
  }

  async validateEmergencyAccess(token, userId, patientId) {
    const access = await this.redis.hgetall(`emergency:${token}`);

    if (!access || !access.token) {
      return { valid: false, reason: 'Token not found or expired' };
    }

    if (access.userId !== userId) {
      return { valid: false, reason: 'Token belongs to different user' };
    }

    if (access.patientId !== patientId) {
      return { valid: false, reason: 'Token for different patient' };
    }

    if (new Date(access.expiresAt) < new Date()) {
      return { valid: false, reason: 'Token expired' };
    }

    if (access.status !== 'active') {
      return { valid: false, reason: 'Token revoked' };
    }

    // Increment access count
    await this.redis.hincrby(`emergency:${token}`, 'accessCount', 1);

    return { valid: true, emergency: access };
  }

  async revokeEmergencyAccess(token, revokedBy) {
    await this.redis.hset(`emergency:${token}`, {
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      revokedBy
    });

    await this.auditLogger.log({
      eventType: 'EMERGENCY_ACCESS_REVOKED',
      token,
      revokedBy,
      timestamp: new Date().toISOString()
    });
  }

  async createEmergencyAlert(access) {
    const alert = {
      type: 'EMERGENCY_ACCESS_ACTIVATED',
      severity: 'CRITICAL',
      userId: access.userId,
      patientId: access.patientId,
      reason: access.reason,
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('alerts:hipaa:critical', JSON.stringify(alert));
  }

  async notifySupervisor(access) {
    // Get user's supervisor
    const supervisor = await this.redis.hget(`user:${access.userId}`, 'supervisor');

    if (supervisor) {
      const notification = {
        to: supervisor,
        type: 'emergency_access',
        message: `User ${access.userId} has requested emergency access to patient ${access.patientId}. Reason: ${access.reason}`,
        timestamp: new Date().toISOString()
      };

      await this.redis.lpush('notifications:queue', JSON.stringify(notification));
    }
  }
}

module.exports = EmergencyAccessService;
```

## Backup and Disaster Recovery

### HIPAA-Compliant Backup

```bash
#!/bin/bash
# hipaa-backup.sh

# Configuration
BACKUP_DIR="/encrypted-backup/redis"
REDIS_DATA_DIR="/var/lib/redis"
ENCRYPTION_KEY_FILE="/etc/secrets/backup-key"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="redis_backup_$DATE"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Trigger Redis save
redis-cli -a "$REDIS_PASSWORD" --tls \
  --cert /etc/redis/certs/redis.crt \
  --key /etc/redis/certs/redis.key \
  --cacert /etc/redis/certs/ca.crt \
  BGSAVE

# Wait for save to complete
while [ $(redis-cli -a "$REDIS_PASSWORD" --tls \
  --cert /etc/redis/certs/redis.crt \
  --key /etc/redis/certs/redis.key \
  --cacert /etc/redis/certs/ca.crt \
  LASTSAVE) == $(redis-cli -a "$REDIS_PASSWORD" --tls \
  --cert /etc/redis/certs/redis.crt \
  --key /etc/redis/certs/redis.key \
  --cacert /etc/redis/certs/ca.crt \
  LASTSAVE) ]; do
  sleep 1
done

# Create encrypted backup
tar czf - $REDIS_DATA_DIR | \
  openssl enc -aes-256-cbc -salt -pbkdf2 \
  -pass file:$ENCRYPTION_KEY_FILE \
  -out $BACKUP_DIR/$BACKUP_NAME.tar.gz.enc

# Generate checksum
sha256sum $BACKUP_DIR/$BACKUP_NAME.tar.gz.enc > \
  $BACKUP_DIR/$BACKUP_NAME.sha256

# Upload to secure offsite storage
aws s3 cp $BACKUP_DIR/$BACKUP_NAME.tar.gz.enc \
  s3://hipaa-backups/redis/ \
  --sse aws:kms --sse-kms-key-id $KMS_KEY_ID

aws s3 cp $BACKUP_DIR/$BACKUP_NAME.sha256 \
  s3://hipaa-backups/redis/

# Clean old local backups (keep 7 days)
find $BACKUP_DIR -name "*.enc" -mtime +7 -delete
find $BACKUP_DIR -name "*.sha256" -mtime +7 -delete

# Log backup completion
echo "$(date): Backup $BACKUP_NAME completed successfully" >> /var/log/hipaa-backup.log
```

## Compliance Checklist

```markdown
## HIPAA Redis Compliance Checklist

### Technical Safeguards
- [ ] Encryption in transit (TLS 1.2+)
- [ ] Encryption at rest (encrypted disk or application-level)
- [ ] Strong authentication (complex passwords, certificates)
- [ ] Access controls (ACLs, role-based access)
- [ ] Automatic logoff (session timeouts)
- [ ] Audit logging (all PHI access logged)

### Administrative Safeguards
- [ ] Risk assessment performed
- [ ] Security policies documented
- [ ] Workforce training completed
- [ ] Incident response plan
- [ ] Business associate agreements
- [ ] Designated security officer

### Physical Safeguards
- [ ] Facility access controls
- [ ] Workstation security
- [ ] Device controls
- [ ] Media disposal procedures

### Audit Requirements
- [ ] Access logs retained 6+ years
- [ ] Regular audit log review
- [ ] Anomaly detection
- [ ] Breach notification procedures

### Backup and Recovery
- [ ] Regular encrypted backups
- [ ] Offsite backup storage
- [ ] Tested recovery procedures
- [ ] Disaster recovery plan
```

## Conclusion

Implementing HIPAA compliance with Redis requires:

- Network isolation and encryption (TLS)
- Strict access controls and role-based permissions
- Application-level PHI encryption
- Comprehensive audit logging
- Emergency access procedures
- Encrypted backups and disaster recovery

By following these patterns, you can use Redis to store and process healthcare data while meeting HIPAA security and privacy requirements.
