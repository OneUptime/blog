# Validation Summary: How to Enable Calico Flow Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Enterprise
- Calico Cloud
- Kubernetes
- FelixConfiguration
- kubectl
- Fluent Bit
- Elasticsearch
- Loki
- Grafana
- Kibana

## Sources Consulted
- Calico Open Source documentation: Enable the flow logs API and Calico Whisker, https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation: View flow logs in the Calico Whisker web console, https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Cloud documentation: Felix configuration resource, https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Cloud documentation: Felix component configuration, https://docs.tigera.io/calico-cloud/reference/component-resources/node/felix/configuration
- Calico Enterprise documentation: Flow log data types, https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/datatypes
- Calico Enterprise documentation: Configure flow logs, https://docs.tigera.io/calico-enterprise/latest/observability/elastic/flow/
- Kubernetes documentation: kubectl reference, https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post claimed file-based flow logs were available in open-source Calico through FelixConfiguration. Current Calico Open Source documentation describes flow logs through the Goldmane flow logs API and Whisker web console, while the file-based Felix settings are documented for Calico Enterprise/Cloud. I narrowed the description, introduction, prerequisites, and conclusion to Calico Enterprise/Cloud and added a note that open-source Calico uses Goldmane/Whisker.
- The post described flow logs as per-connection records for every connection. Calico Open Source documentation describes flow logs as aggregations of connection data, and Calico Enterprise flow log fields also include aggregation behavior. I changed the wording to "network flows" and "flow metadata."
- The aggregation comments incorrectly mapped `1` to per-pod and `2` to per-namespace. Calico Cloud FelixConfiguration documentation defines `0` as no aggregation, `1` as source port based aggregation, and `2` as pod prefix name based aggregation; denied flows also support `3` for no destination ports. I corrected the YAML comments and conclusion.
- The verification command tailed a single hard-coded `flows.log` file name that is not documented by the FelixConfiguration resource page, which documents the default flow log directory. I changed the command to tail `*.log` files under `/var/log/calico/flowlogs/`.

## Review Notes
The Fluent Bit example is a minimal collection fragment, not a complete deployment. A production setup would also need a DaemonSet with the host flow-log directory mounted and output configuration appropriate to the target backend.
