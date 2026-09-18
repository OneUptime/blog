# Debug gRPC 'HTTP/2 Client Preface String Missing or Corrupt' Errors with Proxies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, HTTP/2, Networking, Troubleshooting, API

Description: Debug gRPC HTTP/2 preface errors by identifying the receiving hop, checking TLS and ALPN, and correcting proxy upstream protocol selection.

---

An HTTP/2 server expects a specific connection handshake before it can parse a gRPC request. A missing or corrupt client preface usually means that the bytes reaching that listener belong to another protocol, or that the connection ended before the handshake completed.

The error occurs before your protobuf message is decoded. Changing the schema, increasing the maximum message size, or retrying the same incompatible connection will not repair the protocol mismatch.

## Find which server rejected the preface

Write down every network hop with its expected transport:

| Hop | Example expected transport |
|---|---|
| gRPC client to edge proxy | TLS with HTTP/2 negotiated through ALPN |
| Edge proxy to internal gRPC server | Cleartext HTTP/2 with prior knowledge |
| Separate health probe to HTTP endpoint | HTTP/1.1 or HTTP/2, according to that endpoint |

These are independent choices. The client can successfully negotiate HTTP/2 with the proxy while the proxy sends HTTP/1.1 to the backend. An edge TLS certificate can also be perfectly valid while the upstream port expects a different protocol.

Locate the process that emitted the error and correlate its connection time and remote address with proxy access or connection logs. A periodic message every ten seconds may come from a health checker, not from the business client you are debugging.

## Compare the first bytes with the expected protocol

The HTTP/2 client preface starts with this fixed sequence:

```text
PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n
```

It is followed by a SETTINGS frame. With TLS, these are application bytes after the TLS handshake; they are not visible directly in an encrypted packet capture. The [HTTP/2 connection-preface specification](https://www.rfc-editor.org/rfc/rfc9113.html#name-http-2-connection-preface) defines the required sequence.

When a server log includes a short hexadecimal dump, use it as a classification clue:

| Observed prefix | Likely sender behavior |
|---|---|
| `47 45 54 20` | `GET ` from an HTTP/1.x request or probe |
| `50 4f 53 54 20` | `POST ` from HTTP/1.x forwarding |
| `16 03` | Likely a TLS handshake record sent to a plaintext listener |
| `50 52 4f 58 59 20` | PROXY protocol v1 header without a compatible receiver |
| Empty or short read | Early close, timeout, or a connection-only check |

A prefix identifies a hypothesis, not necessarily the original client. The proxy may have generated or transformed those bytes. Keep packet inspection limited to the affected connection, since application traffic can contain credentials and payloads.

## Test TLS and plaintext modes deliberately

For a TLS endpoint, inspect negotiation using the actual hostname:

```bash
openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -alpn h2 \
  -verify_hostname api.example.com \
  -verify_return_error </dev/null
```

Look for successful certificate verification and an ALPN selection of `h2`. Use your private CA options when required. A successful TCP connection is insufficient, and selecting `http/1.1` cannot carry a native gRPC request.

Then invoke an actual RPC with its generated client. If you use `grpcurl`, use ordinary TLS mode for the TLS listener and `-plaintext` only for a listener configured for cleartext HTTP/2. Its `-insecure` option disables certificate verification while keeping TLS; it does not mean plaintext. The [grpcurl project documentation](https://github.com/fullstorydev/grpcurl) describes these connection modes.

For a cleartext HTTP/2 diagnostic endpoint, a client supporting prior knowledge can test the transport:

```bash
curl --http2-prior-knowledge -v http://127.0.0.1:50051/
```

Check that your curl build supports HTTP/2. A rejected route or media type can still show that HTTP/2 negotiation worked; this GET request is not a complete gRPC health call. The [curl command reference](https://curl.se/docs/manpage.html#--http2-prior-knowledge) explains the option.

## Correct the proxy's upstream protocol

For NGINX, native gRPC upstreams use `grpc_pass`. An HTTP/1.x proxy path is a common source of `GET` or `POST` bytes reaching a plaintext HTTP/2 server.

This location fragment belongs inside an existing NGINX HTTP server block whose frontend is configured for HTTP/2:

```nginx
location /ledger.v1.Ledger/ {
    grpc_pass grpc://ledger_backend:50051;
}
```

Use `grpcs://` when that backend listener expects TLS, and configure upstream trust and identity verification for the internal certificate. These schemes describe the proxy-to-backend connection, independently of the frontend's TLS mode. See the [NGINX gRPC module](https://nginx.org/en/docs/http/ngx_http_grpc_module.html#grpc_pass).

Check the resolved backend port as well as the scheme. A service port accidentally pointing to an HTTP metrics endpoint can produce a completely valid response in the wrong protocol.

If a load balancer prepends PROXY protocol headers, the immediate receiver must explicitly support and consume them before HTTP/2 parsing. Enabling that feature on only one side shifts the first bytes away from the expected preface.

## Verify the repaired path end to end

Retest the client directly against the backend in a controlled environment, then through each proxy hop. Use the same authority, TLS requirements, RPC method, and credentials expected in production so the tests differ only in the hop being isolated.

Finally exercise a stream and inspect its final status. Successful HTTP/2 setup establishes that the peers agree on framing; it does not prove that routing, authorization, gRPC trailers, and stream timeouts are correct. Keep those later errors separate from the original handshake failure.
