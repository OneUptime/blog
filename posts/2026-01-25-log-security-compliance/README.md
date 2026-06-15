# How to Configure Log Security and Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Log Security, Compliance, PII, Data Protection, GDPR, HIPAA, Encryption, Access Control

Description: Learn how to configure log security and compliance for sensitive data. This guide covers PII redaction, encryption, access control, audit trails, and meeting regulatory requirements for log data.

---

> Logs contain sensitive information that requires protection. Customer data, authentication tokens, and system secrets can all end up in logs. Proper security and compliance measures protect your users and your organization.

Security breaches often involve log data. Attackers search logs for credentials, and regulators scrutinize how you handle personal data in logs. A comprehensive log security strategy addresses both threats.

---

## Identifying Sensitive Data in Logs

Common sensitive data that appears in logs:

```typescript
// security/sensitive-patterns.ts
// Patterns for identifying sensitive data

const sensitivePatterns = {
  // Personally Identifiable Information (PII)
  email: /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,

  // Financial data
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  bankAccount: /\b\d{8,17}\b/g,

  // Authentication
  password: /password['":\s]*['"]?[\w!@#$%^&*]{8,}['"]?/gi,
  apiKey: /['"](sk|pk|api|key)[_-]?\w{20,}['"]/gi,
  bearerToken: /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/g,
  jwtToken: /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g,

  // AWS credentials
  awsAccessKey: /AKIA[0-9A-Z]{16}/g,
  awsSecretKey: /[A-Za-z0-9/+=]{40}/g,

  // Database connection strings
  connectionString: /(mongodb|postgres|mysql|redis):\/\/[^\s]+/gi
};

function findSensitiveData(text: string): SensitiveDataMatch[] {
  const matches: SensitiveDataMatch[] = [];

  for (const [type, pattern] of Object.entries(sensitivePatterns)) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type,
        value: match[0],
        position: match.index
      });
    }
  }

  return matches;
}
```

---

## PII Redaction

Automatically redact sensitive data before logging:

```typescript
// security/redaction.ts
// PII redaction implementation

interface RedactionConfig {
  patterns: Record<string, RegExp>;
  replacements: Record<string, string | ((match: string) => string)>;
  allowlist: string[];  // Fields to never redact
  denylist: string[];   // Fields to always redact completely
}

class LogRedactor {
  private config: RedactionConfig;

  constructor(config: RedactionConfig) {
    this.config = config;
  }

  redact(log: Record<string, unknown>): Record<string, unknown> {
    return this.redactObject(log, '');
  }

  private redactObject(obj: Record<string, unknown>, path: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;

      // Skip allowlisted fields
      if (this.config.allowlist.includes(fullPath)) {
        result[key] = value;
        continue;
      }

      // Completely redact denylisted fields
      if (this.config.denylist.includes(fullPath) || this.config.denylist.includes(key)) {
        result[key] = '[REDACTED]';
        continue;
      }

      // Recursively process arrays
      if (Array.isArray(value)) {
        result[key] = value.map((item) => {
          if (typeof item === 'string') {
            return this.redactString(item);
          }
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            return this.redactObject(item as Record<string, unknown>, fullPath);
          }
          return item;
        });
        continue;
      }

      // Recursively process objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.redactObject(value as Record<string, unknown>, fullPath);
        continue;
      }

      // Process strings
      if (typeof value === 'string') {
        result[key] = this.redactString(value);
        continue;
      }

      // Pass through other types
      result[key] = value;
    }

    return result;
  }

  redactString(value: string): string {
    let result = value;

    for (const [type, pattern] of Object.entries(this.config.patterns)) {
      const replacement = this.config.replacements[type];

      if (typeof replacement === 'function') {
        result = result.replace(pattern, replacement);
      } else {
        result = result.replace(pattern, replacement || `[${type.toUpperCase()}_REDACTED]`);
      }
    }

    return result;
  }
}

// Default configuration
const defaultRedactor = new LogRedactor({
  patterns: {
    email: /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    bearerToken: /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/g,
    awsKey: /AKIA[0-9A-Z]{16}/g
  },
  replacements: {
    email: (match) => {
      const [local, domain] = match.split('@');
      return `${local[0]}***@${domain}`;
    },
    creditCard: (match) => {
      const digits = match.replace(/\D/g, '');
      return `****-****-****-${digits.slice(-4)}`;
    },
    ssn: '***-**-****',
    phone: '***-***-****',
    ipAddress: (match) => {
      const parts = match.split('.');
      return `${parts[0]}.${parts[1]}.***.***`;
    },
    bearerToken: 'Bearer [REDACTED]',
    awsKey: 'AKIA************'
  },
  allowlist: ['timestamp', 'level', 'service', 'trace_id', 'span_id'],
  denylist: ['password', 'secret', 'token', 'apiKey', 'api_key', 'authorization']
});

// Middleware for automatic redaction
function redactionMiddleware(logger: Logger): Logger {
  return {
    ...logger,
    log: (level: string, message: string, attributes?: Record<string, unknown>) => {
      const redactedMessage = defaultRedactor.redactString(message);
      const redactedAttributes = attributes ? defaultRedactor.redact(attributes) : undefined;
      logger.log(level, redactedMessage, redactedAttributes);
    }
  };
}
```

