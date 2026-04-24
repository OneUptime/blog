# Validation Summary: How to Set Up Database Operators in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- CloudNativePG
- MongoDB Controllers for Kubernetes
- Percona Operator for MySQL
- Redis Operator
- Helm
- Prometheus Operator
- Grafana

## Sources Consulted
- CloudNativePG Helm chart docs: https://cloudnative-pg.io/charts
- CloudNativePG bootstrap docs: https://cloudnative-pg.io/documentation/1.20/bootstrap/
- CloudNativePG monitoring docs: https://cloudnative-pg.io/docs/1.29/monitoring/
- MongoDB Controllers for Kubernetes install docs: https://www.mongodb.com/docs/kubernetes-operator/current/tutorial/install-k8s-operator/
- MongoDB Helm charts repository: https://github.com/mongodb/helm-charts
- MongoDB Controllers for Kubernetes repository: https://github.com/mongodb/mongodb-kubernetes
- MongoDB Community deployment docs in the current repository: https://github.com/mongodb/mongodb-kubernetes/blob/master/docs/mongodbcommunity/deploy-configure.md
- MongoDB Community user management docs in the current repository: https://github.com/mongodb/mongodb-kubernetes/blob/master/docs/mongodbcommunity/users.md
- Archived MongoDB Community Operator repository notice: https://github.com/mongodb/mongodb-kubernetes-operator
- Percona Operator for MySQL Helm install docs: https://docs.percona.com/percona-operator-for-mysql/pxc/helm.html
- Percona Operator for MySQL custom resource reference: https://docs.percona.com/percona-operator-for-mysql/pxc/operator.html
- Percona Operator for MySQL scheduled backup docs: https://docs.percona.com/percona-operator-for-mysql/pxc/backups-scheduled.html
- Redis Operator repository: https://github.com/OT-CONTAINER-KIT/redis-operator
- RedisCluster example for current `v1beta2`: https://github.com/OT-CONTAINER-KIT/redis-operator/blob/main/example/v1beta2/redis-cluster.yaml
- RedisCluster CRD for current required fields: https://github.com/OT-CONTAINER-KIT/redis-operator/blob/main/config/crd/bases/redis.redis.opstreelabs.in_redisclusters.yaml
- Rancher monitoring configuration examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/examples
- Rancher monitoring architecture docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works

## Issues Found
- The MongoDB section used the deprecated and archived MongoDB Community Operator. I replaced it with the current MongoDB Controllers for Kubernetes Helm install, kept the `MongoDBCommunity` resource format that remains supported, aligned it to the operator namespace, and added the missing password secret details.
- The Percona example pinned old `1.14.0` operator/image versions and used the outdated scheduled backup field `keep`. I updated the sample to current `1.19.0` operator/image references and changed backup retention to the current `retention` structure documented by Percona.
- The Redis `RedisCluster` example was not valid for the current `v1beta2` CRD because it omitted the required `spec.kubernetesConfig` block and used an outdated storage layout. I updated the manifest to match the current CRD and upstream example shape.
- The CloudNativePG setup referenced a namespace and application secret that were never created. I added the required namespace creation and a valid `kubernetes.io/basic-auth` secret for the bootstrap user.
- The CloudNativePG monitoring rule referenced `cnpg_cluster_ready`, which is not documented in current CloudNativePG monitoring docs. I replaced it with a documented `PodMonitor` plus an alert based on `cnpg_collector_up`.

## Review Notes
- The CloudNativePG example keeps a major-version image tag (`ghcr.io/cloudnative-pg/postgresql:16`), which is supported by current CloudNativePG image-tag rules and avoids pinning an outdated patch release in the article body.
- MongoDB, Percona, and Redis examples still pin concrete database/operator versions or current image tags where upstream guidance expects them; these should be refreshed periodically as upstream projects release new certified versions.
- The Redis Operator documentation site still surfaces older examples in some places; for the `v1beta2` custom resource shape, the repository CRD and current example were the authoritative references used for validation.
- Grafana dashboard IDs are catalog entries rather than Rancher-managed resources and may gain newer revisions over time even when the IDs remain importable.
