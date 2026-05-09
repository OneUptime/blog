# Validation Summary: How to Troubleshoot Installation Issues with Calico with Helm

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes custom resources and RBAC
- Helm 3
- kubectl
- Kubernetes CNI

## Sources Consulted
- Calico Open Source 3.32 Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Open Source Helm installation reference: https://docs.tigera.io/calico/latest/reference/installation/helm_customization
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Installation API reference for TigeraStatus: https://docs.tigera.io/calico/latest/reference/installation/api
- Helm command documentation for `helm upgrade`: https://helm.sh/docs/helm/helm_upgrade/
- Helm command documentation for `helm template`: https://helm.sh/docs/helm/helm_template/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The prerequisites listed `calicoctl configured`, but the guide's commands only require kubectl, Helm, and a working kubeconfig. Updated the prerequisite to `kubeconfig configured for the affected cluster`.
- The reinstall examples used Calico `v3.27.0`, while the current official Calico Open Source documentation is for `v3.32.0`. Updated the chart version references to `v3.32.0`.
- The CRD conflict fix used a broad `kubectl delete crd $(kubectl get crd -o name | grep calico.org)` command. This could delete active Calico CRDs and their stored custom resources. Replaced it with a placeholder for deleting only confirmed obsolete CRDs.
- The reinstall examples omitted the current documented CRD chart installation step. Added the `helm template calico-crds projectcalico/crd.projectcalico.org.v1 --version v3.32.0 | kubectl apply --server-side -f -` command before reinstalling the Tigera Operator.
- The Installation CR troubleshooting step advised deleting `installation default` and stated that the operator should recreate it automatically. For Helm-based installs, the Installation resource is rendered from Helm values when enabled, so the safer correction is to patch the bad field or reapply the Helm values. Updated the command and note accordingly.

## Review Notes
The remaining Helm and kubectl command syntax is valid. The guide assumes the `projectcalico` Helm repository has already been added and the `tigera-operator` namespace exists; those assumptions are reasonable for a troubleshooting post about an existing Helm installation, but a future expansion could call them out explicitly.
