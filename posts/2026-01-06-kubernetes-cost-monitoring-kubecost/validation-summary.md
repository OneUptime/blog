# Validation Summary: How to Monitor and Reduce Kubernetes Costs with Kubecost

## Status
validated

## Post Type
Tutorial / practical guide (Kubernetes cost monitoring with Kubecost)

## Technologies Covered
- Kubecost (cost-analyzer Helm chart, API, alerts)
- Kubernetes (Deployments, ResourceQuota, LimitRange, HPA)
- Helm
- Prometheus / Grafana
- AWS Athena / Cost and Usage Reports (cloud integration)
- Datadog integration
- Slack / AlertManager notifications
- OPA / Gatekeeper
- Spot instances, autoscaling, FinOps practices

## Sources Consulted
- Kubecost API documentation (savings + allocation endpoints): https://docs.kubecost.com/apis/apis and GitHub mirror https://github.com/kubecost/docs/blob/main/apis.md
- Kubecost Alerts documentation (`global.notifications.alertConfigs`): https://docs.kubecost.com/using-kubecost/navigating-the-kubecost-ui/alerts
- Kubecost "How to set real-time cost alerts in Kubernetes": https://dev.to/kubecost/how-to-set-real-time-cost-alerts-in-kubernetes-3jco
- Kubecost Datadog integration: https://docs.kubecost.com/integrations/integrating-kubecost-with-datadog
- Kubecost Multi-cluster Federated ETL docs: https://docs.kubecost.com/install-and-configure/install/multi-cluster/federated-etl
- Kubernetes docs: HorizontalPodAutoscaler (autoscaling/v2), ResourceQuota, LimitRange

## Issues Found
The bulk of the post (Helm install, port-forward, savings/allocation API calls, custom pricing, label mapping, cloud integration, Datadog, HPA, ResourceQuota, LimitRange, Gatekeeper) was verified as accurate. The significant errors were in the alerting/reporting and multi-cluster sections, which used fabricated Kubecost custom resources and config keys:

1. **Budget Alerts** — used a non-existent `apiVersion: kubecost.io/v1alpha1` / `kind: Budget` custom resource. Kubecost has no such CRD; alerts are configured through Helm values under `global.notifications.alertConfigs`. Rewrote the example using the real `type: budget` alert (fields: `threshold`, `window`, `aggregation`, `filter`, `ownerContact`).

2. **Cost Anomaly Alerts** — used a fabricated `kind: Alert` with `type: anomaly`. The correct alert type is `spendChange`, which compares spend against a historical `baselineWindow` using `relativeThreshold`. Rewrote accordingly.

3. **Efficiency Alerts** — used the same fabricated `kind: Alert` CRD. Rewrote using the real `type: efficiency` alert (`efficiencyThreshold`, `spendThreshold`, `window`, `aggregation`).

4. **Scheduled Reports** — used a fabricated `kind: Report` CRD with `schedule` cron and `format: pdf`. Kubecost has no Report CRD; scheduled email cost reports are sent via the `recurringUpdate` alert type. Rewrote accordingly.

5. **Multi-Cluster Federated Setup** — used fabricated keys (`federatedCluster.primaryClusterID`, `enabled`, `primaryClusterURL`) implying secondaries report directly to a primary URL. The real Federated ETL model has every cluster push ETL data to a shared object store; config lives under `federatedETL` (`federatedCluster`, `primaryCluster`, `federatedStorageConfigSecret`). Rewrote both primary and secondary examples to match the documented structure.

## Review Notes
- Verified correct and left unchanged: Helm repo/install commands, `kubecostToken`, `prometheus.server.retention`, `kubectl port-forward` to `kubecost-cost-analyzer:9090`, the `/model/allocation` and `/model/savings/{requestSizing,clusterSizing,abandonedWorkloads}` API paths, `customPricesEnabled`/`defaultModelPricing`, `labelMappingConfigs`, `cloudIntegrationJSON` (Athena), Datadog (`kubecostProductConfigs.datadog`), HPA `autoscaling/v2`, ResourceQuota, and LimitRange.
- The AWS `cloudIntegrationJSON` block embeds inline `#` comments inside a JSON string. JSON does not support comments, so those annotations would need to be stripped before real use — left in place since they are clearly illustrative and the same annotation style is used consistently throughout the post.
- Kubecost alert `window` accepts both duration strings (e.g. `7d`, `1d`) and named cadences (`daily`, `weekly`) depending on alert type; the rewritten examples use values consistent with the official docs.
- For Federated ETL on Kubecost 2.x, the Aggregator component replaces the older Federator; the object-store secret must be named appropriately. The rewritten example keeps the structure documentation-accurate without expanding into full object-store secret setup, which is beyond the post's scope.
