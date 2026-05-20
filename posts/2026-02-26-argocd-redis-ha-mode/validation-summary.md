# Validation Summary: How to Configure ArgoCD Redis in HA Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Helm chart
- Kubernetes
- Redis
- Redis Sentinel
- HAProxy
- Prometheus metrics

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD v3.4.2 High Availability source documentation: https://github.com/argoproj/argo-cd/blob/v3.4.2/docs/operator-manual/high_availability.md
- Argo Helm argo-cd chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo Helm argo-cd chart README: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- DandyDeveloper redis-ha chart values and templates: https://github.com/DandyDeveloper/charts/tree/master/charts/redis-ha
- Official Redis Sentinel configuration reference: https://github.com/redis/redis/blob/unstable/sentinel.conf
- Official Argo CD HA install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml

## Issues Found
- Corrected the description of Redis contents to clarify that Argo CD persistent state is stored in Kubernetes objects and Redis is a disposable cache, not the source of truth for application sync or health state.
- Corrected the Helm values example for `redis-ha.topologySpreadConstraints`; the current redis-ha chart expects an object with `enabled`, `maxSkew`, `topologyKey`, and `whenUnsatisfiable`, not a raw Kubernetes list.
- Removed unsupported `sentinel.enabled` from the Helm values example.
- Added `sentinel.quorum` and corrected the explanation of `parallel-syncs`, which controls replica resynchronization concurrency rather than Sentinel agreement.
- Added the required Helm repository setup commands before `helm install`.
- Made the official manifest install namespace creation idempotent.
- Corrected Sentinel commands to use the Argo CD chart's `argocd` master group name instead of the upstream redis-ha default `mymaster`.
- Updated Redis CLI examples to authenticate with the `AUTH` environment variable because Argo CD's Redis HA deployment enables Redis AUTH by default.
- Updated Sentinel failover timing claims to avoid implying a fixed 1-2 second interruption.
- Changed the HAProxy snippet from exact generated YAML to a simplified HAProxy configuration and updated backend service names to the chart's announce services.
- Replaced deprecated `SLAVEOF` wording in the failover diagram with `REPLICAOF`.

## Review Notes
The local environment did not have `helm`, `kubectl`, or `argocd` installed, so CLI behavior was verified against official documentation, chart source, and upstream rendered manifest content rather than local command execution.
