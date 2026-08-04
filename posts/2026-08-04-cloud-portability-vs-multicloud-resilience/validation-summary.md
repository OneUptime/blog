# Validation Summary: Cloud Portability and Multi-Cloud Resilience Are Different Goals

## Status

validated

## Post Type

Architecture guide and conceptual technical reference

## Technologies Covered

- Cloud portability and multi-cloud resilience
- Disaster recovery and high-availability architecture
- Recovery time objective (RTO) and recovery point objective (RPO)
- Backup and restore, pilot light, warm standby, hot standby, and active/active patterns
- AWS, Microsoft Azure, and Google Cloud multi-region designs
- OCI container images and independent container registries
- Terraform infrastructure as code
- DNS, global load balancing, IAM, key management, CI/CD, and observability
- Database backup, point-in-time recovery, replication, fencing, failover, failback, and conflict resolution
- Fault injection, recovery drills, and game days

## Sources Consulted

- [AWS: Disaster recovery options in the cloud](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [AWS: Well-Architected Framework Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
- [AWS: Conduct game days regularly](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_testing_resiliency_game_days_resiliency.html)
- [AWS Elastic Disaster Recovery: Recovery and failback](https://docs.aws.amazon.com/drs/latest/userguide/failback.html)
- [Microsoft Azure: Business continuity, high availability, and disaster recovery](https://learn.microsoft.com/en-us/azure/reliability/concept-business-continuity-high-availability-disaster-recovery)
- [Microsoft Azure: Multi-region network design](https://learn.microsoft.com/en-us/azure/networking/design-guide/multi-region)
- [Google Cloud: Disaster recovery planning guide](https://cloud.google.com/architecture/dr-scenarios-planning-guide)
- [Google Cloud: Architecting disaster recovery for cloud infrastructure outages](https://cloud.google.com/architecture/disaster-recovery)
- [NIST SP 500-291 Rev. 2: Cloud Computing Standards Roadmap](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.500-291r2.pdf)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)

## Issues Found

- The portable-workload example described daily exports as producing a 24-hour RPO and a multi-day RTO. RPO and RTO are objectives, not observed recovery results. The sentence now states that up to 24 hours of data may be at risk and recovery may require multiple days.
- The active/passive guidance said to use one named writer. It now specifies one authorized writer at a time, which more accurately describes an authority that moves during promotion while preserving the single-writer invariant.
- The failback statement required reverse synchronization unconditionally. It now allows reverse synchronization or another reconciliation method because implementations can preserve post-failover writes through different reconciliation mechanisms.
- The resilience-evidence list referred to measuring RPO and RTO during a fault. It now distinguishes the achieved recovery point and recovery time from the RPO and RTO objectives against which they are evaluated.

## Review Notes

The post contains no code examples, commands, configuration snippets, or version-specific APIs. The technical review therefore focused on architecture claims, terminology, failure domains, recovery patterns, data consistency, operational independence, and link validity. All external links resolve to the intended resources. The provider-specific documents support the post's provider-independent use of the recovery-pattern spectrum, with the implementation differences already acknowledged in the post.
