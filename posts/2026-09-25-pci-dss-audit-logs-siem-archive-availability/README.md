# How to Keep PCI DSS Audit Logs Available Across SIEM and Separate Archive Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Logging, Security

Description: Design and test PCI DSS audit-log availability across a searchable SIEM and separate archive, including retention boundaries, retrieval, integrity, and recovery.

---

Keeping twelve months of logs does not necessarily mean keeping twelve months in an expensive SIEM index. The design must preserve the required history and make the recent portion immediately available for analysis. A separate archive can support that design, but its retrieval behavior and completeness need testing.

PCI DSS v4.0.1 Requirement 10.5.1 calls for at least twelve months of history and at least the latest three months immediately available. The requirement describes an outcome rather than naming a particular SIEM or requiring every record to live in one product. [PCI DSS v4.0.1, 10.5.1](https://www.pcisecuritystandards.org/document_library/)

## Define the retention boundary for each source

Start with the audit sources needed for your environment: applications, identity systems, operating systems, databases, network controls, and cloud administration. Record which events are required, where they are delivered, and how long each destination retains them.

Use one ownership table:

| Source | Recent analysis path | Historical storage | Owner |
|---|---|---|---|
| Administrative access | SIEM index | Protected object archive | Security operations |
| Database audit | SIEM index | Separate audit archive | Database platform |
| Cloud configuration changes | Search service | Provider log archive | Cloud security |

For each row, verify the actual deployed settings. A twelve-month bucket lifecycle does not help if the source stops forwarding after a collector restart. Likewise, a SIEM policy retaining ninety days may not cover three calendar months at every boundary. Configure a margin and test the oldest date that must remain immediately available.

Keep source event time and ingestion time distinct. Delayed delivery must not cause an old event to disappear early or make a current search silently miss it.

## Choose storage by retrieval behavior

Document how an analyst moves from an incident timestamp to relevant events. If the SIEM has the complete latest three months, the historical archive can use a different retrieval path. If some recent logs are available only in another service, prove that the service makes them immediately usable for analysis.

Do not equate “stored in S3” with instant retrieval. Amazon S3 Glacier Flexible Retrieval and Deep Archive objects require restoration before access. The storage class and restore process therefore matter to the design. [Amazon S3 archived-object restoration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects.html)

PCI DSS does not provide a blanket numeric retrieval SLA that makes every architecture acceptable. Demonstrate the real workflow, including authorization, restoration where needed, decompression, parsing, and searching. A backup that exists but requires an unavailable administrator or lost parser is not a dependable analysis path.

## Preserve completeness when records move

Prefer overlapping delivery or retention windows so the transition from SIEM to archive has a verifiable handoff. Compare source identifiers, time partitions, counts, and checksums where meaningful. Account for retries and duplicates rather than interpreting matching byte sizes as proof of equivalent content.

Retain enough schema and parsing information to read old records after application upgrades. Keep time-zone interpretation, source identity, and required audit fields. A long-lived archive of opaque proprietary files may become unusable when its exporting product is retired.

Test the oldest retained partition as well as recent data. Storage lifecycle rules, encryption-key changes, and account closures often affect historical objects first.

## Protect both destinations

Apply audit-log protection to the SIEM and archive. Requirement 10.3 covers restricted access, protection against unauthorized alteration, backups, and change detection. Separate application write permissions from privileges that delete records or change retention. [PCI DSS v4.0.1, 10.3](https://www.pcisecuritystandards.org/document_library/)

Preserve access to encryption keys for the necessary retention period. A retained encrypted object with a deleted key is not available history. Monitor lifecycle-policy changes, failed deliveries, deletion attempts, and archive-access failures.

Immutability may help protect integrity, but prevent sensitive payment payloads before ingestion. An immutable copy of data that must not be retained creates a different problem; a retention setting does not override data-protection requirements.

## Run a retrieval exercise with an actual analyst

Generate a synthetic administrative event with a unique identifier. Confirm it appears in the immediate analysis path and the archive. Later, retrieve historical events at several ages, including the boundary between the recent and historical tiers.

Record a result such as:

```text
Source and required time range
Expected event identifiers
Query or retrieval procedure
Authorization and key access used
Time to usable results
Missing records or parsing errors
Owner and remediation for each gap
```

Repeat the exercise after storage-class changes, key rotation, SIEM migrations, and retention-policy changes. Include an incident responder who did not design the pipeline so the test exposes undocumented knowledge.

The final evidence should connect retention policy, deployed configuration, complete records, and successful retrieval. That lets the organization control storage cost while preserving the history and response capability the requirement expects.
