# Validation Summary: How to Validate Calico Component Log Collection

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Calico (calico-node, calico-typha, calico-kube-controllers)
- Kubernetes (kubectl, DaemonSet, Deployment)
- Bash scripting
- Fluent Bit (mentioned)
- Loki (log retention check)
- Elasticsearch / ILM (log retention check)
- Mermaid diagrams

## Sources Consulted
- Tigera Calico documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico upstream manifest (calico-typha.yaml) on GitHub: https://raw.githubusercontent.com/projectcalico/calico/master/manifests/calico-typha.yaml
- Kubernetes kubectl logs/get reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Elasticsearch ILM policy API reference: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-get-lifecycle.html
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/

## Issues Found
- The `check_component` function in the first script selected pods with `-l "app=${label}"`. Calico pods (whether installed via the Tigera operator into `calico-system` or via manifests into `kube-system`) are labeled with `k8s-app=<component>`, not `app=<component>`. The selector would have returned zero pods and the script would have always reported FAIL. Changed the selector to `-l "k8s-app=${label}"` to match Calico's actual label convention and to stay consistent with the second section of the post, which already uses `k8s-app=calico-node`.

## Review Notes
- The container names (`calico-node`, `calico-typha`, `calico-kube-controllers`) are correct for the respective pods.
- The namespace `calico-system` is correct for operator-installed Calico. Users on manifest-based installs would need to switch to `kube-system`.
- The node-coverage check assumes every node should run a calico-node pod. On clusters with tainted/control-plane nodes or restricted node selectors, the DaemonSet may legitimately skip nodes; readers may need to adjust for that, but this is a stylistic caveat rather than a technical error.
- The timestamp regex `^[0-9]{4}-[0-9]{2}-[0-9]{2}` correctly matches Felix/calico-node log lines, which begin with an ISO-style date.
- The Loki retention check assumes a ConfigMap named `loki` in namespace `logging` with a `loki.yaml` key — this is a reasonable default but depends on the chart/deployment used.
