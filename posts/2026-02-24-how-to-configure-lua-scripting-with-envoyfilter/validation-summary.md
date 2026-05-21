# Validation Summary: How to Configure Lua Scripting with EnvoyFilter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP Lua filter
- Lua / LuaJIT
- Kubernetes
- kubectl

## Sources Consulted
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The EnvoyFilter examples used the deprecated Lua `inline_code` field. Updated them to `default_source_code.inline_string`, which is the current Envoy Lua filter configuration field.
- The header manipulation example passed `os.time()` directly to `headers:add()`. Envoy documents header values as strings, so the example now uses `tostring(os.time())`.
- The custom response example could continue executing after responding to `/health`, which could lead to a second `respond()` call when the request also lacked a User-Agent header. Added `return` after the direct health response.
- The dynamic metadata timing example used Lua `os.clock()`, which measures process CPU time rather than request wall time. Updated it to use Envoy's `handle:timestamp()` API and store elapsed milliseconds.
- The performance section described Lua scripts as simply running synchronously in the Envoy worker thread. Clarified that Envoy Lua is written in a synchronous style while Envoy handles async work through its APIs.

## Review Notes
- The `kubectl` binary was not installed in the local workspace, so Kubernetes command syntax was checked against the official generated kubectl reference instead of local `--help` output.
- The examples use `apiVersion: networking.istio.io/v1alpha3`, which remains the API version shown in Istio's current EnvoyFilter reference.
