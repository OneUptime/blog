# Validation Summary: How to Understand Aurora Architecture and Storage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Aurora
- Amazon RDS
- Aurora MySQL
- Aurora PostgreSQL
- AWS CLI
- Aurora Standard and Aurora I/O-Optimized storage

## Sources Consulted
- Amazon Aurora storage: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- Amazon Aurora size limits: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_Limits.html
- Replication with Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html
- High availability for Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- Amazon Aurora reliability: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Reliability.html
- Failing over an Amazon Aurora DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-failover.html
- Amazon Aurora FAQs: https://aws.amazon.com/rds/aurora/faqs/
- Backtracking an Aurora DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.html
- Configuring backtracking for Aurora MySQL: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.Configuring.html
- AWS CLI modify-db-cluster reference: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-cluster.html
- AWS CLI create-db-cluster reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- AWS CLI backtrack-db-cluster reference: https://docs.aws.amazon.com/cli/latest/reference/rds/backtrack-db-cluster.html
- Amazon RDS read replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- Amazon Aurora pricing: https://aws.amazon.com/rds/aurora/pricing/
- Amazon Aurora SIGMOD paper: https://www.amazon.science/publications/amazon-aurora-design-considerations-for-high-throughput-cloud-native-relational-databases

## Issues Found
- The post described standard RDS storage as "local EBS volumes" on the same machine. Changed this to EBS-backed storage attached to the DB instance, because EBS is network-attached storage rather than local instance storage.
- The Multi-AZ comparison said standard RDS "does two copies." Changed this to synchronous replication to a standby in another AZ, which is the accurate standard Multi-AZ DB instance behavior.
- The storage scaling section stated a fixed 128 TB limit and implied storage-full events were not relevant. Updated this to 128 TiB or 256 TiB depending on Aurora engine version, with a caveat that engine-version storage limits still apply.
- The billing section described Aurora storage billing as a high-water mark. Updated this to current dynamic resizing behavior, where supported Aurora versions can reduce allocated storage after data is removed.
- The failover section overstated "no crash recovery replay" and listed older/specific failover timing. Reworded it to fast recovery via Aurora storage and survivable page cache, changed reader failover to typically within 30 seconds, and changed no-reader recovery to typically less than 10 minutes.
- The Backtracking explanation said redo log records are applied in reverse and that backtracking takes seconds. Updated this to Aurora change records and minutes, matching AWS documentation.
- The `create-db-cluster` example used `...` as a placeholder in a bash command. Replaced it with a concrete minimal AWS CLI example that includes master credentials and `--backtrack-window`.
- The recommendation "need more than 5 read replicas" was outdated for standard RDS engines that now support up to 15 read replicas. Reworded it to focus on Aurora's many low-lag replicas without traditional replication load.

## Review Notes
Pricing remains approximate and region-dependent. The post now scopes the listed storage rates to common US Regions, but future pricing changes should be checked against the live Aurora pricing page before publication.
