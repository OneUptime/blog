# Validation Summary: How to Build gRPC Clients in React/Browser with gRPC-Web

## Status
validated

## Post Type
Tutorial / Guide (end-to-end implementation walkthrough)

## Technologies Covered
- gRPC / gRPC-Web
- Protocol Buffers (proto3)
- React + TypeScript (Create React App)
- `grpc-web` and `google-protobuf` JavaScript libraries
- `protoc` with `protoc-gen-grpc-web` code generation
- Envoy proxy (gRPC-Web filter)
- Nginx (reverse proxy)
- TanStack React Query v5
- Docker Compose

## Sources Consulted
- gRPC-Web official repo and docs — https://github.com/grpc/grpc-web
- gRPC Web Basics tutorial — https://grpc.io/docs/platforms/web/basics/
- `grpc-web` npm package — https://www.npmjs.com/package/grpc-web
- gRPC-Web TypeScript client example (DeepWiki) — https://deepwiki.com/grpc/grpc-web/9.3-typescript-client-example
- grpc/grpc-web Discussion #1322 "Nginx is supported out of box" — https://github.com/grpc/grpc-web/discussions/1322
- Envoy gRPC-Web filter docs — https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_web_filter
- Nginx `ngx_http_grpc_module` docs — https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- TanStack Query v5 docs (useInfiniteQuery `initialPageParam`) — https://tanstack.com/query/latest

## Issues Found
1. **Nginx presented as a working drop-in "Alternative to Envoy" (significant, corrected).** The post showed an Nginx `grpc_pass` config under the heading "Nginx Configuration (Alternative to Envoy)" implying it can replace Envoy for gRPC-Web. Nginx's `ngx_http_grpc_module` only proxies *native* gRPC over HTTP/2; it does not perform the gRPC-Web protocol translation — specifically it does not move gRPC status trailers into the response body, which browsers require to read `grpc-status`, and server streaming does not work correctly (confirmed by grpc/grpc-web Discussion #1322). Fix: renamed the heading to "Nginx Configuration" and added an explicit warning that Nginx is not a translation substitute for Envoy and should only sit in front of Envoy for TLS/CORS.
2. **Missing dependency for `@tanstack/react-query-devtools` (minor, corrected).** `App.tsx` imports `ReactQueryDevtools` from `@tanstack/react-query-devtools`, but the install command only installed `@tanstack/react-query`. Added `@tanstack/react-query-devtools` to the `npm install` line.
3. **Incorrect generated-file listing (minor, corrected).** The project-structure tree listed `user_grpc_web_pb.d.ts` in `src/generated/`. With `--grpc-web_out=import_style=typescript` (the style used in the generation script), the service client is emitted as `UserServiceClientPb.ts` and `user_grpc_web_pb.*` files are *not* generated (those come from the `commonjs`/`commonjs+dts` styles). Removed the spurious line.

## Review Notes
- **Create React App is deprecated.** CRA was officially deprecated by the React team in early 2025; `npx create-react-app` still functions but is no longer recommended (Vite or a framework is the current guidance). Left as-is because migrating away from CRA would require restructuring the whole tutorial (env-var prefix `REACT_APP_`, `react-scripts`), which is out of scope for a correctness pass. Readers should be aware they may prefer Vite + a Vite-compatible env setup.
- **`docker-compose.yaml` `version: '3.8'`** — the top-level `version` key is obsolete in Compose v2+ and emits a warning, but is harmless. Not changed.
- **Interceptors are defined but not wired into the client.** The `LoggingInterceptor`/`AuthInterceptor`/`RetryInterceptor`/`ErrorInterceptor` classes are correct and use valid `grpc-web` APIs, but `getUserServiceClient()` constructs `new UserServiceClient(endpoint, null, null)` without passing them via the options object's `unaryInterceptors`. This is an illustrative gap rather than an error; the interceptor code itself is accurate.
- `axios` is installed but never used in the post; harmless and left as-is.
- The gRPC-Web vs gRPC comparison table, Envoy filter ordering (`grpc_web` → `cors` → `router`), the proto3 definitions (including `optional` fields), `mode=grpcwebtext` (correctly chosen to support the server-streaming `WatchUsers` RPC), `RpcError`/`StatusCode` usage, and the React Query v5 hooks (`initialPageParam` + `getNextPageParam`) were all verified as correct.
