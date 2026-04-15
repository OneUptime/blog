# Validation Summary: How to Use Dapr Kitex Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (output bindings)
- CloudWeGo Kitex (Go RPC framework by ByteDance)
- Thrift binary generic calls
- Go (net/http for Dapr sidecar invocation)

## Sources Consulted
- Dapr components-contrib Kitex binding source code: `github.com/dapr/components-contrib/bindings/kitex/kitex_output.go`
- Dapr components-contrib Kitex binding metadata: `github.com/dapr/components-contrib/bindings/kitex/metadata.yaml`
- Dapr official documentation for Kitex binding: `https://docs.dapr.io/reference/components-reference/supported-bindings/kitex/`

## Issues Found

1. **Wrong operation name**: The post used `"invoke"` as the operation in all curl and Go examples. The Kitex binding only supports the `"get"` operation (confirmed from Go source: `bindings.GetOperation`). Changed all instances to `"get"`.

2. **Non-existent `serviceName` metadata field**: The post used `serviceName` in request metadata. The binding implementation only recognizes `destService`, `methodName`, `hostPorts`, and `version`. Replaced `serviceName` with `destService` in all examples.

3. **Fabricated `headersKey`/`headersValue` fields**: The entire "Passing Custom Headers" section described non-existent metadata fields (`headersKey`, `headersValue`). The Kitex binding does not support custom header passing. Removed the section entirely and replaced it with a "Required Request Metadata Fields" reference section documenting the four actual fields.

4. **Fabricated `registryAddress` field and service discovery section**: The "Direct Connection vs Service Discovery" section referenced a `registryAddress` metadata field that does not exist in the binding. The binding only supports direct `hostPorts` connections. Removed this section.

5. **Incorrect `version` metadata value**: The post used `"v1"` as the version metadata value, confusing it with the Dapr component spec version. The `version` field refers to the Kitex framework version (e.g., `"0.5.0"`). Corrected all instances.

6. **Incorrect component-level metadata**: The component YAML included `hostPorts`, `destService`, and `version` as component-level metadata fields. Per the official docs, the Kitex binding takes no component-level metadata — all four fields (`methodName`, `destService`, `hostPorts`, `version`) are passed per-request in `InvokeRequest.Metadata`. Removed them from the component YAML.

7. **Incorrect response body reading in Go code**: `json.NewDecoder(resp.Body).Decode(&result)` into a `[]byte` variable does not correctly read an arbitrary HTTP response body. Replaced with `io.ReadAll(resp.Body)` and added the `io` import.

8. **Inaccurate description of serialization**: Changed "Thrift serialization" to "Thrift binary generic calls" to more accurately describe the Kitex binding mechanism.

9. **Inaccurate prerequisites**: Removed mention of ZooKeeper/Etcd service registry requirements since the binding does not support service discovery — it only supports direct host:port connections.

## Review Notes
- The Kitex binding is in **alpha** status in the Dapr components-contrib repository. Users should be aware it may change in future Dapr releases.
- The `metadata.yaml` in the Dapr repo lists the operation as `create`, but the actual Go implementation returns `bindings.GetOperation` (`"get"`). The Go source code is authoritative.
- The Go code example ignores the error from `json.Marshal(req)` (line `body, _ := json.Marshal(req)`). This is acceptable for a tutorial example but would not be appropriate in production code.
