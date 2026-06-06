# Validation Summary: How to Configure the AWS ECS Container Metrics Receiver

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- AWS ECS Container Metrics Receiver (`awsecscontainermetrics`)
- AWS ECS task metadata endpoint v4
- AWS Fargate and ECS EC2 launch types
- AWS CloudWatch EMF exporter (`awsemf`)
- OTLP HTTP exporter
- OpenTelemetry Collector processors
- AWS Secrets Manager

## Sources Consulted
- OpenTelemetry Collector contrib AWS ECS Container Metrics Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/awsecscontainermetricsreceiver/README.md
- AWS Distro for OpenTelemetry ECS Container Metrics Receiver documentation: https://aws-otel.github.io/docs/components/ecs-metrics-receiver/
- Amazon ECS task metadata endpoint v4 for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-metadata-endpoint-v4-fargate.html
- Amazon ECS task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector processors list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector AWS EMF exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awsemfexporter/README.md

## Issues Found
- Corrected the receiver prerequisites to specify ECS task metadata endpoint v4 requirements: Fargate platform version 1.4.0 or later, or ECS EC2 launch type with ECS agent 1.39.0 or later.
- Corrected metric capability descriptions and the available metrics list. Removed non-emitted metrics such as `container.memory.cache`, `container.memory.rss`, `container.cpu.throttling_data.throttled_time`, `container.storage.read_ops`, and `container.storage.write_ops`; added documented receiver metrics such as `container.cpu.utilized`, `container.memory.utilized`, network rate metrics, and dropped packet metrics.
- Replaced nonstandard `ecs.cluster.name` resource attributes with the documented `aws.ecs.cluster.name` attribute.
- Fixed the filter processor resource attribute example to use the documented `Key` and `Value` fields.
- Updated internal Collector telemetry examples to use `service.telemetry.metrics.readers` instead of the older `metrics.address` setting, which is ignored in Collector v0.123.0 and later.
- Fixed the ECS task definition example by removing the unsupported Kubernetes-style `configMap` volume, removing a duplicate/plaintext `ONEUPTIME_TOKEN` environment variable, and clarifying that the collector config must be supplied through a custom image or deployment process.
- Replaced an invalid metrics sampling recommendation. The `probabilistic_sampler` processor does not support metrics, so the post now recommends filtering metrics for high-volume environments.
- Replaced an invalid `metricstransform` aggregation example with an `awsemf` exporter dimension-control example that matches the CloudWatch EMF exporter configuration model.
- Corrected the OneUptime CPU alert example to use `container.cpu.utilized` and a percentage threshold instead of treating cumulative CPU time as a utilization percentage.

## Review Notes
The legacy filter processor configuration style used in some snippets is still supported by the Collector but is no longer the primary documented syntax in recent versions. Future updates could migrate those examples fully to OTTL-based filter processor configuration.
