# Validation Summary: How to Implement gRPC-Web in React for High-Performance APIs

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- gRPC-Web (`grpc-web` npm package)
- Protocol Buffers (protobuf) / `protoc` compiler
- `protoc-gen-grpc-web` plugin
- React + TypeScript (Create React App)
- `google-protobuf`
- Envoy proxy
- Docker Compose
- Jest / React Testing Library

## Sources Consulted
- grpc/grpc-web repository and releases — https://github.com/grpc/grpc-web (plugin download location, supported streaming types)
- grpc-web TypeScript definitions (`index.d.ts`) — https://raw.githubusercontent.com/grpc/grpc-web/master/packages/grpc-web/index.d.ts (named exports, `RpcError`, `StatusCode`, `Status`, `ClientReadableStream`, `UnaryInterceptor`, `GrpcWebClientBaseOptions`)
- gRPC-Web docs on streaming support (unary + server-streaming only; no client/bidi streaming)

## Issues Found
1. **Incorrect import of a non-existent `grpc` namespace.** The post used `import { grpc } from 'grpc-web'` and then referenced `grpc.RpcError`, `grpc.StatusCode`, and `grpc.Status` throughout (`useUserService.ts`, `useUserStream.ts`, `grpcErrorHandler.ts`, `batchRequests.ts`). The `grpc-web` package does not export a `grpc` namespace object — it exports `RpcError`, `StatusCode`, `Status`, `ClientReadableStream`, etc. as named exports. Fixed all imports to named imports and updated every reference (`grpc.RpcError` → `RpcError`, `grpc.StatusCode` → `StatusCode`, `grpc.Status` → `Status`).

2. **Unofficial plugin download source.** The protoc-gen-grpc-web plugin was downloaded from the third-party fork `github.com/nickygerritsen/protoc-gen-grpc-web`. Changed both the macOS and Linux URLs to the official `github.com/grpc/grpc-web` releases (version 1.5.0 binaries exist there with the same `protoc-gen-grpc-web-1.5.0-{darwin,linux}-x86_64` naming).

3. **Inaccurate streaming claim.** A performance bullet listed "**Bi-directional streaming**: Server-side streaming for real-time updates." gRPC-Web does not support bidirectional (or client-side) streaming — only unary and server-side streaming. Changed the bullet to "**Server-side streaming**: Stream responses from the server for real-time updates."

4. **Invalid client option `'grpc-web-text': 'true'`.** This is not a field on `GrpcWebClientBaseOptions` and would fail TypeScript's excess-property check. The runtime option that selects the wire format is `format` (`'text'` | `'binary'`). Replaced both occurrences (`grpcClient.ts`, `grpcClientWithInterceptors.ts`) with `format: 'text'`.

5. **Unused import in `grpcHealth.ts`.** The health-monitoring snippet imported `grpc` from `grpc-web` but never used it. Removed the dangling import (consistent with fix #1).

## Review Notes
- The post uses `npx create-react-app --template typescript`. Create React App is officially deprecated as of 2025; the snippet still works but newer projects would typically use Vite. Left as-is since it is not incorrect and the post's scope is gRPC-Web, not bootstrapping choice.
- `new Date(event.getTimestamp())` assumes the int64 `timestamp` field is in milliseconds. If a server emits epoch seconds, this would need `* 1000`. The proto does not specify units, so this is left as a reasonable default rather than an error.
- `grpcClientWithInterceptors.ts` imports `StreamInterceptor` and `ClientReadableStream` but does not use them. These are valid `grpc-web` exports and merely unused; left untouched to avoid altering the author's code beyond the genuine errors.
- The Envoy v1.28 config, `grpc_web`/`cors`/`router` HTTP filter ordering, and the `import_style`/`mode=grpcwebtext` protoc flags are all correct for current gRPC-Web tooling.
