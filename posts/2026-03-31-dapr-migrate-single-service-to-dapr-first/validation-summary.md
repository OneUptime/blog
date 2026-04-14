# Validation Summary: How to Migrate a Single Service to Dapr First

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr (sidecar architecture, state management API, component configuration)
- Kubernetes (deployments, annotations, rolling updates, rollback)
- Redis (as Dapr state store backend)
- Python (Dapr HTTP API and Python SDK usage)
- pytest, Locust (testing tools)

## Sources Consulted
- Dapr Component spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr sidecar overview: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Dapr State management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Python SDK client docs: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
1. **Incorrect sidecar container name in comment (line 68):** The comment referred to the Dapr sidecar as "dapr-proxy" but the actual container name is `daprd`. Fixed to "daprd sidecar" for consistency with the `kubectl logs -c daprd` command on the next line.

2. **`kubectl set image` described as canary deployment (lines 117-119):** The comment claimed this command deploys to "10% of traffic" as a canary. In reality, `kubectl set image` triggers a rolling update that replaces all pods with the new image. True canary deployments require additional tooling (e.g., Argo Rollouts, Flagger, Istio traffic splitting, or separate deployments with weighted ingress). Fixed the description to accurately say "rolling deployment" and "rolling update".

3. **`kubectl top pods` described as monitoring error rate (line 123):** The comment said "Monitor error rate" but `kubectl top pods` only shows CPU and memory usage. It does not display error rates or application-level metrics. Fixed the comment to "Monitor resource usage during rollout".

## Review Notes
- The Dapr component YAML, annotations, HTTP state API endpoint, and Python SDK usage are all correct per current official documentation.
- The `pytest --env=staging` flag is not a built-in pytest option and would require a custom plugin or conftest configuration. This is acceptable in context as the post is showing a conceptual example.
- For users who truly need canary deployments with Dapr, they would need to use tools like Argo Rollouts, Flagger, or Istio traffic management rather than plain `kubectl set image`.