---

## Encryption at Rest and in Transit

Encrypt logs during storage and transmission:

```typescript
// security/encryption.ts
// Log encryption implementation

import crypto from 'crypto';
import fs from 'fs';
import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand
} from '@aws-sdk/client-kms';

interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyId: string;
  keyProvider: KeyProvider;
}

interface DataKey {
  plaintext: Buffer;
  encrypted: Buffer;
}

interface KeyProvider {
  generateDataKey(keyId: string): Promise<DataKey>;
  decryptDataKey(encryptedKey: Buffer): Promise<Buffer>;
}

class LogEncryptor {
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig) {
    this.config = config;
  }

  async encrypt(log: LogEntry): Promise<EncryptedLogEntry> {
    const plaintext = JSON.stringify(log);
    const dataKey = await this.config.keyProvider.generateDataKey(this.config.keyId);

    // Generate random IV for each encryption
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(this.config.algorithm, dataKey.plaintext, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get auth tag for GCM mode
    const authTag = cipher.getAuthTag();
    dataKey.plaintext.fill(0);

    return {
      _encrypted: true,
      _keyId: this.config.keyId,
      _algorithm: this.config.algorithm,
      _iv: iv.toString('base64'),
      _authTag: authTag.toString('base64'),
      _encryptedDataKey: dataKey.encrypted.toString('base64'),
      _ciphertext: encrypted,
      // Keep some metadata unencrypted for indexing
      timestamp: log.timestamp,
      level: log.level,
      service: log.service
    };
  }

  async decrypt(encryptedLog: EncryptedLogEntry): Promise<LogEntry> {
    const encryptedDataKey = Buffer.from(encryptedLog._encryptedDataKey, 'base64');
    const key = await this.config.keyProvider.decryptDataKey(encryptedDataKey);

    const iv = Buffer.from(encryptedLog._iv, 'base64');
    const authTag = Buffer.from(encryptedLog._authTag, 'base64');

    const decipher = crypto.createDecipheriv(encryptedLog._algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedLog._ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    key.fill(0);

    return JSON.parse(decrypted);
  }
}

// AWS KMS key provider
class KMSKeyProvider implements KeyProvider {
  private kms: KMSClient;

  constructor() {
    this.kms = new KMSClient({});
  }

  async generateDataKey(keyId: string): Promise<DataKey> {
    // Generate data key from KMS
    const result = await this.kms.send(new GenerateDataKeyCommand({
      KeyId: keyId,
      KeySpec: 'AES_256'
    }));

    if (!result.Plaintext || !result.CiphertextBlob) {
      throw new Error('KMS did not return a complete data key');
    }

    return {
      plaintext: Buffer.from(result.Plaintext),
      encrypted: Buffer.from(result.CiphertextBlob)
    };
  }

  async decryptDataKey(encryptedKey: Buffer): Promise<Buffer> {
    const result = await this.kms.send(new DecryptCommand({
      CiphertextBlob: encryptedKey
    }));

    if (!result.Plaintext) {
      throw new Error('KMS did not return a plaintext data key');
    }

    return Buffer.from(result.Plaintext);
  }
}

// TLS configuration for log transport
const tlsConfig = {
  // Minimum TLS 1.2
  minVersion: 'TLSv1.2',

  // Strong cipher suites only
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256'
  ].join(':'),

  // Certificate validation
  rejectUnauthorized: true,

  // Certificate pinning (optional but recommended)
  ca: fs.readFileSync('/path/to/ca-bundle.crt')
};
```

