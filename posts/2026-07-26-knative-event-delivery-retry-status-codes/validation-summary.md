# Validation Summary: Knative Event Delivery Retries: Which HTTP Status Codes Trigger Redelivery?

## Status
validated

## Post Type
Technical reference and configuration guide

## Technologies Covered
- Knative Eventing
- CloudEvents HTTP protocol binding
- HTTP response status codes and redirects
- Knative delivery retries and exponential backoff
- Knative dead letter sinks
- Knative `delivery-retryafter` feature
- Kubernetes and `kubectl`
- Knative Serving Services

## Sources Consulted
- Knative handling delivery failure documentation — https://knative.dev/docs/eventing/event-delivery/
- Knative `DeliverySpec.RetryAfterMax` feature documentation — https://knative.dev/docs/eventing/features/delivery-retryafter/
- Knative Eventing API reference — https://knative.dev/docs/eventing/reference/eventing-api/
- Knative Eventing shared retry classification (`retries.go`) — https://github.com/knative/eventing/blob/main/pkg/kncloudevents/retries.go
- Knative Eventing shared dispatcher (`event_dispatcher.go`) — https://github.com/knative/eventing/blob/main/pkg/kncloudevents/event_dispatcher.go
- Knative Eventing HTTP client construction (`http_client.go`) — https://github.com/knative/eventing/blob/main/pkg/kncloudevents/http_client.go
- Knative Eventing v1.21.0, v1.22.0, and v1.22.2 tagged retry implementations — https://github.com/knative/eventing/tags
- CloudEvents HTTP protocol binding v1.0.2 — https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md
- Go `net/http.Client` documentation — https://pkg.go.dev/net/http#Client
- Kubernetes `kubectl` command overview and syntax — https://kubernetes.io/docs/reference/kubectl/
- Kubernetes `kubectl get` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl describe` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
1. **`retryAfterMax` cap wording was ambiguous**: The original text could be read as saying that `retryAfterMax` caps the final retry delay. Knative actually caps the delay parsed from the `Retry-After` header first, then chooses the larger of that capped value and the normal configured backoff. Reworded the sentence to state the calculation order precisely.

## Review Notes
- The retry status classification is implementation-specific rather than a CloudEvents guarantee. It was verified against Knative Eventing v1.21.0, v1.22.0, v1.22.2, and current `main`; the post correctly tells readers to confirm behavior for their installed release and transport.
- The Trigger manifest uses the current `eventing.knative.dev/v1` API and valid `DeliverySpec` fields. `retry: 4` means up to four retries after the initial attempt, and `PT1S` is a valid ISO 8601 duration.
- The dispatcher considers only `200` through `299` successful. Its selective retry function retries a nil response, HTTP client errors, status codes at or above `500`, and `404`, `408`, `409`, and `429`; it does not retry final `1xx`, `2xx`, `3xx`, or other `4xx` responses.
- Knative's shared HTTP client leaves `CheckRedirect` unset, so Go's default redirect policy applies. The post correctly classifies the response that remains after redirect processing and warns against treating redirects as Knative routing policy.
- The Kafka Broker delivery support and channel-based Broker limitation statements match the current Knative delivery support table.
- The `kubectl get`, `kubectl describe`, `-n`, and `-o yaml` usages are valid. `ksvc` remains the documented short name for a Knative Serving Service.
