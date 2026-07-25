# Validation Summary: How Gatekeeper Webhook Certificate Rotation Fails—and How to Recover Admission

## Status
validated

## Post Type
Incident response and operational troubleshooting guide

## Technologies Covered
- Open Policy Agent Gatekeeper
- Kubernetes admission webhooks
- Kubernetes Secrets, Services, Deployments, and RBAC
- TLS certificates and certificate authorities
- `kubectl`, JSONPath, `jq`, and OpenSSL

## Sources Consulted
- [Gatekeeper v3.23.x: Customizing Startup Behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-startup/)
- [Gatekeeper v3.23.x: Runtime Flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper v3.23.x: Operations and Required Permissions](https://open-policy-agent.github.io/gatekeeper/website/docs/operations/)
- [Gatekeeper: Emergency Recovery](https://open-policy-agent.github.io/gatekeeper/website/docs/emergency/)
- [Gatekeeper: Failing Closed](https://open-policy-agent.github.io/gatekeeper/website/docs/failing-closed/)
- [Gatekeeper v3.23.x: Integration with Kubernetes Validating Admission Policy](https://open-policy-agent.github.io/gatekeeper/website/docs/validating-admission-policy/)
- [Gatekeeper v3.23.0 Deployment Manifest](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/deploy/gatekeeper.yaml)
- [Gatekeeper v3.23.0 Certificate Rotator Setup](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/main.go)
- [OPA Certificate Controller](https://github.com/open-policy-agent/cert-controller)
- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes: `kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Go `crypto/tls`: TLS Alert Definitions](https://go.dev/src/crypto/tls/alert.go)
- [Go `crypto/tls`: Certificate and Private-Key Parsing](https://go.dev/src/crypto/tls/tls.go)

## Issues Found
- The Secret JSONPath expressions used two backslashes before the dots in `tls.crt` and `ca.crt`. In a single-quoted shell argument, that over-escapes the map keys and returns no data. Changed both expressions to use the documented single-backslash form.
- The webhook-list JSONPath expression used `{"\\n"}`, which prints a literal `\n`. Changed it to `{"\n"}` so each webhook is printed on a separate line.
- The rotation-ownership explanation covered an omitted `--disable-cert-rotation` flag but not the explicit boolean form emitted by the Helm chart. Clarified that an omitted flag or `=false` enables embedded rotation, while the bare flag or `=true` disables it.
- The `tls: bad certificate` row incorrectly treated that generic peer alert as evidence of a local serving key/certificate mismatch. Clarified that the logging side must be identified, and added the precise Go TLS error for a mismatched certificate and private key.
- The `no endpoints available` row ruled out certificate rotation too strongly. Gatekeeper certificate bootstrap can hold readiness and indirectly leave the Service without ready endpoints, so the cause description now preserves that possibility.
- The clock guidance included the administrator workstation even though the API server validates the webhook certificate and Gatekeeper generates it. Limited the comparison to the control plane and the node hosting the generating Gatekeeper Pod.
- Replaced “patches both webhook configurations” with “updates both webhook configurations” to match the certificate controller's update behavior.
- The break-glass explanation said deleting the `ValidatingWebhookConfiguration` disables all Gatekeeper validation. On current Gatekeeper, eligible CEL policies can also be enforced through generated Kubernetes `ValidatingAdmissionPolicy` and `ValidatingAdmissionPolicyBinding` resources, and mutation uses a separate webhook configuration. Narrowed the claim to Gatekeeper's validating webhooks and documented the remaining enforcement paths.

## Review Notes
- The review used Gatekeeper v3.23.x documentation and the v3.23.0 default manifest. Resource names and certificate ownership can differ in Helm, operator-managed, or externally injected certificate installations, and the post appropriately tells readers to inspect the live installation.
- Gatekeeper v3.23.0's pinned certificate controller updates a pre-created Secret and does not recreate that object after deletion. This supports the post's warning not to delete the certificate Secret without confirming which installation reconciler can restore it.
- The emergency deletion command matches Gatekeeper's documented webhook recovery procedure. Gatekeeper-generated Validating Admission Policies and the mutating webhook require separate consideration.
- The unversioned Gatekeeper emergency-recovery URL currently resolves to the v3.20.x documentation, whose broad “all admission checks” wording predates the default Validating Admission Policy generation documented for v3.23.x. The post now reflects the current enforcement paths.
- The remaining `kubectl`, `jq`, OpenSSL, RBAC, Service DNS, CA-bundle, and recovery guidance is technically consistent with the consulted primary sources.
