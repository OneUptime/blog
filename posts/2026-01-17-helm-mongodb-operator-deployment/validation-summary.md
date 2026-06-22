# Validation Summary: Deploying MongoDB Operator with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- MongoDB Community Kubernetes Operator
- MongoDB Controllers for Kubernetes
- MongoDB replica sets and sharded clusters
- Helm
- Kubernetes Deployments, StatefulSets, Secrets, ConfigMaps, CronJobs, and Services
- TLS with OpenSSL and Kubernetes TLS secrets
- Percona Backup for MongoDB
- Percona MongoDB Exporter
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- MongoDB Community Kubernetes Operator GitHub documentation: https://github.com/mongodb/mongodb-kubernetes-operator
- MongoDB Community Operator Helm chart values: https://github.com/mongodb/helm-charts/blob/main/charts/community-operator/values.yaml
- MongoDB Community Operator CRD schema: https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/config/crd/bases/mongodbcommunity.mongodb.com_mongodbcommunity.yaml
- MongoDB Controllers for Kubernetes install and Helm settings docs: https://www.mongodb.com/docs/kubernetes/current/tutorial/install-k8s-operator/ and https://www.mongodb.com/docs/kubernetes/current/reference/helm-operator-settings/
- MongoDB Controllers for Kubernetes database resource docs: https://www.mongodb.com/docs/kubernetes/current/tutorial/deploy-replica-set/ and https://www.mongodb.com/docs/kubernetes/current/tutorial/deploy-sharded-cluster/
- MongoDB Controllers for Kubernetes CRD schema: https://github.com/mongodb/mongodb-kubernetes/blob/main/config/crd/bases/mongodb.com_mongodb.yaml
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Prometheus Operator ServiceMonitor troubleshooting: https://prometheus-operator.dev/docs/platform/troubleshooting/
- Percona MongoDB Exporter reference: https://github.com/percona/mongodb_exporter/blob/main/REFERENCE.md
- Percona Backup for MongoDB S3 storage documentation: https://docs.percona.com/percona-backup-mongodb/details/s3-storage.html

## Issues Found
- The Community Operator Helm values used an empty `watchNamespace` comment as "all namespaces" and included an image name with a registry prefix. Updated `watchNamespace` to `"*"`, corrected the comment, and aligned image/hook/agent values with the official chart defaults.
- The enterprise section used the deprecated `mongodb/enterprise-operator` chart path and an invalid `opsManager.enabled` values key. Updated the section to use MongoDB Controllers for Kubernetes and the `mongodb/mongodb-kubernetes` chart.
- The sharded cluster example used `MongoDBCommunity`, but the Community Operator CRD only supports `type: ReplicaSet`. Replaced the example with the `mongodb.com/v1` `MongoDB` resource and the required Ops Manager credentials fields.
- The enterprise and sharded examples used old container names in pod spec overrides. Updated them to match the current MongoDB Controllers for Kubernetes database image name.
- The TLS certificate command created a wildcard CN without subjectAltName entries for the StatefulSet pod DNS names. Added SANs for the service and expected replica-set pod DNS names.
- The PBM ConfigMap showed shell environment variables inside static ConfigMap data. Replaced them with explicit placeholders because Kubernetes does not expand environment variables inside ConfigMap literals.
- The application Deployment had a selector but no matching pod template labels. Added `template.metadata.labels`.
- The ServiceMonitor selected a non-existent MongoDB service label and referenced a port name that did not exist. Added an exporter Service and updated the ServiceMonitor to select it by label and scrape its `metrics` port.
- The MongoDB exporter example scraped the replica set through a non-SRV URI and did not enable compatibility metrics for the alert examples. Updated it to use the operator-created SRV service name and `--compatible-mode`.
- The vertical scaling snippet was marked as YAML but was a shell command, and the patch body was not a JSON merge patch. Changed the code fence to Bash and converted the patch payload to JSON.
- The wrap-up still recommended the Enterprise Operator generically. Updated it to distinguish Community Operator replica sets from MongoDB Controllers for Kubernetes for Ops Manager or Cloud Manager backed deployments.

## Review Notes
- Local `helm` and `kubectl` binaries were not installed, so commands could not be verified via CLI help or server-side dry-run. YAML snippets were parsed locally with PyYAML via `python3`.
- Prometheus metric names can vary by exporter version and compatibility mode. The exporter example now enables `--compatible-mode`, but production alert rules should still be checked against the exact metrics exposed by the deployed exporter.
