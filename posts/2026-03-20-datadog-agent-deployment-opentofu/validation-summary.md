# Validation Summary: How to Set Up Datadog Agent Deployment with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Datadog Agent (DaemonSet) and Cluster Agent
- Datadog Helm chart
- Kubernetes (Secrets, namespaces, DaemonSets/Deployments)
- Datadog APM, Logs, Process Monitoring, Network Performance Monitoring
- Datadog Terraform provider (`datadog_monitor`)
- Helm provider (`helm_release`) and Kubernetes provider (`kubernetes_secret`)

## Sources Consulted
- Datadog Helm chart values.yaml: https://github.com/DataDog/helm-charts/blob/main/charts/datadog/values.yaml
- Datadog Helm chart on Artifact Hub: https://artifacthub.io/packages/helm/datadog/datadog
- Datadog Terraform provider `datadog_monitor` resource docs: https://github.com/DataDog/terraform-provider-datadog/blob/master/docs/resources/monitor.md

## Issues Found
- **`datadog_monitor` thresholds syntax**: The post used `thresholds = { critical = 80, warning = 70 }` as a map attribute. The current Datadog Terraform provider exposes thresholds as a `monitor_thresholds` block, not a map attribute (the legacy `thresholds` attribute was removed). Replaced with the block-form syntax:

  ```hcl
  monitor_thresholds {
    critical = 80
    warning  = 70
  }
  ```

## Review Notes
- The Datadog Helm chart values used (`apiKeyExistingSecret`, `appKeyExistingSecret`, `site`, `tags`, `kubeStateMetricsEnabled`, `logs.enabled`, `logs.containerCollectAll`, `apm.portEnabled`, `processAgent.enabled`, `processAgent.processCollection`, `networkMonitoring.enabled`, `kubelet.tlsVerify`, `clusterName`, `clusterAgent.enabled`, `clusterAgent.replicas`, `clusterAgent.admissionController.enabled`, `clusterAgent.admissionController.mutateUnlabelled`, `agents.resources`) all exist and are correctly named in the official chart. `mutateUnlabelled` uses the British spelling with double-L, which matches the chart.
- Secret keys `api-key` / `app-key` are the correct keys expected by the Datadog Helm chart when referencing an existing secret via `apiKeyExistingSecret`/`appKeyExistingSecret`.
- The pinned chart version `3.50.2` exists historically; the chart has since advanced significantly (the latest stream is in the 3.20x range as of 2026), so readers may want to pin to a newer version for security/feature fixes. The pinned version still functions for the demonstrated configuration.
- `kubelet.tlsVerify = false` is acceptable for getting started but should be `true` in production with a properly configured kubelet certificate, as the inline comment notes.
- `notify_no_data`, `no_data_timeframe`, `renotify_interval`, `query`, `type`, `message`, `name`, and `tags` on `datadog_monitor` are all valid current attributes.
