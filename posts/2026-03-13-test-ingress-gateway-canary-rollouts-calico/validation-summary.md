# Validation Summary: How to Test Ingress Gateway Canary Rollouts with Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (NetworkPolicy / projectcalico.org/v3 API)
- Kubernetes Ingress (networking.k8s.io/v1)
- NGINX Ingress Controller (canary annotations)
- kubectl (logs, annotate)
- Mermaid diagrams

## Sources Consulted
- NGINX Ingress Controller canary annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax (set notation): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- kubectl logs reference (`--prefix` flag): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

- The `nginx.ingress.kubernetes.io/canary` and `nginx.ingress.kubernetes.io/canary-weight` annotations are valid and correctly applied to a separate Ingress resource sharing the same host as the stable Ingress, which is the documented pattern for NGINX canary routing.
- The Ingress manifests use the stable `networking.k8s.io/v1` API with the required `pathType` field, which is correct for current Kubernetes versions.
- The Calico `NetworkPolicy` (`projectcalico.org/v3`) uses valid set-based selector syntax (`app in {'app-v1', 'app-v2'}`) and a proper ingress rule sourced from the `ingress-nginx` workload.
- `kubectl logs -l <selector> --prefix=true` is a valid invocation; `--prefix` prefixes each line with the source pod/container, which is appropriate for multi-pod log inspection.
- `kubectl annotate ingress app-canary nginx.ingress.kubernetes.io/canary-weight=50 --overwrite` is the correct way to update an existing annotation.
- The `grep "500\|error"` pattern works as expected with GNU grep's basic regex alternation.
- Mermaid `\n` line-breaks inside node labels render correctly in flowcharts.

## Review Notes
- The NGINX canary annotation set also supports `canary-by-header`, `canary-by-header-value`, and `canary-by-cookie` for more deterministic routing during validation; the post intentionally focuses on weight-based splitting, which is fine.
- Counting error lines via `grep "500\|error" | wc -l` is a quick smoke check; for production canary analysis, metrics from Prometheus/Grafana or the controller's `nginx_ingress_controller_requests` counter (by `status` label) would give more reliable error-rate comparisons. Not a correctness issue.
- The Calico policy assumes the ingress controller pods carry the label `app=ingress-nginx`; the default Helm chart for `ingress-nginx` uses `app.kubernetes.io/name=ingress-nginx`, so readers may need to adjust the selector to match their installation. Worth noting but consistent with how the post presents the example.
- The post does not explicitly state that both Ingress resources must share the same `host`/`path` for canary routing to take effect; the example does this correctly, but a future revision could call it out.
