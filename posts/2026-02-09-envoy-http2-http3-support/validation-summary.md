# Validation Summary: How to Configure Envoy HTTP/2 and HTTP/3 Support

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Envoy Proxy
- HTTP/2
- HTTP/3
- QUIC
- TLS and ALPN
- curl
- OpenSSL
- h2load / nghttp2
- Prometheus metrics

## Sources Consulted
- Envoy HTTP/3 overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http3.html
- Envoy core protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy upstream HTTP protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto.html
- Envoy QUIC listener config API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/quic_config.proto.html
- Envoy HTTP connection manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy official downstream HTTP/3 example: https://github.com/envoyproxy/envoy/blob/main/configs/envoyproxy_io_proxy_http3_downstream.yaml
- RFC 9113, HTTP/2: https://www.rfc-editor.org/rfc/rfc9113
- RFC 9114, HTTP/3: https://www.rfc-editor.org/info/rfc9114
- RFC 9001, Using TLS to Secure QUIC: https://www.rfc-editor.org/in-notes/rfc9001.html
- curl local help output for `--http2`, `--http2-prior-knowledge`, and `--http3`
- OpenSSL local help output for `s_client -alpn` and `-connect`
- nghttp2 h2load documentation: https://nghttp2.org/documentation/h2load.1.html

## Issues Found
- The introduction said HTTP/2 provides server push. HTTP/2 server push is no longer a useful current feature to present as a modern benefit, so the sentence was narrowed to multiplexing and header compression.
- The introduction said HTTP/3 builds on HTTP/2's features. This was imprecise because HTTP/3 maps HTTP semantics over QUIC and uses different transport and compression mechanisms, so it was changed to describe QUIC over UDP and transport-level head-of-line blocking more accurately.
- The first HTTP/2 example used `stream_error_on_invalid_http_message`, which is not the current `Http2ProtocolOptions` field. It was replaced with `override_stream_error_on_invalid_http_message`.
- The HTTP/2 examples used `allow_metadata`, which is not present in the current Envoy `Http2ProtocolOptions` schema. Those lines and comments were removed.
- The upstream cluster placed `common_http_protocol_options` directly on the cluster, a deprecated pattern. It was moved under `typed_extension_protocol_options` in `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.
- The advanced HTTP/2 example included both `override_stream_error_on_invalid_http_message` and the invalid `stream_error_on_invalid_http_message` field. The invalid field was removed.
- The advanced HTTP/2 example included `custom_settings_parameters`, which is not a current `Http2ProtocolOptions` field. That block was removed.
- The protocol selection example implied HTTP/3 could be enabled on the same TCP listener with `codec_type: AUTO` and `http3_protocol_options`. It was corrected to describe HTTP/1.1 and HTTP/2 on TCP, with Alt-Svc advertising the separate UDP HTTP/3 listener.
- The best-practice note said TLS 1.2+ is required for HTTP/2. This was corrected to say TLS 1.2+ applies to HTTP/2 over TLS, while HTTP/3 uses QUIC with TLS 1.3.

## Review Notes
The examples are still illustrative and use placeholder certificate paths and backend names. Envoy HTTP/3 behavior and QUIC upstream support remain version-sensitive, so production configurations should be validated with the exact Envoy version deployed.
