# Validation Summary: How to Turn Business RTO and RPO Targets into a Testable Recovery Architecture

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Disaster recovery and business continuity architecture
- Recovery time objective (RTO) and recovery point objective (RPO)
- Backup, replication, point-in-time recovery, and data-integrity validation
- AWS backup-and-restore, pilot-light, warm-standby, and multi-site active/active recovery patterns
- YAML recovery contracts
- Failure injection, synthetic transactions, recovery exercises, and evidence collection

## Sources Consulted

- [NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [Google Cloud: Disaster recovery planning guide](https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide)
- [Google Cloud Well-Architected Framework: Perform testing for recovery from failures](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-failures)
- [Google Cloud Well-Architected Framework: Perform testing for recovery from data loss](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-data-loss)
- [AWS Well-Architected Framework REL13-BP01: Define recovery objectives for downtime and data loss](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_objective_defined_recovery.html)
- [AWS Well-Architected Framework REL13-BP02: Use defined recovery strategies to meet recovery objectives](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html)
- [AWS Well-Architected Framework REL13-BP03: Test disaster recovery implementation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html)

## Issues Found

1. **The sample RTO clock could start after the actual interruption.** Starting at the first failed eligible checkout can omit time between the capability becoming unavailable and the next checkout. Changed the origin to the capability-unavailable event, aligned the target with the contract's reconciled-transaction stop condition, and described the measured value as observed recovery time rather than "actual RTO."
2. **The sample recovery-point evidence could not prove a time-based RPO.** An ordinal commit sequence compared with a pre-injection watermark can reveal gaps, but it cannot establish recovery-point age in seconds and can miss writes in the capture-to-failure race. Added an authoritative commit timestamp, an explicit disruption-time origin, continuous timestamped canary writes, and an acknowledgment log outside the injected failure domain. The exercise now uses that evidence to measure recovery-point age and identify acknowledged-write loss.
3. **The 30-minute stage budget had no margin.** Its six stages totaled exactly 30 minutes while the surrounding text required documented margin. Clarified that the table is a zero-margin allocation that fails the stated acceptance criterion and needs revision.
4. **The payment integrity rule was one-sided.** It prohibited duplicate charges and orders without payment records but did not prohibit a successful charge whose order was lost. Added the corresponding charge-without-order invariant to the scenario and recovery contract.
5. **Recovery evidence had no time-based expiration.** Expiring results only after material architecture changes can leave stale evidence valid despite operational drift. Added expiration on a defined schedule as well as after material changes, consistent with official guidance to test periodically.

## Review Notes

- The recovery-contract YAML is an illustrative, project-defined schema rather than a vendor configuration format. It is syntactically valid YAML.
- The post contains no terminal commands, executable program code, product-version constraints, or deprecated API usage to validate.
- All cited reference URLs and the author URL resolve to the intended pages. The AWS recovery-pattern descriptions remain consistent with the current Well-Architected guidance.
