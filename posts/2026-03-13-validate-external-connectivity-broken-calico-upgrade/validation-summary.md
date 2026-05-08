# Validation Summary: How to Validate Resolution of External Connectivity After Calico Upgrade

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- calicoctl
- iptables
- BusyBox

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico configure outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico eBPF dataplane documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico nftables dataplane documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables

## Issues Found
- The `kubectl run` examples attempted to run `wget` and `sh` without `--command`. Kubernetes treats arguments after `--` as container args unless `--command` is set, so these commands could be passed to the BusyBox image default command instead of replacing it. Added `--command` to both examples.
- The cleanup command used `kubectl delete pods -l run=ext-test`, but `kubectl run` labels each pod with its generated pod name, such as `run=ext-test-node1`. Added a stable `app=ext-test` label and changed cleanup to use that label.
- The HTTPS/DNS test waited for `condition=Ready`, which is unreliable for a short-lived pod that should complete. Changed the wait to check `.status.phase` for `Succeeded`.
- The post treated iptables verification as universally applicable. Calico also supports non-iptables dataplanes, including eBPF and nftables, so the wording now refers to the active dataplane and scopes the iptables command to clusters using the Calico iptables dataplane.
- The post said a `natOutgoing` fix takes effect immediately. Adjusted this to say it takes effect after calico-node reconciles it and does not require pod restarts.

## Review Notes
Local `kubectl` and `calicoctl` binaries were not installed in the review environment, so command validation was performed against current official Kubernetes and Calico documentation instead of local `--help` output.
