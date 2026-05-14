# Validation Summary: How to Alert on Whisker in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Whisker
- Goldmane flow logs API
- Felix flow logs
- Kubernetes
- kubectl

## Sources Consulted
- Calico documentation: View flow logs in the Calico Whisker web console - https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico documentation: Flow logs API - https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico documentation: FelixConfiguration resource reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Installation API reference for Whisker - https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes documentation: kubectl port-forward reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Project Calico source: Whisker backend flow API types - https://github.com/projectcalico/calico/blob/master/whisker-backend/pkg/apis/v1/flows.go
- Project Calico source: Whisker frontend developer README - https://github.com/projectcalico/calico/blob/master/whisker/README.md

## Issues Found
- The post described Whisker flow data as driving Prometheus alerts, but current Calico documentation describes Whisker as a browser-based flow-log console powered by the Goldmane flow logs API. I changed the description and introduction to frame the post as flow-log investigation and monitoring rather than Prometheus alert configuration.
- The title promised alerting but the post only covered Whisker access and investigation patterns. I changed the heading to "How to Investigate Whisker Flow Logs in Calico" to match the actual technical content.
- The architecture diagram skipped Goldmane, which Calico documents as the dedicated flow logs API powering Whisker. I added Goldmane between Felix flow logs and the Whisker backend.
- The query examples referred to service destinations, timestamp sorting, and grouping syntax that are not the clearest match for Whisker flow-log fields. I adjusted them to workload destinations, `start_time`, and `source_namespace` filtering.

## Review Notes
Calico documents Whisker and the Goldmane flow logs API as tech preview features, so future posts should mention that caveat when providing production guidance. The `kubectl` examples use valid resource names, namespace flags, label selectors, and JSONPath syntax, but `kubectl` was not installed in this local environment for live command execution.
