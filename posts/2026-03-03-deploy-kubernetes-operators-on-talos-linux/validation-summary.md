# Validation Summary: How to Deploy Kubernetes Operators on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Kubernetes Operator pattern (CRDs + Controllers)
- OperatorHub.io / Artifact Hub
- Operator Lifecycle Manager (OLM) / packagemanifests
- cert-manager (Operator example for kubectl install)
- OT-Container-Kit Redis Operator (Helm install)
- CloudNativePG (PostgreSQL Operator)
- kubectl / Helm CLI workflows
- Kubernetes RBAC (Role, ClusterRole)
- Prometheus metrics for Operators

## Sources Consulted
- cert-manager documentation and releases: https://cert-manager.io/docs/installation/ and https://github.com/cert-manager/cert-manager/releases
- CloudNativePG releases and install docs: https://github.com/cloudnative-pg/cloudnative-pg/releases and https://cloudnative-pg.io/documentation/
- OT-Container-Kit Redis Operator: https://github.com/OT-CONTAINER-KIT/redis-operator and https://ot-container-kit.github.io/redis-operator/
- Redis Operator CRD reference: https://doc.crds.dev/github.com/OT-CONTAINER-KIT/redis-operator/redis.redis.opstreelabs.in/RedisCluster/v1beta2
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ingress-nginx project (verified it is a Controller, not an Operator): https://github.com/kubernetes/ingress-nginx

## Issues Found
1. **Mislabeled NGINX Ingress as an "Operator"** — The original post used `ingress-nginx` (the NGINX Ingress *Controller*) as the kubectl-install example in a section titled "Deploying an Operator with kubectl." The `kubernetes/ingress-nginx` project is a Kubernetes Ingress controller, not an Operator (it does not follow the Operator pattern with custom resources reconciled by a domain-specific controller). Replaced this example with cert-manager v1.20.2, which is a true Operator commonly installed via a single `kubectl apply` of the published `cert-manager.yaml` (CRDs + controller + webhook + cainjector). Updated the verification commands to match the `cert-manager` namespace and `cert-manager` CRD prefix.

2. **CloudNativePG version 1.22.0 is EOL** — The post pinned the install URL to `release-1.22/releases/cnpg-1.22.0.yaml`. CloudNativePG 1.22 reached end-of-life well before 2026; the current stable line at validation time is 1.29.x (v1.29.1 released 2026-05-08). Updated the URL to `release-1.29/releases/cnpg-1.29.1.yaml` and added the `--server-side` flag, which the CloudNativePG project recommends because the manifest contains large CRDs that can exceed the client-side apply annotation size limit.

3. **RedisCluster `v1beta1` is deprecated** — The post used `apiVersion: redis.redis.opstreelabs.in/v1beta1`. The OT-Container-Kit Redis Operator has moved to `v1beta2` as the active API; `v1beta1` is slated for removal. The `clusterSize`, `kubernetesConfig`, and `storage.volumeClaimTemplate` fields used in the example are all valid under `v1beta2`, so only the `apiVersion` line needed updating.

## Review Notes
- The `kubectl get packagemanifests` command only works after Operator Lifecycle Manager (OLM) is installed in the cluster. Talos Linux does not ship OLM by default. The post's framing ("Or use the OLM catalog") implies this prerequisite, so the command is left as-is, but readers should be aware they need to install OLM first.
- The CloudNativePG `Cluster` manifest example uses `storageClass: local-path` (Rancher's local-path-provisioner). On a fresh Talos cluster this storage class will not exist unless the user has separately installed it; readers should substitute whichever storage class is available on their cluster.
- The `barmanObjectStore` backup example with `endpointURL: https://s3.amazonaws.com` is valid configuration syntax for CloudNativePG, but using Barman against AWS S3 in production typically also requires `wal` and `data` compression settings depending on workload. This is a stylistic/operational note, not a correctness issue.
- The `kubectl port-forward ... 8443:8443` snippet for Prometheus metrics assumes the Operator exposes metrics over HTTPS on 8443; many controller-runtime-based Operators default to 8443 with self-signed certs (hence `curl -k`), but some use plain HTTP on 8080. This is intentionally generic in the post.
- The namespace-scoped RBAC example grants `secrets` read/write to the Operator's Role — readers in security-sensitive Talos deployments may want to narrow this further (e.g., `resourceNames`) but the example is correct as written.
