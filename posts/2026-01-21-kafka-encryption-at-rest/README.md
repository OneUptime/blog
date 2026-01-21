# How to Encrypt Kafka Data at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Encryption, Data at Rest, Security, Compliance, Key Management

Description: A comprehensive guide to encrypting Apache Kafka data at rest using filesystem encryption, client-side encryption, and key management best practices.

---

Encrypting Kafka data at rest protects sensitive information stored in broker log files from unauthorized access. This guide covers various approaches to implementing data-at-rest encryption for Kafka clusters.

## Understanding Data at Rest Encryption

Kafka stores data in log segments on disk. Without encryption, anyone with filesystem access can read message content. Encryption options include:

| Approach | Pros | Cons |
|----------|------|------|
| Filesystem encryption (LUKS, dm-crypt) | Transparent, no app changes | Full disk, key management |
| Cloud provider encryption (EBS, GCS) | Easy setup, managed keys | Cloud-specific |
| Client-side encryption | Field-level control | Application changes needed |
| Kafka interceptors | Centralized, transparent | Performance overhead |

## Filesystem-Level Encryption

### Linux LUKS Encryption

```bash
#!/bin/bash
# Setup LUKS encrypted volume for Kafka logs

# Install cryptsetup
apt-get install cryptsetup

# Create encrypted partition
cryptsetup luksFormat /dev/sdb1

# Open encrypted volume
cryptsetup luksOpen /dev/sdb1 kafka-data

# Create filesystem
mkfs.ext4 /dev/mapper/kafka-data

# Mount
mkdir -p /var/kafka-logs
mount /dev/mapper/kafka-data /var/kafka-logs

# Auto-mount on boot (requires key file or manual password)
echo "kafka-data /dev/sdb1 /etc/kafka/luks-keyfile luks" >> /etc/crypttab
echo "/dev/mapper/kafka-data /var/kafka-logs ext4 defaults 0 2" >> /etc/fstab
```

### Automated Key Management with HashiCorp Vault

```python
import hvac
import subprocess
import os

class VaultLuksManager:
    def __init__(self, vault_addr: str, vault_token: str):
        self.client = hvac.Client(url=vault_addr, token=vault_token)

    def get_luks_key(self, key_path: str) -> bytes:
        """Retrieve LUKS key from Vault."""
        secret = self.client.secrets.kv.v2.read_secret_version(path=key_path)
        return secret['data']['data']['key'].encode()

    def unlock_volume(self, device: str, mapper_name: str, key_path: str):
        """Unlock LUKS volume using key from Vault."""
        key = self.get_luks_key(key_path)

        # Pass key to cryptsetup via stdin
        process = subprocess.Popen(
            ['cryptsetup', 'luksOpen', device, mapper_name],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate(input=key)

        if process.returncode != 0:
            raise Exception(f"Failed to unlock volume: {stderr.decode()}")

        print(f"Volume {device} unlocked as {mapper_name}")

    def rotate_key(self, device: str, old_key_path: str, new_key_path: str):
        """Rotate LUKS encryption key."""
        old_key = self.get_luks_key(old_key_path)

        # Generate new key
        new_key = os.urandom(32)

        # Store new key in Vault
        self.client.secrets.kv.v2.create_or_update_secret(
            path=new_key_path,
            secret={'key': new_key.hex()}
        )

        # Add new key to LUKS
        process = subprocess.Popen(
            ['cryptsetup', 'luksAddKey', device],
            stdin=subprocess.PIPE
        )
        process.communicate(input=old_key + b'\n' + new_key)

        print(f"New key added to {device}")


def main():
    manager = VaultLuksManager(
        vault_addr='https://vault.example.com:8200',
        vault_token=os.environ['VAULT_TOKEN']
    )

    # Unlock Kafka data volume on startup
    manager.unlock_volume(
        device='/dev/sdb1',
        mapper_name='kafka-data',
        key_path='kafka/encryption/luks-key'
    )


if __name__ == '__main__':
    main()
```

## Cloud Provider Encryption

### AWS EBS Encryption

```yaml
# Terraform configuration for encrypted EBS
resource "aws_ebs_volume" "kafka_data" {
  availability_zone = "us-east-1a"
  size              = 1000
  type              = "gp3"
  encrypted         = true
  kms_key_id        = aws_kms_key.kafka_key.arn

  tags = {
    Name = "kafka-data-volume"
  }
}

resource "aws_kms_key" "kafka_key" {
  description             = "KMS key for Kafka data encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
}
```

### GCP Persistent Disk Encryption

```yaml
# Terraform for encrypted GCP disk
resource "google_compute_disk" "kafka_data" {
  name = "kafka-data-disk"
  type = "pd-ssd"
  size = 1000
  zone = "us-central1-a"

  disk_encryption_key {
    kms_key_self_link = google_kms_crypto_key.kafka_key.id
  }
}

resource "google_kms_crypto_key" "kafka_key" {
  name            = "kafka-encryption-key"
  key_ring        = google_kms_key_ring.kafka_ring.id
  rotation_period = "7776000s" # 90 days

  lifecycle {
    prevent_destroy = true
  }
}
```

