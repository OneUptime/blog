# Validation Summary: How to Use Feature Flags in Go

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- Feature flags / feature toggles
- Percentage rollouts and consistent hashing
- User targeting and segmentation
- A/B testing
- LaunchDarkly Go server-side SDK
- Unleash Go SDK
- Go net/http
- Go sync.RWMutex

## Sources Consulted
- Go package documentation for sync: https://pkg.go.dev/sync
- Go package documentation for net/http: https://pkg.go.dev/net/http
- LaunchDarkly Go SDK reference: https://launchdarkly.com/docs/sdk/server-side/go
- LaunchDarkly Go server SDK v7 package documentation: https://pkg.go.dev/github.com/launchdarkly/go-server-sdk/v7
- LaunchDarkly ldcomponents package documentation: https://pkg.go.dev/github.com/launchdarkly/go-server-sdk/v7/ldcomponents
- LaunchDarkly ldvalue package documentation: https://pkg.go.dev/github.com/launchdarkly/go-sdk-common/v3/ldvalue
- Unleash Go SDK documentation: https://docs.getunleash.io/sdks/go
- Unleash Go SDK v6 package documentation: https://pkg.go.dev/github.com/Unleash/unleash-go-sdk/v6

## Issues Found
- Updated the LaunchDarkly dependency and imports from `github.com/launchdarkly/go-server-sdk/v6` to the current v7 module path shown in the official SDK reference.
- Removed an unused `context` import from the LaunchDarkly example and added the missing `ldvalue` import.
- Fixed the LaunchDarkly `JSONVariation` wrapper to pass through the caller's `ldvalue.Value` default value instead of ignoring it and always using `{}`.
- Updated the Unleash dependency from the older `github.com/Unleash/unleash-client-go/v4` path to the current `github.com/Unleash/unleash-go-sdk/v6@latest` module path.
- Updated the Unleash example for current v6 APIs: `http.Header` for custom headers, `FeatureOptions{Ctx: ctx}` for flag evaluation, `VariantOptions{Ctx: ctx}` for variants, and `*api.Variant` as the variant return type.
- Adjusted thread-safe examples that returned pointers to internal mutable flag state after releasing locks. The basic flag manager, lifecycle manager, and HTTP API list/get/update paths now return or encode copies where appropriate.

## Review Notes
- The in-memory examples are suitable for demonstration and small applications, but production systems should still use persistent storage, authorization around management APIs, audit logging, and stronger validation of rollout percentages and A/B test weights.
- Local compilation was not possible because the `go` binary is not installed in this environment. The code was reviewed against official Go, LaunchDarkly, and Unleash documentation instead.
