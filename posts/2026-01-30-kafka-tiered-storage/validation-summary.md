# Validation Summary: How to Create Kafka Tiered Storage

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Apache Kafka tiered storage / KIP-405
- Apache Kafka broker and topic configuration
- Aiven RemoteStorageManager plugin for Apache Kafka
- Amazon S3
- Google Cloud Storage
- Azure Blob Storage
- Kubernetes
- Prometheus JMX Exporter
- Python cost estimation script

## Sources Consulted
- Apache Kafka Tiered Storage documentation: https://kafka.apache.org/41/operations/tiered-storage/
- Apache Kafka Tiered Storage configuration reference: https://kafka.apache.org/40/configuration/tiered-storage-configs/
- Apache Kafka Monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Aiven tiered-storage-for-apache-kafka README and configuration docs: https://github.com/Aiven-Open/tiered-storage-for-apache-kafka
- Confluent Platform Tiered Storage documentation: https://docs.confluent.io/platform/current/clusters/tiered-storage.html
- Amazon S3 Intelligent-Tiering documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html
- Amazon S3 archived object restore documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects.html
- Amazon MSK topic tiered storage CLI documentation: https://docs.aws.amazon.com/msk/latest/developerguide/msk-enable-disable-topic-tiered-storage-cli.html

## Issues Found
- The post used non-existent Apache Kafka built-in S3, GCS, and Azure RemoteStorageManager class names. Apache Kafka provides the tiered storage API but does not ship object-store RemoteStorageManager implementations. Updated the examples to use the Aiven RemoteStorageManager plugin and its documented S3, GCS, and Azure storage backend configuration keys.
- The metadata manager example used an invalid class name. Replaced it with Kafka's topic-based metadata manager class and added the required metadata manager listener setting.
- Several object-store configuration keys used unsupported `remote.log.storage.s3.*`, `remote.log.storage.gcs.*`, and `remote.log.storage.azure.*` names. Replaced them with documented `rsm.config.*` plugin keys.
- The S3 bucket and lifecycle examples enabled archive tiers that require asynchronous restore before reads. Removed Archive Access, Deep Archive Access, Glacier Flexible Retrieval, and Deep Archive lifecycle guidance for Kafka-readable remote log data, keeping only immediately readable storage classes.
- The production configuration used outdated or invalid remote log manager properties such as `remote.log.manager.max.thread.pool.size` and unprefixed remote log metadata topic settings. Updated them to current Kafka configuration names, including `remote.log.manager.copier.thread.pool.size` and `rlmm.config.*`.
- The monitoring section used incorrect JMX metric names for Kafka tiered storage. Updated the Prometheus JMX patterns and dashboard table to match Kafka's documented `BrokerTopicMetrics`, `RemoteStorageThreadPool`, and `RemoteLogManager` metrics.
- The health check script compared Prometheus counter values as shell integers, which can fail for floating-point values or multiple series. Updated it to aggregate values with `awk` and compare numerically.
- The troubleshooting section suggested a destructive `kafka-storage.sh format --rebuild-metadata` command that is not a valid metadata repair procedure. Replaced it with backup/vendor runbook guidance.

## Review Notes
The post now presents Apache Kafka tiered storage with a concrete third-party RemoteStorageManager plugin. Confluent Platform has a separate tiered storage implementation and configuration model, so future revisions could add a dedicated Confluent example instead of mixing it with Apache Kafka plugin configuration.
