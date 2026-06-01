# Validation Summary: How to Configure Autoscaling Rules for Azure Spring Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Spring Apps
- Azure Monitor autoscale
- Azure CLI
- Spring Boot Actuator
- Micrometer
- Azure Monitor metrics
- Java
- HikariCP

## Sources Consulted
- Microsoft Learn: Set up autoscale for Azure Spring Apps applications - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-setup-autoscale
- Microsoft Learn: Azure CLI `az monitor autoscale create` - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale
- Microsoft Learn: Azure CLI `az monitor autoscale rule create` - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/rule
- Microsoft Learn: Azure CLI `az monitor autoscale profile create` - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/profile
- Microsoft Learn: Metrics for Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concept-metrics
- Microsoft Learn: Supported metrics for Microsoft.AppPlatform/spring - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-appplatform-spring-metrics
- Microsoft Learn: Azure CLI `az monitor metrics alert create` - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure CLI `az monitor activity-log list` - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log
- Micrometer Reference: Azure Monitor registry - https://docs.micrometer.io/micrometer/reference/implementations/azure-monitor.html
- Spring Boot Reference: Actuator metrics and custom metrics - https://docs.spring.io/spring-boot/reference/actuator/metrics.html

## Issues Found
- The autoscale target used the Azure Spring Apps app resource ID. Azure Spring Apps autoscale settings target a deployment resource, so the setup now builds the `Microsoft.AppPlatform/Spring/.../apps/.../deployments/default` resource ID.
- The CPU and memory rules used non-existent metric names (`CpuUsage`, `MemoryUsage`) and 0-100 threshold values. Azure Spring Apps uses `PodCpuUsage` and `PodMemoryUsage`, with values documented in the 0.0-1.0 range, so the rules now use `0.7`, `0.3`, `0.8`, and `0.4`.
- The request-based scaling section described request counts but used `IngressBytesReceived`, which measures bytes. It now uses the documented Java request metric `tomcat.global.request.total.count` with `AppName` and `Deployment` dimensions.
- The schedule profile commands used an unsupported `--resource` argument for `az monitor autoscale profile create`, an IANA timezone value where the CLI expects Azure timezone names, and did not copy the default metric rules. The commands now omit `--resource`, use `Eastern Standard Time`, and include `--copy-rules default`.
- The weekend/off-hours profile attempted to represent a cross-midnight weekday schedule in a single recurring profile. It now uses a weekend recurring profile and clarifies that the default profile applies outside scheduled profiles.
- The Java controller snippet referenced `orderService` without declaring or injecting it. The snippet now includes an `OrderService` field and constructor parameter.
- The activity log example filtered `--caller` with a provider namespace. The CLI documents `--caller` for identities, so the example now filters with `--namespace Microsoft.Insights`.
- The metric alert used the obsolete/non-existent `CpuUsage` metric and 0-100 threshold. It now uses `PodCpuUsage` and the documented metric alert dimension syntax.

## Review Notes
Azure Spring Apps Basic, Standard, and Enterprise plans entered retirement on March 17, 2025, and Microsoft marks the `az spring` command group as deprecated. The post now avoids the deprecated `az spring app show` command in the autoscale setup, but future revisions should mention the Azure Spring Apps retirement status explicitly if the blog wants date-sensitive service guidance.
