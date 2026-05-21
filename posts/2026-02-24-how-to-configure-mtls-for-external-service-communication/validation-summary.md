# Validation Summary: How to Configure mTLS for External Service Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio Gateway and VirtualService
- Istio egress gateway
- Istio SDS credentialName
- Kubernetes Secrets, Deployments, RBAC
- cert-manager Certificate resources

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio Egress Gateways with TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The Deployment example for mounting a secret into the sidecar was missing the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `app: my-app` labels and selector.
- The `credentialName` sidecar example omitted the `workloadSelector` required by Istio for sidecar use. Added a matching `workloadSelector` and noted the requirement.
- The `credentialName` sidecar flow omitted the RBAC step shown in Istio's mTLS origination documentation. Added a Role and RoleBinding for the workload service account.
- The TLS origination DestinationRule targeted port `443`, but Istio's HTTP-to-HTTPS origination pattern applies TLS settings to the HTTP ServiceEntry port with `targetPort: 443`. Changed the port to `80` and added explicit SNI.
- The egress gateway section was incomplete: it showed a Gateway and a DestinationRule for the external host but did not route sidecar traffic through the gateway or separate app-to-gateway ISTIO_MUTUAL from gateway-to-external MUTUAL. Added the missing DestinationRule, VirtualService, gateway namespace reference, and egress-gateway DestinationRule.
- The verification text implied sidecar logs show TLS handshake details by default and that transport sockets always show file paths. Updated the wording to mention request entries, TLS-related errors, and SDS secret references.
- The `credentialName` troubleshooting note said gateway secrets must be in `istio-system`. Updated it to the more accurate rule that the secret must be in the namespace of the proxy using it.

## Review Notes
The examples now match current Istio documentation for sidecar mTLS origination and egress gateway mTLS origination. In a future revision, the post could clarify which sections apply to applications sending plaintext HTTP versus applications that already initiate TLS themselves.
