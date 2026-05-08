# Validation Summary: How to Validate Calico Flow Logs in Production

## Status
validated

## Post Type
Tutorial / production validation guide

## Technologies Covered
- Calico flow logs
- Calico FelixConfiguration
- Kubernetes Pods, Services, and NetworkPolicy
- kubectl
- Elasticsearch

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Open Source flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Cloud flow log data types: https://docs.tigera.io/calico-cloud/observability/elastic/flow/datatypes
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The denied-traffic test attempted to curl `http://flow-test-target:80` after creating only a Pod. Kubernetes creates stable DNS names for Services, not arbitrary standalone Pod names, so the example could fail before testing NetworkPolicy behavior. I changed the snippet to create the target Pod, wait for it to become Ready, expose it as a Service, and curl the fully qualified Service DNS name.
- The flow-log wait used `sleep 20`, but Calico documents `flowLogsFlushInterval` with a default of `5m0s`. I changed the waits to `sleep 320` and noted that users can shorten the wait when their configured flush interval is lower.
- The introduction described "per-flow logs" as individual connection records. Calico documents flow logs as aggregations over a time period, with no-aggregation mode preserving more detailed fields. I changed the wording to avoid implying that flow logs always record every individual connection as a separate record.
- The Elasticsearch query used `src_name`, but Calico's documented Elasticsearch field is `source_name`. I changed the query to match `source_name`.

## Review Notes
The post assumes file-based Calico flow logs are enabled and available under `/var/log/calico/flowlogs/flows.log`. Calico Cloud and Enterprise document file-based flow log settings, while current Calico Open Source documentation emphasizes Goldmane and Whisker for flow log viewing. Operators should confirm which Calico distribution and flow-log pipeline they are using before applying these commands.
