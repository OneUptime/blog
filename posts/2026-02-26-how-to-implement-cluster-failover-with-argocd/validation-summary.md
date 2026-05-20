# Validation Summary: How to Implement Cluster Failover with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Argo CD Notifications
- Kubernetes CronJobs and Deployments
- AWS Route 53 health checks and DNS changes
- Crossplane Upbound AWS Route53 provider
- Prometheus alerting rules
- Bash scripting

## Sources Consulted
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet resource modification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD CLI `app wait` documentation: https://argo-cd.readthedocs.io/en/release-2.2/user-guide/commands/argocd_app_wait/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- AWS CLI `route53 change-resource-record-sets` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Upbound provider-aws-route53 managed resources documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-route53/v2.5.2?tab=managedResources
- Upbound provider-aws-route53 HealthCheck resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-route53/v2.5.0/resources/route53.aws.m.upbound.io/HealthCheck/v1beta1
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The post deployed applications with an ApplicationSet but later used `argocd app set --path` on generated Applications during failover and failback. ApplicationSet-managed Applications are reconciled back to the ApplicationSet template, so those direct changes would not be durable. Updated the examples to switch the `role` label on Argo CD cluster secrets, which is the value already used by the ApplicationSet template to choose the active or passive overlay.
- The automated failover CronJob used `bitnami/kubectl:latest` while the script calls `argocd` and `jq`. Updated the image to a purpose-built controller image that includes `argocd`, `kubectl`, and `jq`.
- The prerequisites did not state that the cluster secrets need the labels consumed by the ApplicationSet and failover scripts. Added the required `environment=production` and `role=active` / `role=passive` labeling prerequisite.
- The Route 53 HealthCheck example used the older Upbound provider API group `route53.aws.upbound.io`. Updated it to the current namespaced Crossplane 2.x provider group `route53.aws.m.upbound.io`.

## Review Notes
The examples remain high-level and assume supporting resources exist, including RBAC for the failover service account, the `failover-state` ConfigMap, DNS updater CronJob, Route 53 change batch file, container images, and Prometheus metrics such as `failover_state_changes_total`. These are acceptable omissions for a guide, but a production runbook should define them explicitly.
