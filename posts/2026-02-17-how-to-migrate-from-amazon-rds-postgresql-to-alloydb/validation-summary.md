# Validation Summary: How to Migrate from Amazon RDS PostgreSQL to AlloyDB

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Amazon RDS for PostgreSQL
- Google Cloud AlloyDB for PostgreSQL
- Google Cloud Database Migration Service
- PostgreSQL logical replication and pglogical
- AWS CLI
- Google Cloud CLI
- Cloud VPN and AWS Site-to-Site VPN
- Google Cloud Secret Manager

## Sources Consulted
- AWS RDS User Guide: Performing logical replication for Amazon RDS for PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.LogicalReplication.html
- AWS RDS User Guide: Setting up the pglogical extension: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.pglogical.basic-setup.html
- Google Cloud Database Migration Service: Configure your source for PostgreSQL to AlloyDB: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/configure-source-database
- Google Cloud Database Migration Service: Create a migration job to an existing AlloyDB destination instance: https://docs.cloud.google.com/database-migration/docs/postgresql-to-alloydb/create-migration-job-existing-instance
- Google Cloud SDK: gcloud database-migration connection-profiles create postgresql: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/connection-profiles/create/postgresql
- Google Cloud SDK: gcloud database-migration migration-jobs create: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Google Cloud SDK: gcloud database-migration migration-jobs promote: https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/promote
- Google Cloud SDK: gcloud alloydb clusters create: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create
- Google Cloud SDK: gcloud alloydb instances create: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/instances/create
- Google Cloud SDK: gcloud compute vpn-tunnels create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud Network Connectivity: Connect HA VPN to AWS peer gateways: https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/connect-ha-vpn-aws-peer-gateway

## Issues Found
- The prerequisite stated "version 10 or later", but Google DMS documents specific supported minimum patch versions for Amazon RDS PostgreSQL, including 10.5+. Updated the prerequisite to say a DMS-supported version, such as 10.5 or later.
- The RDS setup enabled only `rds.logical_replication`. For DMS PostgreSQL-to-AlloyDB migrations, Google documents pglogical requirements, and AWS documents adding `pglogical` to `shared_preload_libraries`. Updated the parameter group command, verification step, and SQL setup to include pglogical and `rds_replication` privileges.
- The DMS source connection profile command used a generic `connection-profiles create` form with `--provider=POSTGRESQL`, which is not the current gcloud syntax. Updated it to `gcloud database-migration connection-profiles create postgresql`.
- The DMS AlloyDB destination profile command used `--provider=ALLOYDB` with the generic create command. For an existing AlloyDB destination, the documented CLI flow uses the PostgreSQL connection profile command with `--alloydb-cluster`. Updated the command accordingly.
- The migration flow started the job immediately after creation. For an existing AlloyDB destination, DMS requires demoting the destination before starting replication. Added the `gcloud database-migration migration-jobs demote-destination` step.
- The cutover wording said to promote the AlloyDB instance directly. In DMS, the operation is promotion of the migration job, which detaches the destination and promotes it. Updated the wording.

## Review Notes
The Cloud VPN section remains intentionally abbreviated. Google Cloud's production HA VPN-to-AWS documentation requires additional external VPN gateway and BGP configuration for a highly available setup; the post correctly frames the commands as a GCP-side example and says the AWS details depend on the networking setup.
