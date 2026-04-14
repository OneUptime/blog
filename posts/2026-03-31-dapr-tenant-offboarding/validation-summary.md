# Validation Summary: How to Implement Tenant Offboarding with Dapr

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Dapr (state management, pub/sub, components, resiliency, subscriptions)
- Kubernetes (kubectl, namespaces, deployments, pods, PVCs, Jobs)
- Helm
- Redis (redis-cli, RDB dumps)
- Apache Kafka (consumer groups, lag monitoring)

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Query API: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/
- Kubernetes kubectl wait documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl scale documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Kafka consumer-groups.sh documentation: https://kafka.apache.org/documentation/#basic_ops_consumer_group
- Helm uninstall documentation: https://helm.sh/docs/helm/helm_uninstall/

## Issues Found

### 1. Invalid Dapr State API URL (Step 3)
- **What was wrong:** The blog used `curl "http://tenant-api.${TENANT_ID}:3500/v1.0/state/statestore?key=all"` to export all state data. This is not a valid Dapr state management API endpoint. The Dapr GET state endpoint is `GET /v1.0/state/<storename>/<key>` for a single key, and there is no `?key=all` query parameter.
- **What was changed:** Replaced with the Dapr state query API: `POST /v1.0-alpha1/state/statestore/query` with an empty filter `{"filter": {}}`, which returns all state entries. Also updated the description text from "state API" to "state query API" for clarity.
- **Why:** The original URL would return a 404 or error. The state query API is the correct Dapr mechanism for retrieving multiple state entries without knowing keys in advance.

### 2. Incorrect terminology in Step 4 (minor)
- **What was wrong:** The text said "Delete Dapr CRDs for the tenant". CRDs (Custom Resource Definitions) are cluster-scoped schema definitions. What's being deleted are custom resources (CRs) — the instances of those definitions.
- **What was changed:** Changed "CRDs" to "custom resources".
- **Why:** Accuracy of Kubernetes terminology. Deleting CRDs would remove the definitions cluster-wide, affecting all tenants.

## Review Notes
- The state query API (`v1.0-alpha1`) is still in alpha and not all state stores support it. Redis does support querying, so the example is valid for the Redis use case shown. The direct `redis-cli --rdb` approach shown first is the more reliable export method.
- The final offboarding script is a simplified version that skips the state export/archival and pub/sub drain steps described in earlier sections. This is noted in context but could confuse readers expecting a complete script.
- The `kubectl delete component/configuration/resiliency/subscription` commands are valid when Dapr CRDs are installed on the cluster. These are namespaced Dapr resources and would also be cleaned up when the namespace is deleted in the final step.
