# Validation Summary: How to Validate Resolution of Calico Policy Blocking DNS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes NetworkPolicy
- Kubernetes kubectl
- CoreDNS Prometheus metrics
- DNS troubleshooting

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- CoreDNS prometheus plugin metrics documentation: https://coredns.io/plugins/metrics/
- Calico network policy documentation: https://docs.tigera.io/calico/latest/about/about-network-policy

## Issues Found
- The `kubectl run` DNS validation command passed `nslookup` as container arguments instead of the container command. Added `--command --` so BusyBox executes `nslookup kubernetes.default` directly.
- The CoreDNS SERVFAIL check described a rate, but the command only displayed the cumulative `coredns_dns_responses_total` counter and also assumed the CoreDNS image had `wget` installed. Replaced it with a `kubectl port-forward` and local `curl` check that compares the SERVFAIL counter before and after a 60-second window.
- The application health command used `kubectl get pods | grep -v Running`, which includes the header line and does not reliably verify readiness. Replaced it with `kubectl wait --for=condition=Ready pod --all`.

## Review Notes
The CoreDNS metric name and `rcode="SERVFAIL"` label are current in the CoreDNS prometheus plugin documentation. The CoreDNS deployment and pod labels can vary in heavily customized clusters, so operators may need to adjust the `k8s-app=kube-dns` selector.
