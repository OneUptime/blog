# Validation Summary: How to Use Whisker in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Whisker
- Goldmane flow logs API
- Kubernetes
- kubectl
- Kubernetes NetworkPolicy and Calico policy observability

## Sources Consulted
- Calico Open Source documentation, View flow logs in the Calico Whisker web console: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source documentation, Enable the flow logs API and Calico Whisker: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation, Flow logs API: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico Open Source documentation, Installation reference for Goldmane and Whisker resources: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source documentation, FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes kubectl reference, port-forward: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl reference, logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post described Whisker as showing each denied connection exactly. Calico documents Whisker flow logs as aggregated flow records, so I changed the wording to describe source, destination, policy interaction, and the flow-log time window.
- The operational checks referenced only Whisker pods and a Felix `flowLogsFlushInterval` field. Current Calico Open Source Whisker uses Goldmane, and the current FelixConfiguration reference does not document that field for this path, so I changed the checks to include `tigerastatus`, Goldmane pods, and the Goldmane operator resource.
- The architecture diagram showed Felix flow logs feeding a Whisker backend. Calico documents Goldmane as the flow logs API that powers Whisker, so I updated the diagram to show Calico flow logs flowing through Goldmane to Whisker.
- The query examples used undocumented/generic field names and `Deny` with uppercase capitalization. Calico documents fields such as `source_name`, `dest_name`, `source_namespace`, `start_time`, and lowercase `deny`, so I updated the examples accordingly.

## Review Notes
Calico Open Source Whisker and Goldmane are documented as tech preview features in the current Calico documentation, so the exact UI and API behavior may change between Calico releases. I could not run local `kubectl --help` because `kubectl` is not installed in this workspace; kubectl command syntax was checked against the official Kubernetes generated reference instead.
