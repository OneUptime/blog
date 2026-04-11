# How to Use RANDOM_BYTES() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Random, Security, Function, Cryptography

Description: Learn how to use MySQL's RANDOM_BYTES() function to generate cryptographically secure random byte strings for tokens, initialization vectors, and salts.

---

## Introduction

`RANDOM_BYTES()` is MySQL's function for generating cryptographically secure random byte strings. Unlike `RAND()` which generates pseudo-random floating-point numbers, `RANDOM_BYTES()` uses the operating system's cryptographic random number generator, making it suitable for security-sensitive use cases like generating tokens, salts, initialization vectors (IVs) for AES encryption, and unique identifiers.

## Basic Syntax

```sql
RANDOM_BYTES(len)
```

- `len` - the number of random bytes to generate (must be between 1 and 1024)
- Returns a binary string of the specified length
- Each call generates a different result

## Basic Examples

```sql
-- Generate 16 random bytes
SELECT RANDOM_BYTES(16);
-- Returns: binary data (16 bytes)

-- View as hex
SELECT HEX(RANDOM_BYTES(16));
-- Returns something like: A3F72B8E1C9D4052E67A3B1F8C2D5E70

-- Generate different lengths
SELECT HEX(RANDOM_BYTES(8))  AS bytes_8;
SELECT HEX(RANDOM_BYTES(32)) AS bytes_32;
SELECT HEX(RANDOM_BYTES(64)) AS bytes_64;
```

## Generating Secure Tokens

Use `RANDOM_BYTES()` to create secure tokens for password resets, API keys, or session tokens:

```sql
-- Generate a 32-byte (256-bit) token as hex string
SELECT HEX(RANDOM_BYTES(32)) AS reset_token;
-- Returns: 64-character hex string

-- Store as part of an INSERT
INSERT INTO password_resets (user_id, token, expires_at)
VALUES (
  42,
  HEX(RANDOM_BYTES(32)),
  DATE_ADD(NOW(), INTERVAL 1 HOUR)
);
```

## Using RANDOM_BYTES() as AES Initialization Vector

The most common use of `RANDOM_BYTES()` in MySQL is generating IVs for AES encryption in CBC mode:

```sql
SET block_encryption_mode = 'aes-256-cbc';
SET @key = UNHEX(SHA2('my_encryption_key', 256));
SET @iv  = RANDOM_BYTES(16);  -- AES-CBC requires 16-byte IV

-- Encrypt with random IV
INSERT INTO secure_data (user_id, encrypted_value, iv)
VALUES (
  1,
  AES_ENCRYPT('sensitive value', @key, @iv),
  @iv
);
```

Storing a unique IV per row ensures that even if two rows contain the same plaintext, the ciphertext differs.

## Generating Salts for Custom Hashing

```sql
-- Generate a random salt and hash a value with it
SET @salt = HEX(RANDOM_BYTES(16));
SET @value = 'data_to_hash';
SELECT SHA2(CONCAT(@salt, @value), 256) AS salted_hash, @salt AS salt;
```

Store both the salt and hash together. To verify:

```sql
SELECT SHA2(CONCAT(stored_salt, 'data_to_hash'), 256) = stored_hash AS valid
FROM hash_store WHERE id = 1;
```

## Generating UUID-Like Identifiers

```sql
-- Generate a random 128-bit ID similar to UUID v4
SELECT LOWER(
  CONCAT(
    HEX(RANDOM_BYTES(4)), '-',
    HEX(RANDOM_BYTES(2)), '-',
    HEX(RANDOM_BYTES(2)), '-',
    HEX(RANDOM_BYTES(2)), '-',
    HEX(RANDOM_BYTES(6))
  )
) AS random_uuid;
-- Returns: a3f72b8e-1c9d-4052-e67a-3b1f8c2d5e70
```

Note: `UUID()` is preferred for standard UUID v1 generation; use the above only when you need fully random IDs.

## Constraints and Error Handling

```sql
-- len must be 1-1024
SELECT RANDOM_BYTES(0);
-- ERROR 1690 (22003): value is out of range in 'random_bytes'

SELECT RANDOM_BYTES(1025);
-- ERROR 1690 (22003): value is out of range in 'random_bytes'

SELECT RANDOM_BYTES(NULL);
-- Returns: NULL
```

## Comparison with RAND()

```sql
-- RAND() - pseudo-random float, NOT cryptographically secure
SELECT RAND();       -- 0.12345678...

-- RANDOM_BYTES() - cryptographically secure binary
SELECT HEX(RANDOM_BYTES(8));  -- cryptographically unpredictable
```

Never use `RAND()` for security tokens, IVs, or salts. Always use `RANDOM_BYTES()` for security-sensitive randomness.

## Summary

`RANDOM_BYTES()` is MySQL's cryptographically secure random byte generator. Use it for AES encryption IVs (16 bytes for CBC mode), security tokens (32+ bytes for sufficient entropy), custom salts for hashing workflows, and any other use case requiring unpredictable random data. Convert to hex with `HEX()` for human-readable output or store as `BINARY(n)` for compact storage.
