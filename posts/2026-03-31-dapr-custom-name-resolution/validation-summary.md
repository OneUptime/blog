# Validation Summary: How to Use Custom Name Resolution in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime, components-contrib, name resolution)
- Go (implementation language)
- gRPC (mentioned but corrected — not used for name resolution)
- Kubernetes (deployment)
- YAML (Dapr Configuration resource)

## Sources Consulted
- Dapr supported name resolution components reference: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr pluggable components overview: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/pluggable-components-overview/
- Dapr pluggable components development guide: https://docs.dapr.io/developing-applications/develop-components/pluggable-components/develop-pluggable/
- Dapr pluggable components registration: https://docs.dapr.io/operations/components/pluggable-components-registration/
- Dapr components-contrib name resolution interface: https://github.com/dapr/components-contrib/blob/master/nameresolution/nameresolution.go
- Dapr proto components directory: https://github.com/dapr/dapr/tree/master/dapr/proto/components/v1
- Dapr Go pluggable components SDK: https://github.com/dapr-sandbox/components-go-sdk

## Issues Found

### 1. Fundamental approach was incorrect — pluggable components do not support name resolution
The post originally described building a custom name resolution component using the gRPC pluggable component interface (Unix sockets, proto definitions). Dapr's pluggable component support only covers state stores, pub/sub, bindings, and secret stores. There is no `nameresolution.proto` in the Dapr proto definitions. Custom name resolution requires implementing the `Resolver` interface from `components-contrib` and compiling it into a custom Dapr runtime build. **Fixed**: Rewrote the approach to use the correct `components-contrib` `Resolver` interface.

### 2. All proto types were fabricated
The original code referenced non-existent types: `proto.UnimplementedNameResolutionServer`, `proto.InitRequest`, `proto.Empty`, `proto.ResolveRequest`, `proto.ResolveResponse`, and `proto.RegisterNameResolutionServer`. None of these exist in the Dapr proto definitions. **Fixed**: Replaced with the correct `nameresolution.Resolver` interface, `nameresolution.Metadata`, and `nameresolution.ResolveRequest` types from `components-contrib`.

### 3. Method name `InitWithMetadata` was incorrect
The actual interface method is `Init(ctx context.Context, metadata Metadata) error`, not `InitWithMetadata`. **Fixed**: Changed to `Init`.

### 4. Field name `req.Id` was incorrect
The `ResolveRequest` struct uses `ID` (all caps), not `Id`. **Fixed**: Changed to `req.ID`.

### 5. Missing `fmt` import
The original Go code used `fmt.Errorf` but did not import the `fmt` package. **Fixed**: Added `fmt` to imports.

### 6. Missing `Close()` method
The `Resolver` interface requires a `Close() error` method (via `io.Closer`). The original code did not implement it. **Fixed**: Added `Close()` method.

### 7. Configuration resource type was wrong
Name resolution components are configured via `kind: Configuration` with `spec.nameResolution`, not via `kind: Component` with `spec.type`. **Fixed**: Replaced with correct `Configuration` resource format.

### 8. Unix socket and sidecar deployment model was incorrect
Since name resolution is not a pluggable component, the Unix socket path (`/tmp/dapr-components-sockets/`) and sidecar container pattern were wrong. Custom name resolution requires a custom `daprd` binary. **Fixed**: Updated deployment instructions to use a custom `daprd` image with `dapr.io/sidecar-image` annotation.

### 9. AWS CloudMap was missing from built-in components list
The list of built-in name resolution components omitted AWS CloudMap. **Fixed**: Added AWS CloudMap to the list.

### 10. `dapr run` command used `--components-path` instead of `--config`
Name resolution is configured via the `--config` flag, not `--components-path`. **Fixed**: Updated both `dapr run` commands.

## Review Notes
- The post's approach (custom Dapr runtime build) is more involved than typical Dapr customization. Users should be aware this requires maintaining a fork of the `dapr/dapr` repository and rebuilding `daprd` whenever they want to incorporate upstream updates.
- The Kubernetes YAML snippet is simplified for illustration. In practice, the `template` and `spec` nesting would need to be part of a complete Deployment manifest.
- The hardcoded registry map in the example is for demonstration; a real implementation would typically connect to an external service registry in the `Init` method using metadata properties.
