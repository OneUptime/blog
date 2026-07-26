# Validation Summary: Why Doesn’t My Knative Trigger Filter Match the CloudEvent?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Knative Eventing
- Knative Trigger `filter` and `filters` APIs
- Apache Kafka Broker and MTChannelBasedBroker
- CloudEvents 1.0
- CloudEvents HTTP protocol binding
- CloudEvents SQL (CESQL) 1.0
- Kubernetes and `kubectl`
- YAML
- curl

## Sources Consulted

- [Knative: Using Triggers](https://knative.dev/docs/eventing/triggers/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative: About Brokers](https://knative.dev/docs/eventing/brokers/)
- [Knative Eventing debugging](https://knative.dev/docs/eventing/troubleshooting/)
- [CloudEvents specification v1.0.2](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
- [CloudEvents HTTP protocol binding v1.0.2](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [CloudEvents JSON event format v1.0.2](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/formats/json-format.md)
- [CloudEvents SQL expression language v1.0.0](https://github.com/cloudevents/spec/blob/cesql%40v1.0.0/cesql/spec.md)
- [Kubernetes: `kubectl run`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Official curl container image documentation](https://hub.docker.com/r/curlimages/curl)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)

## Issues Found

- The nested `prefix` example used the unquoted value `urn:example:`. A trailing colon cannot appear in a YAML plain scalar because the following line break is whitespace, so the configuration would not parse. Changed it to `"urn:example:"`.
- The probe passed `curl` after the `kubectl run` argument separator without `--command`. By default, those values are container arguments, while the official `curlimages/curl` image already defines curl as its entrypoint; the extra `curl` would be interpreted as a curl argument rather than the executable. Added `--command` so the command is explicitly executed as written.
- The producer checklist stated that structured-mode events use `application/cloudevents+json`, but the HTTP binding permits structured event formats other than JSON. Narrowed the statement to structured JSON mode.
- The probe pinned the older `curlimages/curl:8.12.1` image. Updated it to the current official `8.21.0` release used by the image documentation at validation time.

## Review Notes

- The Knative API reference still marks `spec.filters` as experimental. Current Knative Trigger documentation limits the documented advanced filter dialect support to the Apache Kafka Broker and MTChannelBasedBroker, so users should continue checking the documentation for their installed Knative release and Broker implementation.
- The remaining CloudEvents envelope examples, exact/prefix/suffix semantics, top-level AND composition, `any`/`all`/`not` nesting, legacy empty-string behavior, CESQL syntax and Knative 1.15 version warning, JSONPath query, and `kubectl run` flags are technically consistent with the consulted specifications and references.
