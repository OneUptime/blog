# Validation Summary: How to Deploy Apache Pulsar with BookKeeper on Kubernetes for Event Streaming

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Pulsar
- Apache BookKeeper
- Apache Pulsar Helm chart
- Kubernetes
- Prometheus Operator ServiceMonitor
- Pulsar Admin CLI
- Pulsar Python client
- Avro schemas
- AWS S3 tiered storage
- ZooKeeper metadata storage

## Sources Consulted
- Apache Pulsar Helm chart README and values.yaml: https://github.com/apache/pulsar-helm-chart
- Apache Pulsar admin CLI reference: https://pulsar.apache.org/docs/3.3.x/reference-pulsar-admin/
- Apache Pulsar Python client documentation: https://pulsar.apache.org/docs/client-libraries/python-use/
- Apache Pulsar schema administration documentation: https://pulsar.apache.org/docs/2.11.x/admin-api-schemas/
- Apache Pulsar metrics reference: https://pulsar.apache.org/docs/4.2.x/reference-metrics/
- Apache Pulsar AWS S3 tiered storage documentation: https://pulsar.apache.org/docs/4.2.x/tiered-storage-aws/
- Apache Pulsar geo-replication documentation: https://pulsar.apache.org/docs/4.2.x/administration-geo/
- Apache BookKeeper configuration reference: https://bookkeeper.apache.org/docs/next/reference/config/
- Apache BookKeeper CLI reference: https://bookkeeper.apache.org/docs/reference/cli/

## Issues Found
- The post called the Helm deployment an operator installation and attributed the official chart to StreamNative. Updated the section to describe the official Apache Pulsar Helm chart.
- The install command used `autorecovery.enableProvisionContainer`, which is not a current chart value. Replaced it with `components.autorecovery=true` and set `clusterName=pulsar-cluster` so later commands use a real cluster name.
- The expected admin pod was listed as `pulsar-bastion-0`, but the current chart deploys the toolset component as `pulsar-toolset-0`. Updated the pod name and related comments.
- The namespace replication command used `set-replication-clusters`, which is not the current namespace subcommand. Replaced it with `namespaces set-clusters`.
- The resource quota example used a non-existent `namespaces set-resource-quota` command. Replaced it with current namespace publish and dispatch rate commands.
- The topic creation example created `events` but all later schema and client examples used `user-events`. Updated the partitioned topic name to `user-events`.
- The schema upload file used a raw Avro record, but Pulsar Admin expects a schema payload with `type`, `schema`, and `properties`. Rewrote the schema JSON accordingly.
- The Python producer and consumer passed a dict to `AvroSchema`, but Pulsar's Python client expects a `schema.Record` class. Rewrote both examples to define a `User` record and send a `User` instance.
- The BookKeeper tuning snippet used uppercase `BOOKIE_*` keys that do not match BookKeeper configuration names or the Helm chart's `configData` shape. Replaced them with current BookKeeper config keys under `bookkeeper.configData`.
- The ServiceMonitor and scaling examples used `component: bookkeeper`, but the Helm chart labels BookKeeper pods and services as `component: bookie`. Updated selectors and `kubectl` labels.
- Several Prometheus metric names were inaccurate. Replaced them with metrics listed in the official Pulsar metrics reference.
- The tiered storage snippet created an unused ConfigMap and put namespace threshold settings in broker config. Reworked it to use a Secret for AWS credentials, Helm `broker.extraEnvs`, broker `configData`, and namespace offload threshold/deletion-lag commands.
- The scaling section said Pulsar automatically rebalances partitions across new brokers. Adjusted this to a more accurate description of broker load-manager assignment and bundle unloading.
- The backup section used invalid `zkCli.sh dump` and restore commands. Replaced them with BookKeeper ledger metadata inspection and guidance to use coordinated persistent volume snapshots.

## Review Notes
The guide is now technically consistent with current Apache Pulsar and BookKeeper documentation. Production deployments still need additional hardening that is outside this post's scope, especially authentication, authorization, TLS, PodDisruptionBudgets, backup runbooks, and storage-class-specific snapshot examples.
