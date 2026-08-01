# Validation Summary: Why Sidecar Injection Webhooks Time Out: DNS, TLS, CNI, and Firewall Checks

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Kubernetes mutating admission webhooks and `AdmissionReview`
- `kubectl`
- Kubernetes Services and EndpointSlices
- Kubernetes NetworkPolicy, CNI networking, and control-plane firewall paths
- TLS and X.509 certificate identity and trust
- Istio automatic sidecar injection

## Sources Consulted

- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes API: MutatingWebhookConfiguration](https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/)
- [Kubernetes API: WebhookClientConfig](https://kubernetes.io/docs/reference/kubernetes-api/definitions/webhook-client-config-v1-admissionregistration/)
- [Kubernetes: Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes: Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes API: EndpointSlice](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Virtual IPs and Service Proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes: Cluster Networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Debugging DNS Resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Istio: Sidecar Injection Problems](https://istio.io/latest/docs/ops/common-problems/injection/)

## Issues Found

- The Events command sorted on `.lastTimestamp`, a deprecated Event field that is renamed for compatibility in `events.k8s.io/v1` and may not be populated for newer Events. Changed it to the stable `.metadata.creationTimestamp` field.
- The EndpointSlice command used `-o wide`, which lists addresses and ports but does not expose each endpoint's readiness conditions. Changed it to `-o yaml` so `endpoints[].conditions.ready` can be inspected.
- The Service checklist assumed every Service has a selector. Qualified the check with “if present” because Kubernetes supports selectorless Services backed by manually managed EndpointSlices.
- The `caBundle` guidance implied that every webhook must provide a custom CA bundle and described it only as the directly signing CA. Clarified that the field is a PEM-encoded validation bundle required for a private CA, while omitting it makes the API server use its system trust roots, which is valid for an external endpoint with an appropriately trusted certificate.
- The timeout warning implied that raising `timeoutSeconds` adds latency to every matching request, even when the webhook responds promptly. Clarified that it increases how long a stalled matching request can block.
- The network-path list conflated CNI-based Pod networking with Service proxying. Distinguished kube-proxy (or its replacement) from the CNI or other network plugin that supplies the Pod route.

## Review Notes

- `matchConditions` is stable and enabled by default starting with Kubernetes v1.30; operators of older clusters should check the feature's availability for their Kubernetes version.
- In the EndpointSlice API, an omitted `conditions.ready` value is interpreted as `true`.
- Kubernetes Events are best-effort diagnostic data with limited retention, so API-server and injector logs may still be needed when no relevant Event remains.
