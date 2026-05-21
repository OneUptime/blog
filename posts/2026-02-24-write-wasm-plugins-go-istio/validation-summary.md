# Validation Summary: How to Write Wasm Plugins in Go for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio WasmPlugin
- Envoy proxy-wasm
- WebAssembly / WASI
- Go
- proxy-wasm Go SDK
- HTTP filters, headers, request bodies, and HTTP callouts

## Sources Consulted
- proxy-wasm Go SDK README: https://github.com/proxy-wasm/proxy-wasm-go-sdk
- proxy-wasm Go SDK package documentation: https://pkg.go.dev/github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Go WebAssembly documentation: https://go.dev/wiki/WebAssembly

## Issues Found
- The post used the older TinyGo-focused module path `github.com/tetratelabs/proxy-wasm-go-sdk`. Updated it to the maintained `github.com/proxy-wasm/proxy-wasm-go-sdk` path.
- The setup and build instructions used TinyGo, `-scheduler=none`, and `-target=wasi`. Updated them to the current Go 1.24+ WASI reactor build command: `GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared`.
- The plugin examples registered the VM context from `main`. Updated them to the SDK-documented `func main() {}` plus `init()` registration pattern.
- The first plugin example could fail when plugin configuration was omitted and could leave empty header defaults after partial configuration. Added default initialization and an empty-configuration check.
- The request-body example replaced the request body without removing `content-length`. Added request-header handling to remove `content-length` before body size changes, matching the SDK documentation.
- The HTTP callout example used a non-existent `GetHttpCallResponseHeader` helper. Replaced it with `GetHttpCallResponseHeaders()` and header lookup.
- The HTTP callout example used a service DNS name as the Envoy cluster name. Updated it to an Istio outbound cluster-style name.
- The HTTP callout example built JSON by string concatenation. Updated it to use `json.Marshal` so authorization tokens are encoded correctly.
- The limitations section described TinyGo-specific restrictions that no longer apply to the maintained SDK. Updated it to current Go/WASI/proxy-wasm host limitations.

## Review Notes
- I could not locally compile the snippets because this workspace does not have Go or TinyGo installed. API names and build flags were checked against the maintained SDK documentation and official Go/Istio references.
- Istio still documents `WasmPlugin`, but Istio has newer proxy extension work in progress. Future updates may want to mention version-specific deployment guidance if the blog targets a specific Istio release.
