# Validation Summary: How to Troubleshoot Gatekeeper Webhook Timeouts and Kubernetes API Latency

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- OPA Gatekeeper
- Kubernetes admission webhooks
- Kubernetes Services, Endpoints, EndpointSlices, and NetworkPolicy
- kubectl
- Prometheus metrics
- Rego and Gator
- Gatekeeper external data providers

## Sources Consulted

- [Gatekeeper v3.23.x metrics and observability](https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/)
- [Gatekeeper v3.23.x performance tuning](https://open-policy-agent.github.io/gatekeeper/website/docs/performance-tuning/)
- [Gatekeeper v3.23.x runtime flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper v3.23.x admission behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/)
- [Gatekeeper v3.23.x external data](https://open-policy-agent.github.io/gatekeeper/website/docs/externaldata/)
- [Gatekeeper v3.23.x Gator CLI](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- [Gatekeeper v3.23.0 release manifest](https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/deploy/gatekeeper.yaml)
- [Kubernetes admission webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes ValidatingWebhookConfiguration API](https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes kubectl top reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/)
- [Gatekeeper cloud and vendor-specific networking guidance](https://open-policy-agent.github.io/gatekeeper/website/docs/vendor-specific/)

## Issues Found

- The opening sentence described every matching Gatekeeper admission call as being on the API write path. Gatekeeper can also be configured to validate `CONNECT` operations, so the sentence was changed to say that each matching call blocks the API request it evaluates.
- The JSONPath example used `{"\\n"}` inside a single-quoted shell argument. This prints the two literal characters `\n` instead of a newline. It was corrected to the Kubernetes-documented `{"\n"}` form.
- The resource-pressure section did not state that `kubectl top` requires Metrics Server and could imply that the listed commands directly expose CPU throttling and Go garbage-collection pauses. The text now identifies the prerequisite and directs readers to container metrics and runtime telemetry for those signals.
- The Gator example did not select an engine. In Gatekeeper v3.23, `gator bench` defaults to the CEL engine and skips templates without CEL code. Because the example is introduced as a Rego policy comparison, `--engine=rego` was added.

## Review Notes

- The review used the current Gatekeeper v3.23.x and Kubernetes v1.36 documentation. Kubernetes `matchConditions` became stable in v1.30, so the post correctly tells readers to account for cluster-version support.
- Gatekeeper documents the validation counter as `gatekeeper_validation_request_count`; Prometheus exporters conventionally append `_total` to counters, which makes the post's scraped series name `gatekeeper_validation_request_count_total` appropriate for the default Prometheus backend.
- The remaining commands, metrics, timeout limits, concurrency guidance, external-data deadline behavior, and mutating-versus-validating webhook ordering claims matched the official sources.
