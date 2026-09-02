# Validation Summary: How to Prove a Recovered Service Is Ready with Synthetic Transactions and Data Reconciliation

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Disaster recovery readiness, RPO, and RTO
- Synthetic transactions and black-box monitoring
- Datastore commit durability and stale-writer fencing
- Cross-store data reconciliation and business invariants
- Databases, queues, object stores, caches, indexes, and external provider state
- Staged traffic, canary observation, and internal telemetry
- JSON, YAML, RFC 3339 timestamps, and SHA-256 content digests
- OpenTelemetry distributed tracing

## Sources Consulted

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Book: Data Integrity—What You Read Is What You Wrote](https://sre.google/sre-book/data-integrity/)
- [Google Cloud Well-Architected Framework: Perform testing for recovery from data loss](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-data-loss)
- [AWS Well-Architected Framework: Define recovery objectives for downtime and data loss](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_objective_defined_recovery.html)
- [AWS Reliability Pillar: Disaster Recovery objectives](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/disaster-recovery-dr-objectives.html)
- [AWS Well-Architected Framework: Test disaster recovery implementation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html)
- [PostgreSQL documentation: Asynchronous Commit](https://www.postgresql.org/docs/current/wal-async-commit.html)
- [PostgreSQL documentation: Reliability](https://www.postgresql.org/docs/current/wal-reliability.html)
- [OpenTelemetry documentation: Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [NIST glossary: Recovery Point Objective](https://csrc.nist.gov/glossary/term/recovery_point_objective)
- [NIST glossary: Recovery Time Objective](https://csrc.nist.gov/glossary/term/Recovery_Time_Objective)
- [OCI Image Specification: Content Descriptors and digests](https://github.com/opencontainers/image-spec/blob/main/descriptor.md)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)
- [RFC 8259: The JavaScript Object Notation Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259.html)
- [RFC 3339: Date and Time on the Internet](https://www.rfc-editor.org/rfc/rfc3339.html)

## Issues Found

- The production-safety warning prohibited any transaction that modified production, which contradicted the later recommendation to perform a controlled synthetic write during a real recovery. It now prohibits real payment, notification, shipping, and uncontrolled production effects while still permitting a bounded, reversible synthetic write.
- A read from a new process or connection was presented as durability evidence. Such a read prevents reuse of an application process's in-memory result, but it does not by itself prove survival of a datastore or host crash. The post now requires verification of the datastore's configured durability guarantee and, when required by the recovery contract, confirmation after restart or primary handoff.
- The source-cutoff instruction allowed an arbitrary pre-exercise cutoff, which could omit writes acknowledged between capture and interruption. It now requires the final acknowledged cutoff at the planned interruption or fencing boundary, or derivation of the final pre-interruption acknowledged cutoff from an independent immutable ledger for an unplanned event.
- The post called recovery-point age a direct RPO measurement. RPO is an objective; the calculated age is an observed recovery-point gap that must be compared with that objective. The explanation and acceptance criterion were corrected accordingly.
- The recovery examples used `failure_at` at `01:00:10Z` but started the RTO interval at `01:00:00Z`. The acceptance record now uses the same `01:00:10Z` service-interruption anchor, and the observed recovery duration was recalculated from `1334.602` to `1324.602` seconds. The field was renamed from `actual_rto_seconds` to `actual_recovery_time_seconds` so it is not confused with the RTO target.
- `release_digest: sha256:example` was not a valid SHA-256 digest. It was replaced with a correctly formed digest, and exact configuration digest, recovery target, and writer epoch fields were added so the example matches the instruction to bind acceptance to those inputs.

## Review Notes

- The JSON example is valid JSON, both YAML examples are syntactically valid, and all timestamps conform to RFC 3339.
- The remaining reconciliation arithmetic is correct: recovery-point age is `42.578` seconds, acknowledged-write loss span is `36.588` seconds, and the gap-free suffix contains 11 writes. The corrected observed recovery duration is `1324.602` seconds.
- All external links in the post resolved to the intended pages. The OpenTelemetry reference supports request-path diagnosis but is narrower than the disaster-recovery and reconciliation methodology.
- Unquoted timestamps can receive different implicit types in YAML 1.1 and YAML 1.2 parsers. Quote them if downstream signing or processing requires stable string types.
- The heading “Signed Result” reads naturally as operational sign-off because the example records approving roles. A cryptographic attestation design would additionally need an authenticated signature and provenance mechanism.
