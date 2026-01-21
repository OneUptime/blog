# How to Implement Data Encryption at Rest with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Encryption, Security, Data Protection, Compliance, Key Management, At-Rest Encryption

Description: A comprehensive guide to implementing data encryption at rest with Redis, covering encryption strategies, key management, client-side encryption, and best practices for protecting sensitive data.

---

Data encryption at rest is a critical security requirement for many applications, especially those handling sensitive information. This guide covers various approaches to encrypting data stored in Redis, from client-side encryption to disk-level encryption.

## Understanding Encryption at Rest

Redis stores data in memory and optionally persists to disk. Encryption at rest protects data from unauthorized access if storage media is compromised or accessed by unauthorized parties.

### Encryption Levels

```
+------------------+------------------------------------------+
| Level            | Description                              |
+------------------+------------------------------------------+
| Application      | Encrypt before storing in Redis          |
| Client Library   | Transparent encryption in Redis client   |
| Proxy            | Encryption at proxy layer                |
| Disk             | Encrypt RDB/AOF files at filesystem      |
| Hardware         | Hardware-based encryption (HSM)          |
+------------------+------------------------------------------+
```

## Client-Side Encryption

### Node.js Implementation

```javascript
// encryption.js
const crypto = require('crypto');

class RedisEncryption {
  constructor(encryptionKey, algorithm = 'aes-256-gcm') {
    // Key should be 32 bytes for AES-256
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
    this.algorithm = algorithm;
  }

  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
    });
  }

  decrypt(encryptedPayload) {
    const payload = JSON.parse(encryptedPayload);
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const encryptedData = payload.data;

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

module.exports = RedisEncryption;
```

### Encrypted Redis Client Wrapper

```javascript
// encryptedRedisClient.js
const Redis = require('ioredis');
const RedisEncryption = require('./encryption');

class EncryptedRedisClient {
  constructor(redisUrl, encryptionKey) {
    this.redis = new Redis(redisUrl);
    this.encryption = new RedisEncryption(encryptionKey);

    // Fields that should be encrypted
    this.sensitiveFields = new Set([
      'ssn', 'creditCard', 'password', 'email',
      'phone', 'address', 'healthData'
    ]);
  }

  // Encrypt sensitive data automatically
  async set(key, value, options = {}) {
    const { encrypt = true, ex } = options;

    let storedValue = value;
    if (encrypt && typeof value === 'object') {
      storedValue = this.encryptObject(value);
    } else if (encrypt) {
      storedValue = this.encryption.encrypt(value);
    }

    if (ex) {
      return this.redis.setex(key, ex, storedValue);
    }
    return this.redis.set(key, storedValue);
  }

  async get(key, options = {}) {
    const { decrypt = true } = options;

    const value = await this.redis.get(key);
    if (!value) return null;

    if (decrypt) {
      try {
        return this.encryption.decrypt(value);
      } catch (e) {
        // Value might not be encrypted
        return value;
      }
    }
    return value;
  }

  // Selectively encrypt sensitive fields in objects
  encryptObject(obj) {
    const encrypted = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.sensitiveFields.has(key)) {
        encrypted[key] = this.encryption.encrypt(value);
        encrypted[`${key}_encrypted`] = true;
      } else if (typeof value === 'object' && value !== null) {
        encrypted[key] = this.encryptObject(value);
      } else {
        encrypted[key] = value;
      }
    }

    return JSON.stringify(encrypted);
  }

  decryptObject(encryptedStr) {
    const obj = JSON.parse(encryptedStr);
    return this.decryptObjectRecursive(obj);
  }

  decryptObjectRecursive(obj) {
    const decrypted = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key.endsWith('_encrypted')) continue;

      if (obj[`${key}_encrypted`]) {
        decrypted[key] = this.encryption.decrypt(value);
      } else if (typeof value === 'object' && value !== null) {
        decrypted[key] = this.decryptObjectRecursive(value);
      } else {
        decrypted[key] = value;
      }
    }

    return decrypted;
  }

  // Hash operations with encryption
  async hset(key, field, value, options = {}) {
    const { encrypt = true } = options;
    const storedValue = encrypt
      ? this.encryption.encrypt(value)
      : value;
    return this.redis.hset(key, field, storedValue);
  }

  async hget(key, field, options = {}) {
    const { decrypt = true } = options;
    const value = await this.redis.hget(key, field);

    if (!value) return null;

    if (decrypt) {
      try {
        return this.encryption.decrypt(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  }

  async hgetall(key, options = {}) {
    const { decrypt = true } = options;
    const hash = await this.redis.hgetall(key);

    if (!hash || Object.keys(hash).length === 0) return null;

    if (decrypt) {
      const decrypted = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          decrypted[field] = this.encryption.decrypt(value);
        } catch (e) {
          decrypted[field] = value;
        }
      }
      return decrypted;
    }
    return hash;
  }
}

module.exports = EncryptedRedisClient;
```

