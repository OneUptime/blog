# How to Set and Verify a PCI DSS Cardholder-Data Retention and Deletion Schedule

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Data Protection, Compliance

Description: Define PCI DSS retention by business purpose and data copy, automate disposal, and verify that expired account data is securely removed.

---

A retention policy is incomplete if it describes the production database but ignores its replicas, exports, and backups. The practical task is to determine why each copy of account data exists, when that purpose ends, and how the organization verifies that the copy is no longer recoverable when required.

PCI DSS v4.0.1 Requirement 3.2.1 requires minimizing account-data storage, documented retention justification, disposal processes, and verification at least every three months that data beyond the defined retention period has been securely deleted or rendered unrecoverable. It does not prescribe one universal PAN retention period. [PCI DSS v4.0.1, 3.2.1](https://www.pcisecuritystandards.org/document_library/)

## Separate data classes before choosing durations

Inventory PAN, other cardholder data stored with it, provider tokens, limited display data, and sensitive authentication data (SAD). Give each category a documented purpose and handling rule.

For ordinary merchant processing, SAD such as card verification codes must not be retained after authorization, even if encrypted. A business retention schedule does not create an exception. The standard has specific provisions for issuers and entities supporting issuing services; do not apply them to an ordinary merchant workflow. Retention controls also cover SAD held before authorization. [PCI DSS v4.0.1, 3.2.1 and 3.3](https://www.pcisecuritystandards.org/document_library/)

Challenge whether PAN is needed at all. A provider reference may support refunds or reconciliation without keeping the card number. Record the actual business dependency rather than assuming every payment-related record requires full account data.

## Define a retention rule per purpose and copy

Work with the business owner and the relevant legal or regulatory decision makers to establish the required period. Do not borrow an arbitrary duration from another company's checklist.

A retention register should include:

| Field | Decision to record |
|---|---|
| Data and purpose | What is retained and why |
| Locations | Primary, replicas, exports, archives, and provider copies |
| Retention clock | Which event starts the period |
| Duration | Approved period and supporting obligation or business reason |
| Disposal | Method for each storage technology |
| Exceptions | Approved handling, owner, and review date |
| Verification | Query, report, or test demonstrating expiry enforcement |

Define the clock precisely. “Keep for 30 days” is ambiguous unless it means 30 days after capture, settlement, account closure, or another event. Any example interval is a business design choice, not a PCI requirement.

## Implement expiry as a managed data lifecycle

Attach the retention category and expiry event to the record or its governing dataset. Use scheduled disposal or lifecycle mechanisms appropriate to the storage system. Include retries, partial-failure detection, and alerting when deletion stops progressing.

Cover secondary representations. Deleting a database row can leave its content in indexes, replicas, historical versions, transaction logs, exports, or snapshots. Understand what each service's deletion mechanism actually removes and when remaining copies become unrecoverable.

For immutable backups, design retention and expiry before ingesting account data. A backup lock that exceeds the approved retention period creates a design issue; it is not automatically a PCI exception. If using cryptographic erasure, verify that the affected ciphertext cannot be recovered using surviving keys, replicas, escrow, or restored key material. Merely disabling a key temporarily is not destruction.

## Coordinate provider and geographic copies

When a TPSP stores account data, work with it to understand how disposal requirements are met, including geographic instances of the data. Record provider commitments, configuration prerequisites, deletion behavior, and available evidence. [PCI DSS v4.0.1, 3.2.1 applicability notes](https://www.pcisecuritystandards.org/document_library/)

Treat the provider's retention defaults as configuration to evaluate. A service's capability to retain data for years does not justify doing so. Confirm whether deleting the customer-visible object also affects versions, soft-deleted items, and recovery copies.

## Verify disposal independently of the job status

At least every three months, check for stored account data exceeding its approved period. This is a minimum verification cadence, not permission to keep expired data until the next quarterly review. Disposal should follow the schedule itself. [PCI DSS v4.0.1, 3.2.1](https://www.pcisecuritystandards.org/document_library/)

Compare the inventory with the deletion population. Query expiry metadata, inspect exceptions, review failed disposal jobs, and verify secondary-store treatment. Use synthetic records to test boundary conditions such as timezone changes, retries, and a record restored after expiry.

Keep verification results as counts and protected references rather than exporting raw PAN. A successful deletion command alone does not prove every copy was addressed.

## Make restoration respect the schedule

A restored backup can reintroduce records that expired after the backup was created. Include retention reconciliation before restored systems return to service. Reapply expiry decisions and check that restored pipelines do not republish removed data to downstream stores.

The finished process connects purpose, inventory, expiry, disposal, verification, and recovery. That connection is what turns a written retention period into an operating control that continues to work as storage systems and payment workflows change.
