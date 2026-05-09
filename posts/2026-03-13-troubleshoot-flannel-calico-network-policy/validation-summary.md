# Validation Summary: How to Troubleshoot Flannel with Calico Network Policy

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Flannel
- Calico
- Canal
- Kubernetes NetworkPolicy
- calicoctl
- iptables

## Sources Consulted
- Calico documentation: Install Calico for policy and flannel, also known as Canal, for networking: https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/install-for-flannel
- Calico documentation: Configuring calico/node and Felix readiness checks: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: calicoctl get command and supported resource types: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: WorkloadEndpoint resource: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico documentation: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: kubectl debug command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debug running Pods and Nodes with kubectl debug profiles: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Flannel project documentation: flannel README and backend/firewall notes: https://github.com/flannel-io/flannel

## Issues Found
- The Canal log command used `-c canal`, but the official Canal manifest uses `kube-flannel` and `calico-node` containers. Changed the command to check both containers.
- The Flannel log command used `-c flannel`, but the container name in the official Canal manifest is `kube-flannel`. Updated the command.
- The node annotation command piped kubectl JSONPath output for an object into `python3 -m json.tool`, but that output is not valid JSON. Replaced it with a kubectl Go template that prints annotation key/value pairs before grepping for Flannel annotations.
- The Felix health check used `calico-node -version`, which does not verify Felix readiness. Replaced it with the documented `/bin/calico-node -felix-ready` readiness check.
- The `calicoctl` commands assumed a non-standard `deploy/calicoctl` workload exists. Replaced them with direct `calicoctl` commands and clarified that they should run where `calicoctl` is configured.
- The node debug command used the default kubectl debug profile before running `chroot /host iptables`. Kubernetes documentation notes that the default debug pod may not be privileged enough for `chroot`; updated the command to use `--profile=sysadmin`.

## Review Notes
- The guide is accurate as a Canal troubleshooting workflow after the command corrections. The iptables check applies to Calico's iptables dataplane; clusters configured for Calico's nftables dataplane would require different inspection commands.
