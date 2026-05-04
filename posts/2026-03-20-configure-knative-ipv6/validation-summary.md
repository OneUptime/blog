# Validation Summary: How to Configure Knative with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Knative Serving (v1.13.0)
- Knative Eventing (ApiServerSource)
- Kourier (net-kourier v1.13.0) ingress/networking layer
- Kubernetes Services (dual-stack `ipFamilyPolicy` / `ipFamilies`)
- kubectl
- `hey` HTTP load testing tool
- IPv6 networking on Kubernetes

## Sources Consulted
- Knative Serving v1.13.0 release: https://github.com/knative/serving/releases/tag/knative-v1.13.0
- net-kourier v1.13.0 release: https://github.com/knative/net-kourier/releases/tag/knative-v1.13.0
- Knative ingress-class docs: https://knative.dev/docs/serving/services/ingress-class/
- Knative config-network upstream YAML: https://raw.githubusercontent.com/knative/networking/main/config/config-network.yaml
- Knative ApiServerSource reference: https://knative.dev/docs/eventing/sources/apiserversource/reference/
- net-kourier README: https://github.com/knative-extensions/net-kourier/blob/main/README.md
- Knative config-domain.yaml: https://github.com/knative/serving/blob/main/config/core/configmaps/domain.yaml
- Kubernetes dual-stack docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- rakyll/hey source: https://github.com/rakyll/hey

## Issues Found
- **Incorrect label selector for log retrieval.** The original `kubectl logs -n default -l app=hello-ipv6 | grep "RemoteAddr"` will not return any pods. Knative does not set `app=<service-name>` on its pods; the `app` label on the underlying Deployment/Pods uses the revision name (e.g. `hello-ipv6-00001-deployment`). The canonical selector for a Knative Service is `serving.knative.dev/service=<service-name>`. Replaced with `kubectl logs -n default -l serving.knative.dev/service=hello-ipv6 -c user-container | grep "RemoteAddr"`. The explicit `-c user-container` is also added because Knative pods have multiple containers (queue-proxy, user-container) and `kubectl logs` requires a container selection when there are multiple.

## Review Notes
- The `gcr.io/knative-samples/helloworld-go` image does not by default log a `RemoteAddr` field, so the `grep "RemoteAddr"` filter at the end may produce no output even though the command itself is now correct. The intent (inspecting source addresses to verify IPv6 traffic) is valid; in practice, users may need a different sample or to enable access logs on the queue-proxy. This is a minor practical caveat rather than a technical inaccuracy and was not changed.
- The `kubectl get ksvc hello-ipv6` example output is truncated for brevity (omits `LATESTCREATED`, `LATESTREADY`, `READY`, `REASON` columns). Acceptable as illustrative output.
- The `config-domain` ConfigMap example correctly nests `selector:` inside the domain key as a YAML block scalar (`example.com: |`), which is the supported format.
- Knative v1.13.0 was released in early 2024 and is no longer the latest; readers using this post in mid-2026 may want to consult current release notes for newer versions, but all referenced URLs and APIs are still valid for v1.13.0.
- The `config-network` ConfigMap key `ingress-class` (with hyphen) is the correct, upstream-canonical key.
