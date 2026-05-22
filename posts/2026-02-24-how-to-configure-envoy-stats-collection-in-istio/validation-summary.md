# Validation Summary: How to Configure Envoy Stats Collection in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Prometheus
- PromQL
- Prometheus Operator-style scrape configuration

## Sources Consulted
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio MeshConfig and ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy admin interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Envoy listener statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy HTTP connection manager statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy stats configuration API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/metrics/v3/stats.proto

## Issues Found
- The post said Istio's default behavior was mainly standard `istio_*` metrics plus basic `envoy_server_*` metrics. Updated this to the documented default Envoy-native stats matchers: `cluster_manager`, `listener_manager`, `server`, and `cluster.xds-grpc`, while clarifying that `istio_*` metrics are generated separately by Istio telemetry.
- The post described `/stats` as showing all hidden Envoy stats and `/stats/prometheus` as showing only what Prometheus scrapes. Corrected this because Istio's `proxyStatsMatcher` controls additional Envoy stat creation; stats missing from both endpoints are generally not being created.
- The post described `proxyStatsMatcher` as controlling only Prometheus exposure. Updated it to state that it controls creation and exposure of additional Envoy-native stats.
- The circuit breaker section implied `remaining_*` metrics always appear. Added the Envoy caveat that remaining circuit breaker metrics require `track_remaining`.
- The Prometheus name-format section incorrectly described dots and pipes conversion. Updated it to describe Envoy tag extraction and to use `envoy_cluster_name` as the label.
- The `extraStatTags` section implied arbitrary Envoy-native stat tagging. Corrected it to describe Istio telemetry labeling and noted the current deprecation caveat from Istio documentation.
- The EnvoyFilter section described the example as configuring a stats sink directly. Corrected it to describe bootstrap stats configuration and added the Istio deprecation caveat for `applyTo: BOOTSTRAP`.
- The debugging command annotated an existing pod and then deleted it, which would not preserve the annotation for a replacement pod controlled by a Deployment. Replaced it with a Deployment pod-template patch plus `kubectl rollout restart`.
- The metric relabeling example used `cluster_name`; updated it to `envoy_cluster_name` to match Envoy's default Prometheus tag naming.

## Review Notes
The examples are version-sensitive because Istio-generated Envoy stat names and default tag extraction can change with Istio and Envoy upgrades. The post now advises validating dashboards and enabled stats in the target mesh, but future updates could add a short note recommending canary verification before Istio upgrades.
