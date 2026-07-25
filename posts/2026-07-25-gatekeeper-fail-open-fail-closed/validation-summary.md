# Validation Summary: Gatekeeper Fail-Open vs Fail-Closed Without Bypass or Lockout

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- OPA Gatekeeper
- Kubernetes admission webhooks
- `ValidatingWebhookConfiguration`
- Kubernetes Validating Admission Policy
- `kubectl`
- Kubernetes Services and EndpointSlices
- PodDisruptionBudgets and topology-aware scheduling
- TLS certificate rotation
- Gatekeeper audit and external data

## Sources Consulted
- [Gatekeeper: Failing Closed](https://open-policy-agent.github.io/gatekeeper/website/docs/failing-closed/)
- [Gatekeeper: Emergency Recovery](https://open-policy-agent.github.io/gatekeeper/website/docs/emergency/)
- [Gatekeeper: Customizing Admission Behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/)
- [Gatekeeper: Integration with Kubernetes Validating Admission Policy](https://open-policy-agent.github.io/gatekeeper/website/docs/validating-admission-policy/)
- [Gatekeeper: Operations](https://open-policy-agent.github.io/gatekeeper/website/docs/operations/)
- [Gatekeeper: Metrics and Observability](https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/)
- [Gatekeeper: External Data](https://open-policy-agent.github.io/gatekeeper/website/docs/externaldata/)
- [Gatekeeper current deployment manifest](https://github.com/open-policy-agent/gatekeeper/blob/master/deploy/gatekeeper.yaml)
- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: Disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl delete`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/)

## Issues Found
- The live-configuration command used `{"s\\n"}` inside a single-quoted JSONPath expression. `kubectl` interprets that as the characters `\n`, so results would run together instead of appearing on separate lines. Changed it to `{"s\n"}`, matching Kubernetes JSONPath syntax, and confirmed the escaping behavior with `kubectl` v1.34.1.
- The opening described a failed Constraint webhook as removing all Gatekeeper enforcement. Current Gatekeeper can also enforce CEL-based constraints through generated Kubernetes `ValidatingAdmissionPolicy` resources. Narrowed the statement to enforcement from that webhook and noted that other configured enforcement points can still evaluate the request.
- The emergency-recovery explanation said deleting the validating webhook configuration removes Gatekeeper admission checks for the whole cluster. The command disables the Gatekeeper validating webhook, but it does not delete Gatekeeper's separate mutating webhook configuration or generated `ValidatingAdmissionPolicy` resources. Corrected the scope of the claim.

## Review Notes
The `ValidatingWebhookConfiguration` YAML is a focused field excerpt rather than a complete standalone resource; the surrounding text correctly directs readers to change the installation's managed source manifest. Exact generated manifests and defaults can vary by Gatekeeper version and installation method, so the post's instruction to inspect the live configuration remains important.
