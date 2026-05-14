# Validation Summary: How to Avoid Common Mistakes with eBPF in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes
- kube-proxy
- Linux eBPF and BPF filesystem
- Felix metrics and Prometheus
- kubectl

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: kubectl port-forward - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Mirantis MKE documentation: Deploy Calico eBPF Data Plane - https://docs.mirantis.com/mke4k/latest/configuration/container-network-interface/ebpf-dataplane-use/

## Issues Found
- The post stated that Calico eBPF requires kernel 5.3+. Current Calico documentation lists the base eBPF dataplane requirement as Linux kernel 5.10+ for most supported distributions, with a Red Hat 8.4 backport exception. Updated the kernel requirement and fix guidance.
- The kube-proxy conflict explanation was too absolute and described duplicate DNAT entries. Calico documentation describes disabling kube-proxy as recommended, or configuring Felix to avoid kube-proxy conflicts on platforms where kube-proxy cannot be disabled. Updated the wording to reflect iptables conflict/flapping behavior.
- The BPF filesystem diagnosis used a broad `mount | grep bpf` check and the fix said to add a systemd mount unit while showing `/etc/fstab` commands. Updated the check to target `/sys/fs/bpf`, corrected the mount command form, and aligned the fix text with persistent fstab configuration.
- The mixed-node guidance said to use `kubectl get nodes` to verify kernel versions, but the default output does not show kernel versions. Updated it to `kubectl get nodes -o wide`.
- The monitoring command used `kubectl port-forward daemonset/calico-node`, which is not one of the documented kubectl port-forward examples and is less portable than forwarding to a selected pod. Updated it to select a calico-node pod and forward to `pod/$POD`.
- Felix Prometheus metrics are disabled by default in Calico documentation. Added the required `felixconfiguration` patch before reading metrics from port 9091.

## Review Notes
The post is technically relevant and salvageable. Future improvements could mention the Calico operator's automatic eBPF configuration path for kubeadm-style clusters, the IPVS-to-iptables migration caution before disabling kube-proxy, and platform-specific kube-proxy limitations such as AKS.
