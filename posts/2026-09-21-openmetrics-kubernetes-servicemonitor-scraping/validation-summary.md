# Validation Summary: How to Expose and Scrape OpenMetrics in Kubernetes with a ServiceMonitor

## Status

validated

## Post Type

Tutorial / implementation guide.

## Technologies Covered

- OpenMetrics 1.0 and Prometheus text exposition.
- Prometheus 2.49+ and Prometheus 3 scrape negotiation and ingestion.
- Prometheus Operator and ServiceMonitor custom resources.
- Kubernetes Services, pods, namespaces, EndpointSlices, discovery permissions, and kubectl.
- Helm selector configuration and curl HTTP diagnostics.

## Sources Consulted

- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/) — counter naming, content type, negotiation, and EOF requirements.
- [Prometheus Operator getting started](https://prometheus-operator.dev/docs/developer/getting-started/) — Service, pod, and ServiceMonitor discovery and permissions.
- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec) — ServiceMonitor fields, endpoint port names, selectors, protocol values, and version requirements.
- [Prometheus 3 migration guide](https://prometheus.io/docs/prometheus/latest/migration/) — content-type validation and fallback behavior.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/) — target health and the up metric.
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/) — selectors and port mapping.
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/) — backend addresses, readiness, and the Service association label.
- [Kubernetes namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) — automatic namespace name labels.
- [kubectl explain reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/) — nested field inspection against server OpenAPI information.
- [kubectl apply reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/) — server-side application and server dry-run flags.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — resource lookup, label filtering, and YAML output.
- [kubectl port-forward reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/) — forwarding through a named Service port to a selected pod.
- [curl manual](https://curl.se/docs/manpage.html) — HTTP failure handling, silent/error output, custom headers, and response-header capture.
- [kube-prometheus-stack chart values](https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/values.yaml) — Helm-derived ServiceMonitor selectors.

## Issues Found

No technical issues found.

## Review Notes

- The README required no changes. Its technical reference links resolve to the intended official documentation.
- The counter example correctly uses payments_requests for the family metadata, payments_requests_total for the sample, and the OpenMetrics EOF terminator. Its content type identifies OpenMetrics 1.0.
- The Service selects the stated application pods and maps port 8080 to port 8080. The monitor selects Service labels in apps and refers to the named metrics Service port. Its 10-second timeout is below the 30-second interval.
- The two namespace selectors serve distinct discovery stages. The Prometheus selector matches the monitor label and the monitoring namespace label. Helm defaults and discovery permissions remain deployment-specific prerequisites, as the post explains.
- scrapeProtocols is correctly placed at ServiceMonitor spec level and requires Prometheus 2.49 or newer. The listed protocol values and preference order are valid. Supporting Operator and CRD versions are also necessary; checking the installed schema is appropriate.
- Prometheus 3 fails scrapes with missing, unparseable, or unrecognized content types unless fallback is configured. The separate ServiceMonitor fallbackScrapeProtocol field requires Prometheus 3.0 or newer.
- Named Service port-forwarding is valid but connects to a selected pod and does not prove connectivity from Prometheus. EndpointSlices can retain unready addresses, so address presence alone does not establish readiness or scrape health.
- Local static checks passed: all four Bash blocks passed bash -n, and both YAML blocks parsed successfully as three YAML documents using PyYAML.
- No live Kubernetes deployment, server-side dry-run, application HTTP request, or Prometheus scrape was executed. Runtime success depends on the existing cluster, application implementation, installed CRDs, permissions, and network configuration described in the prerequisites.
