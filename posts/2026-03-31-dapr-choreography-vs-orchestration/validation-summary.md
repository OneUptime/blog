# Validation Summary: How to Implement Choreography vs Orchestration with Dapr

## Status
validated

## Post Type
Tutorial / Comparison Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Pub/Sub building block
- Dapr Workflow building block
- Go programming language
- Dapr declarative Subscription YAML

## Sources Consulted
- Dapr Go SDK Client package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK Workflow package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/workflow
- Dapr Docs - How to: Author a workflow: https://docs.dapr.io/developing-applications/building-blocks/workflow/howto-author-workflow/
- Dapr Docs - Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Docs - How to: Publish and subscribe: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr Docs - Go SDK service callbacks: https://docs.dapr.io/developing-applications/sdks/go/go-service/grpc-service/

## Issues Found
1. **Missing `ctx` parameter in `placeOrder` function**: The function signature was `func placeOrder(client dapr.Client, order Order) error` but the function body used `ctx` (for `SaveState` and `PublishEvent` calls) without declaring it as a parameter. This would cause a compilation error. Fixed by adding `ctx context.Context` as the first parameter: `func placeOrder(ctx context.Context, client dapr.Client, order Order) error`.

## Review Notes
- The Subscription YAML uses `apiVersion: dapr.io/v1alpha1`, which is still functional but the newer `dapr.io/v2alpha1` format is now available. The v2alpha1 format uses `routes` (plural) with a `default` sub-field instead of `route` (singular). The v1alpha1 format shown in the blog is not incorrect but readers should be aware of the newer format.
- The handler functions (`handleOrderCreated`, `handlePaymentCompleted`) reference a `client` variable that is not in their function signatures. This is a common blog pattern where the client is assumed to be available from an outer scope (package-level variable or closure). Not a compilation error per se, but readers implementing this will need to manage the client lifecycle themselves.
- The `SaveState` call passes `nil` as the metadata parameter (`map[string]string`), which is valid and common when no metadata is needed.
- The topic event handler return value `(bool, error)` is correctly used: `false` means "do not retry" (drop the message), which is appropriate for both success and business logic failures.
- The Workflow API usage (`*workflow.WorkflowContext`, `GetInput`, `CallActivity` with `workflow.ActivityInput`, and `Await`) all match the current Dapr Go SDK signatures.
- The comparison table and guidance on when to use each pattern are accurate and well-aligned with industry consensus on choreography vs orchestration trade-offs.
