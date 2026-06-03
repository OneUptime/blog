# Validation Summary: How to troubleshoot Kubernetes API server network connectivity

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Kubernetes API server
- kubectl
- kubeadm
- TLS certificates and OpenSSL
- Linux networking tools
- HAProxy
- firewalld and iptables
- AWS EC2 security groups
- Prometheus and Prometheus Operator ServiceMonitor
- PromQL

## Sources Consulted
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl config set-cluster reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-cluster/
- Kubernetes kubeconfig guide: https://kubernetes.io/docs/concepts/cluster-administration/authenticate-across-clusters-kubeconfig/
- Kubernetes service account documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes accessing the API from a Pod: https://kubernetes.io/docs/tasks/run-application/access-api-from-pod/
- Kubernetes debug running pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes kubeadm certs reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-certs/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The post used `curl -k` while saying to expect a certificate error. The `-k` flag disables certificate verification, so I split the example into a verifying `curl` command and a separate insecure quick connectivity check.
- The post used `/healthz` as the main API server health endpoint in several examples. Kubernetes documents `/healthz` as deprecated since v1.16 and recommends `/livez` and `/readyz`, so I changed readiness-oriented examples to `/readyz`.
- The network policy wording implied all NetworkPolicy objects can directly block API server traffic. Kubernetes NetworkPolicies apply to selected pods, so I clarified the wording to include egress rules and firewall rules.
- The ServiceMonitor example for scraping API server metrics omitted authentication. The API server metrics endpoint normally requires authorization, so I added an `authorization.credentials` reference and explicit `/metrics` path using current Prometheus Operator fields.

## Review Notes
The post is technically relevant and validated after corrections. The ServiceMonitor example still assumes a matching Service and a Secret named `prometheus-kube-apiserver-token`; in production, teams should prefer their monitoring stack's established Kubernetes API server scrape configuration and token rotation process.
