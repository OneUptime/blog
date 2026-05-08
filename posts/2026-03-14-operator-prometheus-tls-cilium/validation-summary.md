# Validation Summary: Using Operator Prometheus TLS Configuration in Cilium Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Cilium Operator
- Prometheus
- Prometheus Operator ServiceMonitor
- cert-manager
- Kubernetes Secrets and ConfigMaps
- OpenSSL
- Helm

## Sources Consulted
- Cilium Running Prometheus & Grafana documentation, including Operator Prometheus TLS flags: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm reference for `operator.prometheus`, `operator.prometheus.tls`, and `operator.prometheus.metricsService`: https://docs.cilium.io/en/stable/helm-reference/
- Cilium operator command reference for Prometheus TLS flags: https://docs.cilium.io/en/stable/cmdref/cilium-operator/
- Cilium v1.19.3 upstream Helm templates for operator Service, ServiceMonitor, Deployment, and ConfigMap: https://github.com/cilium/cilium/tree/v1.19.3/install/kubernetes/cilium/templates
- Prometheus Operator API reference for ServiceMonitor `endpoints`, `scheme`, and `tlsConfig`: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus scrape configuration reference for `scheme` and `tls_config`: https://prometheus.io/docs/prometheus/2.55/configuration/configuration/
- cert-manager Certificate documentation for `tls.crt`, `tls.key`, and `ca.crt` Secret keys: https://cert-manager.io/v1.14-docs/usage/certificate/

## Issues Found
- The Cilium Helm values mounted a Secret with `operator.extraVolumes` and `operator.extraVolumeMounts`, but did not enable Cilium's supported operator Prometheus TLS settings. Updated the values to use `operator.prometheus.tls.enabled=true` and `operator.prometheus.tls.server.existingSecret`.
- Disabling the built-in Cilium ServiceMonitor without enabling `operator.prometheus.metricsService` would prevent the Cilium chart from creating the `cilium-operator` metrics Service. Added `metricsService: true` so the custom TLS ServiceMonitor has a Service to select.
- The manual Secret creation used `kubectl create secret tls`, which creates `tls.crt` and `tls.key` but not `ca.crt`. Updated it to create a generic Secret containing `tls.crt`, `tls.key`, and `ca.crt`, matching the Cilium server Secret and Prometheus CA reference needs.
- The manual OpenSSL certificate did not explicitly include server authentication EKU. Added `extendedKeyUsage=serverAuth`.
- The ServiceMonitor endpoint used `port: operator-prometheus`, but the Cilium chart names the operator metrics Service port `metrics`. Updated the ServiceMonitor to use `port: metrics`, added the `io.cilium/app: operator` selector label, and added `namespaceSelector.matchNames`.
- The post configured Cilium's built-in ServiceMonitor while also showing a custom TLS ServiceMonitor. Since the built-in Cilium ServiceMonitor template does not render `scheme: https` or `tlsConfig`, the Helm values now disable the built-in ServiceMonitor and the post applies the custom one.
- The standalone Prometheus scrape config did not filter by endpoint port name. Added a relabel rule for `__meta_kubernetes_endpoint_port_name=metrics`.
- The TLS verification commands assumed `/tmp/ca.crt` existed inside a temporary curl pod and assumed the operator image included `openssl`/`netstat`. Replaced them with local verification through `kubectl port-forward`, exported CA data, `curl`, and `openssl s_client`.
- The metrics-flow query used `cilium_operator_process_cpu_seconds_total`, which is not a reliable Cilium operator metric name. Replaced it with an `up{job=~".*cilium-operator.*"}` target query.
- The troubleshooting section referred to a custom volume mount path that Cilium does not use for this chart feature. Updated it to refer to `operator.prometheus.tls.server.existingSecret` and the expected Secret keys.

## Review Notes
- Local `helm` and `kubectl` binaries were not installed in the review environment, so CLI syntax was checked against official documentation and upstream chart templates instead of local `--help` output.
- cert-manager only writes `ca.crt` to the issued Secret when the issuing CA is known. Environments using a public ACME issuer may need to provide trust differently for Prometheus.
