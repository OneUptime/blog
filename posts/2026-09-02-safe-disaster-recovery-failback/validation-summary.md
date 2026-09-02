# Validation Summary: How to Plan a Safe Failback After the Disaster Recovery Site Becomes Primary

## Status
validated

## Post Type
Technical guide / disaster recovery runbook

## Technologies Covered
- Disaster recovery failover and failback
- Active/passive, single-writer high-availability architecture
- Reverse replication, reseeding, and Azure Site Recovery reprotection
- Data integrity checks, replication watermarks, queues, and cross-store reconciliation
- Writer fencing and monotonic epochs
- DNS traffic switching
- TLS and Server Name Indication (SNI)
- Azure Site Recovery recovery plans and Azure Resiliency Recovery Orchestration Plans
- YAML

## Sources Consulted
- [Microsoft Azure: Failover and failback concepts](https://learn.microsoft.com/en-us/azure/reliability/concept-failover-failback)
- [Azure Site Recovery: Failover and failback for on-premises machines (modernized)](https://learn.microsoft.com/en-us/azure/site-recovery/failover-failback-overview-modernized)
- [Azure Site Recovery: Classic VMware and physical-machine experience deprecation](https://learn.microsoft.com/en-us/azure/site-recovery/vmware-physical-azure-classic-deprecation)
- [Azure Resiliency: Execute failover and reprotect operations using a Recovery Orchestration Plan (preview)](https://learn.microsoft.com/en-us/azure/resiliency/recovery-orchestration-plan-execute)
- [Azure Site Recovery: About recovery plans](https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview)
- [AWS Well-Architected Framework REL13-BP02: Use defined recovery strategies](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html)
- [AWS Well-Architected Framework REL13-BP03: Test disaster recovery implementation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html)
- [AWS Migration Lens: Cutover synchronization and rollback planning](https://docs.aws.amazon.com/wellarchitected/latest/migration-lens/assess-rel.html)
- [AWS Elastic Disaster Recovery: Recovery and failback](https://docs.aws.amazon.com/drs/latest/userguide/failback.html)
- [Amazon Route 53: DNS changes, caching, and TTL behavior](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/troubleshooting-new-dns-settings-not-in-effect.html)
- [Azure IoT Operations: State-store locking and fencing tokens](https://learn.microsoft.com/en-us/azure/iot-operations/develop-edge-apps/reference-state-store-protocol)
- [PostgreSQL: Hot Standby read-only restrictions](https://www.postgresql.org/docs/current/hot-standby.html)
- [PostgreSQL: Sequence values are not gapless](https://www.postgresql.org/docs/current/functions-sequence.html)
- [Apache Kafka: Log compaction and stable offsets](https://kafka.apache.org/41/design/design/)
- [RFC 8767: DNS TTL and serving stale cached data](https://www.rfc-editor.org/rfc/rfc8767.html)
- [RFC 9293: TCP connection state](https://www.rfc-editor.org/rfc/rfc9293.html)
- [RFC 6066: TLS Server Name Indication](https://www.rfc-editor.org/rfc/rfc6066.html)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)

## Issues Found
1. The reconciliation checklist required the highest continuous transaction or event sequence. Database sequences can legitimately have gaps after aborted transactions or crashes, and compacted event logs can retain valid offsets after records at lower offsets are removed. The check now compares each store's authoritative position or offset and tests continuity only when that source guarantees it. Related cutover and acceptance wording now records and verifies a boundary for each critical store rather than implying one universal watermark.
2. Passive-site validation said to exercise migrations while the candidate was required to remain stopped or read-only. Migrations commonly perform DDL or other writes and can fail on a physical standby or diverge a replication target. The instruction now validates migration compatibility without applying migrations to the passive candidate.
3. The final cutover step referred ambiguously to draining “old sessions” without reopening “old-site” writes. Because the original site has just become primary, “old site” could be misread. The step now explicitly drains sessions from the former primary without re-enabling writes at the DR site.
4. The linked Azure Site Recovery VMware failback article described the retired classic architecture. Microsoft ended support for that experience in March 2026, before this post's publication date. The reference now points to the current modernized failover and failback documentation.
5. The Recovery Orchestration Plan reference was labeled as an Azure Site Recovery page even though it documents an Azure Resiliency preview feature. The link label now identifies the correct service and preview status.

## Review Notes
- The YAML example is syntactically valid. Its field names are an illustrative runbook record, not a claimed vendor configuration schema.
- The core single-writer transfer order, reverse-replication guidance, post-write rollback boundary, DNS caching warning, and “zero lag is not integrity” explanation are technically sound.
- A writer epoch is effective fencing only when an authoritative coordinator allocates it and every protected write target rejects stale epochs. The post already requires stale-epoch rejection; implementations must supply those product-specific enforcement guarantees.
- Active/active conflict resolution is outside the post's stated single-writer design.
