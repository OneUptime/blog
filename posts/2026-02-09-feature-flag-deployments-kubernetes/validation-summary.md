# Validation Summary: How to Implement Feature Flag-Based Deployments in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments, ConfigMaps, Secrets, Services, volumes, and sidecar containers
- kubectl apply and patch commands
- Node.js filesystem APIs
- LaunchDarkly Node.js server-side SDK
- Prometheus metrics and PromQL
- Feature flag rollout and cleanup practices

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap update tutorial: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- LaunchDarkly Node.js server-side SDK reference: https://launchdarkly.com/docs/sdk/server-side/node-js
- LaunchDarkly context configuration documentation: https://launchdarkly.com/docs/sdk/features/context-config
- Node.js fs.watch documentation: https://nodejs.org/api/fs.html
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- prom-client package documentation: https://www.npmjs.com/package/prom-client

## Issues Found
- The LaunchDarkly example used the older `launchdarkly-node-server-sdk` package name. Updated it to the current `@launchdarkly/node-server-sdk` package and added `kind: 'user'` to match current LaunchDarkly context examples.
- The LaunchDarkly example waited for initialization without a timeout. Updated it to `waitForInitialization({ timeout: 10 })`, matching LaunchDarkly's documented recommendation to avoid unbounded waits.
- The "internal users" ConfigMap rollout patch set `percentage` to `0` while the sample evaluator applies percentage checks before group checks, which meant internal users would never receive the feature. Changed the internal-only rollout to `percentage: 100` with `userGroups: ["internal"]`.
- The ConfigMap update explanation said pods need to restart unless watching for changes. Clarified that ConfigMap volume updates are reflected in mounted files after kubelet refresh, while applications must reload the file; environment-variable based ConfigMaps require new pods, and `subPath` mounts do not receive automatic updates.
- The PromQL ratio divided series with mismatched label sets and described "users" when the metric counts evaluations. Updated the query to aggregate with `sum by (flag_name)` and changed the comment to "Percentage of evaluations."
- The typed flag value example called `flags.getConfig()` even though the earlier custom helper did not define that method. Added a minimal `getConfig()` method and a default value argument in the example.

## Review Notes
The remaining Kubernetes YAML examples use valid core API fields for `apps/v1` Deployments, ConfigMap volumes, `secretKeyRef`, `emptyDir`, and Services. The custom feature-flag evaluator is intentionally simplified; a production implementation should add error handling around JSON reloads and consider watching the ConfigMap mount directory because Kubernetes refreshes projected volume contents via symlink updates.
