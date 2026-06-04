# Validation Summary: How to Deploy Apache Druid on Kubernetes for Real-Time Analytics Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Druid
- Druid Kubernetes operator
- Kubernetes
- ZooKeeper
- PostgreSQL
- Kafka ingestion supervisors
- Prometheus ServiceMonitor

## Sources Consulted
- Apache Druid operator documentation: https://apache.googlesource.com/druid/+/HEAD/druid-operator/docs
- Druid operator getting started guide: https://raw.githubusercontent.com/druid-io/druid-operator/master/docs/getting_started.md
- Druid operator CRD and API types: https://raw.githubusercontent.com/druid-io/druid-operator/master/deploy/crds/druid.apache.org_druids.yaml and https://raw.githubusercontent.com/druid-io/druid-operator/master/apis/druid/v1alpha1/druid_types.go
- Druid operator sample cluster: https://raw.githubusercontent.com/druid-io/druid-operator/master/examples/tiny-cluster.yaml
- Apache Druid Kafka ingestion documentation: https://druid.apache.org/docs/latest/ingestion/kafka-ingestion/
- Apache Druid supervisor documentation: https://druid.apache.org/docs/latest/ingestion/supervisor/
- Apache Druid clustered deployment documentation: https://druid.apache.org/docs/latest/tutorials/cluster/
- Apache Druid Prometheus emitter documentation: https://druid.apache.org/docs/latest/development/extensions-contrib/prometheus/
- Apache Druid Kubernetes extension documentation: https://druid.apache.org/docs/latest/development/extensions-core/kubernetes/

## Issues Found
- The Druid operator install commands used a stale CRD URL and did not install the operator ServiceAccount, Role, or RoleBinding. Updated the commands to use the current upstream `deploy/crds` and RBAC manifests.
- The operator was installed in `druid-system` while the Druid custom resource was created in `druid`. Since the upstream operator defaults to watching its own namespace, updated the install flow to install the operator in the `druid` namespace.
- The ZooKeeper StatefulSet used `metadata.name` directly as `ZOO_MY_ID`, which produces values like `zookeeper-0` instead of ZooKeeper numeric server IDs. Updated the container command to derive a numeric ID from the StatefulSet ordinal and corrected `ZOO_SERVERS` to use matching numeric IDs.
- The PostgreSQL manifest mounted the PVC directly at the default data directory without setting a subdirectory for `PGDATA`, which can fail on initialized volume roots. Added `PGDATA=/var/lib/postgresql/data/pgdata`.
- The Druid custom resource omitted the required `commonConfigMountPath` field. Added the field using the path shown in upstream operator examples.
- The Druid cluster used local deep storage for a multi-node deployment. Updated the configuration to use S3-backed deep storage and indexing logs, matching Druid clustered deployment guidance that production clusters use distributed deep storage.
- The coordinator node was used as the ingestion API target but was not configured to run the Overlord role. Added coordinator-as-Overlord and remote indexing settings.
- Historical nodes mounted `/druid/segment-cache` but did not configure `druid.segmentCache.locations` to use that path. Added the segment cache location and size.
- Router nodes lacked the broker/coordinator service discovery and management proxy settings needed for the unified console routing behavior. Added the relevant router runtime properties.
- Manually created Kubernetes Services selected `nodeType`, but the Druid operator labels node pods with `component`. Updated selectors to use `component`.
- The Kafka supervisor JSON used the older unwrapped shape and omitted `ioConfig.inputFormat`, which current Druid supervisor specs require. Wrapped the ingestion configuration under `spec` and added a JSON input format.
- The Prometheus `ServiceMonitor` referenced a port name that did not exist. Added labeled Services with named `http` and `prometheus` ports and updated the ServiceMonitor to scrape the named `prometheus` port.

## Review Notes
The Druid image version in the post remains pinned to `apache/druid:28.0.0`; that is valid for the tutorial, but readers should check current Druid release notes before using the example in a new production cluster. The S3 bucket name is still a placeholder and must be replaced with a real bucket and appropriate credentials or workload identity configuration.
