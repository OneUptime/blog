# Validation Summary: How to Plan a Dapr Migration Strategy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (Helm, kubectl, pod annotations, sidecar injection)
- Redis (as Dapr state store backend)
- Python (Dapr Python SDK, redis-py)

## Sources Consulted
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr logs troubleshooting: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr state management how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr Python SDK source (DaprClient): https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- **`save_state` value type**: The `save_state` call passed `order` directly as the value, but the Dapr Python SDK's `save_state` method expects `Union[bytes, str]` for the value parameter. Since the "before" code used `json.dumps(order)` (implying `order` is a dict), the Dapr version must also serialize it. Fixed by changing `d.save_state('statestore', f'order-{order_id}', order)` to `d.save_state('statestore', f'order-{order_id}', json.dumps(order))`.

## Review Notes
- The Helm install command is correct but omits the prerequisite `helm repo add dapr https://dapr.github.io/helm-charts/` and `helm repo update` steps. This is a common omission in blog posts and not strictly an error, but readers new to Dapr may need this step.
- The kubectl jsonpath command for counting Dapr-enabled pods uses backslash-dot escaping (`dapr\.io`), which works in bash/zsh with single quotes. Bracket notation (`metadata.annotations["dapr.io/enabled"]`) would be more portable across shells and platforms.
- All Dapr component YAML, annotations, CLI commands, and Kubernetes configuration are accurate and current.
