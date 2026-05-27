# Validation Summary: How to Replicate Oracle Database Changes to BigQuery Using Datastream

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Google Cloud Datastream
- Oracle Database
- Oracle LogMiner
- Oracle RMAN
- Amazon RDS for Oracle
- BigQuery
- Google Cloud CLI

## Sources Consulted
- Google Cloud Datastream: Configure a source Oracle database: https://docs.cloud.google.com/datastream/docs/configure-your-source-oracle-database
- Google Cloud Datastream: Configure a self-managed Oracle database for CDC: https://docs.cloud.google.com/datastream/docs/configure-self-managed-oracle
- Google Cloud Datastream: Configure a pluggable Oracle database for CDC: https://docs.cloud.google.com/datastream/docs/configure-pluggable-oracle
- Google Cloud Datastream: Work with Oracle database redo log files: https://docs.cloud.google.com/datastream/docs/work-with-oracle-database-redo-log-files
- Google Cloud Datastream: Oracle source overview and limitations: https://docs.cloud.google.com/datastream/docs/sources-oracle
- Google Cloud Datastream REST API, streams resource: https://docs.cloud.google.com/datastream/docs/reference/rest/v1/projects.locations.streams
- Google Cloud Datastream BigQuery data type mappings: https://docs.cloud.google.com/datastream/docs/bq-map-data-types
- Google Cloud SDK: gcloud datastream connection-profiles create: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/connection-profiles/create
- Google Cloud SDK: gcloud datastream streams create: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Google Cloud SDK: gcloud datastream private-connections create: https://cloud.google.com/sdk/gcloud/reference/datastream/private-connections/create
- Amazon RDS for Oracle: Retaining archived redo logs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.CommonDBATasks.RetainRedoLogs.html

## Issues Found
- The post said Datastream enables supplemental logging. Changed this to say the user must configure supplemental logging before Datastream reads changes.
- The Oracle LogMiner privilege examples were incomplete and used broad or non-recommended grants. Updated them to match the required direct grants for self-managed Oracle and CDB/PDB LogMiner setups.
- The redo log retention example used `DB_FLASHBACK_RETENTION_TARGET`, which is not the Datastream archive log retention configuration. Replaced it with the RMAN retention policy recommended by Datastream documentation.
- The Amazon RDS Oracle retention example used `aws rds modify-db-instance`, which does not configure local archived redo log retention for LogMiner. Replaced it with `rdsadmin.rdsadmin_util.set_configuration`.
- The Oracle connection profile command used `--oracle-database-service`, which is not the current gcloud flag. Changed it to `--database-service`.
- The stream creation command passed inline JSON to flags that expect JSON or YAML config file paths. Added creation of `oracle-source-config.json` and `bigquery-destination-config.json`, then referenced those files in the `gcloud datastream streams create` command.
- The BigQuery destination dataset identifier used a REST resource-style path. Changed it to the Datastream BigQuery destination config format.
- Several Oracle-to-BigQuery data type mappings were incorrect or outdated. Corrected mappings for `DATE`, `NUMBER`, `RAW`, `XMLTYPE`, and `INTERVAL`, and clarified LOB handling with `streamLargeObjects`.
- The LOB discussion did not mention that Datastream writes LOB columns as NULL unless `streamLargeObjects` is configured. Added that caveat.

## Review Notes
The local environment did not have `gcloud` installed, so Google Cloud CLI commands were verified against the official Google Cloud SDK reference instead of local `--help` output. The post remains a simplified setup guide; production deployments should also validate database sizing, archive log storage capacity, Datastream IAM permissions, and BigQuery dataset location choices.
