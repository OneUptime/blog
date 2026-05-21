# Validation Summary: How to Write PeerAuthentication YAML (Cheat Sheet)

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Istio PeerAuthentication
- Istio mutual TLS (mTLS)
- Istio DestinationRule TLS settings
- istioctl
- kubectl
- Kubernetes health checks
- YAML

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The mesh-wide policy sections assumed `istio-system` is always the mesh root namespace. Updated the wording to say the policy belongs in the Istio root namespace, usually `istio-system`.
- The permissive mode section described permissive mode as the default when Istio is installed. Updated it to clarify that permissive applies when no PeerAuthentication policy sets a stricter mode.
- The namespace-level policy section said it applies regardless of mesh-wide settings. Updated it to note that workload-level policies can still override it.
- The port-level mTLS section did not mention that `portLevelMtls` only applies with a workload selector and that the key is the workload port, not the Kubernetes Service port. Added that clarification.
- The post did not mention that `DISABLE` mode is unsupported in ambient mode. Added a short note and narrowed the port example wording to sidecar mode.
- The health-check example used port `15021`, the sidecar status port, as a PeerAuthentication exception. Replaced it with an application workload port example and clarified that the exception should be for the workload port receiving custom plaintext health checks.
- The validation command used the old `istioctl authn tls-check` command, which is not present in the current `istioctl` command reference. Replaced it with `istioctl experimental describe pod`, which current docs list as a way to inspect Istio configuration affecting a pod.
- The duplicate-policy section said behavior is undefined. Updated it to match Istio documentation: when more than one workload-specific peer authentication policy matches, Istio picks the oldest one.

## Review Notes
The YAML examples use current `security.istio.io/v1` and `networking.istio.io/v1` API versions. The post remains focused on sidecar-style PeerAuthentication behavior; ambient mode is only called out where it affects the correctness of `DISABLE`.
