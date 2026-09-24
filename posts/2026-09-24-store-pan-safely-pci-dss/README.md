# How to Store a PAN Safely When Business Requirements Make It Unavoidable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Encryption, Data Security

Description: Isolate unavoidable PAN storage, apply data-level protection and key separation, constrain retrieval, and verify retention across replicas and backups.

---

If a business process truly requires recoverable PAN, build a small, explicitly controlled storage service around that requirement. Keeping card numbers in a general customer table because a future feature might need them creates a large security and retention problem before there is a demonstrated benefit.

Start with a written owner-approved reason: which operation needs the full PAN, who performs it, how frequently, and for how long. Challenge whether a processor reference or truncated identifier can meet the same need.

## Separate PAN from prohibited authentication data

PAN is cardholder data and can be stored when necessary under the applicable PCI DSS controls. Card verification codes, full track data, and PIN/PIN-block information are sensitive authentication data with different rules.

For an ordinary merchant, do not retain sensitive authentication data after authorization, even encrypted. The specialized exception for issuers and issuing-service entities should not be generalized to merchant storage. [PCI SSC FAQ 1318](https://www.pcisecuritystandards.org/faqs/1318/) explains retention expectations and the post-authorization prohibition.

Define an input schema that accepts only the permitted fields for the specific operation. Prevent generic request objects from being written into the vault, audit log, or retry queue.

## Use a narrow vault interface

Keep the PAN repository behind a service whose API expresses business operations. Ordinary applications should work with opaque record identifiers and safe display metadata.

An example interface is:

```text
create_payment_record(authorized_input) -> record_id, display_last4
submit_to_approved_processor(record_id, operation_context) -> result
delete_payment_record(record_id, retention_reason) -> deletion_result
```

Avoid a broadly available `get_all_cards` or bulk-decrypt endpoint. Where full-PAN retrieval is unavoidable, require a distinct permission, explicit purpose, constrained response, and an audit event identifying the requester and record without including the PAN itself.

Treat the vault runtime and the systems that administer it as part of the scope analysis. Network isolation cannot compensate for a general deployment identity that can replace the vault code.

## Protect the data at the appropriate layer

Requirement 3.5.1 of [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/) covers rendering stored PAN unreadable. Select the method that matches the operation: truncation when reconstruction is unnecessary, a suitable token design, or strong cryptography with managed keys when recovery is required.

For non-removable media, disk or partition encryption alone is insufficient under Requirement 3.5.1.2. Review what the database or storage product actually encrypts and when plaintext becomes available. Do not infer suitability merely from a console checkbox labeled “encryption enabled.”

Use a mature encryption library or service rather than inventing a format. If using envelope encryption, record the protected data, wrapped data key, key identifier, algorithm/version metadata, and any authenticated context required by the implementation. Protect the wrapping key separately, and verify the concrete design against Requirement 3.6.

Encryption does not by itself remove the repository from PCI scope, as [PCI SSC FAQ 1086](https://www.pcisecuritystandards.org/faqs/1086/) confirms.

## Make plaintext access exceptional

Give routine applications only the operations they require. Separate identities that administer keys from identities that invoke permitted cryptographic operations. Avoid giving database operators unrestricted decrypt permissions simply because they maintain the database.

Inspect exports, query tools, support screens, caches, and crash dumps. A well-encrypted main table offers little protection if a troubleshooting job writes plaintext into object storage.

Apply masking before data crosses into ordinary support interfaces. Use last-four display values when they are sufficient. If a role needs more digits, document the business justification and enforce it on the server, not only in the browser.

## Design deletion and recovery together

Define retention by business purpose. PCI DSS does not supply one universal maximum PAN retention period; [FAQ 1318](https://www.pcisecuritystandards.org/faqs/1318/) requires a justified retention and disposal policy.

Map deletion across primary records, replicas, exports, caches, and backups. Define how an old backup is restored without reintroducing records already due for deletion. Keep historical copies protected while they remain recoverable, and test the retention process with synthetic records.

Do not destroy a key without understanding every record and backup that depends on it. Conversely, do not retain obsolete keys indefinitely without a documented reason and restricted decryption-only use where appropriate.

## Validate the complete path

Test an authorized operation and multiple denied operations: wrong customer, wrong service identity, unauthorized export, expired retention, and unavailable key service. Confirm that failures do not disclose plaintext through exceptions or operational logs.

Collect the schema, key policies, access decisions, audit records, recovery exercise, and deletion evidence. Review them with the assessment owner against the full applicable requirements. A defensible vault is a controlled lifecycle for PAN, not simply an encrypted column.
