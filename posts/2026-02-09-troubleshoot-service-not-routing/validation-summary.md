# Validation Summary: How to Troubleshoot Kubernetes Service Not Routing Traffic to Pods

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes Services
- EndpointSlices
- Pods and Deployments
- Readiness probes
- NetworkPolicy
- kube-proxy
- kubectl
- iptables / IPVS service routing

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Debug Services task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Debugging Kubernetes Nodes With Kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- kube-proxy reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/

## Issues Found
- The post described Services as automatically creating legacy Endpoints objects and presented `kubectl get endpoints` as the primary inspection path. Updated the explanation and examples to use EndpointSlices, which Kubernetes documents as stable and as kube-proxy's source of truth for service routing.
- The Deployment YAML snippets omitted the required `spec.selector` field for `apps/v1` Deployments, and one readiness probe snippet lacked matching pod template labels. Added selectors and labels so the snippets are valid Kubernetes manifests.
- Several `kubectl run` troubleshooting commands passed `curl` or `/bin/bash` without `--command`, which would be treated as arguments to the image entrypoint instead of an explicit command. Added `--command --` and `--restart=Never` where appropriate for one-shot or interactive debug pods.
- The kube-proxy metrics example grepped for a service name against sync-rule metrics that are not per-service metrics. Changed the command to grep for `kubeproxy_sync_proxy_rules`.
- The node debugging section checked `/var/run/kube-proxy`, which is not a documented kube-proxy socket path. Replaced it with the documented `/host/var/log/kube-proxy.log` host filesystem path caveat.
- The LoadBalancer example assumed providers always set `.status.loadBalancer.ingress[0].ip`. Updated it to handle either an IP address or hostname.
- The iptables troubleshooting example used `iptables -t nat -L -n | grep myapp-service`, which may not show service comments. Switched to `iptables-save | grep myapp-service`, matching Kubernetes troubleshooting guidance.

## Review Notes
- Local `kubectl` was not installed in this workspace, so CLI syntax was verified against the official Kubernetes kubectl reference rather than local `--help` output.
- The guide remains intentionally generic; exact kube-proxy labels, metrics accessibility, and node log paths can vary by distribution or managed Kubernetes provider.
