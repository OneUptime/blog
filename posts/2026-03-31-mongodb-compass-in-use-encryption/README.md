# How to Use MongoDB Compass In-Use Encryption Feature

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compass, Encryption, Security, CSFLE

Description: Learn how to use MongoDB Compass to work with Client-Side Field Level Encryption to view and edit encrypted fields transparently.

---

## What Is In-Use Encryption?

MongoDB's in-use encryption (also called Client-Side Field Level Encryption, or CSFLE) encrypts specific document fields on the client before they are sent to the database. The server stores and returns encrypted blobs - it never sees the plaintext. Only clients with the correct encryption key can read the actual values.

Compass supports CSFLE through its In-Use Encryption feature, letting you view and edit encrypted fields as if they were plain text.

## Supported Key Management Services

Compass supports the following KMS providers for managing data encryption keys:

- AWS KMS
- Azure Key Vault
- Google Cloud KMS
- KMIP (Key Management Interoperability Protocol)
- Local master key (for development only)

## Enabling In-Use Encryption in Compass

1. Open a new connection in Compass
2. Go to Advanced Connection Options
3. Click the In-Use Encryption tab
4. Toggle Enable In-Use Encryption on

## Configuring a Local Key (Development)

For local development without a cloud KMS, use a local master key:

```text
KMS Provider: Local
Local Master Key: <96 bytes of base64-encoded random data>
```

Generate a local key:

```bash
openssl rand -base64 96
```

Paste the output into the Local Master Key field.

## Configuring AWS KMS

```text
KMS Provider:     AWS
Access Key ID:    AKIAIOSFODNN7EXAMPLE
Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Session Token:    (optional, for temporary credentials)
```

The AWS IAM principal needs `kms:Encrypt`, `kms:Decrypt`, and `kms:GenerateDataKey` permissions on the CMK.

## Setting the Key Vault Namespace

The key vault is a MongoDB collection that stores encrypted data encryption keys (DEKs). Specify it as:

```text
Key Vault Namespace: encryption.__keyVault
```

## Connecting and Viewing Encrypted Fields

After configuring In-Use Encryption and connecting, navigate to a collection that uses CSFLE. Fields that are encrypted will display their actual decrypted values in Compass instead of the raw binary blobs that an unencrypted client would see.

Encrypted fields appear with a lock icon to indicate they are stored encrypted on the server.

## Inserting a Document with Encrypted Fields

When In-Use Encryption is active in Compass, inserting a document through the Documents tab will automatically encrypt fields that are defined as encrypted in the collection's schema:

```json
{
  "name": "Alice Johnson",
  "ssn": "123-45-6789",
  "creditCard": "4111111111111111",
  "address": "123 Main St"
}
```

If `ssn` and `creditCard` are configured for deterministic or random encryption, Compass encrypts them before sending to the server.

## Schema Map Configuration

For Compass to know which fields to encrypt, provide a JSON schema map in the In-Use Encryption section:

```json
{
  "mydb.patients": {
    "bsonType": "object",
    "properties": {
      "ssn": {
        "encrypt": {
          "keyId": [{ "$uuid": "your-key-uuid" }],
          "bsonType": "string",
          "algorithm": "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
        }
      }
    }
  }
}
```

Deterministic encryption produces the same ciphertext for the same value, enabling equality queries. Random encryption is more secure but prevents querying on the encrypted field.

## Limitations

- Range queries on encrypted fields require Queryable Encryption (available in MongoDB 7.0+)
- Full aggregation pipeline support depends on the field encryption type
- In-Use Encryption is not available for M0 free tier clusters

## Summary

Compass's In-Use Encryption feature lets developers and DBAs work with CSFLE-protected collections without writing custom decryption code. Configure your KMS provider, set the key vault namespace, provide a schema map, and Compass handles encryption and decryption transparently. Use a local key for development and a cloud KMS for production environments.
