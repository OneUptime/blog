# Validation Summary: How to Use HelmRelease for Deploying Redis with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux HelmRepository
- Kubernetes
- Helm
- Bitnami Redis Helm chart
- Redis
- Kubernetes Secrets
- SOPS

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux GitHub bootstrap command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Bitnami Redis Helm chart documentation: https://github.com/bitnami/charts/blob/main/bitnami/redis/README.md
- Bitnami Redis Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/redis/values.yaml
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/

## Issues Found
- The HelmRepository snippet described `spec.interval` as the frequency for checking new chart versions. Flux documentation states that `spec.interval` is ignored for OCI HelmRepository sources, so the comment was changed to say it is ignored for OCI HelmRepository sources.
- The replication example described plain Redis replicas as high availability. Bitnami and Redis documentation distinguish master-replica replication from Sentinel-based failover; without Sentinel, replicas are read replicas and the chart waits for the master to be respawned. The wording was changed to "read replicas" and "read scaling and redundancy."

## Review Notes
- The Flux OCI HelmRepository API remains valid for the examples, but Flux documentation now notes that OCI HelmRepository support is in maintenance mode and recommends OCIRepository for improved OCI chart support.
- The HelmRelease API version, `valuesFrom` fields, Bitnami Redis values, service names, Flux bootstrap command, and verification commands were consistent with the consulted documentation.
