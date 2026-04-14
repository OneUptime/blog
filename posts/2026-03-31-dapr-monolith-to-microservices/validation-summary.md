# Validation Summary: How to Migrate from a Monolith to Microservices Using Dapr

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Dapr (sidecar architecture, service invocation, pub/sub, state management, outbox pattern)
- Kubernetes (deployments, annotations, labels)
- Python (Flask-based examples with requests library)
- Redis (as a state store)
- PostgreSQL (as a state store)
- Mermaid (diagrams)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr programmatic subscriptions: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr state store component reference (Redis): https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr state store component reference (PostgreSQL): https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr component scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr component secrets: https://docs.dapr.io/operations/components/component-secrets/
- Dapr outbox pattern: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-outbox/
- Dapr metadata API: https://docs.dapr.io/reference/api/metadata_api/
- Dapr sidecar injector source (for injected labels): https://github.com/dapr/dapr/blob/master/pkg/injector/patcher/sidecar_patcher.go

## Issues Found

### Issue 1: Pub/sub event handler not unwrapping CloudEvents envelope
- **What was wrong:** The `/handle-order-event` handler called `request.get_json()` and accessed `data.get('type')` and `data['email']` directly. However, Dapr delivers pub/sub messages wrapped in a CloudEvents v1.0 envelope by default. The custom payload is nested inside the `data` field of the CloudEvents envelope, so accessing the top-level `type` would match the CloudEvents type (`com.dapr.event.sent`), not the custom `order.placed` type.
- **What was changed:** Updated the handler to extract `event_data = event.get('data', {})` from the CloudEvents envelope, then access `event_data.get('type')`, `event_data['email']`, and `event_data['orderId']`.
- **Why:** Without this fix, the conditional check would never match `order.placed` and no confirmation email would be sent.

### Issue 2: kubectl command used annotation name as label selector
- **What was wrong:** The command `kubectl get pods --all-namespaces -l dapr.io/enabled=true` uses `-l` which filters by **labels**, not annotations. `dapr.io/enabled` is a pod template **annotation** used to trigger sidecar injection. It is not added as a label to the pod.
- **What was changed:** Changed to `kubectl get pods --all-namespaces -l dapr.io/sidecar-injected=true`, which uses the label that Dapr's sidecar injector actually adds to pods after injection.
- **Why:** The original command would return no results because no pod has `dapr.io/enabled` as a label.

## Review Notes
- The PostgreSQL state store components use `version: v1`. Dapr currently recommends `v2` for the PostgreSQL state store, which has an improved schema. While `v1` is still supported, authors may want to update to `v2` in a future revision.
- The programmatic subscription uses `"route"` (singular string) rather than the `"routes"` (structured object with `rules` and `default`). Both are valid — `"route"` is the simpler shorthand for subscriptions without routing rules, which is appropriate for this example.
- All Dapr annotations, API URL patterns, component YAML structures, scopes placement, secretKeyRef format, and outbox metadata fields are correct.
