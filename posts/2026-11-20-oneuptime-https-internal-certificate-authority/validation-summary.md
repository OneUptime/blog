# Validation Summary: OneUptime HTTPS with an Internal CA

## Source review

Reviewed on 20 November 2026. The guide describes TLS termination by a separately managed internal NGINX proxy, forwarding HTTP to a restricted OneUptime gateway. It explicitly states the backend encryption boundary and does not claim a live deployment.

- Reviewed RFC 9525 for certificate service identity and SAN requirements; distinguished DNS SANs from IP SANs.
- Checked NGINX HTTPS, proxy, WebSocket, and command-line documentation for certificate ordering, TLS directives, forwarding headers, path preservation, WebSocket upgrade handling, and configuration-test behavior.
- Inspected OneUptime chart 17.0.0 values.yaml and templates/nginx.yaml for host, httpProtocol, ssl.provision, ssl.skipVerification, trustedProxyHops, gateway service naming and ports, and ClusterIP support.
- Chart SHA-256: f6ec64764b3fab5ee60a78bdec027fb9eacca6d2d63964c43000bb7ddaf9899a.
- Checked OneUptime's documented built-in gRPC ingress caveat, OTLP/HTTP /otlp path, ingestion header, and 4 MB ingress body limit. The text distinguishes this deployment constraint from general gRPC/private-CA support.
- Checked OpenTelemetry exporter specification for HTTPS endpoint, protocol, certificate-file, and authentication-header settings; signal-specific endpoint behavior is explained.
- Read Collector HTTP exporter and TLS source documentation. The example uses the current otlp_http name and notes version compatibility and the deprecated otlphttp alias. ca_file verifies the server; exporter activation requires a service pipeline reference.
- Checked Mozilla's enterprise CA guidance. Browser trust, application runtime trust, and Collector trust are treated separately.
- Checked OpenSSL x509 and s_client documentation for extension/expiry inspection, SNI, hostname verification, CA files, and verify_return_error.

## Checks performed

- Both Bash blocks passed bash -n syntax checks through standard input. No application environment was changed.
- Both YAML blocks parsed successfully using Ruby Psych.safe_load.
- Rendered the article's Helm overlay locally against chart 17.0.0. Verified the oneuptime-nginx gateway Service in namespace oneuptime, type ClusterIP, and HTTP port 80 targeting 7849.
- Verified the certificate-inspection flags against installed OpenSSL 4.1.0 help. No certificate was issued, changed, or added to a trust store, and no live TLS endpoint was contacted.
- Structurally checked the Mermaid flowchart: five defined nodes, five edges, quoted labels, balanced delimiters, and valid node references. The diagram separates HTTPS/application forwarding from CA trust and issuance relationships.
- Reviewed NGINX directives against official documentation and checked balanced blocks. No nginx binary was available, so nginx -t was not executed.
- Metadata, heading hierarchy, code fences, author, tags, and image dimensions passed focused checks. Title: 71 characters; description: 159 characters; word count including metadata and examples but excluding link URLs: 1487.
- Generated social-media.png with the existing npm script. Confirmed 1280 x 720 dimensions and visually inspected all three title lines for legibility and clipping.

## Limitations

The Mermaid check was structural, not execution by a Mermaid renderer. NGINX configuration, Collector configuration, SDK environment settings, certificate matching, chain validation, browser login, telemetry ingestion, renewal, and CA overlap were not exercised against running services. YAML parsing and local Helm rendering do not establish runtime behavior. SDK and Collector settings require matching supported versions and the described files, secrets, and pipelines.

The article uses a source-verified configuration example with explicit replacement names and paths; it is not a complete deployment manifest. It does not create the proxy, mount secrets, issue certificates, or install trust automatically. The lab-CA explanation is separate from production CA operations, and no verification-bypass setting is recommended.

Repository-wide validation and catalog integration remain with parent review because that validator may modify shared files. Only the assigned post folder was written.

## Official sources checked

- https://www.rfc-editor.org/rfc/rfc9525.html
- https://nginx.org/en/docs/http/configuring_https_servers.html
- https://helm-chart.oneuptime.com/oneuptime-17.0.0.tgz
- https://nginx.org/en/docs/http/websocket.html
- https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- https://nginx.org/en/docs/switches.html
- https://support.mozilla.org/en-US/kb/setting-certificate-authorities-firefox
- https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- https://oneuptime.com/enterprise/air-gapped/observability
- https://docs.openssl.org/3.0/man1/openssl-x509/
- https://docs.openssl.org/3.0/man1/openssl-s_client/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
