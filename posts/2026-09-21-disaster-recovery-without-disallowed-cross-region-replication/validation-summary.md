# Validation Summary: How to Plan Disaster Recovery Within Data Residency Rules

## Status
validated

## Post Type
Technical architecture and disaster recovery planning guide, including an AWS CLI command and an application-specific JSON policy example.

## Technologies Covered
- Amazon RDS Multi-AZ DB instances and Multi-AZ DB clusters
- AWS Regions and Availability Zones
- AWS CLI and JMESPath response filtering
- Point-in-time recovery, snapshots, and isolated cross-account backups
- Amazon S3 Object Lock retention modes and legal holds
- AWS IAM regional conditions and backup encryption key permissions
- JSON recovery policies and deployment automation
- Recovery objectives, failover, and disaster recovery rehearsals

## Sources Consulted
- [Amazon RDS Multi-AZ DB instance deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html) — synchronous standby placement, read-traffic restrictions, and availability-zone protection.
- [Amazon RDS Multi-AZ DB cluster deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts.html) — writer and two readers in three availability zones within one region; cluster replication and failover behavior.
- [AWS CLI: describe-db-instances](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html) — command options and the response fields used by the example.
- [AWS CLI: describe-db-clusters](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-clusters.html) — cluster inventory and DBClusterMembers identifiers.
- [JMESPath tutorial](https://jmespath.org/tutorial.html) — array indexing, subexpressions, and multiselect hashes used by the query.
- [Amazon RDS point-in-time recovery](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html) — recovery within the available backup retention window.
- [AWS Backup cross-account copies](https://docs.aws.amazon.com/aws-backup/latest/devguide/create-cross-account-backup.html) — account isolation, supported resource types, copy/restore workflow, and encryption prerequisites.
- [Amazon S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html) — governance and compliance retention modes, legal holds, and protection of object versions.
- [AWS IAM: aws:RequestedRegion](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-requestedregion) — endpoint restrictions do not constrain every cross-region effect of an operation.
- [AWS Regions and Availability Zones](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions-availability-zones.html) — geographic regions and isolated availability zones within a region.
- [AWS Well-Architected: Plan for Disaster Recovery](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/plan-for-disaster-recovery-dr.html) — recovery objectives, recovery strategies, testing, and automation.
- [Author GitHub profile](https://github.com/nawazdhandala) — the author link resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- No changes to README.md were required during this review.
- Confirmed the distinction between a synchronous, non-readable Multi-AZ DB instance standby and a Multi-AZ DB cluster with a writer and two readable replicas. Neither topology supplies a recovery destination outside its region.
- Checked all CLI flags and the exact response fields: MultiAZ, AvailabilityZone, SecondaryAvailabilityZone, and DBInstanceArn. The JMESPath aliases are valid output labels. Bash syntax validation passed. SecondaryAvailabilityZone is optional and may appear as null in the projected output when absent.
- The CLI example requires an existing instance named orders in eu-west-2 and credentials with permission to describe it. No live AWS call or infrastructure failure drill was performed. JMESPath syntax was reviewed against its official documentation; the local Python JMESPath module was unavailable, so the query was not executed locally.
- Parsed the JSON example successfully and verified that its automatic failover destinations are a subset of its approved regions. Its fields are explicitly application-defined, so they are not presented as AWS API parameters or an automatically enforced AWS policy.
- Account separation and immutable storage address different failure modes from geographic disaster recovery. The post correctly qualifies cross-account backup support and encryption requirements. Object Lock protects stored object versions; it does not establish application consistency.
- Point-in-time recovery depends on retained, usable backup history and any required encryption keys. The failure table presents candidate mechanisms and remaining dependencies rather than an unconditional recovery guarantee.
- Recovery rehearsals, durable write handling, dependency inventories, and suspension when no approved destination is reachable are coherent architectural recommendations. Their implementation and achievable recovery objectives must be validated for the actual application.
- All external links in the post resolved to the intended resources, including the author link redirect. No deprecated API or version-specific error was identified. The guide does not prescribe a particular database engine version or claim that the example region satisfies a specific law or contract.
