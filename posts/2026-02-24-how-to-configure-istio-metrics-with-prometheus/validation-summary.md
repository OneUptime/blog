# Validation Summary: How to Configure Istio Metrics with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Prometheus
- Prometheus Operator
- kube-prometheus-stack Helm chart
- Kubernetes
- Helm
- kubectl
- YAML configuration

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio application requirements and sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio sidecar injection template, release 1.30: https://raw.githubusercontent.com/istio/istio/release-1.30/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml
- Istio ingress gateway Helm chart defaults, release 1.30: https://raw.githubusercontent.com/istio/istio/release-1.30/manifests/charts/gateways/istio-ingress/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator design documentation: https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Helm install documentation: https://docs.helm.sh/docs/helm/helm_install/
- Helm repo update documentation: https://helm.sh/docs/v3/helm/helm_repo_update
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The sidecar scraping section described `http-envoy-prom` as merged metrics on port 15020. Istio uses port 15020 for merged telemetry and port 15090, named `http-envoy-prom`, for Envoy Prometheus telemetry. Updated the wording to distinguish the two ports.
- The ingress gateway example used a ServiceMonitor with `port: http-envoy-prom`, but the default Istio ingress gateway Service does not expose that service port. Changed it to a PodMonitor that selects the gateway pod's `http-envoy-prom` container port.
- The plain Prometheus Envoy sidecar job rewrote targets to port 15020. Istio's documented custom scrape configuration selects pod container ports ending in `-envoy-prom`. Updated the job to select the `*-envoy-prom` port and added the injected sidecar label filter so it does not duplicate the separate gateway job.
- The plain Prometheus ingress gateway job also rewrote targets to port 15020. Updated it to select the gateway pod's `*-envoy-prom` container port.
- The metric keep rule preserved only histogram bucket series for request duration and byte metrics. Added `_sum` and `_count` series so Prometheus histogram metrics remain complete.
- The troubleshooting command checked `localhost:15020` while the post's PodMonitor examples scrape `http-envoy-prom` on port 15090. Updated the command to check `localhost:15090/stats/prometheus`.
- The RBAC troubleshooting command hard-coded a Prometheus service account name that depends on the Helm release and chart settings. Changed it to read the service account from the Prometheus custom resource.

## Review Notes
- Helm and kubectl were not installed in the local environment, so CLI syntax was checked against official Helm and Kubernetes references instead of local `--help` output.
- The resource sizing numbers are rough operational guidance, not version-specific guarantees. Actual series count depends on enabled Istio telemetry, Envoy stat inclusion settings, workloads, labels, and traffic shape.
- All YAML snippets in the post were parsed successfully after the edits.
