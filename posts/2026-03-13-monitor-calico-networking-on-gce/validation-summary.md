# Validation Summary: Monitor Calico Networking on Google Compute Engine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Google Compute Engine
- Google Cloud VPC Flow Logs
- Google Cloud Firewall Rules Logging
- Cloud Logging log-based metrics
- Cloud Monitoring
- Prometheus and PromQL
- Grafana

## Sources Consulted
- Google Cloud SDK reference for `gcloud compute networks subnets update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud VPC Flow Logs overview: https://cloud.google.com/vpc/docs/flow-logs
- Google Cloud VPC Flow Logs record format: https://cloud.google.com/vpc/docs/about-flow-logs-records
- Google Cloud Firewall Rules Logging overview: https://cloud.google.com/firewall/docs/firewall-rules-logging
- Google Cloud SDK reference for `gcloud logging metrics create`: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud SDK reference for `gcloud compute routes list`: https://cloud.google.com/sdk/gcloud/reference/compute/routes/list
- Calico documentation for Google Compute Engine: https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Prometheus PromQL functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post described VPC Flow Logs as packet-level visibility into allowed and denied traffic. Google Cloud documents VPC Flow Logs as sampled, aggregated flow records; denied ingress packets are not sampled by VPC Flow Logs. Updated the introduction to distinguish VPC Flow Logs from Firewall Rules Logging.
- The `gcloud compute networks subnets update` example used `--logging-metadata INCLUDE_ALL_METADATA`, which is the API enum style. The gcloud flag expects values such as `include-all`. Updated the command.
- The route health script used `calicoctl ipam show --show-blocks --output=json`, but the documented `calicoctl ipam show` options do not include `--output`. Replaced the example with a Kubernetes PodCIDR-to-GCE-route comparison.
- The denied packets log-based metric used VPC Flow Log fields and the unsupported `gcloud logging metrics create --value-extractor` flag. Replaced it with a counter metric for Firewall Rules Logging entries where `jsonPayload.disposition="DENIED"`.
- The Prometheus alert used `decrease()`, which is not a PromQL function. Replaced it with `delta(felix_active_local_endpoints[5m]) < -2`.
- The Prometheus alert used `felix_resyncs_total`, which is not listed in the current Calico Felix metrics reference. Replaced it with the documented `felix_resyncs_started` metric.
- The dashboard listed `felix_policy_dropped_packets_total`, which is not documented as a current Calico Open Source Felix metric. Replaced it with `felix_int_dataplane_failures`.
- The conclusion referred to high drop rates after the metric changes. Updated it to refer to denied firewall connections and frequent Felix resyncs.

## Review Notes
The route-health example applies to GCE cloud-route based clusters. Clusters using overlay encapsulation or VPC-native alias IP routing may need different route checks.
