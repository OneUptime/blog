# Validation Summary: How to Deploy Fluent Bit with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization APIs
- Fluent Bit
- Fluent Bit Helm chart
- Elasticsearch output
- Loki output
- Amazon S3 output
- Amazon CloudWatch Logs output
- Prometheus ServiceMonitor

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomization/
- Flux CLI reference for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI reference for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Fluent Bit Helm chart README and values: https://github.com/fluent/helm-charts/tree/main/charts/fluent-bit
- Fluent Bit monitoring documentation: https://docs.fluentbit.io/manual/administration/monitoring
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit tail input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/tail
- Fluent Bit systemd input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/systemd
- Fluent Bit nest filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/nest
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Fluent Bit S3 output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/s3
- Fluent Bit CloudWatch Logs output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/cloudwatch

## Issues Found
- The HelmRelease pinned the Fluent Bit chart to `0.43.x` and the image to `fluent/fluent-bit:3.0`, which is stale relative to the current official Fluent Bit chart. Updated the chart range to `0.57.x` and aligned the image with the current chart app version, `cr.fluentbit.io/fluent/fluent-bit:5.0.5`.
- The readiness probe used `/api/v1/health`; the current chart default and current Fluent Bit monitoring documentation use `/api/v2/health` for JSON health status. Updated the probe path.
- The Flux Kustomization set `wait: true` while also declaring `healthChecks`. Flux documents that explicit `healthChecks` are ignored when `wait` is true. Removed `wait: true` so the HelmRelease health check is effective.
- The systemd input comments described metrics and kernel messages, but the `systemd` input collects journald logs and the filters shown select kubelet and containerd unit logs. Updated the comments.
- The `nest` filter comment said it nested Kubernetes metadata, but `Operation lift` with `Nested_under kubernetes` lifts nested metadata to top-level fields. Updated the comment to match the configuration.
- The multiple-destination example used `outputs_additional`, which is not a Fluent Bit Helm chart value. Changed it to `outputs` to match the chart's `config.outputs` value when added under the `config` section.

## Review Notes
- The legacy Helm repository URL `https://fluent.github.io/helm-charts` remains supported, though the current chart README recommends OCI installation for direct Helm CLI usage.
- The S3 and CloudWatch output examples require appropriate AWS credentials/IAM permissions in a real cluster; the syntax shown is valid.
