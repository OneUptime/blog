# How to Use AES_ENCRYPT() and AES_DECRYPT() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, AES, Encryption, Security, Function

Description: Learn how to use MySQL's AES_ENCRYPT() and AES_DECRYPT() functions to encrypt and decrypt sensitive data stored in MySQL tables using AES-128 or AES-256.

---

## Introduction

MySQL provides `AES_ENCRYPT()` and `AES_DECRYPT()` for symmetric encryption of data stored in the database. These functions use the Advanced Encryption Standard (AES) algorithm, which is currently considered secure. They are useful for encrypting sensitive data like social security numbers, payment tokens, or personal identifiers that must be stored in the database but protected from unauthorized access.

## Basic Syntax

```sql
AES_ENCRYPT(str, key_str [, init_vector [, kdf_name [, salt [, info | iterations]]]])
AES_DECRYPT(crypt_str, key_str [, init_vector [, kdf_name [, salt [, info | iterations]]]])
```

The simplest form uses just the string and a key:

```sql
AES_ENCRYPT(plaintext, key)
AES_DECRYPT(ciphertext, key)
```

## Setting the Block Encryption Mode

Before using AES functions, configure the encryption mode with the `block_encryption_mode` system variable:

```sql
SET block_encryption_mode = 'aes-256-cbc';
```

Common modes:
- `aes-128-ecb` - AES-128 in ECB mode (no IV, less secure, default)
- `aes-256-cbc` - AES-256 in CBC mode (requires IV, more secure)
- `aes-256-ofb` - AES-256 in OFB mode (requires IV, stream cipher mode)

## Basic Encryption and Decryption

```sql
SET @key = 'my_secret_key_32_chars_long_here';

-- Encrypt
SELECT AES_ENCRYPT('sensitive data', @key);

-- Decrypt
SELECT AES_DECRYPT(AES_ENCRYPT('sensitive data', @key), @key);
-- Returns: sensitive data
```

## Using CBC Mode with an Initialization Vector

CBC mode requires a random initialization vector (IV) for each encryption operation:

```sql
SET block_encryption_mode = 'aes-256-cbc';

SET @key = SHA2('my_strong_passphrase', 256);
SET @iv  = RANDOM_BYTES(16);

-- Encrypt
SET @encrypted = AES_ENCRYPT('John Doe SSN: 123-45-6789', @key, @iv);

-- Decrypt
SELECT AES_DECRYPT(@encrypted, @key, @iv);
```

The IV must be stored alongside the ciphertext to enable decryption later.

## Storing Encrypted Data

Design the table to store both the ciphertext and the IV:

```sql
CREATE TABLE sensitive_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  encrypted_ssn VARBINARY(256) NOT NULL,
  ssn_iv BINARY(16) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET block_encryption_mode = 'aes-256-cbc';
SET @key = SHA2('application_secret_key', 256);
SET @iv  = RANDOM_BYTES(16);

INSERT INTO sensitive_records (user_id, encrypted_ssn, ssn_iv)
VALUES (42, AES_ENCRYPT('123-45-6789', @key, @iv), @iv);
```

## Decrypting Stored Data

```sql
SET block_encryption_mode = 'aes-256-cbc';
SET @key = SHA2('application_secret_key', 256);

SELECT
  id,
  user_id,
  CAST(AES_DECRYPT(encrypted_ssn, @key, ssn_iv) AS CHAR) AS ssn
FROM sensitive_records
WHERE user_id = 42;
```

## Searching Encrypted Data

Because encrypted values differ even for the same plaintext (when using CBC with random IV), you cannot directly query encrypted columns. One approach is to encrypt the search value with a deterministic method:

```sql
-- Using ECB mode (deterministic) for searchable encryption
SET block_encryption_mode = 'aes-128-ecb';
SET @key = SHA2('search_key', 256);

SELECT * FROM records
WHERE AES_ENCRYPT(search_term, @key) = encrypted_column;
```

Note: ECB mode is less secure. Consider application-level search over encrypted fields for higher security requirements.

## Important Security Considerations

- Never hardcode encryption keys in SQL queries - pass keys from application configuration
- Use AES-256-CBC rather than ECB mode
- Always use a fresh random IV per encryption operation in CBC mode
- Consider column-level encryption at the application layer (using libraries like SQLAlchemy, Hibernate) for more control

```python
# Better: encrypt at application level
from cryptography.fernet import Fernet
key = Fernet.generate_key()
f = Fernet(key)
encrypted = f.encrypt(b"sensitive data")
```

## Summary

MySQL's `AES_ENCRYPT()` and `AES_DECRYPT()` provide database-level symmetric encryption for sensitive data. Use `aes-256-cbc` mode with a random IV per record for security. Store the IV alongside ciphertext, derive keys from strong passphrases using `SHA2()`, and never embed encryption keys in queries. For high-security applications, prefer application-layer encryption to keep keys outside the database entirely.
