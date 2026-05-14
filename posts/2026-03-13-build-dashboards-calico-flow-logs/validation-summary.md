# Validation Summary: How to Build Dashboards for Calico Flow Logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Enterprise flow logs
- Kubernetes
- FelixConfiguration
- Fluent Bit
- Elasticsearch
- Loki
- Grafana
- Kibana

## Sources Consulted
- Calico Open Source documentation: View flow logs in the Calico Whisker web console - https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source documentation: Flow logs API - https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico Enterprise documentation: Flow log data types - https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/datatypes
- Calico Enterprise documentation: Filter flow logs - https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/filtering
- Calico Cloud documentation: Felix configuration - https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Open Source documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The flow log examples used a pipe-delimited, mixed-case format that did not match the documented Calico Enterprise raw flow log format. Updated the examples to the documented space-delimited field order and lowercase `allow`/`deny` action values.
- The denied-flow grep searched for both `deny` and `Deny`, but documented action values are lowercase. Updated it to match a denied action at the end of the raw flow log line.

## Review Notes
Calico Open Source 3.30+ documents Whisker and Goldmane for viewing flow logs, while Calico Enterprise and Calico Cloud document Elasticsearch-oriented flow logs and Felix flow log configuration. The post is most accurate when read as a Calico Enterprise or Calico Cloud file/log pipeline guide rather than a generic Calico Open Source dashboard guide.
