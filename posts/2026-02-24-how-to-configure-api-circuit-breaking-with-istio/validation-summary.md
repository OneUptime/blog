# Validation Summary: How to Configure API Circuit Breaking with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic management
- DestinationRule
- VirtualService retries
- Envoy circuit breakers and outlier detection
- Fortio load testing
- Prometheus alerting

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.30.0 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Envoy cluster manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The post described `maxConnections` as a service-wide TCP connection ceiling. Istio documents this field as the maximum number of HTTP/1.1 or TCP connections to a destination host, so the description was corrected.
- The post described `http1MaxPendingRequests` as only an HTTP/1.1 queue limit and `http2MaxRequests` as only an HTTP/2 active request limit. Istio documents both settings as applying to HTTP/1.1 and HTTP/2, so the explanations were corrected.
- The post described `maxRetries` as applying across the entire cluster. Istio documents it as the maximum outstanding retries to all hosts in an Envoy cluster, so the wording was tightened.
- The testing commands executed `deploy/fortio` without first deploying Fortio. Added the official Fortio sample deployment command.
- The testing commands used Istio `release-1.20`, which is no longer supported as of 2026-05-22. Updated sample URLs to `release-1.30`, the current supported release.
- The sample Envoy admin stats output omitted the `;.` separator between the Istio cluster name and stat suffix. Updated it to match the format shown in the official Istio circuit-breaking task.
- The Prometheus section implied the Envoy cluster metrics would always be available. Istio documents that Envoy stats collection is minimal by default and extra stats may need to be enabled, so the section now states that the relevant Envoy cluster stats must be collected first.
- The `minHealthPercent` explanation called the behavior "panic mode." Istio documents this field as disabling outlier detection below the threshold and load balancing across all hosts, so the wording was corrected.

## Review Notes
The Kubernetes manifests use current Istio `networking.istio.io/v1` APIs and valid DestinationRule, VirtualService, connection pool, outlier detection, and retry fields. The Prometheus metric names match Envoy cluster stats as exposed through Istio's Envoy statistics path, but production dashboards should be checked in a canary environment because Istio notes Envoy statistic names and collection can vary by proxy configuration.
