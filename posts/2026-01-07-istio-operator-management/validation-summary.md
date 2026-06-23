# Validation Summary: How to Manage Istio with Istio Operator

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Istio
- Istio Operator / IstioOperator API
- Kubernetes
- Helm
- istioctl
- Argo CD
- Flux
- GitOps
- Horizontal Pod Autoscaling
- Istio mTLS / PeerAuthentication

## Sources Consulted
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio installation profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio installation customization guide: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio supported releases and Kubernetes version support: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio mesh configuration reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Argo CD application deletion finalizer documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/

## Issues Found
- The post presented the in-cluster Istio Operator as current guidance. Updated the description, introduction, installation sections, and conclusion to clarify that Istio's in-cluster operator was deprecated in Istio 1.23, removed from Istio core in 1.24, and that the examples apply to legacy/operator-compatible deployments.
- The prerequisites used an outdated generic Kubernetes 1.22 recommendation. Replaced it with version-specific guidance for the Istio 1.20 examples, which supported Kubernetes 1.25 through 1.29.
- The "Simplified Upgrades" bullet referred to a non-existent `version` field. Changed it to `tag` or `revision`.
- The basic IstioOperator example incorrectly described `metadata.namespace` as the install namespace. Clarified that `spec.namespace` controls the control plane namespace and added `spec.namespace: istio-system`.
- The profile table described `empty` as "base only". Corrected it to "No components" to match Istio profile documentation.
- HPA examples used the old `targetAverageUtilization` shape. Updated them to the current Kubernetes autoscaling metric target format with `target.type: Utilization` and `target.averageUtilization`.
- The in-place upgrade section said "same minor version" but showed a minor upgrade from 1.19 to 1.20. Changed the example to a patch upgrade from 1.20.0 to 1.20.8.
- The Argo CD Application example included `resources-finalizer.argocd.argoproj.io` while claiming it prevented accidental pruning. Removed the finalizer because Argo CD uses it for cascading deletion of managed resources.
- The troubleshooting section used the obsolete `istioctl authn tls-check` command. Replaced it with `istioctl proxy-config secret` for certificate inspection during mTLS troubleshooting.
- The security snippet claimed a Pilot environment variable enabled strict peer authentication. Replaced that with a proper mesh-wide `PeerAuthentication` resource using `mtls.mode: STRICT`.
- Corrected misleading security comments around DNS capture and proxy image selection.

## Review Notes
- All YAML code fences in the post were parsed successfully after edits.
- The post is now technically framed as a legacy/operator-compatible guide. Future content for new Istio deployments should prefer Helm or `istioctl install`, or explicitly cover ecosystem operators such as Classic Operator Controller or Sail Operator.
