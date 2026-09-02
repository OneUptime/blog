# Validation Summary: How to Measure Actual RTO and RPO During a Recovery Exercise

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Disaster recovery exercises and business-capability acceptance testing
- Recovery Time Objective (RTO) and Recovery Point Objective (RPO) measurement
- Machine-readable event timelines, monotonic clocks, UTC synchronization, and timestamp uncertainty
- Backups, snapshots, point-in-time recovery, log replay, and replication recovery points
- Durable application watermarks, marker streams, commit identifiers, log positions, and queue offsets
- Multi-store consistency, durable outbox replay, and cross-store reconciliation
- JSON event records and YAML recovery scorecards

## Sources Consulted

- [Google Cloud: Disaster recovery planning guide](https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide)
- [Google Cloud Well-Architected Framework: Perform testing for recovery from data loss](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-data-loss)
- [AWS Well-Architected Framework REL13-BP01: Define recovery objectives for downtime and data loss](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_objective_defined_recovery.html)
- [AWS Disaster Recovery of Workloads: Detection](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/detection.html)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-34r1.pdf)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [POSIX.1-2024: clock_getres, clock_gettime, and clock_settime](https://pubs.opengroup.org/onlinepubs/9799919799/functions/clock_getres.html)
- [RFC 5905: Network Time Protocol Version 4](https://www.rfc-editor.org/rfc/rfc5905.html)
- [PostgreSQL: Transactions and Identifiers](https://www.postgresql.org/docs/current/transaction-id.html)
- [PostgreSQL: CREATE SEQUENCE](https://www.postgresql.org/docs/current/sql-createsequence.html)

## Issues Found

- The multi-store example called business sequence `9102` a service-level "recovery point," although the post defines a recovery point as a time or replay boundary and a recovered cutoff as a business-history watermark. Changed the sentence to identify the service-level recovered cutoff as `9099`, not `9102`, because the fulfillment dependency is recovered continuously only through sequence 9099. This preserves the post's necessary distinction between the conventional time-based RPO measurement and sequence-based business-loss evidence.

## Review Notes

- AWS and Google Cloud define RTO and RPO as maximum acceptable objectives. The post correctly labels the exercise output as observed recovery time and compares recovery-point age with the RPO objective instead of presenting either objective as a measured counter.
- Measuring from `T-failure` through documented business acceptance is consistent with interruption-to-restoration definitions and is conservative. AWS guidance specifically includes detection, notification, escalation, and declaration within recovery planning, while Google Cloud requires testing the full application stack and critical infrastructure with restored data.
- The recovery-point-age formula matches the conventional time-based RPO concept. Keeping acknowledged-write loss span and lost-write count as separate business measures is also correct; Google Cloud explicitly distinguishes RPO duration from the amount or quality of lost data.
- The monotonic-clock and synchronized-UTC guidance is sound. POSIX gives monotonic clocks an unspecified origin, and NTP represents synchronization error, so recording a clock domain and timestamp uncertainty is appropriate.
- The warning not to assume generic transaction IDs or database sequences represent commit order or gap-free durable history is correct. PostgreSQL transaction IDs are assigned when a transaction first writes, and PostgreSQL sequence allocations can have gaps and appear out of sequence across sessions.
- The JSON event example and YAML scorecard both parse successfully. The scorecard arithmetic is consistent: the RTO margin is `1800 - 1334.602 = 465.398` seconds, and the RPO margin is `60 - 41.208 = 18.792` seconds.
- All external links in the post resolve to the intended author profile or official documentation. No deprecated APIs, commands, configuration fields, or version-specific claims are present.
- The title uses the common shorthand "actual RTO and RPO," while the body correctly distinguishes objectives from observed recovery time, recovery-point age, and acknowledged-write loss.
