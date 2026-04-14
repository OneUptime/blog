# Validation Summary: How to Use Dapr with Logrus in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk`) — client and service/http packages
- Logrus (`github.com/sirupsen/logrus`) — structured logging for Go
- Go (Golang)

## Sources Consulted
- Dapr Go SDK `service/common` package docs — https://pkg.go.dev/github.com/dapr/go-sdk/service/common
- Dapr Go SDK `service/http` package docs — https://pkg.go.dev/github.com/dapr/go-sdk/service/http
- Dapr Go SDK `client` package docs — https://pkg.go.dev/github.com/dapr/go-sdk/client
- Logrus package docs — https://pkg.go.dev/github.com/sirupsen/logrus
- Dapr HTTP Service SDK for Go guide — https://docs.dapr.io/developing-applications/sdks/go/go-service/http-service/

## Issues Found

1. **Types imported from wrong package**: `InvocationEvent`, `Content`, `TopicEvent`, and `Subscription` were referenced as `daprd.X` (from `service/http`), but these types are only exported from `github.com/dapr/go-sdk/service/common`. Added the `common` import and changed all type references to `common.InvocationEvent`, `common.Content`, `common.TopicEvent`, and `common.Subscription`.

2. **`InvocationEvent.TraceID` does not exist**: The code referenced `in.TraceID` on `InvocationEvent`, but this struct only has `Data`, `ContentType`, `DataTypeURL`, `Verb`, and `QueryString` fields. There is no `TraceID` field. Changed the handler to use `in.Verb` (which does exist) and the `APP_ID` env var instead.

3. **`in.ContentType` passed as `callerAppID`**: The second argument to `WithDaprContext` was `in.ContentType` (MIME type like `application/json`), but the parameter was named `callerAppID`. This was semantically incorrect. Refactored `WithDaprContext` to accept `appID` and `method` parameters that match what `InvocationEvent` actually provides.

4. **Event handler used default logrus logger**: `orderEventHandler` called `logrus.WithFields()` (the package-level function on the default logger) instead of `logger.Log.WithFields()`, bypassing the configured JSON formatter, custom field map, and log level. Changed to use the configured logger.

5. **Description and summary claimed W3C trace header propagation**: The description said "propagating W3C trace headers" and the summary mentioned "trace IDs", but `InvocationEvent` does not expose trace context. Updated both to accurately describe what the code does (app context and request metadata).

## Review Notes
- Logrus is in maintenance mode. The author (Simon Eskildsen) recommends using `log/slog` (Go 1.21+) or `zerolog` for new projects. This doesn't make the post incorrect, but readers should be aware.
- The `DatadogHook` example uses `entry.Bytes()` which is correct (added in logrus v1.5.0), but error handling is suppressed with `_`. In production, failed log shipping should be handled.
- `TopicEvent` (used in the pub/sub handler) does have `TraceID` and `TraceParent` fields, unlike `InvocationEvent`. The event handler could be enhanced to log these for trace correlation, but this was not added to keep changes minimal.
- The `client.SaveState` call creates a new Dapr client per request. In production, the client should be created once and reused.