---

## Access Control

Implement role-based access to logs:

```typescript
// security/access-control.ts
// Log access control implementation

interface AccessPolicy {
  role: string;
  permissions: LogPermission[];
  filters: AccessFilter[];
}

interface LogPermission {
  action: 'read' | 'search' | 'export' | 'delete';
  resource: string;  // Log type or pattern
}

interface AccessFilter {
  field: string;
  operator: 'equals' | 'contains' | 'in';
  value: unknown;
}

class LogAccessController {
  public readonly policies: Map<string, AccessPolicy> = new Map();

  addPolicy(policy: AccessPolicy): void {
    this.policies.set(policy.role, policy);
  }

  canAccess(user: User, action: string, logEntry: LogEntry): boolean {
    // Get user's policies based on roles
    const userPolicies = user.roles
      .map(role => this.policies.get(role))
      .filter(Boolean) as AccessPolicy[];

    if (userPolicies.length === 0) {
      return false;  // No policies = no access
    }

    // Check if any policy grants the action
    for (const policy of userPolicies) {
      if (this.policyAllowsAction(policy, action, logEntry)) {
        // Check filters
        if (this.policyFiltersMatch(policy, user, logEntry)) {
          return true;
        }
      }
    }

    return false;
  }

  private policyAllowsAction(policy: AccessPolicy, action: string, logEntry: LogEntry): boolean {
    for (const permission of policy.permissions) {
      if (permission.action === action) {
        // Check resource pattern
        if (this.matchesResource(logEntry, permission.resource)) {
          return true;
        }
      }
    }
    return false;
  }

  private matchesResource(logEntry: LogEntry, resource: string): boolean {
    if (resource === '*') return true;

    // Support glob patterns
    const pattern = new RegExp('^' + resource.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    return pattern.test(logEntry.service) || pattern.test(logEntry.tag || '');
  }

  private policyFiltersMatch(policy: AccessPolicy, user: User, logEntry: LogEntry): boolean {
    // All filters must match
    for (const filter of policy.filters) {
      const fieldValue = this.getFieldValue(logEntry, filter.field);
      const expectedValue = this.resolveFilterValue(filter.value, user);

      switch (filter.operator) {
        case 'equals':
          if (fieldValue !== expectedValue) return false;
          break;
        case 'contains':
          if (!String(fieldValue).includes(String(expectedValue))) return false;
          break;
        case 'in':
          if (!Array.isArray(expectedValue) || !expectedValue.includes(fieldValue)) return false;
          break;
      }
    }
    return true;
  }

  private resolveFilterValue(value: unknown, user: User): unknown {
    if (typeof value === 'string' && value.startsWith('${user.') && value.endsWith('}')) {
      const field = value.slice('${user.'.length, -1);
      return this.getFieldValue(user as unknown as LogEntry, field);
    }

    return value;
  }

  private getFieldValue(logEntry: LogEntry, field: string): unknown {
    return field.split('.').reduce((obj, key) => obj?.[key], logEntry as any);
  }

  // Apply access control to search results
  filterResults(user: User, logs: LogEntry[]): LogEntry[] {
    return logs.filter(log => this.canAccess(user, 'read', log));
  }
}

// Example policies
const accessController = new LogAccessController();

// Developers can read their team's logs
accessController.addPolicy({
  role: 'developer',
  permissions: [
    { action: 'read', resource: '*' },
    { action: 'search', resource: '*' }
  ],
  filters: [
    { field: 'team', operator: 'equals', value: '${user.team}' }
  ]
});

// Security team can read all security logs
accessController.addPolicy({
  role: 'security',
  permissions: [
    { action: 'read', resource: 'security.*' },
    { action: 'search', resource: 'security.*' },
    { action: 'export', resource: 'security.*' }
  ],
  filters: []
});

// Compliance team can read audit logs
accessController.addPolicy({
  role: 'compliance',
  permissions: [
    { action: 'read', resource: 'audit.*' },
    { action: 'search', resource: 'audit.*' },
    { action: 'export', resource: 'audit.*' }
  ],
  filters: []
});

// Admins can do everything
accessController.addPolicy({
  role: 'admin',
  permissions: [
    { action: 'read', resource: '*' },
    { action: 'search', resource: '*' },
    { action: 'export', resource: '*' },
    { action: 'delete', resource: '*' }
  ],
  filters: []
});
```

