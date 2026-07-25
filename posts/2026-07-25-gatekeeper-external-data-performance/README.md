# How to Use External Data Providers Without Slowing Gatekeeper Admission Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, External Data, Admission Control, Performance

Description: Keep Gatekeeper external-data policy within its latency budget using short timeouts, batching, caching, TLS, high availability, and explicit failure behavior.

---

Gatekeeper external data lets policy query services such as image registries, signature verifiers, vulnerability systems, and identity directories. It also puts another network hop on the Kubernetes admission path.

External Data is beta in Gatekeeper v3.11 and later. Treat the provider as a control-plane dependency with a strict latency and availability budget.

## Understand the provider path

```text
API server
  -> Gatekeeper webhook
    -> in-cluster Provider Service over HTTPS
      -> external system or local cache
    <- ProviderResponse
  <- admission decision
```

Gatekeeper's provider model is safer and more observable than allowing arbitrary `http.send` calls from policy. A `Provider` resource restricts the endpoint and configures trust:

```yaml
apiVersion: externaldata.gatekeeper.sh/v1beta1
kind: Provider
metadata:
  name: image-verifier
spec:
  url: https://image-verifier.policy-system:8090/validate
  timeout: 1
  caBundle: <base64-encoded-provider-ca>
```

The timeout is seconds. Gatekeeper recommends provider implementations return within one to two seconds at most. Admission SLOs often require much less, so measure your actual budget.

## Budget from the outside inward

The provider deadline must fit inside the Gatekeeper webhook deadline, which must fit inside the API request deadline:

```text
API request deadline
  > webhook timeoutSeconds
    > Gatekeeper evaluation plus provider timeout
```

For mutation, Gatekeeper uses the smaller of the Provider timeout and the admission time remaining. A ten-second Provider timeout cannot extend a webhook with only one second left.

Leave time for TLS, policy evaluation, response serialization, and network variance. Do not allocate the entire webhook timeout to the provider.

## Batch keys into one request

The validation built-in accepts a provider name and a list of keys:

```rego
images := [container.image |
  container := input.review.object.spec.containers[_]
]

response := external_data({
  "provider": "image-verifier",
  "keys": images,
})
```

The ProviderRequest contains one `keys` array. Gatekeeper's official guidance recommends batching keys rather than making one call per container.

Also include init and ephemeral containers when the policy covers Pods. Deduplicate keys in policy or the provider when repeated images would cause duplicate upstream work.

The provider should batch its own upstream API calls or serve from a local index. A loop that performs one registry request per image merely moves the fan-out downstream.

## Use the response cache deliberately

Gatekeeper v3.13 and later caches external-data responses for validating admission and audit. The default TTL is three minutes:

```text
--external-data-provider-response-cache-ttl=3m
```

Set the TTL through the Gatekeeper deployment source. `0` disables caching.

Choose a TTL based on:

- How quickly signatures or vulnerability decisions can change.
- How quickly a revoked image must be blocked.
- Provider capacity and upstream rate limits.
- The percentage of repeated keys.

A longer TTL lowers latency and provider load but extends staleness. Cache immutable image digests rather than mutable tags where possible. Ensure the provider's key uniquely captures every input that changes the decision, including policy or tenant context if applicable.

## Require TLS and manage trust

Since Gatekeeper v3.11, external providers require HTTPS with TLS or mutual TLS and a minimum TLS version of 1.3.

The Provider's `caBundle` lets Gatekeeper verify the server. For mTLS, the provider must also trust the CA that issued Gatekeeper's client certificate. Coordinate certificate rotation so trust bundles do not drift.

Monitor:

- Certificate expiry.
- Service DNS names in certificate SANs.
- Provider and Gatekeeper clocks.
- CA bundle rotation.
- TLS handshake errors.

Do not put a plaintext Provider endpoint behind a trusted in-cluster proxy and assume the remaining hop is harmless unless that design is explicitly in the threat model.

## Design explicit error behavior

A ProviderResponse can return an error for one key or a system-wide error. Validation policy must decide how those errors affect violations. Distinguish:

- Image explicitly failed verification.
- Image was not found.
- Provider timed out.
- Upstream system was unavailable.
- Provider returned malformed data.

For external-data mutation, Gatekeeper supports `Fail`, `Ignore`, or `UseDefault`; `Fail` is the default. A permissive default for a security-sensitive image transformation can create a bypass. Use `UseDefault` only when the default is independently safe and validated afterward.

Gatekeeper's own webhook `failurePolicy` is another layer. Document the combined matrix so operators know whether a Provider outage rejects, admits, warns, or skips a request.

## Make the provider highly available

Run multiple provider replicas behind a ClusterIP Service, spread across failure domains, and use readiness probes that reflect whether the provider can answer safely.

Avoid making readiness depend on a slow optional upstream if cached answers can still be served. Conversely, do not report ready when every request will fail.

Set:

- CPU and memory requests sized for the workload, with CPU limits that do not cause throttling.
- Bounded concurrency and connection pools.
- Upstream timeouts shorter than the Provider deadline.
- Circuit breaking and rate limits.
- A local cache sized for the admission workload.
- PodDisruptionBudget and topology spread appropriate to the cluster.

Load-test bursts from controllers, not only single interactive requests.

## Monitor the full chain

Gatekeeper exposes:

- `gatekeeper_providers` by status.
- `gatekeeper_provider_error_count` (`gatekeeper_provider_error_count_total` in Prometheus) for Provider reconciliation errors.
- `gatekeeper_validation_request_duration_seconds`.
- `gatekeeper_mutation_request_duration_seconds`.

Add provider-side request duration, upstream duration, cache hit ratio, error type, and saturation. Correlate by time rather than putting raw image names into high-cardinality metric labels.

If admission latency is unacceptable, use scoped enforcement points to run a suitable policy in audit only, or move immutable verification earlier into CI and retain a fast admission assertion. This changes prevention guarantees, so make it an explicit risk decision.

## Official documentation

- [Gatekeeper External Data](https://open-policy-agent.github.io/gatekeeper/website/docs/externaldata/)
- [Gatekeeper external-data runtime flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper metrics](https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/)
- [Kubernetes admission webhook performance guidance](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/#performance-and-latency)
