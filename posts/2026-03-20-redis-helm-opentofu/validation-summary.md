# Validation Summary: How to Deploy Redis on Kubernetes with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Kubernetes
- Redis
- Redis Sentinel
- Redis Cluster
- Helm
- Bitnami Helm charts

## Sources Consulted
- Bitnami Redis chart README: https://github.com/bitnami/charts/tree/main/bitnami/redis
- Bitnami Redis chart package for the version used in the post: https://charts.bitnami.com/bitnami/redis-18.16.0.tgz
- Bitnami Redis Cluster chart README: https://github.com/bitnami/charts/tree/main/bitnami/redis-cluster
- Bitnami Redis Cluster chart package for the version used in the post: https://charts.bitnami.com/bitnami/redis-cluster-10.2.0.tgz
- Terraform Helm provider `helm_release` docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Kubernetes provider `kubernetes_secret` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Terraform Kubernetes provider `kubernetes_namespace` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/2.21.0/docs/resources/namespace
- Kubernetes namespaces docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes PodDisruptionBudget docs: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Redis Sentinel docs: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/

## Issues Found
- The post created a `kubernetes_secret` in the `redis` namespace before that namespace existed, while also relying on `auth.existingSecret`. I added an explicit `kubernetes_namespace` resource and updated the secret, Helm releases, and PDB to reference it.
- The Redis chart example used `master.replicaCount`, which is not a valid value in Bitnami Redis chart `18.16.0`. I removed that incorrect setting.
- In Sentinel mode for chart `18.16.0`, the rendered workload is driven by the `replica.*` settings, not `master.resources` and `master.persistence`. I moved the storage and resource sizing to `replica`, and I moved the Redis tuning into `commonConfiguration` so it applies consistently across nodes.
- The Sentinel example used `replica.replicaCount = 2`, which is not a robust Sentinel deployment. Redis Sentinel’s own documentation recommends at least three Sentinel instances for a robust setup, so I changed it to three Redis/Sentinel nodes while keeping quorum at `2`.
- The Redis Cluster example used an `auth { ... }` block, but Bitnami `redis-cluster` chart `10.2.0` expects top-level `usePassword`, `existingSecret`, and `existingSecretPasswordKey`. I corrected that configuration.
- The PodDisruptionBudget selected `app.kubernetes.io/component = "replica"`, but the Sentinel-enabled Redis chart renders pods labeled `app.kubernetes.io/component = "node"`. I corrected the selector so the PDB actually applies to the deployed pods.
- The outputs hardcoded `redis-master.redis.svc.cluster.local`, but in Sentinel mode the chart exposes the `redis.redis.svc.cluster.local` service and clients should resolve the current write master through Sentinel. I updated the outputs and added `redis_sentinel_port`.
- The description claimed TLS encryption even though no `tls.*` settings were configured. I removed that inaccurate claim instead of introducing undocumented TLS certificate setup.

## Review Notes
- The pinned chart versions in the post are technically valid, but they are not current and Bitnami’s newer documentation prefers OCI chart references rather than the legacy HTTP repository.
- `metrics.serviceMonitor.enabled = true` is valid, but it requires the `ServiceMonitor` CRD from Prometheus Operator. The post now notes that prerequisite inline.
