# Why Sidecar Injection Webhooks Time Out: DNS, TLS, CNI, and Firewall Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecars, Admission Webhooks, TLS, Networking, Troubleshooting

Description: Trace sidecar injection timeouts from the API server through webhook selection, Service endpoints, network paths, TLS identity, and injector health without hiding the failure.

---

Automatic sidecar injection usually happens in a mutating admission webhook. When a matching Pod is created, the Kubernetes API server sends an HTTPS `AdmissionReview` to the injector and waits for a response. If that call times out, Pod creation is either rejected or allowed without mutation according to the webhook's `failurePolicy`.

The failing path is therefore not “Pod to injector”:

```text
kubectl or controller
        |
        v
kube-apiserver --HTTPS--> webhook Service or URL --> ready injector endpoint
```

Debug each hop in that order.

## Read the Exact Admission Error

The workload controller usually records the useful message in Events:

```bash
kubectl describe deployment checkout -n shop
kubectl get events -n shop --sort-by=.metadata.creationTimestamp
```

Classify the text before changing anything:

| Error fragment | Most likely layer |
| --- | --- |
| `context deadline exceeded` or `i/o timeout` | Route, firewall, NetworkPolicy, overloaded or hung injector. |
| `connect: connection refused` | Service routed to no listener, wrong target port, or endpoint not ready. |
| `no such host` | DNS for a URL-based webhook or an incorrect hostname. |
| `x509: certificate signed by unknown authority` | Missing, stale, or wrong `caBundle`. |
| `certificate is valid for ... not ...` | Certificate SAN does not match the Service DNS name or URL host. |
| HTTP 404 | Wrong webhook path or service routing. |
| HTTP 500 | Injector handled the request but failed internally. |

Preserve the full error; its host, port, and path tell you which configuration Kubernetes used.

## Inspect the Webhook Configuration

List and retrieve the actual mutating configuration:

```bash
kubectl get mutatingwebhookconfigurations
kubectl get mutatingwebhookconfiguration <injector-name> -o yaml
```

For the matching webhook entry, verify:

- `rules`, `namespaceSelector`, `objectSelector`, and `matchConditions` select the intended Pods;
- `clientConfig.service.name`, `.namespace`, `.port`, and `.path` are correct;
- or, for an external endpoint, `clientConfig.url` is the intended HTTPS URL;
- `caBundle` is a PEM-encoded CA bundle that validates the serving certificate, unless an external endpoint's certificate chains to system trust roots available to the API server;
- `admissionReviewVersions` includes a version the API server supports;
- `timeoutSeconds` is appropriate;
- `failurePolicy` reflects the security and availability decision.

Admission webhook timeout values are 1–30 seconds and default to 10 seconds. Increasing the timeout can mask a slow or unreachable injector and increase how long a stalled matching API request can block. Kubernetes recommends fast webhooks and small timeouts.

## Verify the Service and Ready Endpoints

For an in-cluster webhook:

```bash
kubectl get service -n mesh-system injector -o yaml
kubectl get endpointslice -n mesh-system \
  -l kubernetes.io/service-name=injector -o yaml
kubectl get pods -n mesh-system -l app=injector -o wide
kubectl logs -n mesh-system -l app=injector --all-containers --tail=200
```

Check that:

- the Service selector, if present, matches the injector Pods;
- at least one EndpointSlice endpoint is ready;
- Service `port` maps to the port on which the injector actually listens;
- readiness is not failing because certificates or configuration are unavailable;
- the process is not CPU-throttled, memory-starved, or saturated.

A successful request from an ordinary Pod proves only that the Pod network can reach the injector. The API server may run on a host network or in a provider-managed control plane with a different route.

## Test the Control-Plane Network Path

The API server must reach the endpoint selected by `clientConfig`. Depending on the cluster architecture, that path can cross:

- Service routing implemented by kube-proxy or a replacement service proxy;
- Pod routing implemented by the CNI or another network plugin;
- control-plane and worker security groups;
- cloud firewall rules;
- on-premises ACLs;
- NetworkPolicies applied to the injector Pod;
- a proxy configured for the API server.

Review flow logs or firewall counters where available. Confirm the source used by the control plane and the injector's real serving port rather than opening every port. On managed Kubernetes, follow the provider's documented requirement for control-plane-to-node or control-plane-to-Pod webhook traffic.

If a restrictive NetworkPolicy selects the injector, allow ingress from the actual control-plane source as represented by your network implementation. A namespace label in a policy does not necessarily match traffic originating outside the Pod network.

DNS needs different treatment for the two client forms:

- With `clientConfig.service`, Kubernetes uses the Service reference and verifies TLS for a name based on `<service>.<namespace>.svc`.
- With `clientConfig.url`, the API server must resolve the URL hostname using its own DNS environment. In-cluster Service names should use a Service reference rather than a URL.

Running `nslookup` in an application Pod does not prove that an externally hosted API server resolves the same name.

## Verify TLS Identity and Trust

The injector needs a serving certificate valid for the hostname the API server uses. For a Service reference, include the appropriate Service DNS names in the certificate SANs. For a privately signed certificate, the webhook's `caBundle` must contain the CA certificate that validates that serving certificate; if `caBundle` is omitted, the API server uses its system trust roots.

Compare certificate sources using your injector's documented procedure. Istio, for example, documents comparing the `caBundle` in its `MutatingWebhookConfiguration` with the root certificate managed for `istiod` when an unknown-authority error appears.

Also check:

- certificate `notBefore` and `notAfter` dates;
- clock synchronization on control-plane and injector hosts;
- whether a rotation updated both the serving Secret and `caBundle`;
- whether multiple injector revisions are using the correct CA and Service;
- whether a proxy or load balancer is presenting a different certificate.

Do not “fix” trust by disabling verification or leaving an empty `caBundle` for a privately signed endpoint.

## Do Not Hide an Outage with `failurePolicy`

`failurePolicy: Ignore` lets a request continue when the webhook call fails. That can improve API availability, but a Pod may start without the proxy, policy agent, or other injected control. `failurePolicy: Fail` blocks matching creates, making the dependency explicit but increasing blast radius if the webhook is down.

Choose deliberately based on what an uninjected Pod can do, and alert on webhook latency and failures either way. Scope selectors narrowly, run multiple ready injector replicas, use disruption protection, and test certificate rotation.

## A Safe Recovery Sequence

1. Capture the exact Event and webhook configuration.
2. Confirm injector Pods, readiness, logs, Service ports, and EndpointSlices.
3. Validate the API-server network route and narrowly scoped firewall or policy rules.
4. Validate certificate SANs, dates, and `caBundle` trust.
5. Fix the declarative configuration or injector deployment.
6. Create a test Pod in an intended namespace and inspect the admitted Pod for the sidecar.
7. Resume workload rollout only after both admission and injected data-plane behavior work.

Deleting application Pods repeatedly just creates more admission requests. Repair the control-plane path first.

## Official Documentation

- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Debugging DNS Resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Istio: Sidecar Injection Problems](https://istio.io/latest/docs/ops/common-problems/injection/)
