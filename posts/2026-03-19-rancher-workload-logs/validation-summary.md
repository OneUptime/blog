# Validation Summary: How to View Workload Logs in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- Rancher Logging
- Logging operator
- Elasticsearch

## Sources Consulted
- Rancher: Access a Cluster with Kubectl and kubeconfig - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Rancher: Helm Charts and Apps - https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher: Rancher Integration with Logging Services - https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging
- Rancher: Logging Architecture - https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/logging/logging-architecture
- Rancher: Flows and ClusterFlows - https://ranchermanager.docs.rancher.com/v2.12/integrations-in-rancher/logging/custom-resource-configuration/flows-and-clusterflows
- Rancher: Outputs and ClusterOutputs - https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Kubernetes: `kubectl logs` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes: CronJob - https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Logging operator: Elasticsearch output - https://kube-logging.dev/docs/configuration/plugins/outputs/elasticsearch/

## Issues Found
- The post referred to Rancher log aggregation as part of Rancher Monitoring. Rancher documents logging as a separate app, so the section was corrected from "Rancher Monitoring" to "Rancher Logging" and the description was updated accordingly.
- The kubectl shell instructions used older UI wording ("kubectl" button in the top-right corner). Rancher currently documents this as the `Kubectl Shell` button in the top navigation menu, so that wording was corrected.
- The CronJob example used `kubectl get jobs -l job-name=my-cronjob`, which is not the right way to identify Jobs created by a CronJob. It was replaced with a command sequence that lists Job names sorted by creation time, filters by the CronJob-derived name prefix, and then fetches logs from the newest Job.
- The `ClusterOutput` and `ClusterFlow` YAML examples omitted the required `cattle-logging-system` namespace. Rancher documents cluster-scoped logging resources as needing to be deployed in the same namespace as the logging operator, so both examples were fixed.
- The logging chart description used an outdated "Banzai Cloud Logging Operator" reference. It was updated to the current generic "Logging operator" wording used in Rancher documentation.

## Review Notes
- The post is technically relevant and contains working Kubernetes and Rancher guidance after the corrections above.
- `kubectl` was not installed in the local workspace, so CLI verification relied on the official Kubernetes command reference rather than local `--help` output.
