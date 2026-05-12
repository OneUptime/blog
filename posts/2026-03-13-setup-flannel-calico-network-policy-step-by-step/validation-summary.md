# Validation Summary: How to Set Up Flannel with Calico Network Policy Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Canal (Calico + Flannel combined CNI)
- Calico v3.27.0 (Felix policy engine)
- Flannel (VXLAN overlay)
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- kubectl
- calicoctl
- kubeadm / k3s / RKE

## Sources Consulted
- Calico v3.27.0 canal.yaml manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/canal.yaml (verified DaemonSet name `canal`, label `k8s-app: canal`, container names `install-cni`, `calico-node`, `kube-flannel`)
- Calico v3.27.0 calicoctl.yaml manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calicoctl.yaml (verified calicoctl is deployed as a Pod, not a Deployment)
- Flannel default pod CIDR (10.244.0.0/16): https://github.com/flannel-io/flannel
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
1. **Incorrect container name**: The post stated "Each pod contains both the `flannel` and `calico-node` (Felix) containers." Verifying the v3.27.0 canal.yaml manifest, the Flannel container is actually named `kube-flannel`. Updated the text to use the correct container name.

2. **calicoctl referenced as a Deployment**: The post used `kubectl exec -n kube-system deploy/calicoctl -- calicoctl node status`. The official calicoctl.yaml manifest at v3.27.0 deploys calicoctl as a `Pod` (named `calicoctl` in `kube-system`), not a Deployment. Using `deploy/calicoctl` would fail with `deployments.apps "calicoctl" not found`. Changed to `kubectl exec -n kube-system calicoctl -- calicoctl node status`.

## Review Notes
- The canal.yaml and calicoctl.yaml URLs at `projectcalico/calico/v3.27.0/manifests/` both return HTTP 200 and are valid.
- The default Flannel pod CIDR of `10.244.0.0/16` is correct.
- The `k8s-app=canal` label selector matches what is set on the DaemonSet pods in the manifest.
- The NetworkPolicy example uses `networking.k8s.io/v1`, which is the current stable API.
- The calicoctl pod started by the manifest runs `calicoctl version --poll=1m` as its command. The pod stays running, so `kubectl exec` for `calicoctl node status` works as described. Users should be aware they may need to wait for the pod to be Ready before exec'ing.
- Canal as a distribution path has been deprecated in newer Calico releases (post-v3.27), so this tutorial is version-specific. A future-proofing note recommending Calico's standalone manifests (with Calico-only or Calico+VXLAN backends) could be added but is outside the scope of technical correctness for v3.27.0.
- The `sed -i` command in Step 2 only updates occurrences of the default pod CIDR string within canal.yaml; users should also ensure the ConfigMap `canal-config` `net-conf.json` and the `CALICO_IPV4POOL_CIDR` env are both consistently updated (both reference 10.244.0.0/16 in the upstream manifest, so the single `sed` does cover both).
