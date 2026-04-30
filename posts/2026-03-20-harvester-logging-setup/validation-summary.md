# Validation Summary: How to Configure Harvester Logging - Setup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Harvester
- Rancher Logging / Logging Operator
- Kubernetes audit logging
- Fluent Bit / Fluentd
- Elasticsearch
- Grafana Loki

## Sources Consulted
- Harvester Logging documentation: https://docs.harvesterhci.io/v1.7/logging/harvester-logging/
- Harvester Logging troubleshooting: https://docs.harvesterhci.io/v1.7/troubleshooting/logging/
- Rancher `Outputs` and `ClusterOutputs` documentation: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Logging Operator `ClusterFlow` CRD reference: https://kube-logging.dev/docs/configuration/crds/v1beta1/clusterflow_types/
- Logging Operator `OutputSpec` reference: https://kube-logging.dev/docs/configuration/crds/v1beta1/output_types/
- Logging Operator Elasticsearch output reference: https://kube-logging.dev/docs/configuration/plugins/outputs/elasticsearch/
- Logging Operator Record Transformer filter reference: https://kube-logging.dev/docs/configuration/plugins/filters/record_transformer/
- Logging Operator Loki output reference: https://kube-logging.dev/docs/configuration/plugins/outputs/loki/
- Logging Operator Buffer reference: https://kube-logging.dev/docs/configuration/plugins/outputs/buffer/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Elasticsearch ILM rollover documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html

## Issues Found
- The enablement instructions were incorrect. Harvester logging is enabled through the `rancher-logging` add-on from `Advanced > Addons`, not through the `Advanced > Monitoring & Logging > Logging` path shown in the post, and the direct `helm install` snippet was not the documented Harvester workflow. I replaced Step 1 with the supported add-on flow.
- The main `ClusterFlow` example had a schema issue and an overly narrow selector. `record_transformer.records` was written as a map, but the Logging Operator documents it as an array of record entries. I corrected that structure. The original namespace-only match also excluded Harvester host/kernel/systemd logs, so I changed the flow to `select: {}` to route all collected Harvester logs as described.
- The audit section was technically wrong. It described “VM audit log collection via Harvester's event API” and used a label/grep-based `ClusterFlow`, but Harvester documents Kubernetes audit routing through a dedicated `loggingRef` named `harvester-kube-audit-log-ref`. I replaced Step 4 with a separate audit `ClusterOutput` and `ClusterFlow` that use the required `loggingRef`.
- The Elasticsearch retention example was overstated. The original section implied that creating an ILM policy alone configured log rotation. I corrected the section to explain that the policy must be applied through the relevant Elasticsearch index template or data stream, and I changed the code fence to `http` so the example matches the actual request format.
- The Loki option was incomplete. The original snippet only defined a `ClusterOutput`, but the corresponding `ClusterFlow` would also need its output reference changed. I added that instruction and updated the example to use the documented `extra_labels`/buffer style.

## Review Notes
- Harvester also supports separate Kubernetes event log routing. This post now accurately covers general cluster logging plus Kubernetes audit logging, but it does not include a dedicated event-tailer example for VM lifecycle events.
- The Elasticsearch retention section is backend-side guidance. Exact retention behavior still depends on how the Elasticsearch deployment maps Harvester logs to indices or data streams.
