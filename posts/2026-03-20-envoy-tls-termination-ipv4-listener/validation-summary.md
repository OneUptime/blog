# Validation Summary: How to Configure Envoy TLS Termination on an IPv4 Listener

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- TLS / HTTPS termination
- SNI
- IPv4 listeners
- YAML configuration
- OpenSSL CLI
- curl CLI

## Sources Consulted
- Envoy TLS transport socket API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto.html
- Envoy common TLS configuration API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto.html
- Envoy listener filter chain matching reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener_components.proto.html
- Envoy FAQ on SNI listener configuration: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/sni.html
- Envoy TLS Inspector documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/tls_inspector
- Envoy HTTP header manipulation documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy TLS sandbox documentation: https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/tls.html
- Envoy certificate management documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/certificates.html
- curl man page: https://curl.se/docs/manpage.html
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.4/man1/openssl-s_client/

## Issues Found
- The original route config manually added `X-Forwarded-Proto: https`. Envoy already sets `x-forwarded-proto` for terminated HTTPS requests, so the manual mutation was redundant and could lead to incorrect duplicated values. I removed that header mutation.
- The SNI example omitted the TLS Inspector listener filter. Envoy documents that SNI-based `filter_chain_match.server_names` matching requires TLS Inspector to detect the requested server name. I added `envoy.filters.listener.tls_inspector` to the snippet.
- The original `curl --resolve` example used `https://203.0.113.10/` as the URL while resolving `example.com`. That does not test the intended hostname/SNI path because `--resolve` applies to the URL host. I corrected the command to `https://example.com/ --resolve example.com:443:203.0.113.10`.
- The conclusion claimed multiple domains could be hosted on one IPv4 address "without reloading Envoy." Envoy's certificate management docs state that statically referenced certificates do not reload automatically; restart, listener reload, or SDS is required. I corrected that statement.

## Review Notes
- The TLS configuration is valid as written, but the configured `cipher_suites` list only affects TLS 1.0-1.2 negotiation; Envoy documents that this setting does not affect TLS 1.3 cipher selection.
