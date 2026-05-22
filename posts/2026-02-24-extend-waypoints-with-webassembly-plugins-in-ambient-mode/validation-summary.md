# Validation Summary: How to Extend Waypoints with WebAssembly Plugins in Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio waypoint proxies
- Istio TrafficExtension and Wasm proxy extensions
- Envoy Proxy-Wasm
- Go WebAssembly plugins
- OCI artifacts and ORAS
- Kubernetes kubectl and ConfigMaps
- istioctl and pilot-agent debugging commands

## Sources Consulted
- Istio TrafficExtension API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/traffic_extension/
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio ambient waypoint WebAssembly guide: https://istio.io/latest/docs/ambient/usage/extend-waypoint-wasm/
- Istio TrafficExtension announcement and migration notes: https://istio.io/latest/blog/2026/traffic-extension-api/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Proxy-Wasm Go SDK README: https://github.com/proxy-wasm/proxy-wasm-go-sdk
- Proxy-Wasm Go SDK package docs: https://pkg.go.dev/github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm
- ORAS push command reference: https://oras.land/docs/commands/oras_push/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/

## Issues Found
- The post used `WasmPlugin` as the primary waypoint API. Istio 1.30 introduces `TrafficExtension` as the recommended extensibility API for Wasm and Lua, and the official ambient waypoint Wasm guide uses `TrafficExtension` with `targetRefs`. Updated examples and wording to use `kind: TrafficExtension`.
- The configuration snippets placed `url`, `sha256`, and `pluginConfig` directly under `spec`. In `TrafficExtension`, Wasm-specific settings belong under `spec.wasm`. Updated all YAML snippets accordingly.
- The phase descriptions were imprecise, especially `STATS`, which is inserted before Istio stats filters and after authorization filters, not simply after request processing. Updated the phase descriptions to match the Istio API reference.
- The Go example used the archived `github.com/tetratelabs/proxy-wasm-go-sdk` TinyGo-focused SDK. Updated imports and build commands to the current `github.com/proxy-wasm/proxy-wasm-go-sdk` guidance, using Go 1.24+ with `GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared`.
- The hosting section implied a ConfigMap could directly host a Wasm binary for the API. Istio supports OCI, HTTP(S), and `file://` URLs; a file URL requires the module to already exist in the proxy container. Replaced the ConfigMap guidance with the supported `file://` caveat.
- The debugging command checked `kubectl get wasmplugin`. Updated it to `kubectl get trafficextension`.
- The multiple-plugin ordering stated that lower priority numbers execute first. Istio applies extensions in descending priority order within a phase. Corrected this to higher priority numbers execute first.
- The rate-limiting example implied counters would be global. Added that local counters are per waypoint proxy instance unless an external store is used.
- The update section said plugin updates occur without any traffic disruption. Updated the wording to note that reload happens without restarting the waypoint proxy, assuming the new module is fetched and loaded successfully.

## Review Notes
TrafficExtension is alpha in Istio 1.30. Existing WasmPlugin resources remain compatible according to Istio's migration notes, but new waypoint-focused guidance should prefer TrafficExtension.