---

## Audit Trail for Log Access

Track who accesses logs:

```typescript
// security/access-audit.ts
// Audit trail for log access

interface LogAccessEvent {
  timestamp: string;
  user: {
    id: string;
    email: string;
    roles: string[];
    ip: string;
  };
  action: string;
  query?: {
    filters: Record<string, unknown>;
    timeRange: { start: string; end: string };
  };
  results: {
    count: number;
    services: string[];
  };
  duration_ms: number;
}

class LogAccessAuditor {
  private auditLogger: AuditLogger;

  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
  }

  // Wrap log query operations with auditing
  async auditedQuery<T>(
    user: User,
    queryFn: () => Promise<LogQueryResult<T>>
  ): Promise<LogQueryResult<T>> {
    const startTime = Date.now();

    try {
      const result = await queryFn();

      // Record successful access
      await this.auditLogger.log({
        eventType: 'LOG_ACCESS',
        actor: {
          userId: user.id,
          email: user.email,
          roles: user.roles
        },
        action: {
          name: 'search_logs',
          parameters: result.query
        },
        result: {
          status: 'success',
          metadata: {
            resultsCount: result.logs.length,
            servicesAccessed: [...new Set(result.logs.map(l => l.service))],
            duration_ms: Date.now() - startTime
          }
        }
      });

      return result;
    } catch (error) {
      // Record failed access
      await this.auditLogger.log({
        eventType: 'LOG_ACCESS',
        actor: {
          userId: user.id,
          email: user.email,
          roles: user.roles
        },
        action: { name: 'search_logs' },
        result: {
          status: 'failure',
          errorMessage: (error as Error).message,
          metadata: {
            duration_ms: Date.now() - startTime
          }
        }
      });

      throw error;
    }
  }

  // Audit log export operations
  async auditedExport(
    user: User,
    exportParams: ExportParams,
    exportFn: () => Promise<ExportResult>
  ): Promise<ExportResult> {
    try {
      const result = await exportFn();

      await this.auditLogger.log({
        eventType: 'LOG_EXPORT',
        actor: {
          userId: user.id,
          email: user.email,
          roles: user.roles
        },
        action: {
          name: 'export_logs',
          parameters: exportParams
        },
        result: {
          status: 'success',
          metadata: {
            format: exportParams.format,
            recordCount: result.recordCount,
            sizeBytes: result.sizeBytes
          }
        }
      });

      return result;
    } catch (error) {
      await this.auditLogger.log({
        eventType: 'LOG_EXPORT',
        actor: {
          userId: user.id,
          email: user.email,
          roles: user.roles
        },
        action: { name: 'export_logs', parameters: exportParams },
        result: {
          status: 'failure',
          errorMessage: (error as Error).message
        }
      });

      throw error;
    }
  }
}
```

---

## Compliance Checklist

Verify your log security meets requirements:

