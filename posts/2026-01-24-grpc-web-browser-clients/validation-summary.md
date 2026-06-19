# Validation Summary: How to Configure gRPC Web for Browser Clients

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- gRPC
- gRPC-Web
- Protocol Buffers
- Go gRPC server
- Envoy Proxy
- Docker Compose
- JavaScript and TypeScript
- React
- Nginx
- JWT authentication
- CORS

## Sources Consulted
- gRPC-Web README and TypeScript/code generation guidance: https://github.com/grpc/grpc-web/blob/master/README.md
- gRPC-Web protocol specification: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md
- gRPC over HTTP/2 protocol specification: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- Envoy gRPC-Web filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter
- Envoy CORS filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter
- Envoy CORS proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cors/v3/cors.proto
- Envoy string matcher proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/matcher/v3/string.proto
- Envoy JWT authentication proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/jwt_authn/v3/config.proto
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- NGINX gRPC module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- NGINX proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The Go server declared `UpdateTask` and `DeleteTask` in the proto and used them from the client, but the server implementation did not define those methods. Added minimal implementations so the example service handles the RPCs instead of returning unimplemented errors.
- The delete implementation initially could not safely broadcast a deletion over a stream of plain `Task` messages because clients would treat it as an update. The corrected example deletes the task and lets the calling client update local state.
- The Envoy Docker Compose example used `localhost` for the upstream gRPC server from inside the Envoy container. Changed it to the Compose service name `grpc-server`.
- The Envoy CORS example used `prefix: "*"` as if it were a wildcard. Envoy string matchers treat `prefix` literally, so this was changed to a `safe_regex` matcher for the development wildcard example.
- The client generation instructions implied that the npm packages installed all required `protoc` tooling. Updated the instructions to point to the official Protocol Buffers and gRPC-Web release artifacts for `protoc`, `protoc-gen-js`, and `protoc-gen-grpc-web`.
- The TypeScript client imported `TasksServiceClientPb`, but the grpc-web generator names the file from the service name, producing `TaskServiceClientPb` for `TaskService`. Updated the import path.
- The TypeScript client imported unused grpc-web types. Removed the unused imports from the example.
- The React component referenced `Task.AsObject` without importing `Task`. Added the missing import.
- The Envoy JWT example said it would pass authentication headers through, but the JWT filter removes a verified JWT by default unless `forward: true` is set. Added `forward: true`.
- The Nginx TLS termination example used `grpc_pass`, which is for native gRPC upstreams, even though this hop forwards browser gRPC-Web traffic to Envoy over HTTP. Replaced it with `proxy_pass` and appropriate proxy headers.

## Review Notes
- The Docker Compose `version` key is now optional in the current Compose specification, but leaving it in place is still common and does not break the tutorial.
- `http2_protocol_options: {}` remains widely used in Envoy examples for simple gRPC upstreams, though newer Envoy configurations may prefer explicit typed protocol options in larger production setups.