## Client-Side Encryption

### Java Encryption Serializer

```java
import org.apache.kafka.common.serialization.Serializer;
import org.apache.kafka.common.serialization.Deserializer;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Map;

public class EncryptingSerializer implements Serializer<String> {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private SecretKeySpec keySpec;

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        String keyHex = (String) configs.get("encryption.key");
        byte[] keyBytes = hexToBytes(keyHex);
        this.keySpec = new SecretKeySpec(keyBytes, "AES");
    }

    @Override
    public byte[] serialize(String topic, String data) {
        if (data == null) {
            return null;
        }

        try {
            // Generate random IV
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            // Encrypt
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec);

            byte[] cipherText = cipher.doFinal(data.getBytes("UTF-8"));

            // Prepend IV to ciphertext
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + cipherText.length);
            buffer.put(iv);
            buffer.put(cipherText);

            return buffer.array();

        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    @Override
    public void close() {
    }

    private byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }
}

public class DecryptingDeserializer implements Deserializer<String> {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private SecretKeySpec keySpec;

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        String keyHex = (String) configs.get("encryption.key");
        byte[] keyBytes = hexToBytes(keyHex);
        this.keySpec = new SecretKeySpec(keyBytes, "AES");
    }

    @Override
    public String deserialize(String topic, byte[] data) {
        if (data == null) {
            return null;
        }

        try {
            ByteBuffer buffer = ByteBuffer.wrap(data);

            // Extract IV
            byte[] iv = new byte[GCM_IV_LENGTH];
            buffer.get(iv);

            // Extract ciphertext
            byte[] cipherText = new byte[buffer.remaining()];
            buffer.get(cipherText);

            // Decrypt
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);

            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText, "UTF-8");

        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }

    @Override
    public void close() {
    }

    private byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }
}
```

### Using Encrypted Serializers

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;
import java.util.*;

public class EncryptedKafkaClient {

    public static KafkaProducer<String, String> createEncryptedProducer(
            String bootstrapServers, String encryptionKey) {

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "com.example.EncryptingSerializer");
        props.put("encryption.key", encryptionKey);

        return new KafkaProducer<>(props);
    }

    public static KafkaConsumer<String, String> createEncryptedConsumer(
            String bootstrapServers, String groupId, String encryptionKey) {

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "com.example.DecryptingDeserializer");
        props.put("encryption.key", encryptionKey);

        return new KafkaConsumer<>(props);
    }

    public static void main(String[] args) throws Exception {
        String encryptionKey = "0123456789abcdef0123456789abcdef"; // 256-bit key

        // Producer
        try (KafkaProducer<String, String> producer =
                createEncryptedProducer("localhost:9092", encryptionKey)) {

            producer.send(new ProducerRecord<>("secure-topic", "key",
                "sensitive data")).get();
            System.out.println("Encrypted message sent");
        }

        // Consumer
        try (KafkaConsumer<String, String> consumer =
                createEncryptedConsumer("localhost:9092", "secure-group", encryptionKey)) {

            consumer.subscribe(Collections.singletonList("secure-topic"));
            ConsumerRecords<String, String> records = consumer.poll(
                java.time.Duration.ofSeconds(10));

            for (ConsumerRecord<String, String> record : records) {
                System.out.println("Decrypted: " + record.value());
            }
        }
    }
}
```

### Python Client-Side Encryption

```python
from confluent_kafka import Producer, Consumer
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from confluent_kafka.serialization import Serializer, Deserializer
import os
import struct

class EncryptingSerializer(Serializer):
    def __init__(self, key: bytes):
        self.aesgcm = AESGCM(key)

    def __call__(self, obj, ctx=None):
        if obj is None:
            return None

        data = obj.encode('utf-8') if isinstance(obj, str) else obj
        nonce = os.urandom(12)
        ciphertext = self.aesgcm.encrypt(nonce, data, None)

        # Prepend nonce to ciphertext
        return nonce + ciphertext


class DecryptingDeserializer(Deserializer):
    def __init__(self, key: bytes):
        self.aesgcm = AESGCM(key)

    def __call__(self, data, ctx=None):
        if data is None:
            return None

        nonce = data[:12]
        ciphertext = data[12:]
        plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)

        return plaintext.decode('utf-8')


class EncryptedKafkaClient:
    def __init__(self, bootstrap_servers: str, encryption_key: bytes):
        self.bootstrap_servers = bootstrap_servers
        self.encryption_key = encryption_key
        self.serializer = EncryptingSerializer(encryption_key)
        self.deserializer = DecryptingDeserializer(encryption_key)

    def create_producer(self) -> Producer:
        return Producer({
            'bootstrap.servers': self.bootstrap_servers,
        })

    def create_consumer(self, group_id: str) -> Consumer:
        return Consumer({
            'bootstrap.servers': self.bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
        })

    def produce_encrypted(self, producer: Producer, topic: str,
                         key: str, value: str):
        encrypted_value = self.serializer(value)
        producer.produce(topic, key=key, value=encrypted_value)

    def consume_and_decrypt(self, consumer: Consumer, timeout: float = 1.0):
        msg = consumer.poll(timeout)
        if msg and not msg.error():
            decrypted_value = self.deserializer(msg.value())
            return {
                'key': msg.key(),
                'value': decrypted_value,
                'topic': msg.topic(),
                'partition': msg.partition(),
                'offset': msg.offset()
            }
        return None