### Python Implementation

```python
# encryption.py
import json
import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import redis

class RedisEncryption:
    def __init__(self, encryption_key: str, salt: bytes = b'redis-encryption-salt'):
        # Derive a 256-bit key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        self.key = kdf.derive(encryption_key.encode())
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, data) -> str:
        """Encrypt data and return base64 encoded string."""
        nonce = os.urandom(12)  # 96-bit nonce for GCM

        plaintext = json.dumps(data).encode()
        ciphertext = self.aesgcm.encrypt(nonce, plaintext, None)

        # Combine nonce and ciphertext
        encrypted = nonce + ciphertext
        return base64.b64encode(encrypted).decode()

    def decrypt(self, encrypted_data: str):
        """Decrypt base64 encoded encrypted data."""
        encrypted = base64.b64decode(encrypted_data)

        nonce = encrypted[:12]
        ciphertext = encrypted[12:]

        plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
        return json.loads(plaintext.decode())


class EncryptedRedisClient:
    def __init__(self, redis_url: str, encryption_key: str):
        self.redis = redis.from_url(redis_url)
        self.encryption = RedisEncryption(encryption_key)

        # Fields that should be encrypted
        self.sensitive_fields = {
            'ssn', 'credit_card', 'password', 'email',
            'phone', 'address', 'health_data'
        }

    def set(self, key: str, value, encrypt: bool = True, ex: int = None):
        """Set a value with optional encryption."""
        if encrypt:
            stored_value = self.encryption.encrypt(value)
        else:
            stored_value = json.dumps(value) if not isinstance(value, str) else value

        if ex:
            return self.redis.setex(key, ex, stored_value)
        return self.redis.set(key, stored_value)

    def get(self, key: str, decrypt: bool = True):
        """Get a value with optional decryption."""
        value = self.redis.get(key)
        if not value:
            return None

        if decrypt:
            try:
                return self.encryption.decrypt(value.decode())
            except Exception:
                # Value might not be encrypted
                try:
                    return json.loads(value)
                except Exception:
                    return value.decode()
        return value.decode()

    def set_user(self, user_id: str, user_data: dict, ex: int = None):
        """Store user data with selective encryption of sensitive fields."""
        encrypted_data = {}

        for field, value in user_data.items():
            if field in self.sensitive_fields:
                encrypted_data[field] = self.encryption.encrypt(value)
                encrypted_data[f'{field}_encrypted'] = True
            else:
                encrypted_data[field] = value

        if ex:
            return self.redis.setex(f'user:{user_id}', ex, json.dumps(encrypted_data))
        return self.redis.set(f'user:{user_id}', json.dumps(encrypted_data))

    def get_user(self, user_id: str) -> dict:
        """Retrieve user data with automatic decryption of sensitive fields."""
        data = self.redis.get(f'user:{user_id}')
        if not data:
            return None

        user_data = json.loads(data)
        decrypted_data = {}

        for field, value in user_data.items():
            if field.endswith('_encrypted'):
                continue

            if user_data.get(f'{field}_encrypted'):
                decrypted_data[field] = self.encryption.decrypt(value)
            else:
                decrypted_data[field] = value

        return decrypted_data


# Usage
if __name__ == '__main__':
    client = EncryptedRedisClient(
        'redis://localhost:6379',
        'your-secret-encryption-key'
    )

    # Store encrypted data
    client.set('secret-key', {'sensitive': 'data'})

    # Retrieve and decrypt
    data = client.get('secret-key')
    print(data)

    # Store user with selective encryption
    client.set_user('12345', {
        'name': 'John Doe',  # Not encrypted
        'email': 'john@example.com',  # Encrypted
        'ssn': '123-45-6789',  # Encrypted
        'role': 'admin'  # Not encrypted
    })

    user = client.get_user('12345')
    print(user)
```

## Key Management

### Key Rotation Strategy

