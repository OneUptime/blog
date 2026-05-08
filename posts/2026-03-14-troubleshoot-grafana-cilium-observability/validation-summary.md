# Validation Summary: Troubleshooting Grafana Access for Cilium Observability

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Grafana
- Cilium
- Hubble metrics
- Prometheus
- Kubernetes
- kubectl
- CiliumNetworkPolicy
- jq and curl

## Sources Consulted
- Grafana HTTP API reference: https://grafana.com/docs/grafana/latest/http_api/
- Grafana data source HTTP API: https://grafana.com/docs/grafana-cloud/developer-resources/api-reference/http-api/api-legacy/data_source/
- Grafana dashboard permissions HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/dashboard_permissions/
- Grafana server CLI documentation: https://grafana.com/docs/grafana/latest/administration/cli/
- Grafana alert rule evaluation documentation: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/

## Issues Found
- The admin password reset command used the older `grafana-cli` form. Updated it to the current documented `grafana cli admin reset-admin-password` syntax.
- Datasource health, lookup, update, and proxy examples used ID-based Grafana API paths. Updated the examples to resolve the Prometheus datasource UID and use UID-based endpoints where available.
- The datasource update example replaced the datasource with a minimal JSON body. Updated it to fetch the existing datasource JSON, modify only URL/access/default settings with `jq`, and send the complete body back to Grafana.
- The verification loop for datasource health only echoed datasource names and did not actually check health. Updated it to call each datasource UID health endpoint.
- The alerting troubleshooting note incorrectly stated that the evaluation interval must be shorter than the `for` duration. Updated it to reflect Grafana's pending period behavior: the condition must remain true for the full pending period and evaluations must succeed.

## Review Notes
- `kubectl` was not installed in the local review environment, so CLI syntax was verified against Kubernetes official documentation rather than local `--help` output.
- Some commands assume deployment, service, secret, and label names from common Helm-style installations. Those names can differ by chart or operator, but the troubleshooting approach is technically valid.
- Grafana legacy `/api` endpoints remain available as of current documentation, but Grafana documents ongoing migration toward the newer `/apis` structure.
