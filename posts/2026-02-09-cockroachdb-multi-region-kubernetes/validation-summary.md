# Validation Summary: How to Deploy CockroachDB with Multi-Region Topology

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- CockroachDB
- CockroachDB Kubernetes Operator
- Kubernetes
- Helm
- Prometheus ServiceMonitor
- CockroachDB SQL multi-region features
- CockroachDB backup schedules

## Sources Consulted
- CockroachDB Operator deployment docs: https://www.cockroachlabs.com/docs/v26.1/deploy-cockroachdb-with-cockroachdb-operator
- CockroachDB Helm charts values file: https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb-parent/charts/cockroachdb/values.yaml
- CockroachDB Operator CRD schema: https://raw.githubusercontent.com/cockroachdb/cockroach-operator/master/install/crds.yaml
- CockroachDB multi-region overview: https://www.cockroachlabs.com/docs/stable/multiregion-overview
- CockroachDB CREATE DATABASE docs: https://www.cockroachlabs.com/docs/stable/create-database
- CockroachDB CREATE TABLE docs: https://www.cockroachlabs.com/docs/stable/create-table
- CockroachDB BACKUP docs: https://www.cockroachlabs.com/docs/stable/backup
- CockroachDB CREATE SCHEDULE FOR BACKUP docs: https://www.cockroachlabs.com/docs/stable/create-schedule-for-backup
- CockroachDB follower reads docs: https://www.cockroachlabs.com/docs/stable/follower-reads
- CockroachDB metrics docs: https://www.cockroachlabs.com/docs/stable/metrics
- CockroachDB Prometheus endpoint docs: https://www.cockroachlabs.com/docs/stable/prometheus-endpoint

## Issues Found
- The operator install command used a chart reference and image tag that do not match the current official operator deployment flow. Updated it to clone the official Helm chart repository and install the operator sub-chart from the local checkout.
- The node labeling example only set regions. CockroachDB multi-region localities should include region and zone labels, so zone labels and verification output were added.
- The deployment YAML used unsupported raw `CrdbCluster` fields such as `spec.topology.regions` and per-region `nodeCount`. Replaced it with the supported Helm values structure using `cockroachdb.crdbCluster.regions`, `localityMappings`, `startFlags`, storage, ingress, resources, and topology spread constraints.
- The text incorrectly stated that the operator creates one StatefulSet per region. Updated this to describe operator-managed nodes for each configured region.
- The SQL setup block mixed shell comments with SQL and omitted the primary region from the `REGIONS` list. Split the shell command from SQL and corrected the `CREATE DATABASE` statement.
- The SQL shell commands assumed a fixed pod name. Replaced them with a label-based pod lookup to match operator-managed naming.
- The regional-by-row table explanation implied a user-defined `region` string column controlled placement. Updated the example and note to use CockroachDB's hidden `crdb_region` column behavior.
- The backup example used removed `BACKUP ... TO` syntax and an outdated CockroachDB image. Replaced the Kubernetes CronJob with CockroachDB's built-in `CREATE SCHEDULE ... FOR BACKUP ... INTO` syntax.
- Several metric names used underscores or non-current names. Updated them to documented CockroachDB metric names.
- The failover test scaled a non-existent per-region StatefulSet. Replaced it with cordon/drain commands for the nodes in one region.
- The scaling commands patched unsupported raw CRD paths. Replaced them with a Helm upgrade that changes the per-region node counts in the supported values structure.
- The data residency claim was absolute. Qualified it to account for the need to keep nodes and backups constrained to EU locations as well.

## Review Notes
The post is technically relevant and salvageable. The largest caveat is that multi-region Kubernetes networking and DNS remain environment-specific; the corrected examples follow the current operator chart schema, but a production deployment still needs provider-specific validation for cross-region routing, storage classes, ingress, and certificate handling.
