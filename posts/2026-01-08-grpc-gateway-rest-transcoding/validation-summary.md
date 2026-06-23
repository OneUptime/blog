# Validation Summary: How to Transcode gRPC to REST with grpc-gateway

## Status
validated

## Post Type
Tutorial / Guide (hands-on, step-by-step implementation walkthrough)

## Technologies Covered
- gRPC (grpc-go)
- grpc-gateway v2 (reverse proxy / transcoding)
- Protocol Buffers (proto3)
- protoc and plugins (protoc-gen-go, protoc-gen-go-grpc, protoc-gen-grpc-gateway, protoc-gen-openapiv2)
- google.api HTTP annotations and field_behavior
- OpenAPI / Swagger v2 generation
- Go standard library (net/http, context, graceful shutdown)
- google.golang.org/protobuf/encoding/protojson

## Sources Consulted
- grpc-gateway runtime package — https://pkg.go.dev/github.com/grpc-ecosystem/grpc-gateway/v2/runtime
- grpc-gateway "Customizing your gateway" — https://grpc-ecosystem.github.io/grpc-gateway/docs/mapping/customizing_your_gateway/
- grpc-gateway v2 migration guide — https://grpc-ecosystem.github.io/grpc-gateway/docs/development/grpc-gateway_v2_migration_guide/
- grpc-gateway "Customizing OpenAPI Output" — https://grpc-ecosystem.github.io/grpc-gateway/docs/mapping/customizing_openapi_output/
- protoc-gen-openapiv2 options.proto — https://github.com/grpc-ecosystem/grpc-gateway/blob/main/protoc-gen-openapiv2/options/openapiv2.proto
- protoc-gen-openapiv2 options package — https://pkg.go.dev/github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2/options
- googleapis google/api annotations.proto, http.proto, field_behavior.proto (raw.githubusercontent.com/googleapis/googleapis)

## Issues Found
No technical issues found.

The post was reviewed in detail and is technically accurate:
- The custom error handler signature `func(ctx context.Context, mux *runtime.ServeMux, marshaler runtime.Marshaler, w http.ResponseWriter, r *http.Request, err error)` matches `runtime.ErrorHandlerFunc` and is correctly registered with `runtime.WithErrorHandler`.
- `runtime.WithMarshalerOption(runtime.MIMEWildcard, &runtime.JSONPb{...})` with `protojson.MarshalOptions{UseProtoNames, EmitUnpopulated}` and `protojson.UnmarshalOptions{DiscardUnknown}` are all valid current fields.
- Uses the modern, non-deprecated `grpc.NewClient` with `insecure.NewCredentials()` instead of the deprecated `grpc.Dial`/`grpc.DialContext`. The lazy connection is compatible with `RegisterUserServiceHandler(ctx, mux, conn)`.
- Proto3 syntax, `google.api.http` HTTP bindings (path params, query params, `body`, `body: "*"`, and `additional_bindings`) are correct.
- `google.api.field_behavior` annotations (`OUTPUT_ONLY`, `REQUIRED`) and the `openapiv2_swagger` / `openapiv2_operation` options (schemes, consumes/produces, security_definitions with `TYPE_API_KEY`/`IN_HEADER`, responses) are valid.
- protoc invocation flags (`paths=source_relative`, `generate_unbound_methods`, `allow_merge`, `merge_file_name`) and the import path layout (`-I third_party` resolving `protoc-gen-openapiv2/options/annotations.proto`) are correct.
- The googleapis raw URLs for annotations.proto, http.proto, and field_behavior.proto, and the grpc-gateway raw URLs for the openapiv2 options protos, are accurate.
- `status.Convert`, `runtime.HTTPStatusFromCode`, and the `errdetails` usage (`BadRequest_FieldViolation`, `ResourceInfo`, `RetryInfo` with `durationpb.Duration`) are all correct.

## Review Notes
- The post pins prerequisites at Go 1.21+, which is appropriate; `grpc.NewClient` requires grpc-go v1.63+ (released 2024) — readers on older grpc-go would need to upgrade, which is the correct guidance anyway.
- The Swagger UI snippet pins swagger-ui-dist@4 via unpkg. This works, but newer major versions (5.x) exist; using a CDN-pinned major is a reasonable, stable choice.
- The in-memory pagination is explicitly described as simplified ("in production, use cursor-based pagination"), so the offset-token approach is acceptable for a tutorial.
- The CORS middleware applies a permissive `Access-Control-Allow-Origin: *`; this is fine for a demo and the post's Production Considerations section appropriately covers TLS, rate limiting, and validation hardening.
