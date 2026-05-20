# Validation Summary: How to Deploy Redis Sentinel with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Redis Sentinel
- ArgoCD
- Kubernetes
- Helm
- Bitnami Redis Helm chart
- External Secrets Operator
- ioredis
- redis-py
- Prometheus redis_exporter
- Kubernetes NetworkPolicy

## Sources Consulted
- Bitnami Redis Helm chart 19.6.0 package and values: https://charts.bitnami.com/bitnami/redis-19.6.0.tgz
- Bitnami Redis chart source: https://github.com/bitnami/charts/tree/main/bitnami/redis
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/v0.10.5/api/externalsecret/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel client specification: https://redis.io/docs/latest/develop/reference/sentinel-clients/
- ioredis Sentinel connection options: https://redis.github.io/ioredis/interfaces/SentinelConnectionOptions.html
- redis-py Sentinel documentation: https://redis.readthedocs.io/en/latest/connections.html
- redis_exporter source and metrics definitions: https://github.com/oliver006/redis_exporter
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The Bitnami Redis chart uses `replica.replicaCount` as the number of Redis/Sentinel `redis-node-*` StatefulSet pods when Sentinel is enabled. The post set `replicaCount: 2` but later referenced three Sentinel endpoints and described one primary plus two replicas. Updated `replicaCount` to `3`.
- The scaling example said `replicaCount: 4 # was 2`, but the corrected baseline is now three Redis/Sentinel nodes. Updated the comment to `# was 3`.
- The Python redis-py example used `REDIS_PASSWORD` without defining it. Added `import os` and `REDIS_PASSWORD = os.environ["REDIS_PASSWORD"]` before constructing the Sentinel client.

## Review Notes
The ArgoCD Application, ExternalSecret, Redis configuration directives, Sentinel client examples, NetworkPolicy structure, and listed redis_exporter metric names are technically valid. The guide pins Bitnami chart `19.6.0`, which is valid for Redis `7.2.5`; future updates should retest the Helm values against the selected chart version because Bitnami chart values can change across major versions. The separate `redis-config` and `redis-sentinel` Applications are workable, but initial installs should ensure the ExternalSecret reconciles before the Helm chart needs the referenced `redis-credentials` Secret.
