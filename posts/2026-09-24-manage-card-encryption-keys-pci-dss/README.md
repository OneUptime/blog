# How to Store, Rotate, and Restrict Access to Card-Encryption Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Encryption Key Management, Security

Description: Separate card-data encryption keys from data, restrict key operations, define cryptoperiods, and test rotation, compromise response, and recovery.

---

Card-data encryption is only as useful as the control over its keys. If a database reader can also retrieve a plaintext key from the same configuration store, encryption may offer little protection against that reader or an attacker using the account.

Build a key-management design around operations and identities. Document who can generate, use, rotate, disable, recover, and destroy each key, including the systems that can grant those privileges.

## Inventory the key hierarchy

Distinguish data-encryption keys from key-encryption keys. The first protect the account data; the second protect other keys. An envelope-encryption design can store a wrapped data key alongside ciphertext while keeping the wrapping key in a separately controlled cryptographic service.

Record the following for each key type:

```text
purpose: encrypt PAN records
owner: payment security
key class: data-encryption key
protection: wrapped by designated key-encryption key
allowed operations: encrypt/decrypt through vault service
cryptoperiod: documented policy and rationale
retirement behavior: no new encryption; restricted historical decryption
recovery dependency: approved backup and key-service recovery process
```

Include algorithm and strength, key identifiers, dependent datasets, authorized identities, and storage locations in the inventory. Keep raw key material out of the inventory itself.

## Choose a permitted storage arrangement

Requirement 3.6.1.2 of [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/) describes acceptable protection for secret and private keys, including wrapping with a suitably strong separate key, secure cryptographic devices, and appropriate full-length components or shares.

An HSM-backed managed key service can support this design, but the product name alone does not prove that the application uses it correctly. Check which keys can leave the service in plaintext and where they appear in application memory, configuration, or backups.

Do not split a key string into two halves and call that split knowledge. Requirement 3.7.6 concerns manual cleartext key-management operations and specifies appropriate split-knowledge and dual-control handling. Use established cryptographic components and procedures rather than improvised secret sharing.

## Separate administration from data access

Give the payment vault the minimum cryptographic operations it needs. A routine application writer should not be able to change key policy, export key material, or schedule destruction. A key administrator should not receive decrypt access merely because they maintain rotation settings.

Evaluate indirect privilege escalation too. An identity that can edit a key policy or assume the vault's runtime role may be able to grant itself data access. Review these paths alongside direct permissions.

Require approval and auditable execution for destructive changes. Protect the credentials and deployment systems that manage key policy. Collect logs of permitted and denied cryptographic operations, but exclude plaintext keys and account data from those records.

## Define rotation by key type

Requirement 3.7.4 requires defined cryptoperiods and processes for changing keys at their end. It does not mandate one universal “rotate every 90 days” schedule for all key types. Use the application vendor's guidance, the key owner's documented decision, and relevant industry guidance.

Specify what rotation actually changes. Replacing a wrapping key, rewrapping data keys, replacing data keys, and re-encrypting stored PAN are different operations with different effects.

For example, [AWS KMS documents](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html) that rotating KMS key material does not rotate generated data keys or re-encrypt existing data. It also does not mitigate a compromised data key. An “automatic rotation enabled” screenshot therefore cannot demonstrate that every part of a card-data encryption design is rotated appropriately.

## Plan for compromise and retirement

Requirement 3.7.5 addresses retirement, replacement, or destruction when keys reach their cryptoperiod, have weakened integrity, or are suspected or known to be compromised. Retired keys must not encrypt new data.

Write an incident procedure that identifies affected datasets, stops unauthorized use, replaces the relevant keys, and determines whether data needs re-encryption. If an attacker obtained a plaintext data key and ciphertext, rotating only the wrapping key does not undo that exposure.

Retain old keys only where needed to decrypt protected historical data, under controlled access. Before destruction, inventory all dependent backups and legal retention needs. A successful deletion API call is not a recovery plan.

## Exercise the lifecycle

In a non-production environment, create a synthetic record, rotate the appropriate keys, confirm that new writes use the intended version, and verify permitted historical reads. Then test denied identities, an unavailable key service, and a recovery scenario.

Restore a representative encrypted backup with the documented recovery identities. Confirm that key administrators cannot silently use an alternative route to bypass the application's authorization checks.

Keep the key inventory, policy exports, rotation events, approval records, and exercise results together. Review them after architectural changes. The goal is a key lifecycle that remains understandable during both routine maintenance and an actual compromise.
