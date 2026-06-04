# Validation Summary: How to Configure API Gateway Request and Response Transformation Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kong Gateway request-transformer and response-transformer plugins
- Kong Gateway custom Lua plugins and PDK
- Kubernetes Gateway API HTTPRoute filters
- NGINX Gateway Fabric SnippetsFilter
- Envoy HTTP Lua, external processing, and gRPC-JSON transcoder filters
- curl and kubectl

## Sources Consulted
- Kong Request Transformer plugin documentation: https://developer.konghq.com/plugins/request-transformer/
- Kong Request Transformer configuration reference: https://developer.konghq.com/plugins/request-transformer/reference/
- Kong Response Transformer plugin documentation: https://docs.konghq.com/hub/kong-inc/response-transformer/
- Kong custom plugin handler.lua documentation: https://developer.konghq.com/custom-plugins/handler.lua/
- Kong PDK kong.request documentation: https://developer.konghq.com/gateway/pdk/reference/kong.request/
- Kong PDK kong.service.request documentation: https://developer.konghq.com/gateway/pdk/reference/kong.service.request/
- Kong PDK kong.service.response documentation: https://developer.konghq.com/gateway/pdk/reference/kong.service.response/
- NGINX Gateway Fabric Snippets documentation: https://docs.nginx.com/nginx-gateway-fabric/traffic-management/snippets/
- NGINX Gateway Fabric API reference: https://docs.nginx.com/nginx-gateway-fabric/reference/api/
- Kubernetes Gateway API HTTPRoute specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy external processing filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_proc_filter.html
- Envoy gRPC-JSON transcoder documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_json_transcoder_filter
- Envoy gRPC-JSON transcoder API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/grpc_json_transcoder/v3/transcoder.proto

## Issues Found
- The Kong Admin API example used `$(uuidgen)`, which is evaluated by the local shell at plugin creation time rather than per request. Changed it to pass a Kong request-transformer template for an incoming request ID header and quoted it so the shell does not treat `$()` as command substitution.
- The Kong declarative request-transformer example used `$(date +%s)`, which is not valid per-request shell execution in Kong declarative configuration. Replaced it with a request header template and added a note explaining that transformer templates read request values rather than run shell commands.
- The Kong custom Lua example returned arbitrary `transform_request` and `transform_response` functions instead of a Kong plugin handler table with phase methods. Updated it to return a handler with `VERSION`, `PRIORITY`, `access`, and `response` methods, matching Kong custom plugin conventions.
- The Kong custom Lua response example used `kong.service.response` for response body mutation. Updated it to read and set the downstream response body through `kong.response.get_raw_body()` and `kong.response.set_raw_body()` in the response phase.
- The Kong custom plugin deployment text implied that creating a ConfigMap and calling the Admin API fully deploys a plugin. Added the requirement to mount the plugin under the expected Kong plugin path and include it in Kong's loaded plugins setting before enabling it.
- The NGINX Gateway Fabric advanced snippet used the NGINX Ingress Controller `VirtualServer` API, not NGINX Gateway Fabric. Replaced it with a `gateway.nginx.org/v1alpha1` `SnippetsFilter` and an HTTPRoute `ExtensionRef`, matching NGINX Gateway Fabric documentation.
- The first NGINX Gateway API example used `gateway.networking.k8s.io/v1beta1` and lacked route attachment/backend references. Updated it to `gateway.networking.k8s.io/v1` with `parentRefs` and `backendRefs`.
- The Envoy Lua example passed `os.time()` directly as a header value. Updated it to `tostring(os.time())` to match Envoy's Lua header API expectation of string values.
- The performance section gave fixed millisecond overhead figures without an authoritative basis and without accounting for deployment, payload, and gateway differences. Replaced those numbers with qualitative, technically defensible guidance.

## Review Notes
The examples remain illustrative and still need environment-specific values such as real Gateway names, Kong deployment settings, Envoy clusters, and service names before they can be applied in production.
