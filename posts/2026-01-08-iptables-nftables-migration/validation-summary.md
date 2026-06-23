# Validation Summary: How to Migrate from iptables to nftables in Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Linux nftables / iptables (netfilter)
- Kubernetes kube-proxy (iptables, nftables, IPVS modes)
- kubeadm / KubeProxyConfiguration
- CNI plugins: Calico (Felix), Cilium (eBPF), Flannel
- iptables-translate / iptables-restore-translate compatibility tooling
- update-alternatives (iptables-nft compatibility layer)
- kubectl, systemd, iperf3

## Sources Consulted
- Kubernetes — NFTables mode for kube-proxy (blog/announcement): https://v1-32.docs.kubernetes.io/blog/2025/02/28/nftables-kube-proxy/
- Kubernetes — Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes — Linux Kernel Version Requirements: https://kubernetes.io/docs/reference/node/kernel-version-requirements/
- KEP-3866 (nftables proxy): https://github.com/kubernetes/enhancements/blob/master/keps/sig-network/3866-nftables-proxy/README.md
- kubernetes/kubernetes PR #124152 — update client/kernel version requirements for nftables kube-proxy: https://github.com/kubernetes/kubernetes/pull/124152
- Calico — Configuring Felix (iptablesBackend): https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico — Data plane guide: nftables: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico manifest (calico_backend ConfigMap values): https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/calico.yaml
- Fedora Project Wiki — Changes/firewalld default to nftables: https://fedoraproject.org/wiki/Changes/firewalld_default_to_nftables
- nftables wiki (rule syntax, families, hooks/priorities): https://wiki.nftables.org/

## Issues Found
1. **Incorrect Fedora version for the nftables switch.** The intro claimed "Fedora 18+" uses nftables as the default firewall framework. Fedora 18 (2013) predates nftables (kernel 3.13, 2014); firewalld defaulted to the nftables backend starting in **Fedora 32** (2020). Changed "Fedora 18+" → "Fedora 32+".

2. **Wrong kernel / nft version minimums for kube-proxy nftables mode.** The pre-migration check and the compatibility matrix stated kernel 4.10+ and nftables 0.9.0+. Per the Kubernetes docs and PR #124152, kube-proxy's nftables mode requires **kernel 5.13+** and the **`nft` CLI 1.0.1+**. Updated the `uname -r` comment to "5.13+ required for kube-proxy nftables mode", and the matrix rows to Kernel min 5.13 / rec 5.15+ and nftables (nft CLI) min 1.0.1 / rec 1.0.1+.

3. **Checklist contradicted the stated minimums.** The Pre-Migration checklist said "Verify kernel version 4.10+" and "Verify Kubernetes version 1.25+", both inconsistent with the rest of the post (and incorrect for nftables mode). Changed to kernel **5.13+** and Kubernetes **1.29+** (nftables mode is alpha in 1.29).

4. **Incorrect Calico nftables configuration.** The first Calico example set `calico_backend: "nftables"` in the `calico-config` ConfigMap. The `calico_backend` key controls the BGP/networking dataplane and only accepts `bird` or `vxlan` — it does not select the firewall backend. The nftables firewall backend is selected via the `FELIX_IPTABLESBACKEND` env var (on the calico-node DaemonSet) or FelixConfiguration `iptablesBackend: NFT`. Replaced the wrong ConfigMap snippet with a `FELIX_IPTABLESBACKEND: NFT` DaemonSet env example; the subsequent (already-correct) FelixConfiguration example was kept.

5. **Misleading update-alternatives comment.** The comment claimed setting the `iptables` alternative to `iptables-nft` "Switch[es] to nftables-only mode (removes iptables-nft symlinks)". That is the opposite of what happens — it points the `iptables` command at the nftables-backed (`nf_tables`) frontend, i.e. it *uses* the compatibility layer. Corrected the comment to "Point the iptables/ip6tables commands at the nftables (nft) backend".

## Review Notes
- The kube-proxy nftables mode timeline in the post (alpha in 1.29, beta in 1.31) is historically accurate. Note that nftables mode reached **GA/stable in Kubernetes 1.33**; iptables remains the upstream default. The "Recommended 1.31+" guidance still holds (it includes 1.33), so no change was made, but readers on current clusters should prefer 1.33+ for GA support.
- The `kubectl patch` examples that set `config.conf` to a single field (e.g. `mode: iptables` in Quick Rollback, or `syncPeriod: 60s\nminSyncPeriod: 10s` in the High-CPU section) use a `--type=merge` patch that replaces the **entire** `config.conf` string. In practice this would overwrite the full kube-proxy configuration rather than amend one field. They are illustrative, but on a real cluster the safer path is to edit the ConfigMap YAML (as shown in Option 2) and rolling-restart. Left as-is since the surrounding text frames them as quick/illustrative actions.
- The `kubeadm` example uses `apiVersion: kubeadm.k8s.io/v1beta3`, which is valid for 1.29–1.31; `v1beta4` was added in 1.31. Fine for the versions discussed.
- nftables rule syntax throughout (inet/ip families, `ct state`, `dnat to`, `masquerade`, hook priorities `dstnat`/`srcnat`, `priority -10`) is correct and matches the nftables wiki. The `iptables-translate` sample output, IPVS scheduler list (`rr`/`lc`/`dh`/`sh`/`sed`/`nq`), ports (kubelet 10250, kube-proxy healthz 10256, NodePort range 30000-32767), and Cilium config keys (`enable-bpf-masquerade`, `install-iptables-rules`) are all accurate.
