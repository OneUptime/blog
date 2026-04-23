# Validation Summary: How to Configure PCI DSS Controls in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Admission
- Kubernetes RBAC
- Kubernetes audit logging
- Istio
- PCI DSS

## Sources Consulted
- Rancher Compliance Scans: https://ranchermanager.docs.rancher.com/integrations-in-rancher/compliance-scans
- Rancher Compliance Scan Configuration Reference: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/compliance-scans/configuration-reference
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes Auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Secure Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- PCI SSC FAQ on SAQ/QSA involvement: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/how-should-qsa-assistance-with-completion-of-self-assessment-questionnaire-saqs-be-documented/
- PCI SSC note on PCI DSS validation documents versus certificates: https://blog.pcisecuritystandards.org/beware-of-pci-dss-compliance-certificates

## Issues Found
- The post mixed shell commands and a manifest inside a `yaml` code fence in the network-policy section. I changed it to a `bash` example using `kubectl apply -f - <<EOF` so the snippet is syntactically correct as shown.
- The original `namespaceSelector` matched on `name: payment-gateway`, which is not a default namespace label. I changed it to the standard `kubernetes.io/metadata.name` label documented by Kubernetes.
- The DNS egress rule only allowed UDP/53. I added TCP/53 as well because DNS can fall back to TCP.
- The Rancher scan example used the older `cis.cattle.io/v1` API and an older CIS scan resource pattern. I updated it to the current Rancher compliance-scan API, `compliance.cattle.io/v1`, and the current `ClusterScan` resource example from Rancher documentation.
- The secure-configuration policy example relied on legacy Kyverno policy syntax. I replaced it with Kubernetes built-in Pod Security Admission namespace labels, which are current, native, and directly enforce restricted pod controls in the target namespace.
- The Istio mTLS example used the older `security.istio.io/v1beta1` API and described a namespace-scoped policy as mesh-wide. I updated it to `security.istio.io/v1` and corrected the wording to reflect namespace-scoped in-mesh enforcement.
- The original Istio `DestinationRule` example claimed to enforce TLS 1.2+ for external connections, but that resource does not configure downstream ingress TLS the way the post described. I replaced it with an Istio `Gateway` example using the current `networking.istio.io/v1` API and explicit `minProtocolVersion`/`maxProtocolVersion` settings.
- The RBAC example granted `get`, `list`, and `watch` on `pods/log` together with `pods`. I split `pods` and `pods/log` so log access is limited to `get`, which is the relevant permission for the log subresource.
- The audit-logging section wrote a policy file to `/etc/kubernetes/...` but did not show how Rancher/RKE2 would actually load it. I updated it to the RKE2 audit policy path documented by RKE2, added the service restart step, and used the documented audit log path.
- The original audit policy logged the entire CDE namespace at `RequestResponse` before the more specific secrets rule, which could capture secret payloads. I reordered the rules so secret access is logged only at `Metadata`.
- The segmentation test targeted `http://...` without matching the policy’s allowed port and could fail for reasons unrelated to network isolation. I changed it to test TCP connectivity to port `8443` with `kubectl run ... --restart=Never` and `nc`.
- The prerequisites and conclusion referred to PCI DSS “certification” and implied a QSA is always required. I corrected that language to PCI DSS validation wording and clarified that QSA involvement depends on the assessment path.

## Review Notes
- The corrected post is now specifically accurate for Rancher-managed RKE2 clusters. Operators using imported non-RKE2 clusters may need different audit-log paths and different hardening or compliance-scan workflows.
- The Istio ingress example assumes the default ingress gateway label `istio: ingressgateway` and a TLS secret named `cde-tls-cert` in `istio-system`; those values should be adjusted to match the deployment.
- The compliance-scan example now uses the current Rancher API, but the exact scan profile name should still be chosen to match the cluster’s Kubernetes and benchmark version.
