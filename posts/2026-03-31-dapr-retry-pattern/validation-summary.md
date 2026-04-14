# Validation Summary: How to Implement Retry Pattern with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency CRD (Custom Resource Definition)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Pub/Sub Subscriptions
- Dapr State Store
- Dapr Metrics (Prometheus)
- Go (Golang)
- Kubernetes / YAML configuration

## Sources Consulted
- Dapr Resiliency CRD schema (`charts/dapr/crds/resiliency.yaml` in Dapr GitHub repo)
- Dapr official documentation on resiliency policies and retry configuration
- Dapr Go SDK source code (`client/client.go` — `InvokeMethodWithContent` signature)
- Dapr Go SDK source code (`service/common/service.go` — `TopicEventHandler` type and `TopicEvent` struct)
- Dapr resiliency monitoring source (`resiliency_monitoring.go` — metric labels)
- Dapr Subscription CRD documentation (v1alpha1 vs v2alpha1 differences)

## Issues Found

### 1. Subscription CRD apiVersion incorrect
- **What was wrong:** The Pub/Sub Subscription YAML used `apiVersion: dapr.io/v1alpha1`, but the `routes.rules` feature with `match`/`path` routing is only available in `dapr.io/v2alpha1`. The `v1alpha1` API only supports a simple `route` field.
- **What was changed:** Updated `apiVersion` from `dapr.io/v1alpha1` to `dapr.io/v2alpha1`.
- **Why:** Using `v1alpha1` with `routes.rules` would result in the routing rules being ignored or an error, since that field structure is not recognized in the v1 schema.

### 2. Missing Go imports in first code example
- **What was wrong:** The `checkInventory` function uses `fmt.Sprintf` and `json.Unmarshal` but the import block only included `context`, `log`, and the Dapr client package. Missing `encoding/json` and `fmt`.
- **What was changed:** Added `"encoding/json"` and `"fmt"` to the import block.
- **Why:** The code would not compile without these imports.

### 3. Inaccurate Prometheus metric labels
- **What was wrong:** The monitoring section showed `dapr_resiliency_count` with only `app_id`, `policy`, and `status` labels, and used unverified status values "retry" and "failed". The actual metric includes additional required labels: `name`, `namespace`, `flow_direction`, and `target`.
- **What was changed:** Updated the PromQL examples to include the `name` and `flow_direction` labels, which are the most relevant for filtering retry metrics.
- **Why:** The original examples would not match any actual metrics emitted by Dapr, since they omitted key label dimensions.

## Review Notes
- The Resiliency CRD structure, retry policy field names (`policy`, `duration`, `maxInterval`, `maxRetries`), and target structure (`apps` with direct `retry`, `components` with `inbound`/`outbound`) are all correct per the official CRD schema.
- `maxRetries: -1` for indefinite retries is confirmed correct (it is also the default value).
- The Dapr Go SDK `InvokeMethodWithContent` signature and return type `([]byte, error)` are correct.
- The pub/sub handler return type `(retry bool, err error)` is correct — returning `true` signals Dapr to redeliver the message.
- The idempotency pattern using state store to track processed messages is a sound approach.
- The second Go code block (`handleOrder`) also uses `json` and `log` packages but does not show an import block; this is acceptable for a code snippet that is clearly a fragment rather than a complete file.
