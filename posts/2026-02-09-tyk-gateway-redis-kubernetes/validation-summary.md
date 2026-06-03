# Validation Summary: How to Deploy Tyk Gateway on Kubernetes with Redis Backend

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Tyk Gateway
- Tyk Gateway API
- Tyk OSS Helm chart
- Kubernetes Deployments, StatefulSets, Services, ConfigMaps, and volumeClaimTemplates
- Redis and Redis Cluster
- Bitnami Redis Helm charts
- Helm
- OpenTelemetry metrics and Prometheus

## Sources Consulted
- Tyk Gateway OSS overview: https://tyk.io/docs/tyk-oss-gateway
- Tyk Gateway configuration options: https://tyk.io/docs/tyk-oss-gateway/configuration/
- Tyk Gateway API documentation: https://tyk.io/docs/tyk-gateway-api
- Tyk OSS Helm chart documentation: https://tyk.io/docs/5.0/tyk-oss/ce-helm-chart-new/
- Tyk `tyk-oss` chart values: https://github.com/TykTechnologies/tyk-charts/blob/main/tyk-oss/values.yaml
- Tyk Gateway OpenTelemetry metrics documentation: https://tyk.io/docs/api-management/logs-metrics
- Tyk Gateway installation options and current container registry examples: https://tyk.io/docs/apim/open-source/installation
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Helm install documentation: https://helm.sh/docs/helm/helm_install/
- Bitnami Redis chart values: https://github.com/bitnami/charts/blob/main/bitnami/redis/values.yaml
- Bitnami Redis Cluster chart values: https://github.com/bitnami/charts/blob/main/bitnami/redis-cluster/values.yaml
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/

## Issues Found
- The post incorrectly described Redis as the primary datastore for OSS Gateway API definitions. Updated the description and architecture text to state that file-based OSS API definitions are stored in the Gateway `app_path`, while Redis is used for distributed rate limits, session data, and analytics buffering.
- The Redis configuration used `maxmemory-policy allkeys-lru`, which can evict arbitrary Tyk keys under memory pressure. Changed it to `noeviction` for a datastore-style Redis deployment.
- The Gateway Deployment used the older Docker Hub image name. Updated it to Tyk's current documented registry path, `docker.tyk.io/tyk-gateway/tyk-gateway:v5.2`.
- The Helm values did not match the current `tyk-oss` chart. Replaced them with `global.redis.*`, `global.secrets.APISecret`, and `tyk-gateway.gateway.*` values, and added a Bitnami Redis install command with persistence.
- The Gateway API example did not make clear that API writes through a Kubernetes Service only affect the pod that receives the request. Added a note recommending ConfigMaps, Tyk Operator, or updating each Gateway pod for multi-replica deployments.
- The Redis Cluster install used an unconfigured `bitnami/redis-cluster` repo reference. Updated it to the documented OCI chart reference and adjusted the Tyk Redis Cluster address example.
- The LoadBalancer test command only read `.status.loadBalancer.ingress[0].ip`, which fails on providers that return a hostname. Updated the jsonpath to accept either IP or hostname.
- The Prometheus monitoring snippet used `analytics_config.type: prometheus`, which is not a valid Gateway analytics configuration. Replaced it with the documented OpenTelemetry metrics configuration for Gateway v5.13 and later.

## Review Notes
The post still uses Tyk Gateway v5.2 in the manifest, while current Tyk releases and chart defaults are newer. The version-specific manifest remains usable as a v5.2 example, but future updates should consider aligning the manual deployment with the current Gateway version and using Tyk Operator for Kubernetes-native API management.
