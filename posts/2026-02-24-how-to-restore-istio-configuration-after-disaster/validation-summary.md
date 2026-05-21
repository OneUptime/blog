# Validation Summary: How to Restore Istio Configuration After Disaster

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- kubectl
- Helm
- Velero
- Kubernetes custom resources and CRDs
- Istio traffic management, security, and telemetry APIs

## Sources Consulted
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio custom CA certificate documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio traffic management API reference: https://istio.io/latest/docs/reference/config/networking/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Velero restore documentation: https://velero.io/docs/v1.18/restore-reference/
- Velero resource filtering documentation: https://velero.io/docs/main/resource-filtering/

## Issues Found
- The guide installed Istio before restoring custom CA certificates, while Istio's custom CA documentation expects the `cacerts` secret to exist before Istio is deployed on a fresh cluster. Updated the installation and custom CA sections to make the fresh-cluster order explicit, while retaining the restart instruction for already-running Istiod.
- The Helm base install command omitted `--set defaultRevision=default`, which current Istio Helm documentation recommends for default revision validation in sidecar-mode installs. Added the flag.
- The authentication explanation grouped PeerAuthentication and RequestAuthentication together as "authentication mode." Updated the wording to distinguish mTLS mode from JWT validation rules.
- The conflict-handling section referred to the `--force` flag, but the example correctly used server-side apply with `--force-conflicts`. Updated the text to match the command and avoid implying `kubectl apply --force` is the right conflict-resolution flag.
- The Velero restore example described a restore using the backup name as the restore name. Updated the command to create an explicitly named restore and describe that restore name.
- The Velero filtered restore example used unqualified Istio resource names and the singular `telemetry`. Updated it to use resource.group identifiers, including `telemetries.telemetry.istio.io`.
- The missing CRD pitfall claimed `kubectl apply` would silently fail. Updated it to say `kubectl apply` fails with an error such as "no matches for kind."

## Review Notes
The command examples are otherwise valid as operational examples, assuming the referenced backup files, namespaces, workloads, and sample deployments exist in the user's environment. The guide correctly notes that cross-resource references such as VirtualService to Gateway or DestinationRule subsets are not fully enforced by Kubernetes admission and should be checked with `istioctl analyze`.
