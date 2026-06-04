# Validation Summary: Using K8ssandra Reaper for Cassandra Anti-Entropy Repair on Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Cassandra
- Cassandra anti-entropy repair
- Cassandra Reaper
- K8ssandra Operator
- Kubernetes
- Prometheus metrics

## Sources Consulted
- K8ssandra Reaper component documentation: https://docs.k8ssandra.io/components/reaper/
- K8ssandra repair task documentation: https://docs.k8ssandra.io/tasks/repair/
- K8ssandra Operator CRD reference: https://docs.k8ssandra.io/reference/crd/k8ssandra-operator-crds-latest/
- Apache Cassandra repair documentation: https://cassandra.apache.org/doc/stable/cassandra/managing/operating/repair.html
- Reaper REST API documentation: https://cassandra-reaper.io/docs/api/
- Reaper Prometheus metrics documentation: https://cassandra-reaper.io/docs/metrics/prometheus/
- Kubernetes kubectl port-forward reference: https://v1-33.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The post used `schemaInitMode: CREATE_IF_NOT_EXISTS`, which is not a current K8ssandra Operator Reaper field. Replaced it with `storageType: cassandra`, matching the CRD's supported storage backend field.
- The post described `RepairSchedule` and `RepairRun` Kubernetes custom resources, but the current K8ssandra Operator exposes Reaper configuration through the Reaper/K8ssandraCluster CRDs and repair scheduling through the Reaper UI/API. Replaced the invalid custom resource example and `kubectl get repairschedule`/`repairrun` commands with Reaper REST API examples.
- The manual schedule example used `segmentCount`; Reaper's REST API uses `segmentCountPerNode`. Updated the example and explanation.
- The ServiceMonitor example used unverified labels. Replaced it with the supported K8ssandra Operator `reaper.telemetry.prometheus.enabled` configuration.
- The tuning section used `adaptiveSchedule`, which is not a current K8ssandra Operator auto-scheduling field. Replaced it with `repairType: AUTO`.
- The failure-handling section used a non-existent retry annotation and CRD fields. Replaced those with Reaper REST API calls for listing failed runs, retrying by setting a run to `RUNNING`, and patching schedule settings.
- The post overstated incremental repairs as always faster and less resource-intensive for Cassandra 4.x. Updated the wording to reflect Cassandra's guidance that incremental repairs can reduce work for new data but full repairs should still be run occasionally.
- The web UI/API section omitted K8ssandra's default Reaper UI authentication. Added the generated secret lookup and noted that REST API calls need a bearer token when authentication is enabled.
- The best-practices section incorrectly said system keyspaces are repaired automatically and suggested reducing segment count when repairs run too long. Updated those statements to match K8ssandra auto-scheduling behavior and Reaper's segmentation guidance.

## Review Notes
- Local checks: `validation.json` was validated with `jq`, and extracted Bash snippets passed `bash -n`. `kubectl` is not installed in this workspace, so kubectl command verification used the official Kubernetes command reference instead of local CLI help.
