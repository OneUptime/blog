# Validation Summary: How to Build a Runbook for ClusterIP Reachability Issues with Calico

## Status
validated

## Post Type
Technical guide / runbook

## Technologies Covered
- Kubernetes Services and ClusterIP networking
- Kubernetes EndpointSlice API
- kubectl
- kube-proxy
- Calico and calicoctl
- Linux iptables
- Linux conntrack

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Netfilter conntrack-tools man page: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- Local iptables help output from `iptables v1.8.10`

## Issues Found
- The post used `kubectl get endpoints` for service backend checks. Kubernetes v1.33 deprecated the legacy Endpoints API and recommends EndpointSlices instead, so the affected commands were changed to `kubectl get endpointslices -l kubernetes.io/service-name=<service-name>`.
- The temporary probe pods used `kubectl run ... -- wget ...` and `kubectl run ... -- curl ...` without `--command`. Per the kubectl reference, a different executable should be run with `--command --`; otherwise the values after `--` are treated as arguments to the image's default command. Added `--restart=Never --command --` to both probe commands.
- The conntrack remediation described `conntrack -F` as clearing stale entries. That command flushes connection tracking state broadly, including active state, so the text now warns to use it only during an approved emergency.

## Review Notes
- `kubectl` and `conntrack` were not installed in the local environment, so those commands were verified against official documentation rather than local `--help` output. `iptables` syntax was checked locally.
- The Calico namespace and labels shown are valid for common operator-managed installs, but clusters installed differently may use another namespace such as `kube-system`.
