# Validation Summary: Istio Sidecar Injection Webhook Times Out: Test the API-Server-to-istiod Network Path, CA Bundle, and Endpoints

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes CLI commands, JSON queries, and TLS diagnostics.

## Technologies Covered
- Istio sidecar injection, Istiod, revisions, and revision tags
- Kubernetes admission webhooks, server-side dry run, Services, EndpointSlices, and Pod readiness
- Control-plane networking, Konnectivity, NetworkPolicy, and managed-cluster firewalls
- TLS, X.509 certificates, CA bundles, and OpenSSL
- kubectl, Bash, jq, and base64

## Sources Consulted
- Istio injection troubleshooting: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio injection policy: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio revision migration and retirement: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio injector chart source (webhook names, CREATE rules, selectors, and Service configuration): https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-control/istio-discovery/templates/mutatingwebhook.yaml
- Kubernetes dynamic admission: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes webhook good practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes MutatingWebhookConfiguration API (the post’s original URL redirects here): https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes EndpointSlice API source: https://raw.githubusercontent.com/kubernetes/api/master/discovery/v1/types.go
- Kubernetes control-plane communication: https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication/
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kubectl references and local subcommand help: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/ ; https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/ ; https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/ ; https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- OpenSSL TLS diagnostics: https://docs.openssl.org/3.5/man1/openssl-s_client/
- OpenSSL certificate inspection: https://docs.openssl.org/3.5/man1/openssl-x509/
- jq manual: https://jqlang.org/manual/
- Local base64 help, confirming --decode support
- GKE authorized-network direction: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/network-isolation
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **Dry run could miss the failing injector.** An existing Pod name makes apply an update, while Istio’s injector matches CREATE. Added the requirement for an unused name and matching injection-related workload metadata.
2. **Webhook entry and configuration names were conflated.** Failure messages identify an entry in webhooks, not necessarily its containing configuration. Corrected the instructions to map the entry through the inventory before inspecting the object or extracting its CA.
3. **URL-based entries showed misleading Service defaults.** The inventory could print port 443 and path / for an explicit URL with different values. It now prints “see URL” for those fields when no Service reference exists.
4. **Injection-label precedence was described as ambiguity.** Stated the documented precedence of the Namespace istio-injection label over istio.io/rev.
5. **Endpoint readiness interpretation was incomplete.** Added the null/omitted-ready semantics and publishNotReadyAddresses exception. Clarified that unready Pods can remain in slices with ready: false rather than producing empty slices.
6. **Log output was silently limited.** Added --tail=-1 because using a label selector otherwise defaults to ten lines per Pod, even with --since=20m.
7. **A direct probe might bypass the API server’s tunnel.** Clarified that a host-network connection does not reproduce a configured Konnectivity or egress-selector path.
8. **TLS handshake success was overstated as evidence of trust.** Explained that SNI does not verify a hostname and s_client normally continues after verification errors. Added explicit full-bundle verification, hostname verification, and failure-on-verification-error options. Distinguished certificate inspection from cryptographic chain verification and noted that servers need not send the root certificate.
9. **CA inspection could overlook additional trust anchors.** Explained that the x509 pipeline displays only the first certificate and that all certificates should be inspected while the full bundle is used for verification.
10. **An inbound control-plane control was listed for an outbound failure.** Replaced control-plane authorized networks with control-plane-to-webhook firewall rules; GKE authorized networks govern access to the API endpoint.
11. **Revision retirement checked only Namespace selection.** Extended the prerequisite to Pod-template revision labels, revision tags, and workloads still dependent on the revision.

## Review Notes
- Confirmed the normal Service port 443 to webhook port 15017 mapping, Service DNS certificate identity, webhook timeout range of 1–30 seconds and default of 10, and failure-policy and dry-run semantics.
- Confirmed the use of current admissionregistration.k8s.io/v1 and discovery.k8s.io/v1 concepts. No deprecated API was introduced. The article targets sidecar injection; ambient workloads do not require an injected sidecar.
- The original seven documentation links resolve to the intended official resources, including the redirected API reference; the author link also resolves.
- All ten Bash blocks passed bash -n. Three extracted jq filters were compiled locally, and kubectl flags were checked against local help and official references. The matched-CA jq selector was reviewed against the jq manual.
- This was a documentation and static-command review. No cluster resources were created or changed, and live webhook connectivity, certificate chains, AdmissionReview responses, and canary readiness were not tested. Resource names, IP addresses, revision identities, and the minimal Pod manifest remain environment-specific inputs.
- Edits were limited to technical corrections within the existing structure. The validation date is the requested 2026-09-05.
