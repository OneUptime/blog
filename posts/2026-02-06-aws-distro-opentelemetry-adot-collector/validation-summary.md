# Validation Summary: How to Use AWS Distro for OpenTelemetry (ADOT) Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Distro for OpenTelemetry (ADOT)
- OpenTelemetry Collector
- Docker
- Amazon ECS
- Amazon EKS and the ADOT EKS add-on
- AWS Lambda ADOT layers
- AWS X-Ray
- Amazon CloudWatch EMF
- OneUptime OTLP ingestion

## Sources Consulted
- AWS Distro for OpenTelemetry documentation: https://aws-otel.github.io/
- ADOT Collector ECS setup documentation: https://aws-otel.github.io/docs/setup/ecs/
- ADOT ECS custom configuration with `AOT_CONFIG_CONTENT`: https://aws-otel.github.io/docs/setup/ecs/config-through-ssm
- ADOT EKS add-on collector configuration: https://aws-otel.github.io/docs/getting-started/adot-eks-add-on/config-collector-intro/
- Amazon EKS create add-on documentation: https://docs.aws.amazon.com/eks/latest/userguide/creating-an-add-on.html
- ADOT Lambda documentation: https://aws-otel.github.io/docs/getting-started/lambda/
- ADOT Lambda JavaScript layer documentation: https://aws-otel.github.io/docs/getting-started/lambda/lambda-js/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Operator documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OneUptime OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The local Docker collector config used `detectors: [env, ec2, ecs, eks]`. The current ADOT Collector fails outside Kubernetes when the `eks` detector cannot load in-cluster configuration. Changed the local example to use `[env, ec2, ecs]` and noted that `eks` should be added when running inside Kubernetes.
- The examples used the deprecated `otlphttp` exporter alias. Changed it to `otlp_http`.
- The OneUptime OTLP examples lacked the required `x-oneuptime-token` header. Added a `ONEUPTIME_TOKEN` prerequisite, environment variable, and exporter header.
- The ECS sidecar task definition pointed to `/etc/otel-config.yaml` without defining or mounting that file. Replaced it with `AOT_CONFIG_CONTENT`, which ADOT supports for ECS custom collector configuration.
- The EKS add-on command pinned an old add-on version. Removed the hard-coded version so AWS can select the default compatible version, consistent with EKS add-on guidance.
- The `OpenTelemetryCollector` custom resource used the older `opentelemetry.io/v1alpha1` string config style. Updated it to `opentelemetry.io/v1beta1` with structured `spec.config`, matching current OpenTelemetry Operator examples.
- The EKS manifest referenced a OneUptime token after the exporter fix, so the apply commands now create the `observability` namespace and `oneuptime-otel` secret before applying the custom resource.
- The Lambda example used an outdated Node.js ADOT layer ARN version. Updated the Node.js layer example to the current `aws-otel-nodejs-amd64-ver-1-30-2:1` ARN format for `us-east-1`.
- The troubleshooting section suggested `--log-level debug`, but the current ADOT Collector image does not expose that CLI flag. Updated the guidance to configure `service.telemetry.logs.level`.

## Review Notes
- The updated local collector configuration was tested against the current `public.ecr.aws/aws-observability/aws-otel-collector:latest` image, which reported ADOT Collector `v0.48.0`, and started successfully until stopped by a timeout.
- The AWS CLI was not installed in the local environment, so AWS CLI behavior was verified against official AWS documentation rather than local `--help` output.