```javascript
// keyRotation.js
const crypto = require('crypto');
const Redis = require('ioredis');

class KeyRotationManager {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
    this.keyPrefix = 'encryption:key:';
    this.currentKeyId = null;
  }

  async initialize() {
    // Get current active key ID
    this.currentKeyId = await this.redis.get('encryption:current_key_id');

    if (!this.currentKeyId) {
      // Generate initial key
      await this.rotateKey();
    }
  }

  async rotateKey() {
    const newKeyId = Date.now().toString();
    const newKey = crypto.randomBytes(32).toString('hex');

    // Store new key
    await this.redis.hset(`${this.keyPrefix}${newKeyId}`, {
      key: newKey,
      createdAt: new Date().toISOString(),
      status: 'active',
    });

    // Mark old key as rotated
    if (this.currentKeyId) {
      await this.redis.hset(`${this.keyPrefix}${this.currentKeyId}`,
        'status', 'rotated'
      );
    }

    // Update current key reference
    await this.redis.set('encryption:current_key_id', newKeyId);
    this.currentKeyId = newKeyId;

    return newKeyId;
  }

  async getCurrentKey() {
    const keyData = await this.redis.hgetall(`${this.keyPrefix}${this.currentKeyId}`);
    return Buffer.from(keyData.key, 'hex');
  }

  async getKeyById(keyId) {
    const keyData = await this.redis.hgetall(`${this.keyPrefix}${keyId}`);
    if (!keyData || !keyData.key) {
      throw new Error(`Key not found: ${keyId}`);
    }
    return Buffer.from(keyData.key, 'hex');
  }

  // Encrypt with key ID embedded in payload
  async encrypt(data) {
    const key = await this.getCurrentKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      keyId: this.currentKeyId,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
    });
  }

  // Decrypt using embedded key ID
  async decrypt(encryptedPayload) {
    const payload = JSON.parse(encryptedPayload);
    const key = await this.getKeyById(payload.keyId);

    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  // Re-encrypt data with new key
  async reencrypt(encryptedPayload) {
    const decrypted = await this.decrypt(encryptedPayload);
    return this.encrypt(decrypted);
  }
}

module.exports = KeyRotationManager;
```

### Key Rotation Migration Script

```javascript
// migrateKeys.js
const Redis = require('ioredis');
const KeyRotationManager = require('./keyRotation');

async function migrateEncryptedData(pattern = '*:encrypted') {
  const redis = new Redis(process.env.REDIS_URL);
  const keyManager = new KeyRotationManager(process.env.REDIS_URL);

  await keyManager.initialize();
  const currentKeyId = await redis.get('encryption:current_key_id');

  let cursor = '0';
  let migratedCount = 0;
  let errorCount = 0;

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;

    for (const key of keys) {
      try {
        const value = await redis.get(key);
        const payload = JSON.parse(value);

        // Skip if already using current key
        if (payload.keyId === currentKeyId) {
          continue;
        }

        // Re-encrypt with new key
        const reencrypted = await keyManager.reencrypt(value);
        await redis.set(key, reencrypted);

        migratedCount++;

        if (migratedCount % 1000 === 0) {
          console.log(`Migrated ${migratedCount} keys...`);
        }
      } catch (error) {
        console.error(`Error migrating key ${key}:`, error.message);
        errorCount++;
      }
    }
  } while (cursor !== '0');

  console.log(`Migration complete. Migrated: ${migratedCount}, Errors: ${errorCount}`);
  await redis.quit();
}

migrateEncryptedData();
```

## Disk-Level Encryption

### Linux LUKS Encryption

```bash
#!/bin/bash
# setup-encrypted-redis-storage.sh

# Create encrypted volume for Redis data
DEVICE="/dev/sdb"
MOUNT_POINT="/var/lib/redis"
MAPPER_NAME="redis-data"

# Create encrypted partition
cryptsetup luksFormat $DEVICE

# Open encrypted volume
cryptsetup luksOpen $DEVICE $MAPPER_NAME

# Create filesystem
mkfs.ext4 /dev/mapper/$MAPPER_NAME

# Mount encrypted volume
mkdir -p $MOUNT_POINT
mount /dev/mapper/$MAPPER_NAME $MOUNT_POINT

# Set permissions for Redis
chown redis:redis $MOUNT_POINT
chmod 750 $MOUNT_POINT

# Add to /etc/crypttab for auto-mount (requires keyfile or passphrase)
echo "$MAPPER_NAME $DEVICE none luks" >> /etc/crypttab

# Add to /etc/fstab
echo "/dev/mapper/$MAPPER_NAME $MOUNT_POINT ext4 defaults 0 2" >> /etc/fstab
```

### Redis Configuration for Encrypted Storage

```conf
# redis.conf for encrypted storage

# Ensure data is written to encrypted mount point
dir /var/lib/redis

# RDB persistence
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
rdb-del-sync-files yes

# AOF persistence
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Disable memory overcommit to prevent swap
# (swap might not be encrypted)
# Set in sysctl: vm.overcommit_memory = 1

# Limit memory to prevent swap usage
maxmemory 4gb
maxmemory-policy allkeys-lru
```

