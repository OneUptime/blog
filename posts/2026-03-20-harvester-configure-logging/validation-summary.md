# Validation Summary: How to Configure Harvester Logging

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harvester
- Kubernetes
- Logging Operator
- Fluent Bit
- Fluentd
- Elasticsearch
- Grafana Loki
- Syslog

## Sources Consulted
- Harvester documentation, "Logging": https://docs.harvesterhci.io/v1.7/logging/harvester-logging/
- Harvester documentation, "Add-on Development Guide": https://docs.harvesterhci.io/v1.7/developer/Add-on-development-guide/
- Logging Operator documentation, overview: https://kube-logging.dev/docs/
- Logging Operator documentation, CRDs overview: https://kube-logging.dev/docs/configuration/crds/
- Logging Operator documentation, `FlowSpec`: https://kube-logging.dev/docs/configuration/crds/v1beta1/flow_types/
- Logging Operator documentation, `ClusterFlow`: https://kube-logging.dev/docs/configuration/crds/v1beta1/clusterflow_types/
- Logging Operator documentation, Elasticsearch output: https://kube-logging.dev/docs/configuration/plugins/outputs/elasticsearch/
- Logging Operator documentation, Grafana Loki output: https://kube-logging.dev/docs/configuration/plugins/outputs/loki/
- Logging Operator documentation, Syslog output: https://kube-logging.dev/docs/configuration/plugins/outputs/syslog/
- Logging Operator documentation, Buffer configuration: https://kube-logging.dev/docs/configuration/plugins/outputs/buffer/
- Logging Operator documentation, Parser filter: https://kube-logging.dev/docs/configuration/plugins/filters/parser/
- Logging Operator documentation, Grep filter: https://kube-logging.dev/docs/configuration/plugins/filters/grep/
- Logging Operator documentation, Tag Normaliser filter: https://kube-logging.dev/docs/configuration/plugins/filters/tagnormaliser/
- Logging Operator documentation, Secret definition: https://kube-logging.dev/docs/configuration/plugins/outputs/secret/
- Kubernetes documentation, `kubectl patch`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes documentation, `kubectl run`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
1. The introduction, description, and architecture diagram overstated Harvester's built-in log coverage by referring to VM and VM console logs, and they placed Fluentd on each node. Harvester documents collection of Pod logs, kernel logs, and select systemd services, with Fluent Bit as the per-node collector and Fluentd as the aggregator. I corrected those sections accordingly.
2. The enablement section used an incorrect UI path and a non-existent `Setting` resource named `harvester-logging`. Current Harvester enables logging through the `rancher-logging` add-on, so I updated the UI steps and replaced the CLI example with an `Addon` patch against `addons.harvesterhci.io`.
3. The Elasticsearch example used incomplete buffer settings and incorrect secret field names for authentication. Logging Operator buffer configuration requires time-based buffer keys when a buffer block is defined, and Elasticsearch authentication uses the `password` secret field rather than `password_secret`. I added `timekey` settings and corrected the secret examples.
4. The Loki example also defined a buffer without the documented time-based keys. I added `timekey`, `timekey_wait`, and `timekey_use_utc` so the output matches Logging Operator buffer requirements.
5. The main `ClusterFlow` used `kube_events_timestamp` on all logs and a JSON parser that was not suitable for mixed structured and unstructured log streams. I replaced that with a documented `tag_normaliser`, kept the grep filter on the raw message field, and changed the parser to `multi_format` so JSON logs are parsed while plain-text logs still pass through.
6. The namespaced `Flow` example claimed to collect VM workload logs and used `kube_metadata`, which is not a documented Fluentd filter in current Logging Operator docs. I rewrote the example as an application/workload flow scoped to a namespace and removed the unsupported filter.
7. The node-log section implied Harvester can be reconfigured to collect additional OS logs, but Harvester explicitly documents that the set of collected logs is not user-configurable. I changed that step to show node-level routing with `hosts` matching instead of unsupported collection behavior.
8. The syslog section was technically incorrect because it used the Fluentd `forward` output, which speaks Fluent forward protocol, not syslog. I replaced it with a real `syslog` output using the documented TLS and buffer fields.
9. The verification section relied on a likely non-portable `app=fluentd` label selector and omitted `--restart=Never` from the `kubectl run` test pod example. I changed the log inspection command to resolve a Fluentd pod by name and made the test pod invocation explicit and current. I also clarified that the ILM policy must be attached to an index template or data stream matching the generated indices.

## Review Notes
- This review was aligned to Harvester v1.7, which is the latest stable Harvester documentation available on April 30, 2026.
- Harvester still uses the `logging.banzaicloud.io/v1beta1` API group even though the project documentation now refers to the product generically as Logging Operator. The older API group name is still correct.
- Harvester's built-in logging covers cluster Pod logs, node kernel logs, and selected systemd services. If readers need guest OS or application logs from inside virtual machines, they need separate in-guest log forwarding.
- Backend service names such as `elasticsearch.monitoring.svc.cluster.local` and `loki.monitoring.svc.cluster.local` are examples and must match the reader's actual deployment.
