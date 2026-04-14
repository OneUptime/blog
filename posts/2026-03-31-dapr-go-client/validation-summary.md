# Validation Summary: How to Use Dapr Go Client

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Go (Golang)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- gRPC (underlying transport)

## Sources Consulted
- Dapr Go SDK source code on GitHub (`github.com/dapr/go-sdk/client`)
- Dapr Go SDK package documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr official documentation for Go SDK: https://docs.dapr.io/developing-applications/sdks/go/go-client/

## Issues Found

### Issue 1: Non-existent `dapr.Raw` function
- **What was wrong:** The batch save example used `dapr.Raw(...)` to set the `Value` field on `SetStateItem`. The `Raw` function/type does not exist in the Dapr Go SDK. The `Value` field on `SetStateItem` is typed as `[]byte`.
- **What was changed:** Replaced `dapr.Raw(\`"val-a"\`)` with `[]byte(\`"val-a"\`)` and similarly for `"val-b"`.
- **Why:** `dapr.Raw` would cause a compile error. The correct way to assign byte data is with a standard `[]byte` conversion.

### Issue 2: Incorrect `SubscribeConfigurationItems` return type and unsubscribe pattern
- **What was wrong:** The blog showed `sub, err := client.SubscribeConfigurationItems(...)` followed by `defer sub.Close()`, implying the return value is an object with a `Close()` method. In reality, `SubscribeConfigurationItems` returns `(string, error)` where the string is a subscription ID. Unsubscribing is done via a separate method: `client.UnsubscribeConfigurationItems(ctx, storeName, subscriptionID)`.
- **What was changed:** Changed the return variable from `sub` to `subscriptionID` and replaced `defer sub.Close()` with `client.UnsubscribeConfigurationItems(ctx, "config-store", subscriptionID)`.
- **Why:** The original code would not compile since a `string` type has no `Close()` method.

## Review Notes
- All other API calls (NewClient, SaveState, GetState, DeleteState, SaveBulkState, InvokeMethod, InvokeMethodWithContent, PublishEvent, GetSecret, GetBulkSecret, GetConfigurationItem) were verified as correct against the SDK source.
- The `SetStateItem.Etag` field is typed as `*ETag` (a struct with a `Value string` field), but setting it to `nil` as shown in the blog is valid Go since it's a pointer type.
- The `PublishEvent` data parameter accepts `interface{}` (any), so passing `map[string]any` as shown is correct — the SDK handles JSON marshaling internally.
