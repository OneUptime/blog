# Validation Summary: How to Implement Event Versioning with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Go (Golang)
- Event Sourcing / Event Versioning patterns

## Sources Consulted
- Dapr Go SDK source and API documentation (https://github.com/dapr/go-sdk)
- Dapr Go SDK `Client` interface: `PublishEvent(ctx, pubsubName, topicName string, data interface{}, opts ...PublishEventOption) error`
- Dapr Go SDK `PublishEventWithMetadata(metadata map[string]string) PublishEventOption` function
- Go standard library `encoding/json` behavior for `time.Time` (RFC3339) and `map[string]interface{}` (JSON numbers as `float64`)

## Issues Found
No technical issues found.

## Review Notes
- The `PublishEvent` call signature, including the `PublishEventWithMetadata` functional option, was verified against the current Dapr Go SDK and is correct.
- The type assertion `event.Payload["total"].(float64)` is correct because Go's `encoding/json` unmarshals JSON numbers into `float64` when the target type is `interface{}`.
- The post defines `upcastOrderCreated` in two separate code blocks with different logic (v1.0->v2.0 and v2.0->v3.0). This is a pedagogical choice showing how the function evolves over time; in production code these cases would be combined into a single function with a `switch` statement.
- Import statements (`time`, `context`, `fmt`) are omitted from code snippets, which is standard for blog post formatting.
- The `LoadEvents` and `upcastCustomerRegistered` functions are referenced but not defined — acceptable as the post focuses on the versioning pattern, not a complete implementation.
