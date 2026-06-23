# Validation Summary: How to Connect Grafana to Datasources via Proxy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana
- Grafana datasource provisioning
- Grafana data proxy configuration
- Grafana secure SOCKS5 datasource proxy
- Kubernetes Deployments and Secrets
- Grafana Helm chart values
- Nginx reverse proxying
- Go HTTP proxy environment variables
- TLS certificates for datasource connections

## Sources Consulted
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana datasource provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana secure SOCKS5 datasource proxy documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/proxy/
- Grafana Prometheus datasource configuration documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana default configuration source: https://github.com/grafana/grafana/blob/main/conf/defaults.ini
- Go HTTP proxy environment handling: https://pkg.go.dev/golang.org/x/net/http/httpproxy
- Grafana Community Helm chart values: https://github.com/grafana-community/helm-charts/blob/main/charts/grafana/values.yaml
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post described `access: proxy` and custom HTTP headers as datasource-specific forward proxy configuration. Changed the wording to clarify that `access: proxy` means server-side datasource access, while HTTP forward proxy behavior comes from the Grafana process environment or an intermediary proxy.
- The SOCKS5 section used `ALL_PROXY=socks5://...`, but Go's standard HTTP proxy environment handling uses `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`, not `ALL_PROXY`. Replaced this with Grafana's supported `secure_socks_datasource_proxy` configuration and the per-datasource `enableSecureSocksProxy` setting.
- The HTTP-to-SOCKS Docker Compose example used a SOCKS5 proxy image as if it converted HTTP proxy traffic to SOCKS5. Replaced it with Grafana's native secure SOCKS5 datasource proxy configuration.
- The dataproxy example included options that are not present in current Grafana defaults (`max_idle_connections_per_host` and `expected_idle_conn_timeout_seconds`). Removed those and added the current `expect_continue_timeout_seconds` option.
- The TLS section used non-existent Grafana settings (`[dataproxy] skip_tls_verify` and `[security] custom_ca_file`) for datasource TLS. Replaced them with datasource provisioning fields `tlsAuthWithCACert`, `tlsSkipVerify`, and `secureJsonData.tlsCACert`.
- The Kubernetes TLS example mounted a CA file and set `GF_SECURITY_CUSTOM_CA_FILE`, which is not a valid Grafana setting for datasource TLS. Replaced it with a Secret-backed environment variable consumed by datasource provisioning.
- The Kubernetes Deployment examples omitted the required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added selectors and labels to make the manifests structurally valid.
- The Nginx example claimed that `proxy_pass` forwarded through a corporate forward proxy. Adjusted the comments to describe Nginx as an intermediary reverse proxy from the Nginx host, and replaced direct environment-variable interpolation in the `Authorization` header with a placeholder token.
- Updated the Grafana UI navigation text from the older "Configuration > Data Sources" wording to "Connections > Data sources".

## Review Notes
The guide is now technically valid for current Grafana behavior. Future improvements could add version-specific notes for Grafana installations before the secure SOCKS5 datasource proxy feature, but no additional changes were required for correctness.
