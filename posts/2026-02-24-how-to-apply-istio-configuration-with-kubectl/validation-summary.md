# Validation Summary: How to Apply Istio Configuration with kubectl

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- kubectl
- Kubernetes custom resources
- Kubernetes YAML manifests
- Kustomize
- istioctl

## Sources Consulted
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio dynamic admission webhook overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio configuration validation troubleshooting: https://istio.io/latest/docs/ops/common-problems/validation/
- Istio generated API metadata for short names: https://pkg.go.dev/istio.io/api/networking/v1 and https://pkg.go.dev/istio.io/client-go/pkg/apis/security/v1

## Issues Found
- The server-side dry-run description said invalid fields or references would be reported. Server-side dry run does run API server and admission validation, including Istio's validation webhook, but cross-resource reference analysis is better covered by `istioctl analyze`. Updated the wording to distinguish webhook validation from Istio-specific cross-resource checks.
- The automation script applied `auth-policies.yaml` but verified only `vs,dr,gw,pa`. Added `ap`, the Istio short name for AuthorizationPolicy, so the verification command includes authorization policies too.

## Review Notes
The core commands, Istio `networking.istio.io/v1` examples, `security.istio.io/v1` policy references, Kustomize usage, patch syntax, dry-run flags, and `istioctl proxy-config route --name` usage match current official documentation. `kubectl` and `istioctl` were not installed in the local workspace, so command verification was performed against official generated command references rather than local `--help` output.
