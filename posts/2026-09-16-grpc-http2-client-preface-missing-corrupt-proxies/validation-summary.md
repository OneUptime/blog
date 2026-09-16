# Validation Summary: How to Debug “HTTP/2 Client Preface String Missing or Corrupt” Between gRPC Clients and Proxies

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- gRPC
- HTTP/2 and its connection preface
- TLS and ALPN
- OpenSSL `s_client`
- grpcurl
- curl
- NGINX gRPC proxying
- PROXY protocol

## Sources Consulted
- RFC 9113, “HTTP/2,” especially Sections 3.2–3.4 on TLS negotiation, prior knowledge, and connection prefaces: https://www.rfc-editor.org/rfc/rfc9113.html
- OpenSSL `s_client` official documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- grpcurl official project documentation and usage examples: https://github.com/fullstorydev/grpcurl
- grpcurl command source defining TLS, `-plaintext`, and `-insecure` behavior: https://github.com/fullstorydev/grpcurl/blob/master/cmd/grpcurl/grpcurl.go
- curl official command reference for `--http2-prior-knowledge`: https://curl.se/docs/manpage.html#--http2-prior-knowledge
- NGINX `ngx_http_grpc_module` official documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- gRPC official metadata guide, including HTTP/2 headers and trailers: https://grpc.io/docs/guides/metadata/

## Issues Found
No technical issues found.

## Review Notes
- The cleartext curl command verifies HTTP/2 transport behavior only; the post correctly warns that it is not a complete gRPC health check.
- The NGINX example is intentionally a location fragment. For TLS upstreams, certificate verification is not enabled by `grpcs://` alone; the post correctly instructs readers to configure upstream trust and identity verification.
- Native gRPC requires HTTP/2. gRPC-Web can use HTTP/1.1, but it is a distinct protocol requiring translation and does not contradict the post’s wording about native gRPC.
