# Validation Summary: Prove RPO and RTO with Restore Drills

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Backup and restore systems
- Disaster recovery and recovery drills
- Recovery Point Objective (RPO) measurement
- Recovery Time Objective (RTO) measurement
- Point-in-time recovery, replication, and log replay
- Data-integrity and application-level validation
- YAML evidence records
- Recovery identity, encryption-key, and control-plane dependencies

## Sources Consulted

- [AWS Well-Architected Framework: Define recovery objectives for downtime and data loss](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_objective_defined_recovery.html)
- [AWS Well-Architected Framework: Perform periodic recovery of the data to verify backup integrity and processes](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_backing_up_data_periodic_recovery_testing_data.html)
- [AWS Well-Architected Framework: Test disaster recovery implementation to validate the implementation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_dr_tested.html)
- [AWS Guidance: Drill Planning for AWS Elastic Disaster Recovery](https://docs.aws.amazon.com/guidance/latest/deploying-cross-region-disaster-recovery-with-aws-elastic-disaster-recovery/drill-planning.html)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems](https://csrc.nist.gov/pubs/sp/800/34/r1/final)
- [NIST SP 1339: OT Backup Quick Start Guide](https://csrc.nist.gov/pubs/sp/1339/final)
- [Google Cloud Well-Architected Framework: Perform testing for recovery from failures](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-failures)
- [Google Cloud Well-Architected Framework: Perform testing for recovery from data loss](https://docs.cloud.google.com/architecture/framework/reliability/perform-testing-for-recovery-from-data-loss)

## Issues Found

- The isolated-drill procedure previously recorded readiness without routing real users, while the RTO model and evidence record implied that the traffic-switching phase through service readiness had been measured. The procedure now requires exercising equivalent traffic switching against isolated test endpoints. It also states that untested production-only cutover steps must be recorded as unmeasured assumptions, not included in the demonstrated recovery time. The evidence timestamp was renamed from `service_validated` to `service_ready` to match the RTO formula and include completion of the tested cutover path.

## Review Notes

- The RPO and RTO definitions, formulas, five-minute example, phase decomposition, and application-marker method are technically sound when timestamps use a documented clock basis and the recovery point represents the newest usable durable state.
- The YAML evidence example is syntactically valid.
- The guidance on isolated recovery, data-integrity checks, application-level validation, dependency testing, periodic exercises, and retesting after material changes is consistent with the consulted AWS, NIST, and Google Cloud documentation.
- All external links in the post returned successful HTTP responses during validation.
- The post contains no version-specific API, CLI, or deprecated product guidance.
