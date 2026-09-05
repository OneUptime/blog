# Validation Summary: Envoy Reports `WRONG_VERSION_NUMBER` During TLS Origination: Align Application, ServiceEntry, and DestinationRule Ports

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes commands and Istio configuration examples.

## Technologies Covered
- Istio ServiceEntry, DestinationRule, VirtualService, sidecars, and egress gateways
- Envoy upstream TLS transport and HTTP/TLS protocol classification
- Kubernetes and kubectl
- TLS, SNI, certificate chains, and subject alternative names
- OpenSSL, curl, and jq

## Sources Consulted
- Istio traffic management problems: https://istio.io/latest/docs/ops/common-problems/network-issues/#tls-configuration-mistakes
- Istio egress TLS origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio TLS configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio proxy debugging: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Envoy access logging in Istio: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl apply: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- curl command reference: https://curl.se/docs/manpage.html
- OpenSSL s_client: https://docs.openssl.org/3.5/man1/openssl-s_client/
- OpenSSL certificate verification options: https://docs.openssl.org/3.5/man1/openssl-verification-options/
- jq manual: https://jqlang.org/manual/

## Issues Found
1. The OpenSSL probe supplied SNI and enabled failure on certificate verification errors, but did not request hostname verification. Added `-verify_hostname api.example.test`; SNI alone does not validate the certificate identity.
2. The logging instructions assumed that proxy access logs were enabled. Added that prerequisite to the existing introductory sentence; reading proxy container logs does not itself enable access logging.
3. The plaintext-target explanation described a TLS version error as expected without accounting for other listener behavior. Clarified that a plaintext reply can cause this error, while a close or reset can produce a different failure.
4. The gateway explanation stated that routing after TLS termination is always HTTP. Qualified this as HTTPS termination and noted that non-HTTP TLS termination requires TCP routing.

## Review Notes
- Confirmed the HTTP logical port 8080 to upstream port 443 mapping and the DestinationRule selector on service port 8080. The v1 API and illustrated YAML fields are supported by current Istio documentation.
- Confirmed the distinction between double TLS on opaque ports and HTTP parser failure when encrypted application traffic reaches an HTTP-classified port.
- Retained explicit SNI, CA trust, and subject alternative name checks. Istio security guidance documents the `system` CA setting; the post appropriately requires checking deployed-version support and proxy trust-store availability. Current DestinationRule documentation also describes OS trust defaults when the CA field is omitted; defaults should be checked against the deployed release.
- Reviewed the kubectl, istioctl, curl, OpenSSL, and jq syntax against official references. The proxy commands support resource-type prefixes, namespace suffixes, and the supplied filters.
- The linked Istio documentation pages resolved to relevant official resources. The example hostname, Pod name, deployment, container names, and manifest filename require substitution or setup in the reader's environment.
- This was a documentation and static review. No Kubernetes configuration was applied, no live mesh requests or certificate failure scenarios were executed, and no claim of runtime validation is made. Actual DNS resolution, resource visibility, installed CRDs, trust stores, and effective proxy configuration remain deployment-specific.
