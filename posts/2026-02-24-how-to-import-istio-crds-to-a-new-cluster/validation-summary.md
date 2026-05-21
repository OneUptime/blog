# Validation Summary: How to Import Istio CRDs to a New Cluster

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio
- Istio CRDs and custom resources
- Kubernetes
- kubectl
- istioctl
- Helm

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio sidecar injection labels: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio configuration reference: https://istio.io/latest/docs/reference/config/
- Istio networking resource references: https://istio.io/latest/docs/reference/config/networking/
- Istio security resource references: https://istio.io/latest/docs/reference/config/security/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio diagnose configuration with istioctl analyze: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The Helm base-chart example assumed the Istio Helm repository was already configured and omitted the current `defaultRevision=default` value shown in the official Istio Helm installation flow. I added `helm repo add`, `helm repo update`, and `--set defaultRevision=default`.
- The namespace injection section only showed the legacy/default `istio-injection=enabled` label. I added a short note that revisioned Istio control planes should use `istio.io/rev=<revision>` instead.
- The "Resource already exists" troubleshooting note suggested `--server-side --force-conflicts` as a general fix. I clarified that `AlreadyExists` usually means `kubectl create` was used instead of `kubectl apply`, while `--force-conflicts` applies to server-side apply field ownership conflicts.
- The verification command used unqualified resource names, including `gateways`, which can be ambiguous when Kubernetes Gateway API CRDs are installed. I changed the verification list to fully qualified Istio resource names and included `proxyconfigs` and `telemetries`, which the import script handles.

## Review Notes
The remaining commands and explanations are consistent with current Istio and Kubernetes documentation. The post intentionally stays version-neutral, so migrations across major Istio versions still require checking the relevant Istio migration notes for version-specific API changes.
