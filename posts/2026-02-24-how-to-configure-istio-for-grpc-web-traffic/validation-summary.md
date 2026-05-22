# Validation Summary: How to Configure Istio for gRPC-Web Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- gRPC-Web
- Kubernetes Gateway, VirtualService, Service, and Deployment resources
- Istio RequestAuthentication and AuthorizationPolicy
- CORS
- JavaScript and Protocol Buffers code generation

## Sources Consulted
- Envoy gRPC-Web HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter
- gRPC-Web protocol specification: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md
- gRPC-Web official README and code generation documentation: https://github.com/grpc/grpc-web
- Istio VirtualService and CORS policy reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio protocol selection reference: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- The introduction described gRPC-Web only as a JavaScript client library and said it works "without trailers." Updated it to describe gRPC-Web as a protocol and JavaScript implementation, and clarified that gRPC-Web encodes trailers into the wire format instead of depending on browser-exposed HTTP/2 trailers.
- The content-type examples omitted `application/grpc-web-text` and `application/grpc-web-text+proto`, even though the post uses `mode=grpcwebtext`. Added the text-mode content types in the flow and debugging sections.
- The code generation section did not mention the required `protoc-gen-js` and `protoc-gen-grpc-web` plugins. Added a prerequisite sentence so the `protoc` command is executable as written.
- The streaming section implied server-side streaming works in all gRPC-Web modes. Updated it to specify that server-side streaming is supported in `grpcwebtext` mode.
- The metrics section stated that gRPC-Web requests will show as `request_protocol="grpc"` without qualification. Updated it to distinguish destination-side backend metrics from ingress gateway metrics.
- The browser test loaded CommonJS generated files directly with `<script>` tags and referenced `proto.order.*` globals. Replaced it with a bundled frontend example that matches the earlier `import_style=commonjs` generation mode.

## Review Notes
The EnvoyFilter example uses Istio's advanced EnvoyFilter API, which is valid but should be rechecked during Istio or Envoy upgrades because EnvoyFilter patches depend on generated Envoy configuration details.
