# Validation Summary: How to Deploy Redis on OpenShift

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Redis 7.2
- OpenShift (Security Context Constraints, `oc` CLI)
- Kubernetes (Deployments, Services, PVCs, Secrets)
- Bitnami Redis Docker image
- Bitnami Redis Helm chart
- Helm (OCI registry)

## Sources Consulted
- Bitnami Redis Docker image documentation: https://hub.docker.com/r/bitnami/redis/
- Bitnami Redis container README: https://github.com/bitnami/containers/blob/main/bitnami/redis/README.md
- Bitnami Redis Helm chart values.yaml: https://github.com/bitnami/charts/blob/main/bitnami/redis/values.yaml
- Bitnami Helm charts OCI migration announcement: https://blog.bitnami.com/2024/10/bitnami-helm-charts-moving-to-oci.html
- OpenShift Security Context Constraints documentation: https://docs.openshift.com/container-platform/latest/authentication/managing-security-context-constraints.html
- Official Redis Docker image: https://hub.docker.com/_/redis

## Issues Found
1. **Deprecated Bitnami Helm repository URL**: The post used `helm repo add bitnami https://charts.bitnami.com/bitnami` followed by `helm install redis bitnami/redis`. Bitnami deprecated their legacy HTTPS Helm chart repository and migrated to OCI-based distribution. Fixed by replacing with the OCI install command: `helm install redis oci://registry-1.docker.io/bitnamicharts/redis`. This eliminates the need for `helm repo add`.

## Review Notes
- The Kubernetes YAML manifests (Deployment, Service, PVC) are syntactically correct and use proper field names.
- The Bitnami Redis image correctly runs as UID 1001, and the environment variables `REDIS_PASSWORD` and `REDIS_AOF_ENABLED` are valid.
- The `oc adm policy add-scc-to-user anyuid -z redis-sa -n my-app` command uses correct syntax for granting SCCs to service accounts.
- The official Redis Alpine image (`redis:7.2-alpine`) correctly uses UID 999.
- The Helm chart values (`master.podSecurityContext.enabled`, `master.podSecurityContext.fsGroup`, `master.containerSecurityContext.runAsUser`) are valid Bitnami Redis chart parameters.
- The verification section uses `redis-master-0` which is the pod name from the Helm-deployed StatefulSet. Readers using the Deployment-based Options 1 or 2 would need to substitute their actual pod name, but this is a minor usability note rather than a technical error.
