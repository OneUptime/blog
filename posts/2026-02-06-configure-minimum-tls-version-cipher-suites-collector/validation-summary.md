# Validation Summary: How to Configure Minimum TLS Version and Cipher Suites in the Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporters
- Collector TLS and mTLS configuration
- TLS 1.2 and TLS 1.3
- TLS cipher suites
- OpenSSL `s_client`
- Collector health_check, zPages, and pprof extensions

## Sources Consulted
- OpenTelemetry Collector TLS configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector HTTP configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector gRPC configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector zPages extension documentation and config: https://github.com/open-telemetry/opentelemetry-collector/tree/main/extension/zpagesextension
- OpenTelemetry Collector Contrib health_check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckextension
- OpenTelemetry Collector Contrib pprof extension documentation and config: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/pprofextension
- Go `crypto/tls` cipher suite implementation: https://go.dev/src/crypto/tls/cipher_suites.go
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- NIST SP 800-52 Rev. 2 TLS guidance: https://csrc.nist.gov/pubs/sp/800/52/r2/final
- PCI SSC FAQ on TLS versions and strong cryptography: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/does-pci-dss-define-which-versions-of-tls-must-be-used/
- HHS HIPAA Security Rule guidance: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- RFC 8446, The Transport Layer Security (TLS) Protocol Version 1.3: https://www.rfc-editor.org/rfc/rfc8446

## Issues Found
- The compliance wording was too broad. PCI DSS, HIPAA, and SOC 2 do not all prescribe the same explicit TLS version requirement. Updated the wording to say these frameworks require or expect appropriate protection for sensitive data in transit, and described TLS 1.2 as the practical minimum for modern compliance-oriented deployments.
- The TLS version table specifically labeled TLS 1.0 and 1.1 as non-compliant with HIPAA. HIPAA is safeguards-based and does not directly name those TLS versions in the rule text. Updated the table to use broader compliance-oriented language.
- The post attributed the minimum TLS behavior to Go defaults. The Collector's `configtls` documentation defines `min_version` defaulting to `"1.2"`. Updated the explanation accordingly.
- The extensions section implied that pprof supports direct TLS configuration. The current pprof extension config only exposes listener and profiling fields, while health_check and zPages use HTTP server config that supports TLS. Updated the text to recommend localhost or external network controls for pprof.
- The weak-cipher OpenSSL example used `RC4-SHA`, which is often unavailable in modern OpenSSL builds before the request reaches the Collector. Replaced it with a TLS 1.2 CBC/RSA cipher example using `-tls1_2 -cipher AES128-SHA`.

## Review Notes
The receiver, exporter, mTLS, `min_version`, `max_version`, `client_ca_file`, and `cipher_suites` examples align with current Collector TLS documentation. TLS 1.3 cipher suite configurability is correctly described: Go's `CipherSuites` setting controls TLS 1.2 and below, while TLS 1.3 suites are handled separately by the implementation.
