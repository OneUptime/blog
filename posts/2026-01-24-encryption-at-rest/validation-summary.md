# Validation Summary: How to Handle Encryption at Rest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js crypto
- Mongoose
- Python cryptography
- SQLAlchemy
- PostgreSQL pgcrypto
- MySQL InnoDB tablespace encryption and keyring components
- MongoDB encryption at rest and Client-Side Field Level Encryption
- AWS S3 server-side encryption
- Kubernetes API data encryption at rest
- AWS KMS envelope encryption

## Sources Consulted
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Python cryptography AESGCM documentation: https://cryptography.io/en/latest/hazmat/primitives/aead/
- SQLAlchemy custom types documentation: https://docs.sqlalchemy.org/en/latest/core/custom_types.html
- Mongoose middleware documentation: https://mongoosejs.com/docs/middleware.html
- PostgreSQL encryption options documentation: https://www.postgresql.org/docs/current/encryption-options.html
- PostgreSQL pgcrypto documentation: https://www.postgresql.org/docs/current/pgcrypto.html
- MySQL keyring_file deprecation notice: https://dev.mysql.com/doc/refman/8.0/en/keyring-file-plugin.html
- MySQL component_keyring_file documentation: https://dev.mysql.com/doc/refman/8.0/en/keyring-file-component.html
- MySQL InnoDB data-at-rest encryption documentation: https://docs.oracle.com/cd/E17952_01/mysql-8.0-en/innodb-data-encryption.html
- MongoDB encryption at rest documentation: https://www.mongodb.com/docs/manual/tutorial/configure-encryption/
- MongoDB Node.js ClientEncryption API documentation: https://mongodb.github.io/node-mongodb-native/3.6/api/ClientEncryption.html
- AWS SDK for JavaScript S3 PutObjectCommand documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/PutObjectCommand/
- Kubernetes encrypting confidential data at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- AWS KMS GenerateDataKey documentation: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html

## Issues Found
- PostgreSQL TDE section incorrectly stated that PostgreSQL 16+ supports built-in TDE and showed non-stock `postgresql.conf` settings. Updated the section to state that stock PostgreSQL 16 does not provide built-in TDE, and kept `pgcrypto` as the column-encryption option.
- MySQL TDE section used the deprecated `keyring_file` plugin configuration. Updated it to show `component_keyring_file`, which MySQL documentation recommends instead of `keyring_file` as of MySQL 8.0.34.
- Python SQLAlchemy example referenced `Column`, `Integer`, and `Base` without defining them. Added the missing SQLAlchemy imports and `declarative_base()` setup so the model example is complete.

## Review Notes
- The AES-GCM examples use random nonces/IVs and authentication tags correctly. A 12-byte nonce is the standard recommendation for AES-GCM; the Python example already uses 12 bytes.
- The Kubernetes `aesgcm` provider snippet is valid, but production deployments should pair it with key rotation discipline because nonce exhaustion or key reuse mistakes are serious for AES-GCM.
- The MongoDB at-rest encryption configuration is valid for MongoDB Enterprise or Atlas-backed encryption, not for every self-managed Community deployment.