## Encrypted RDB/AOF Files

### RDB Encryption Wrapper

```python
# rdb_encryption.py
import os
import subprocess
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

class RDBEncryption:
    def __init__(self, password: str):
        salt = b'redis-rdb-salt'  # In production, store securely
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        self.fernet = Fernet(key)

    def encrypt_rdb(self, input_path: str, output_path: str):
        """Encrypt RDB file."""
        with open(input_path, 'rb') as f:
            plaintext = f.read()

        encrypted = self.fernet.encrypt(plaintext)

        with open(output_path, 'wb') as f:
            f.write(encrypted)

        print(f'Encrypted {input_path} -> {output_path}')

    def decrypt_rdb(self, input_path: str, output_path: str):
        """Decrypt RDB file."""
        with open(input_path, 'rb') as f:
            encrypted = f.read()

        plaintext = self.fernet.decrypt(encrypted)

        with open(output_path, 'wb') as f:
            f.write(plaintext)

        print(f'Decrypted {input_path} -> {output_path}')


def backup_encrypted():
    """Create encrypted backup of Redis RDB."""
    encryption = RDBEncryption(os.environ['REDIS_BACKUP_PASSWORD'])

    # Trigger RDB save
    subprocess.run(['redis-cli', 'BGSAVE'], check=True)

    # Wait for save to complete
    subprocess.run(['redis-cli', 'LASTSAVE'], check=True)

    # Encrypt the RDB file
    encryption.encrypt_rdb(
        '/var/lib/redis/dump.rdb',
        f'/backups/dump-{int(time.time())}.rdb.enc'
    )


if __name__ == '__main__':
    import sys
    import time

    encryption = RDBEncryption(os.environ['REDIS_BACKUP_PASSWORD'])

    if sys.argv[1] == 'encrypt':
        encryption.encrypt_rdb(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'decrypt':
        encryption.decrypt_rdb(sys.argv[2], sys.argv[3])
```

## Transparent Encryption Proxy

### Redis Proxy with Encryption

```javascript
// encryptionProxy.js
const net = require('net');
const crypto = require('crypto');

class RedisEncryptionProxy {
  constructor(config) {
    this.listenPort = config.listenPort || 6380;
    this.redisHost = config.redisHost || 'localhost';
    this.redisPort = config.redisPort || 6379;
    this.encryptionKey = crypto.scryptSync(config.encryptionKey, 'salt', 32);
    this.encryptedCommands = new Set(['SET', 'SETEX', 'SETNX', 'MSET', 'HSET', 'LPUSH', 'RPUSH']);
  }

  start() {
    const server = net.createServer((clientSocket) => {
      const redisSocket = net.createConnection({
        host: this.redisHost,
        port: this.redisPort,
      });

      let buffer = '';

      clientSocket.on('data', (data) => {
        buffer += data.toString();

        // Parse RESP protocol and encrypt values
        const modified = this.processCommand(buffer);
        if (modified.complete) {
          redisSocket.write(modified.data);
          buffer = '';
        }
      });

      redisSocket.on('data', (data) => {
        // Decrypt responses for GET commands
        const response = this.processResponse(data);
        clientSocket.write(response);
      });

      clientSocket.on('end', () => redisSocket.end());
      redisSocket.on('end', () => clientSocket.end());

      clientSocket.on('error', (err) => console.error('Client error:', err));
      redisSocket.on('error', (err) => console.error('Redis error:', err));
    });

    server.listen(this.listenPort, () => {
      console.log(`Encryption proxy listening on port ${this.listenPort}`);
    });
  }

  encrypt(value) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag().toString('base64');

    return `ENC:${iv.toString('base64')}:${authTag}:${encrypted}`;
  }

  decrypt(value) {
    if (!value.startsWith('ENC:')) {
      return value;
    }

    const parts = value.slice(4).split(':');
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  processCommand(data) {
    // Simplified RESP parsing - production needs full parser
    const lines = data.split('\r\n');

    if (lines[0].startsWith('*')) {
      const command = lines[2].toUpperCase();

      if (this.encryptedCommands.has(command)) {
        // Encrypt the value (last argument for SET)
        const valueIndex = lines.length - 2;
        const originalValue = lines[valueIndex];
        const encryptedValue = this.encrypt(originalValue);

        lines[valueIndex] = encryptedValue;
        lines[valueIndex - 1] = `$${encryptedValue.length}`;
      }
    }

    return {
      complete: true,
      data: lines.join('\r\n'),
    };
  }

  processResponse(data) {
    const response = data.toString();

    // Decrypt bulk string responses
    if (response.startsWith('$') && response.includes('ENC:')) {
      const lines = response.split('\r\n');
      const value = lines[1];
      const decrypted = this.decrypt(value);

      return `$${decrypted.length}\r\n${decrypted}\r\n`;
    }

    return data;
  }
}

// Start proxy
const proxy = new RedisEncryptionProxy({
  listenPort: 6380,
  redisHost: 'localhost',
  redisPort: 6379,
  encryptionKey: process.env.REDIS_ENCRYPTION_KEY,
});

proxy.start();
```

