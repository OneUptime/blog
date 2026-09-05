# Validation Summary: How to Prove Pod Traffic Cannot Bypass Envoy: Lock Down `NET_ADMIN`, Egress, and NetworkPolicy

## Status
validated

## Post Type
Technical security guide with diagnostic commands and Kubernetes configuration examples.

## Technologies Covered
- Istio sidecar mode, Istio CNI, and Envoy
- Kubernetes security contexts, Pod Security Admission, RBAC, and ephemeral containers
- Kubernetes NetworkPolicy and CNI enforcement
- Mutual TLS, AuthorizationPolicy, and egress gateways
- kubectl, jq, curl, YAML, and Linux capabilities

## Sources Consulted
- [Istio Security Best Practices](https://istio.io/latest/docs/ops/best-practices/security/)
- [Istio Security Model](https://istio.io/latest/docs/ops/deployment/security-model/)
- [Istio CNI installation and repair](https://istio.io/latest/docs/setup/additional-setup/cni/)
- [Istio PeerAuthentication](https://istio.io/latest/docs/reference/config/security/peer_authentication/)
- [Istio AuthorizationPolicy](https://istio.io/latest/docs/reference/config/security/authorization-policy/)
- [Istio resource annotations](https://istio.io/latest/docs/reference/config/annotations/)
- [istioctl command reference](https://istio.io/latest/docs/reference/commands/istioctl/)
- [Istio external services](https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/)
- [Istio egress gateways](https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/)
- [Istio egress TLS origination](https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/)
- [Istio DestinationRule](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio access logging](https://istio.io/latest/docs/tasks/observability/logs/access-log/)
- [Istio standard metrics](https://istio.io/latest/docs/reference/config/metrics/)
- [Istio application requirements](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Istio health checks](https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/)
- [Istio NetworkPolicy](https://istio.io/latest/docs/setup/additional-setup/network-policy/)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes security contexts](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [kubectl exec](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [curl manual](https://curl.se/docs/manpage.html)
- [jq manual](https://jqlang.org/manual/)

## Issues Found
1. **Incomplete and fragile Pod inventory:** The jq example omitted ephemeral containers and assumed annotations were present. Added ephemeral-container security contexts and an empty-object fallback for absent annotations.
2. **Request correlation prerequisites:** The custom header is not in the default Envoy access-log format, and access logging needs to be enabled. Added the logging prerequisites and the header formatter. Standard request metrics aggregate traffic rather than identify the test request; corrected their role to corroborating workload traffic over the test interval.
3. **HTTP example applied to all TCP ports:** Clarified that repeat tests need a client appropriate to each service protocol.
4. **Namespace mTLS policy scope:** A namespace STRICT default can be overridden by more specific policies, and sidecar policy only protects captured ports. Added checks for effective workload/port policy and inbound capture, and qualified the plaintext-rejection claim accordingly.
5. **Egress prerequisites and selector scope:** The allow list omitted Istio configuration and certificate connectivity. Added the control-plane path and typical TCP port 15012, and narrowed gateway selection to gateway Pods within the intended namespace.
6. **NetworkPolicy composition and node exceptions:** Added the additive nature of allow policies and the own-node exception. Qualified the DNS statement for node-local caches and called for host/firewall enforcement where required.
7. **Gateway TLS and identity assumptions:** A TLS-passthrough gateway cannot inspect encrypted HTTP or validate the upstream certificate on behalf of the client. Distinguished passthrough from TLS termination/origination, named DestinationRules for upstream TLS configuration, and required downstream mutual TLS for authenticated service-account authorization.
8. **Gateway verification evidence:** Default access logs alone do not establish source identity and upstream certificate verification. Required configured identity/endpoint logging, effective TLS configuration review, and certificate-validation failure tests.

## Review Notes
- The central claim is appropriately scoped: source-side capture is not an isolation boundary; destination authentication/authorization and independently enforced network restrictions provide the stronger controls.
- The securityContext fields are valid at container scope. Restricted admission drops ALL capabilities and permits only NET_BIND_SERVICE to be added on Linux. CNI removes the workload init container's need for NET_ADMIN/NET_RAW; node-level privilege remains.
- Both security.istio.io/v1 PeerAuthentication and networking.k8s.io/v1 NetworkPolicy match the official API examples. The default-deny egress manifest is valid but depends on an enforcing CNI and the complete set of policies selecting each Pod.
- kubectl get/exec syntax, curl flags, jq expressions, and the istioctl proxy-config bootstrap subcommand were checked against official references. The bootstrap subcommand needs a concrete Pod argument when executed.
- Example Pod names, namespaces, Service DNS name, endpoint, curl availability, and cluster domain must match the test environment. Request success must be assessed from HTTP/application results; curl without --fail can return exit status zero for an HTTP error.
- Reviewed all eight linked technical documentation resources; they resolve to the intended official resources. The author profile link is attribution, not technical evidence.
- The post specifies no release pin. The /latest/ documentation is mutable; installed Istio, Kubernetes, CNI, admission settings, and IPv6 support must be checked for each deployment.
- This was a documentation and static-snippet review. No live Kubernetes cluster, packet-capture experiment, privilege mutation, or network enforcement test was performed. The validation status does not certify a deployed non-bypass guarantee.
