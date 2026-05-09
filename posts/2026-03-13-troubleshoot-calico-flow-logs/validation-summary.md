# Validation Summary: How to Troubleshoot Calico Flow Logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Enterprise and Calico Cloud flow logs
- Calico Open Source Goldmane and Whisker
- Kubernetes `kubectl`
- FelixConfiguration
- Fluentd
- Elasticsearch and Kibana

## Sources Consulted
- Calico Enterprise flow log data types: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/datatypes
- Calico Enterprise flow log filtering and file format: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/filtering
- Calico Enterprise Elasticsearch logs overview: https://docs.tigera.io/calico-enterprise/latest/observability/elastic/overview
- Calico Open Source flow log viewing with Whisker: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source flow log API and Whisker enablement: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described the file-based flow log path as generic Calico behavior. I clarified that the commands and pipeline apply to file-based Calico Enterprise and Calico Cloud flow logs, while Calico Open Source 3.30+ uses Goldmane and Whisker for flow log viewing.
- The post named Fluent Bit as the Kubernetes log collector for the Calico Enterprise/Cloud Elasticsearch pipeline. Official Tigera documentation describes Fluentd as the component automatically installed on nodes to collect flow, audit, and DNS logs, so I changed the text and architecture diagram to Fluentd.
- The architecture diagram listed Loki and Grafana as the standard backend and dashboard path. Tigera's documented default path is Elasticsearch with the Calico web console/Kibana, with other configured destinations available, so I generalized the backend and dashboard labels.
- The flow log examples used pipe-delimited fields, ISO-style timestamps, capitalized `Allow`/`Deny` actions, and a simplified field list. Tigera documents file flow logs as space-delimited fields with UNIX timestamps and lowercase `allow`/`deny` actions, so I replaced the examples with abbreviated space-delimited entries.
- The denied-flow filter searched for both `deny` and `Deny`. Because the documented action value is lowercase `deny` and appears as the final field in file flow logs, I changed the command to match ` deny$`.
- The conclusion said flow logs always show which policy blocked traffic. Policy information is present when policy fields are collected, so I qualified that claim.

## Review Notes
The direct `/var/log/calico/flowlogs/flows.log` inspection commands are useful only where Felix file reporting is enabled and the calico-node pod has that path mounted. In Open Source clusters using the current Whisker/Goldmane flow-log path, troubleshooting should focus on the Goldmane and Whisker components instead.