```typescript
// security/compliance-check.ts
// Compliance verification utilities

interface ComplianceCheck {
  name: string;
  requirement: string;
  check: () => Promise<ComplianceResult>;
}

interface ComplianceResult {
  passed: boolean;
  details: string;
  evidence?: unknown;
}

const complianceChecks: ComplianceCheck[] = [
  {
    name: 'PII Redaction',
    requirement: 'GDPR Article 25 - Data protection by design',
    check: async () => {
      // Test that PII is redacted
      const testLog = { message: 'User john@example.com logged in', email: 'john@example.com' };
      const redacted = defaultRedactor.redact(testLog);

      const containsEmail = JSON.stringify(redacted).includes('john@example.com');
      return {
        passed: !containsEmail,
        details: containsEmail ? 'Email address not redacted' : 'PII redaction working correctly'
      };
    }
  },
  {
    name: 'Encryption at Rest',
    requirement: 'SOC 2 CC6.1 - Logical access protection for data at rest',
    check: async () => {
      // Verify encryption is enabled
      const encryptionEnabled = process.env.LOG_ENCRYPTION_ENABLED === 'true';
      return {
        passed: encryptionEnabled,
        details: encryptionEnabled ? 'Log encryption is enabled' : 'Log encryption is NOT enabled'
      };
    }
  },
  {
    name: 'TLS in Transit',
    requirement: 'SOC 2 CC6.7 - Protection during transmission',
    check: async () => {
      // Verify TLS configuration
      const logEndpoint = process.env.LOG_ENDPOINT || '';
      const usesTLS = logEndpoint.startsWith('https://');
      return {
        passed: usesTLS,
        details: usesTLS ? 'Log shipping uses TLS' : 'Log shipping does NOT use TLS'
      };
    }
  },
  {
    name: 'Access Control',
    requirement: 'HIPAA 164.312(a)(1) - Access control',
    check: async () => {
      // Verify RBAC is configured
      const hasAccessControl = accessController.policies.size > 0;
      return {
        passed: hasAccessControl,
        details: hasAccessControl ? 'Role-based access control configured' : 'No access control configured',
        evidence: { policyCount: accessController.policies.size }
      };
    }
  },
  {
    name: 'Audit Trail',
    requirement: 'SOC 2 CC7.2 - Security event monitoring',
    check: async () => {
      // Verify audit logging is enabled
      const auditEnabled = !!auditLogger;
      return {
        passed: auditEnabled,
        details: auditEnabled ? 'Audit logging enabled' : 'Audit logging NOT enabled'
      };
    }
  },
  {
    name: 'Retention Policy',
    requirement: 'GDPR Article 5(1)(e) - Storage limitation',
    check: async () => {
      // Verify retention policy exists
      const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '0');
      const hasRetention = retentionDays > 0;
      return {
        passed: hasRetention,
        details: hasRetention
          ? `Retention policy: ${retentionDays} days`
          : 'No retention policy configured',
        evidence: { retentionDays }
      };
    }
  }
];

async function runComplianceChecks(): Promise<ComplianceReport> {
  const results: ComplianceCheckResult[] = [];

  for (const check of complianceChecks) {
    const result = await check.check();
    results.push({
      ...check,
      ...result
    });
  }

  const passedCount = results.filter(r => r.passed).length;

  return {
    timestamp: new Date().toISOString(),
    totalChecks: results.length,
    passedChecks: passedCount,
    failedChecks: results.length - passedCount,
    results
  };
}
```

---

## Summary

Log security and compliance requires a layered approach:

1. **Identify sensitive data**: Know what PII and secrets might appear in logs
2. **Redact automatically**: Remove sensitive data before it reaches storage
3. **Encrypt everywhere**: Protect data at rest and in transit
4. **Control access**: Implement RBAC for log queries
5. **Audit access**: Track who views what logs
6. **Verify compliance**: Regularly test your security controls

Remember that log security is not optional when handling personal data or operating in regulated industries. Build security into your logging infrastructure from the start.

---

*Need compliant log management without the complexity? [OneUptime](https://oneuptime.com) provides built-in PII redaction, encryption, access control, and compliance reporting for your log data.*
