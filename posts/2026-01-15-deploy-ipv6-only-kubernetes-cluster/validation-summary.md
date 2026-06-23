# Validation Summary: How to Deploy an IPv6-Only Kubernetes Cluster

## Status
validated

## Post Type
Tutorial / Guide (step-by-step deployment walkthrough)

## Technologies Covered
- Kubernetes (kubeadm, kubelet, kubectl v1.29)
- IPv6 networking (SLAAC, DHCPv6, ULA, sysctl, netplan)
- containerd container runtime
- CNI plugins: Calico (Tigera operator), Cilium (eBPF), Flannel
- CoreDNS
- etcd
- NGINX Ingress Controller
- Linux kernel networking (sysctl, kernel modules, ip6tables)

## Sources Consulted
- Linux Kernel IP Sysctl documentation — https://docs.kernel.org/networking/ip-sysctl.html
- Flannel configuration documentation — https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md
- Cilium installation (Helm/CLI) documentation — https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- cilium-cli repository — https://github.com/cilium/cilium-cli
- kubeadm IPv6/dual-stack reference (kubeadm.k8s.io/v1beta3 API) and Kubernetes service IP family docs
- Calico Tigera operator Installation API (operator.tigera.io/v1)

## Issues Found
1. **Invalid `disable_ipv4` sysctl (fixed).** The IPv6-forwarding sysctl block included
   `net.ipv4.conf.all.disable_ipv4 = 1` and `net.ipv4.conf.default.disable_ipv4 = 1`.
   These keys do not exist in the Linux kernel — there is no `disable_ipv4` sysctl
   (only `net.ipv6.conf.*.disable_ipv6` exists). `sudo sysctl --system` would emit
   "No such file or directory" errors for these entries. Removed the two lines and the
   accompanying comment. IPv4 is already effectively disabled at the interface level via
   the netplan `dhcp4: false` / no IPv4 address configuration shown in Step 2.

2. **Incorrect Cilium values-file flag (fixed).** The install command used
   `cilium install --version 1.15.0 --helm-set-file values.yaml=cilium-ipv6-values.yaml`.
   `--helm-set-file key=path` sets a single Helm value from a file (helm `--set-file`
   semantics); as written it would set a value literally named `values.yaml` to the file
   contents rather than applying the whole values file. The correct flag to apply a full
   values file is `--values`. Changed to
   `cilium install --version 1.15.0 --values cilium-ipv6-values.yaml`.

## Review Notes
- **Flannel `IPv6Backend` is correct** — initially suspected, but verified against the
  official flannel configuration docs: for IPv6-only setups flannel does support a
  separate `IPv6Backend` key in `net-conf.json`. No change made.
- **Cilium `tunnel: disabled` (version caveat).** In Cilium 1.14+ the `tunnel` Helm value
  was deprecated in favor of `routingMode: native` plus `tunnelProtocol`. With Cilium
  1.15 (the version pinned in the post) `tunnel: disabled` may be ignored. Since the
  config already sets `nativeRoutingCIDR` and `autoDirectNodeRoutes`, native routing is
  the clear intent; readers on newer Cilium releases should use `routingMode: native`.
  Left as-is to avoid changing version-pinned behavior, but worth modernizing later.
- **Calico `blockSize: 64`** with a `/48` pool is valid (64 > 48 and within the allowed
  IPv6 block-size range); each node receives a `/64`. Note this co-exists with
  kube-controller-manager `allocate-node-cidrs`/`node-cidr-mask-size: 64`; operators
  should ensure Calico IPAM and kube-controller-manager CIDR allocation are aligned.
- Documentation prefix usage (`2001:db8::/32`) is correct per RFC 3849 for examples.
- AWS public IPv4 charge of $0.005/hour (effective Feb 2024) and the "340 undecillion"
  IPv6 address-space figure (~2^128) are accurate.
- kubeadm `v1beta3` API, Calico `operator.tigera.io/v1`, service `ipFamilies`/
  `ipFamilyPolicy`, etcd IPv6 URLs, CoreDNS Corefile, and the `2001:db8:43::a` cluster
  DNS / `2001:db8:43::1` kubernetes service ClusterIP (first address in the `/112`
  service range) are all consistent and correct.
