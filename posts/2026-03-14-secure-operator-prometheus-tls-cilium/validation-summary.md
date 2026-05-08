# Validation Summary: Securing Operator Prometheus TLS Configuration in Cilium Observability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium Operator Prometheus metrics
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- cert-manager Certificate resources and renewal behavior
- Kubernetes kubectl commands
- CiliumNetworkPolicy
- TLS and mutual TLS

## Sources Consulted
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm Reference for operator Prometheus TLS values: https://docs.cilium.io/en/latest/helm-reference/
- Cilium operator command reference: https://docs.cilium.io/en/stable/cmdref/cilium-operator.html
- Cilium policy documentation for namespace selectors in CiliumNetworkPolicy: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Prometheus Operator API reference for ServiceMonitor `tlsConfig`: https://prometheus-operator.dev/docs/api-reference/api/
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.16-docs/usage/certificate/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/v1.15-docs/devops-tips/prometheus-metrics/
- Kubernetes kubectl reference for `annotate` and `rollout`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post claimed cipher suite restrictions were part of the guide, but it did not configure cipher suites and Cilium's documented operator Prometheus TLS Helm values do not expose a cipher-suite setting. Removed that claim from the description, introduction, and conclusion.
- The ServiceMonitor was placed in `kube-system` while referencing the Prometheus client certificate Secret in `monitoring`. Prometheus Operator TLS secret references are local object references, so the example would not work as written. Moved the ServiceMonitor to `monitoring`, added a `namespaceSelector` for the `kube-system` Cilium service, and added a separate CA Secret in `monitoring` for server verification.
- The mTLS section only configured Prometheus to present a client certificate; it did not enable client certificate verification on the Cilium Operator metrics endpoint. Added the documented Helm values for `operator.prometheus.tls.enabled`, `operator.prometheus.tls.server.existingSecret`, and `operator.prometheus.tls.server.mtls.enabled`.
- The certificate rotation section implied that cert-manager would rotate compromised keys by default. cert-manager renews certificates automatically, but private key rotation requires `privateKey.rotationPolicy: Always`. Added that setting to both client and server Certificate examples.
- The rotation section used `cert-manager.io/inject-ca-from` on a Deployment as if it would restart the operator. That annotation is not a Deployment restart mechanism. Replaced it with `kubectl rollout restart deployment -n kube-system cilium-operator`.
- The CiliumNetworkPolicy allowed Prometheus by pod labels but omitted the Prometheus namespace label. Added `k8s:io.kubernetes.pod.namespace: monitoring` so the cross-namespace source selector is explicit.

## Review Notes
- The ServiceMonitor selector and port name still depend on how Cilium was installed and whether its operator metrics service is enabled. The example assumes the commonly used Cilium operator service labels and the `operator-prometheus` port name.
- The Prometheus alert expression assumes cert-manager metrics are being scraped and that the certificate label set includes `name="cilium-operator-metrics-tls"`.
