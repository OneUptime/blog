# How to Implement Column-Level Encryption in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Encryption, Security, Column, AES

Description: Learn how to implement column-level encryption in MySQL using AES_ENCRYPT and AES_DECRYPT functions to protect sensitive fields like SSNs and credit cards.

---

While tablespace encryption protects files at rest, column-level encryption allows you to encrypt only specific sensitive fields - such as Social Security Numbers, credit card numbers, or medical records - while leaving other columns unencrypted. MySQL provides built-in `AES_ENCRYPT` and `AES_DECRYPT` functions for this purpose.

## MySQL's Encryption Functions

MySQL provides these cryptographic functions:

- `AES_ENCRYPT(data, key)` - Encrypts data using AES
- `AES_DECRYPT(data, key)` - Decrypts AES-encrypted data
- `SHA2(data, bits)` - One-way hash (SHA-256, SHA-512)
- `MD5(data)` - MD5 hash (legacy, not recommended for security)

## Creating a Table with Encrypted Columns

Store encrypted data in `VARBINARY` or `BLOB` columns:

```sql
CREATE TABLE customer_pii (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  ssn_encrypted VARBINARY(256),
  credit_card_encrypted VARBINARY(256),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
```

## Inserting Encrypted Data

```sql
-- Set a session-level key (use a proper key management system in production)
SET @encryption_key = SHA2('your-secret-passphrase', 256);

-- Insert with encrypted columns
INSERT INTO customer_pii (full_name, email, ssn_encrypted, credit_card_encrypted)
VALUES (
  'Jane Doe',
  'jane.doe@example.com',
  AES_ENCRYPT('123-45-6789', @encryption_key),
  AES_ENCRYPT('4111-1111-1111-1111', @encryption_key)
);
```

## Reading Encrypted Data

```sql
SET @encryption_key = SHA2('your-secret-passphrase', 256);

SELECT
  id,
  full_name,
  email,
  CAST(AES_DECRYPT(ssn_encrypted, @encryption_key) AS CHAR) AS ssn,
  CAST(AES_DECRYPT(credit_card_encrypted, @encryption_key) AS CHAR) AS credit_card
FROM customer_pii
WHERE email = 'jane.doe@example.com';
```

## Configuring AES Block Mode

MySQL 5.6.17+ supports configuring the AES cipher mode. Use CBC for stronger security:

```sql
-- Check current mode
SELECT @@block_encryption_mode;

-- Set to AES-256-CBC (more secure than default ECB)
SET GLOBAL block_encryption_mode = 'aes-256-cbc';
```

With CBC mode, you must also pass an initialization vector. First, add a column to store the IV:

```sql
ALTER TABLE customer_pii ADD COLUMN iv VARBINARY(16);
```

Then encrypt and decrypt with the IV:

```sql
SET @iv = RANDOM_BYTES(16);

-- Encrypt with IV
UPDATE customer_pii
SET ssn_encrypted = AES_ENCRYPT('123-45-6789', @encryption_key, @iv),
    iv = @iv
WHERE id = 1;

-- Decrypt with IV
SELECT CAST(AES_DECRYPT(ssn_encrypted, @encryption_key, iv) AS CHAR) AS ssn
FROM customer_pii
WHERE id = 1;
```

## Searching Encrypted Columns

Encrypted columns cannot be searched with `WHERE ssn = '...'`. Create a searchable hash column instead:

```sql
ALTER TABLE customer_pii ADD COLUMN ssn_hash CHAR(64);

-- Store a deterministic hash for lookups
UPDATE customer_pii
SET ssn_hash = SHA2(CONCAT('123-45-6789', 'search-salt'), 256)
WHERE id = 1;

-- Search by hash
SELECT * FROM customer_pii
WHERE ssn_hash = SHA2(CONCAT('123-45-6789', 'search-salt'), 256);
```

## Application-Level Encryption (Recommended for Production)

For production systems, encrypt at the application layer to keep the key out of the database entirely:

```python
from cryptography.fernet import Fernet

key = Fernet.generate_key()
f = Fernet(key)

encrypted_ssn = f.encrypt(b"123-45-6789")
decrypted_ssn = f.decrypt(encrypted_ssn)
```

## Summary

Column-level encryption in MySQL uses `AES_ENCRYPT` and `AES_DECRYPT` to protect individual sensitive fields. Use `VARBINARY` columns to store encrypted values, enable CBC mode for stronger security, and store the IV alongside encrypted data. For production, consider application-layer encryption with key management outside MySQL entirely to prevent database administrators from accessing decryption keys.