def main():
    # 256-bit encryption key
    key = bytes.fromhex('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')

    client = EncryptedKafkaClient('localhost:9092', key)

    # Produce
    producer = client.create_producer()
    client.produce_encrypted(producer, 'secure-topic', 'key1', 'sensitive data')
    producer.flush()
    print("Encrypted message sent")

    # Consume
    consumer = client.create_consumer('secure-group')
    consumer.subscribe(['secure-topic'])

    for _ in range(10):
        result = client.consume_and_decrypt(consumer)
        if result:
            print(f"Decrypted: {result['value']}")

    consumer.close()


if __name__ == '__main__':
    main()
```

## Key Management

### Key Rotation Strategy

```java
import java.util.*;
import java.time.Instant;

public class KeyRotationManager {

    private final Map<String, KeyInfo> keys = new LinkedHashMap<>();
    private String currentKeyId;

    public void addKey(String keyId, byte[] key, Instant validFrom) {
        keys.put(keyId, new KeyInfo(key, validFrom, null));
        if (currentKeyId == null) {
            currentKeyId = keyId;
        }
    }

    public void rotateKey(String newKeyId, byte[] newKey) {
        // Mark old key as expired
        KeyInfo oldKey = keys.get(currentKeyId);
        if (oldKey != null) {
            oldKey.validUntil = Instant.now();
        }

        // Add new key
        keys.put(newKeyId, new KeyInfo(newKey, Instant.now(), null));
        currentKeyId = newKeyId;

        System.out.println("Rotated to key: " + newKeyId);
    }

    public byte[] getCurrentKey() {
        return keys.get(currentKeyId).key;
    }

    public String getCurrentKeyId() {
        return currentKeyId;
    }

    public byte[] getKey(String keyId) {
        KeyInfo info = keys.get(keyId);
        return info != null ? info.key : null;
    }

    static class KeyInfo {
        byte[] key;
        Instant validFrom;
        Instant validUntil;

        KeyInfo(byte[] key, Instant validFrom, Instant validUntil) {
            this.key = key;
            this.validFrom = validFrom;
            this.validUntil = validUntil;
        }
    }
}
```

### Envelope Encryption Pattern

```python
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import json
import base64

class EnvelopeEncryption:
    def __init__(self, kms_key_id: str):
        self.kms_client = boto3.client('kms')
        self.kms_key_id = kms_key_id

    def encrypt(self, plaintext: bytes) -> dict:
        """Encrypt data using envelope encryption."""
        # Generate data encryption key (DEK)
        response = self.kms_client.generate_data_key(
            KeyId=self.kms_key_id,
            KeySpec='AES_256'
        )

        plaintext_dek = response['Plaintext']
        encrypted_dek = response['CiphertextBlob']

        # Encrypt data with DEK
        aesgcm = AESGCM(plaintext_dek)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)

        return {
            'encrypted_dek': base64.b64encode(encrypted_dek).decode(),
            'nonce': base64.b64encode(nonce).decode(),
            'ciphertext': base64.b64encode(ciphertext).decode()
        }

    def decrypt(self, envelope: dict) -> bytes:
        """Decrypt envelope-encrypted data."""
        encrypted_dek = base64.b64decode(envelope['encrypted_dek'])
        nonce = base64.b64decode(envelope['nonce'])
        ciphertext = base64.b64decode(envelope['ciphertext'])

        # Decrypt DEK using KMS
        response = self.kms_client.decrypt(CiphertextBlob=encrypted_dek)
        plaintext_dek = response['Plaintext']

        # Decrypt data with DEK
        aesgcm = AESGCM(plaintext_dek)
        return aesgcm.decrypt(nonce, ciphertext, None)


class EnvelopeEncryptingSerializer:
    def __init__(self, kms_key_id: str):
        self.envelope = EnvelopeEncryption(kms_key_id)

    def serialize(self, value: str) -> bytes:
        envelope = self.envelope.encrypt(value.encode())
        return json.dumps(envelope).encode()

    def deserialize(self, data: bytes) -> str:
        envelope = json.loads(data.decode())
        return self.envelope.decrypt(envelope).decode()
```

## Best Practices

1. **Use strong encryption**: AES-256-GCM for symmetric encryption
2. **Protect encryption keys**: Use HSM or KMS for key storage
3. **Rotate keys regularly**: At least annually, more often for sensitive data
4. **Support key versioning**: Allow decryption with old keys during rotation
5. **Monitor encryption status**: Alert on unencrypted data volumes
6. **Document procedures**: Key recovery, rotation, and incident response

## Conclusion

Encrypting Kafka data at rest requires a layered approach combining filesystem-level encryption for comprehensive protection and client-side encryption for sensitive fields. Use cloud provider encryption for simplified key management in cloud deployments. Implement proper key management with rotation and versioning to maintain security over time. The choice of encryption method depends on your compliance requirements, performance needs, and operational capabilities.
