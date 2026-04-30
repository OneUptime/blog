# Validation Summary: How to Deploy Fluentd/Fluent Bit with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform `helm_release`
- Helm
- Kubernetes
- Fluent Bit
- Fluentd
- Elasticsearch
- Amazon S3

## Sources Consulted
- Fluent Helm Charts repository: https://github.com/fluent/helm-charts
- Fluent Helm Charts release index: https://fluent.github.io/helm-charts/index.yaml
- Fluent Bit chart values (`0.57.3`): https://github.com/fluent/helm-charts/releases/download/fluent-bit-0.57.3/fluent-bit-0.57.3.tgz
- Fluentd chart values (`0.5.3`): https://github.com/fluent/helm-charts/releases/download/fluentd-0.5.3/fluentd-0.5.3.tgz
- Fluent Bit forward output docs: https://docs.fluentbit.io/manual/pipeline/outputs/forward
- Fluent Bit buffering and storage docs: https://docs.fluentbit.io/manual/administration/buffering-and-storage
- Fluent Bit backpressure docs: https://docs.fluentbit.io/manual/administration/backpressure
- Fluent Bit vs Fluentd overview: https://docs.fluentbit.io/manual/about/fluentd-and-fluent-bit
- Fluentd `in_forward` docs: https://docs.fluentd.org/input/forward
- Fluentd Elasticsearch output docs: https://docs.fluentd.org/output/elasticsearch
- Fluentd S3 output docs: https://docs.fluentd.org/output/s3
- Helm provider `helm_release` docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release

## Issues Found
- The post pinned `fluent-bit` chart `0.43.0` and `fluentd` chart `0.5.2`, which were already outdated for a March 20, 2026 post. Updated them to `0.57.3` and `0.5.3`, the current chart releases available on April 30, 2026.
- The architecture diagram described Fluentd as a StatefulSet, but the Fluentd chart defaults to a DaemonSet and only honors `replicaCount` for `Deployment` or `StatefulSet`. Updated the example to set `kind = "Deployment"` and changed the diagram to match.
- The Fluentd service was not exposing port `24224`. In chart `0.5.2`/`0.5.3`, the Service exposes only metrics by default unless `service.ports` is set. Added the forwarder port so Fluent Bit can actually reach Fluentd.
- The Fluentd example used the default `elasticsearch7` image variant but also configured an S3 output. That image variant does not include the S3 plugin by default. Added `plugins = ["fluent-plugin-s3"]` so the S3 store works.
- The Fluent Bit output configured `Shared_Key` while also setting `tls off`, and the Fluentd input used a `<security>` block without a matching secure-forward setup. Fluent Bit documents `Shared_Key` as part of secure forward mode when TLS is enabled. Removed the invalid shared-key configuration from the plain forward example and corrected the best-practice note to describe TLS plus shared keys as the authenticated option.
- The S3 output configuration used old-style top-level time-slice settings and referenced AWS credential environment variables that were not defined anywhere in the example. Replaced this with a current `<buffer tag,time>` file buffer configuration and removed the undefined credential references.
- The best-practice note about `Mem_Buf_Limit` was inaccurate. With Fluent Bit memory buffering, hitting `Mem_Buf_Limit` pauses the input; it does not simply drop data by default. Updated the guidance to reflect the documented backpressure behavior.
- The diagram showed CloudWatch as an output, but the post never configured a CloudWatch destination. Removed CloudWatch from the architecture diagram so the visual matches the code.

## Review Notes
- The Fluent charts repository currently lists `fluent-bit-collector` and `fluent-bit-aggregator` alongside the older `fluent-bit` chart and recommends using the split charts when possible. The post remains technically correct with `fluent-bit`, but that could be a future modernization.
- The S3 buffer path in the example is local to the pod/node filesystem. For stronger durability across pod reschedules or node loss, a future revision could document persistent buffering for Fluentd.
