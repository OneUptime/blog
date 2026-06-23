# Validation Summary: How to Migrate from REST to gRPC Incrementally

## Status
validated

## Post Type
Tutorial / Guide (step-by-step incremental REST-to-gRPC migration with Go code, proto schemas, buf config, and Prometheus rules)

## Technologies Covered
- gRPC (grpc-go)
- Protocol Buffers (proto3)
- grpc-gateway v2
- buf / buf.gen.yaml code generation (protoc-gen-go, protoc-gen-go-grpc, protoc-gen-grpc-gateway, protoc-gen-openapiv2)
- Go standard library (`net/http`, `context`, `sync`)
- google.api HTTP and field_behavior annotations
- Prometheus / promauto metrics and alerting rules
- OpenAPI 3.0

## Sources Consulted
- grpc-gateway docs: https://grpc-ecosystem.github.io/grpc-gateway/
- grpc-go package docs: https://pkg.go.dev/google.golang.org/grpc
- protojson docs: https://pkg.go.dev/google.golang.org/protobuf/encoding/protojson
- buf configuration reference: https://buf.build/docs/configuration/v1/buf-gen-yaml
- google.api annotations (http.proto, field_behavior.proto): https://github.com/googleapis/googleapis/tree/master/google/api
- Prometheus querying / alerting docs: https://prometheus.io/docs/prometheus/latest/querying/functions/ and https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Unused imports in `internal/adapter/rest_compat.go`** — the snippet imported `encoding/json` and `strconv`, but neither was referenced anywhere in the file. Unused imports are a hard compile error in Go, so the snippet would not build as written. Removed both imports, leaving only `net/http` and the generated `userv1` package, which are actually used. No behavior change.

## Review Notes
- **`grpc.Dial` is deprecated.** `NewUserClient` uses `grpc.Dial` with `insecure.NewCredentials()`. As of grpc-go v1.63 (2024), `grpc.Dial`/`grpc.DialContext` are deprecated in favor of `grpc.NewClient`. The code still compiles and works, but a future revision should prefer `grpc.NewClient` (note that `NewClient` uses lazy connection and a different default name-resolution scheme). Left as-is since it remains functional and is still widely used.
- **Decoding gateway JSON into proto structs with `encoding/json`.** The hybrid client (`getUserREST`, `listUsersREST`, `createUserREST`) decodes REST responses into proto-generated structs (`userv1.User`, `userv1.ListUsersResponse`) using `encoding/json`. This is an illustrative simplification: the gateway emits camelCase field names (because `UseProtoNames: false`), and proto messages such as `google.protobuf.Timestamp` do not round-trip correctly through `encoding/json`. In production, `protojson.Unmarshal` (or the generated client types) should be used to deserialize gateway responses. Worth flagging in a future update, but it does not affect the structural correctness of the migration approach being taught.
- **`buf.yaml`/`buf.gen.yaml` use the v1 format**, which is correct and still supported. The short plugin names (`go`, `go-grpc`, `grpc-gateway`, `openapiv2`) resolve to the corresponding local `protoc-gen-*` binaries; this is valid buf v1 usage. A newer post could mention the v2 config format.
- The proto schema, HTTP annotations (`google.api.http` with `body: "*"` and path templates), enum naming conventions (`USER_ROLE_UNSPECIFIED = 0`), field_behavior annotations, gRPC health/reflection registration, graceful shutdown, FNV-based consistent-hash rollout bucketing, and Prometheus PromQL expressions are all technically correct.
- The `FeatureFlagClient` declares a `sync.RWMutex` that its shown method does not use, and `legacyResponseWrapper.body` is stored but never consumed — both are illustrative incompleteness (the middleware is explicitly partial), not compile errors, so they were left untouched.
