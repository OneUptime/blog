# Validation Summary: How to Deploy Wasm Plugins to Istio Proxy

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Istio WasmPlugin
- Envoy proxy extensions
- WebAssembly / Proxy-Wasm modules
- OCI registries and ORAS
- Kubernetes Deployments, Services, ConfigMaps, and Secrets

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio Distributing WebAssembly Modules task: https://istio.io/latest/docs/tasks/extensibility/wasm-module-distribution/
- Istio Pull Policy for WebAssembly Modules: https://istio.io/latest/docs/ops/configuration/extensibility/wasm-pull-policy/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio TrafficExtension announcement and migration guidance: https://istio.io/latest/blog/2026/traffic-extension-api/
- ORAS push command reference: https://oras.land/docs/commands/oras_push/

## Issues Found
- The local-file Deployment example defined the same `wasm-plugins` volume both through `sidecar.istio.io/userVolume` and the pod `volumes` list. This can result in duplicate volume definitions after sidecar injection. I removed the `userVolume` annotation and kept the regular pod volume plus `sidecar.istio.io/userVolumeMount`, so the app init container and injected proxy can share the same volume.
- The image pull policy section stated that `IfNotPresent` is simply the default. Istio defaults to `Always` for OCI URLs tagged `latest`, and digest or `sha256` usage forces `IfNotPresent`. I added those exceptions and clarified that `Always` pulls when the WasmPlugin resource is created or changed.
- The verification command described `kubectl get wasmplugin ... -o yaml` as checking resource status. WasmPlugin resources do not necessarily expose a useful status field, so I changed the wording to checking the resource.
- The rollout section said Envoy downloads the new plugin. Istio documentation states that the Istio agent interprets the WasmPlugin, downloads remote modules, and references the local file in Envoy configuration. I corrected the wording.

## Review Notes
Istio 1.30 introduces `TrafficExtension`, which supersedes `WasmPlugin` as the recommended primary extensibility API, but existing `WasmPlugin` resources remain compatible and Istio internally transforms them to `TrafficExtension`. The post remains technically valid as a WasmPlugin-focused guide, but a future update could add a short migration note for Istio 1.30 and later.
