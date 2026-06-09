# Validation Summary: How to Migrate from K3s to Full Kubernetes

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Kubernetes (kubeadm-based clusters)
- containerd container runtime
- Calico CNI (v3.27.0)
- Traefik IngressRoute CRDs
- nginx-ingress
- Velero (v1.13.0) + velero-plugin-for-aws (v1.9.0)
- PostgreSQL (pg_dumpall / psql)
- kubectl, kubeadm, kubelet
- AWS Route 53 / ALB
- Bash scripting and Python (PyYAML)

## Sources Consulted
- Kubernetes 1.31 kubeadm v1beta4 blog: https://kubernetes.io/blog/2024/08/23/kubernetes-1-31-kubeadm-v1beta4/
- Kubernetes Ingress documentation (ingressClassName vs. annotation): https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes apt repository announcement: https://kubernetes.io/blog/2023/08/15/pkgs-k8s-io-introduction/
- Calico v3.27.0 release: https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Velero file-system backup docs: https://velero.io/docs/main/file-system-backup/
- velero-plugin-for-aws releases: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases
- K3s uninstall documentation: https://docs.k3s.io/installation/uninstall
- K3s networking docs (Flannel default CNI): https://docs.k3s.io/networking/basic-network-options

## Issues Found

1. **Deprecated kubeadm API version (`v1beta3`) used with Kubernetes 1.31.0.**
   - `kubeadm.k8s.io/v1beta3` was formally deprecated in Kubernetes 1.31 in favor of `v1beta4`. The schema fields used in the sample config (ClusterConfiguration with kubernetesVersion/controlPlaneEndpoint/networking/apiServer.certSANs and InitConfiguration with localAPIEndpoint/nodeRegistration.criSocket) are all supported in `v1beta4` unchanged.
   - **Fix:** Updated both occurrences of `apiVersion: kubeadm.k8s.io/v1beta3` to `apiVersion: kubeadm.k8s.io/v1beta4` in the `kubeadm-config.yaml` example.

2. **Deprecated `kubernetes.io/ingress.class` annotation in the Traefik→Ingress transformation script.**
   - This annotation has been deprecated since Kubernetes 1.18 in favor of the `spec.ingressClassName` field. Most ingress controllers (including ingress-nginx) recommend the spec field and may stop honoring the annotation in future versions.
   - **Fix:** In `transform-ingress.py`, removed the `metadata.annotations['kubernetes.io/ingress.class']` entry and added `spec.ingressClassName: 'nginx'` instead.

3. **Invalid field selector on PVCs in the validation script.**
   - `kubectl get pvc -A --field-selector=status.phase!=Bound` would fail because PVCs only support `metadata.name` and `metadata.namespace` as field selectors — `status.phase` is not a supported selector for the PersistentVolumeClaim type and kubectl would return a "field label not supported" error.
   - **Fix:** Replaced the field-selector-based filter in `validate-migration.sh` with a `jsonpath` filter that emits `<namespace>/<name> <phase>` for any PVC whose `status.phase != "Bound"`, then counts non-empty output. This produces the same intent without relying on an unsupported field selector.

## Review Notes

- **v1beta4 vs v1beta3 timing:** `v1beta3` still works in 1.31 (only deprecated, not removed — earliest removal is in 1.34), so readers using the old version won't immediately break, but `v1beta4` is the recommended config for any 1.31+ cluster.
- **velero-plugin-for-aws v1.9.0 caveat (not patched):** v1.9.x of the AWS plugin has known regressions affecting some S3-compatible (non-AWS) backends. The post uses `s3ForcePathStyle=true` with `https://s3.example.com`, which suggests an MinIO/Ceph-style backend. Readers targeting non-AWS S3 endpoints may want to verify compatibility with the specific provider; this is not technically incorrect as written so no in-post edit was made.
- **Calico installation via flat manifest:** The `v3.27.0/manifests/calico.yaml` URL works, but Calico's documentation increasingly recommends the Tigera Operator (`tigera-operator.yaml` + `custom-resources.yaml`) for production. The flat manifest install remains supported; no change needed.
- **The `clean_export` yq filter:** The post uses `yq eval 'del(...)' -`, which is the Mike Farah `yq` v4 syntax. This works correctly for the documented use case; readers using the Python-based `yq` wrapper would need different syntax. Not changed.
- **Path extraction in the Python transformer:** The Traefik rule parser uses string splitting that is fragile for complex match expressions (chained `&&`, escaped backticks). The author's docstring notes this is "simplified parsing," which is fair disclosure; left unchanged.
- **Ingress controller assumption in validation script:** The validation script checks `app.kubernetes.io/name=ingress-nginx` in the `ingress-nginx` namespace, which is correct for the chart-deployed ingress-nginx controller and matches the migration target the post recommends.
