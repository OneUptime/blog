# PCI DSS 4.0.1 Requirement 3.5.1.2: PAN on Non-Removable Media

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security, Encryption

Description: Determine when disk encryption is insufficient for stored PAN and design a verifiable additional protection mechanism under PCI DSS Requirement 3.5.1.2.

---

An encrypted server disk can still return clear-text card numbers to every process with sufficient access after startup. That distinction is central to PCI DSS Requirement 3.5.1.2: protection against a stolen drive does not necessarily restrict access to PAN on an operating system that is already running.

Evaluate the decryption behavior of the whole storage path, not the presence of an “encryption enabled” checkbox.

## Start with the exact requirement

In PCI DSS v4.0.1, Requirement 3.5.1.2 permits disk or partition encryption as the PAN-unreadability mechanism on removable electronic media. When used on non-removable electronic media, another mechanism meeting Requirement 3.5.1 must also render PAN unreadable.

The applicability notes extend the concern to encryption that automatically exposes clear-text PAN when a system runs without an authorized user specifically requesting the data. They also classify media within data-center architecture, such as hot-swappable drives and bulk tape backups, as non-removable for this purpose. A drive being physically detachable is therefore not enough to classify it as removable.

Review both the requirement and its notes in the [PCI DSS v4.0.1 standard](https://www.pcisecuritystandards.org/document_library/). The requirement's March 2025 implementation date has passed.

## Describe the protection boundary

Create a short record for every PAN-bearing repository:

| Question | Example answer |
|---|---|
| Where is PAN persisted? | Payment database, replicas, backups |
| What encrypts the storage? | Cloud volume encryption |
| When is it decrypted? | Automatically during volume reads |
| What additional protection exists? | PAN encrypted before database insertion |
| Who can obtain clear-text PAN? | Dedicated service with a narrowly scoped decrypt permission |
| What evidence demonstrates this? | Storage inspection and denied-access tests |

Extend the review to search indexes, analytics copies, database logs, dumps, caches with persistence, and failed batch exports. A protected database column does not help if an application writes the input to a troubleshooting file first.

Ask vendors for architectural documentation that identifies the encryption layer, key handling, and access behavior. Product names such as transparent encryption or storage encryption do not establish whether a particular implementation satisfies the requirement.

## Choose a mechanism that matches the business need

If the application does not need to recover the full PAN, remove that capability. Suitable truncation or an appropriately designed tokenization system may meet the operational need without keeping a reversible full PAN in the application database.

If full PAN must remain recoverable, a data-level encryption design can give the application ciphertext to store while restricting decryption to an explicitly authorized path. File, column, or field encryption must still be evaluated against the full requirements and implementation.

For a concrete design, separate these responsibilities:

1. A collection service receives payment details through the approved channel.
2. A cryptographic service applies the organization's approved encryption scheme.
3. The application persists ciphertext and the necessary nonsecret format metadata.
4. A narrowly authorized service requests decryption only for defined operations.
5. Audit events record the identity, purpose, and record reference without storing PAN.

Use established cryptographic libraries or managed services and a reviewed key architecture. Do not invent an encryption format for this project.

## Make key access part of the design

Encryption becomes weak operational protection when the same broad administrator role can retrieve both the ciphertext and its keys. Review Requirements 3.6 and 3.7 for key protection and lifecycle management, including access restrictions, storage, rotation, and retirement.

When disk or partition encryption is used to render PAN unreadable, Requirement 3.5.1.3 also specifies separation from native operating-system authentication and access controls, treatment of decryption keys, and protection of authentication factors. Adding data-level protection does not justify ignoring applicable key-management controls.

Document emergency access and recovery dependencies. If historical backups depend on retired keys, the retirement process must reconcile recovery needs, retention obligations, and secure disposal.

## Validate what each identity can actually do

Use synthetic records in an environment representative of production. Test the storage account, backup operator, database reader, application identity, and decryption service separately.

Confirm that raw persistent copies contain the intended protected representation. Then prove that an identity permitted to retrieve a backup or read the protected column cannot decrypt PAN without the separately authorized capability.

Inspect database exports and restore procedures too. Some tools export the logical clear-text values they receive through authorized queries, even when the underlying database files are encrypted. Those exports create a new protection obligation.

Retain configuration versions, diagrams, access decisions, and test outcomes as evidence. Do not attach actual card numbers to the assessment package.

## Check the narrow issuing exception

The applicability notes provide an exception for issuers and companies supporting issuing services when PAN is accessed for real-time transaction processing. PAN stored for other purposes remains covered.

A merchant application does not gain that exception simply because it processes transactions quickly. Determine your role and data use before relying on it.

A successful implementation can explain where PAN is stored, why each copy is unreadable, when decryption occurs, and who can authorize it. That explanation is more useful than counting encryption features.