## AWS KMS Integration

### Using AWS KMS for Key Management

```javascript
// awsKmsEncryption.js
const { KMSClient, GenerateDataKeyCommand, DecryptCommand } = require('@aws-sdk/client-kms');
const crypto = require('crypto');
const Redis = require('ioredis');

class KMSEncryptedRedis {
  constructor(config) {
    this.redis = new Redis(config.redisUrl);
    this.kms = new KMSClient({ region: config.awsRegion });
    this.kmsKeyId = config.kmsKeyId;
    this.dataKeyCache = new Map();
  }

  async getDataKey() {
    const cacheKey = 'current';

    if (this.dataKeyCache.has(cacheKey)) {
      const cached = this.dataKeyCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
        return cached;
      }
    }

    // Generate new data key from KMS
    const command = new GenerateDataKeyCommand({
      KeyId: this.kmsKeyId,
      KeySpec: 'AES_256',
    });

    const response = await this.kms.send(command);

    const dataKey = {
      plaintext: response.Plaintext,
      encrypted: response.CiphertextBlob,
      timestamp: Date.now(),
    };

    this.dataKeyCache.set(cacheKey, dataKey);
    return dataKey;
  }

  async decryptDataKey(encryptedKey) {
    const command = new DecryptCommand({
      CiphertextBlob: encryptedKey,
      KeyId: this.kmsKeyId,
    });

    const response = await this.kms.send(command);
    return response.Plaintext;
  }

  async encrypt(data) {
    const dataKey = await this.getDataKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      dataKey.plaintext,
      iv
    );

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      encryptedDataKey: Buffer.from(dataKey.encrypted).toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted,
    });
  }

  async decrypt(encryptedPayload) {
    const payload = JSON.parse(encryptedPayload);

    // Decrypt the data key using KMS
    const encryptedDataKey = Buffer.from(payload.encryptedDataKey, 'base64');
    const plaintextKey = await this.decryptDataKey(encryptedDataKey);

    const iv = Buffer.from(payload.iv, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', plaintextKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  async set(key, value, ex) {
    const encrypted = await this.encrypt(value);
    if (ex) {
      return this.redis.setex(key, ex, encrypted);
    }
    return this.redis.set(key, encrypted);
  }

  async get(key) {
    const encrypted = await this.redis.get(key);
    if (!encrypted) return null;
    return this.decrypt(encrypted);
  }
}

module.exports = KMSEncryptedRedis;
```

## Best Practices

### Security Checklist

```markdown
## Encryption at Rest Checklist

### Key Management
- [ ] Use strong, randomly generated encryption keys
- [ ] Store keys securely (HSM, KMS, or secrets manager)
- [ ] Implement key rotation policy
- [ ] Never store keys alongside encrypted data
- [ ] Use separate keys for different data classifications

### Implementation
- [ ] Use authenticated encryption (AES-GCM)
- [ ] Use unique IVs/nonces for each encryption
- [ ] Validate encrypted data integrity on decryption
- [ ] Handle decryption errors gracefully
- [ ] Log encryption/decryption operations for audit

### Storage
- [ ] Encrypt RDB and AOF files at rest
- [ ] Use encrypted filesystems for Redis data directories
- [ ] Secure backup storage with encryption
- [ ] Encrypt data in transit (TLS) in addition to at rest

### Operations
- [ ] Test encryption/decryption regularly
- [ ] Monitor encryption performance impact
- [ ] Plan for key compromise scenarios
- [ ] Document recovery procedures
- [ ] Train team on encryption operations
```

## Conclusion

Implementing data encryption at rest for Redis requires careful consideration of:

- Encryption level (application, client, disk)
- Key management and rotation strategies
- Performance impact and optimization
- Compliance requirements
- Operational procedures

By combining client-side encryption with disk-level encryption and proper key management, you can achieve comprehensive data protection for sensitive information stored in Redis while maintaining good performance characteristics.
