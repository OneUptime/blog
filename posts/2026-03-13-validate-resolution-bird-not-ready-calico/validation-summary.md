# Validation Summary: Validate Resolution for BIRD Not Ready in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BIRD
- kubectl
- calicoctl
- Linux routing
- Prometheus Alertmanager

## Sources Consulted
- Calico documentation: calico/node configuration and BIRD readiness behavior: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: calicoctl node status command: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: BGP peering and node status guidance: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: BIRD not-ready troubleshooting: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Kubernetes documentation: kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes documentation: Pod conditions and Ready status: https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/
- Kubernetes documentation: API server service proxy URL format: https://kubernetes.io/docs/tasks/access-application-cluster/access-cluster-services/
- Prometheus Alertmanager documentation and API notes: https://github.com/prometheus/alertmanager

## Issues Found
- The `calicoctl node status` instruction implied that checking from one node may be enough. Calico documents that this command communicates with the local Calico agent, so I changed the comment to say it should be run on each node whose BGP status needs verification.
- The `kubectl run` commands passed `sleep 3600` without `--command`. The kubectl reference distinguishes custom command mode from passing arguments to the image default command, so I added `--command` to make the BusyBox test pods reliably execute `sleep 3600`.

## Review Notes
- The route check using `ip route show | grep bird` is appropriate for Calico deployments where BIRD installs BGP-learned routes into the Linux routing table, but VXLAN-only Calico deployments do not depend on BGP/BIRD in the same way.
- The Alertmanager check assumes the Prometheus Operator convention of an `alertmanager-operated` service in the `monitoring` namespace. Clusters using a different namespace or service name would need to adjust that path.
