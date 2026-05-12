# Validation Summary: How to Test Flannel with Calico Network Policy in a Lab Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Canal (Flannel + Calico network policy)
- Calico v3.27.0
- Flannel (VXLAN backend, 10.244.0.0/16)
- kind v0.22.0 (Kubernetes in Docker)
- kubeadm
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- kubectl
- busybox / nginx test workloads

## Sources Consulted
- Calico v3.27.0 canal manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/canal.yaml (verified HTTP 200, contains canal ConfigMap, DaemonSet with `k8s-app: canal`, and Flannel net-conf with `10.244.0.0/16` + VXLAN)
- kind v0.22.0 release binary: https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64 (verified reachable via redirect)
- kind Cluster config schema (apiVersion `kind.x-k8s.io/v1alpha4`, `networking.podSubnet`, `networking.disableDefaultCNI`)
- Kubernetes NetworkPolicy API reference (networking.k8s.io/v1)
- kubeadm `--pod-network-cidr` flag documentation

## Issues Found
No technical issues found.

- The canal.yaml URL pinned at `v3.27.0` resolves and the manifest contents are consistent with the post (Flannel VXLAN backend, 10.244.0.0/16 network, DaemonSet labelled `k8s-app=canal`).
- The kind config (`apiVersion: kind.x-k8s.io/v1alpha4`, `disableDefaultCNI: true`, `podSubnet: 10.244.0.0/16`) is valid and aligns with the Flannel CIDR baked into canal.yaml.
- `kubectl wait --for=condition=Ready pods -n kube-system -l k8s-app=canal` matches the actual DaemonSet selector in v3.27.0.
- `kubeadm init --pod-network-cidr=10.244.0.0/16` is the correct CIDR to use with Canal/Flannel defaults.
- All NetworkPolicy manifests use valid `networking.k8s.io/v1` schema with correct `podSelector`, `policyTypes`, and `ingress.from.podSelector` fields.
- The `run=server` label used in Test Scenario 3 is correctly applied automatically by `kubectl run server`.
- busybox includes `wget`, so the connectivity tests work as written.

## Review Notes
- Canal is in maintenance mode upstream (Calico recommends pure Calico for new deployments), but the manifest is still published and functional at v3.27.0. A future revision could mention this status.
- The kubeadm option omits the standard post-init steps (copying admin.conf to `~/.kube/config`, untainting the control-plane in single-node setups). Readers familiar with kubeadm will fill these in, but a brief note could improve completeness — not a correctness issue.
- `kubectl delete pod ... --force` without `--grace-period=0` works but emits a deprecation warning in newer kubectl; combining the flags is the canonical form. Cosmetic, not incorrect.
- The claim that "Canal installs identically in both environments" is broadly true for the manifest, but readers should be aware that kernel/conntrack/MTU specifics on real VMs can differ from kind's nested Docker networking — minor caveat for advanced policy testing.
