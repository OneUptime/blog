# Validation Summary: How to Alert on Calico Flow Logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico flow logs
- Calico FelixConfiguration
- Kubernetes
- kubectl
- Fluentd
- Elasticsearch
- Loki
- Grafana
- Kibana

## Sources Consulted
- Calico Open Source documentation: View flow logs in the Calico Whisker web console: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Cloud documentation: Felix configuration resource and flow log file report settings: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Cloud documentation: Flow log data types: https://docs.tigera.io/calico-cloud/observability/elastic/flow/datatypes
- Calico Enterprise documentation: Configure flow logs: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/
- Calico Enterprise documentation: Filter flow logs and flow log field format: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/filtering
- Kubernetes documentation: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/#exec
- Kubernetes documentation: kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The flow log example was fenced as JSON but included a JavaScript-style comment, which made it invalid JSON. I moved the explanatory text outside the code fence.
- The example used ISO-8601 strings for `start_time` and `end_time`, but the Calico flow log data type documentation describes these fields as UNIX timestamp values. I changed them to numeric UNIX timestamps.
- The example used capitalized `TCP` and `Allow`, while the official examples and action values use lowercase values such as `tcp` and `allow`. I changed the example values to lowercase.
- The command section implied that file-based flow logs are always available under the Calico node pod. I clarified that the direct file commands apply when file-based flow logs are enabled.
- The conclusion stated that flow logs show the blocking policy unconditionally. Policy fields in file flow logs are controlled by flow log configuration, so I changed the wording to say policy details can be included when enabled.

## Review Notes
File-based flow log settings such as `flowLogsFileEnabled`, `flowLogsFileDirectory`, and `flowLogsFileIncludePolicies` are documented in the Calico Cloud FelixConfiguration reference. Calico Open Source also has flow log visibility through Whisker/Goldmane in current documentation, so future revisions could distinguish Calico Open Source, Calico Cloud, and Calico Enterprise collection paths more explicitly.
