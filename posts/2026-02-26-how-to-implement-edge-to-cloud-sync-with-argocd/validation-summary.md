# Validation Summary: How to Implement Edge-to-Cloud Sync with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- GitOps
- Kubernetes Deployments, PersistentVolumeClaims, ConfigMaps, and CronJobs
- Kustomize overlays, patches, and components
- Prometheus Operator PrometheusRule
- Prometheus metrics and PromQL

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet List Generator documentation: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/applicationset/Generators-List/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The per-site Kustomize overlay text said it customized the cloud endpoint and site identifier, but the JSON patch only changed `SITE_ID` and `UPLOAD_INTERVAL`. Added a patch operation for `CLOUD_ENDPOINT` so the snippet matches the explanation.
- The coordinated rollout section implied sync waves across ApplicationSets directly enforce cloud-before-edge rollout ordering. Argo CD sync waves order resources during an Application sync, so the text now clarifies that the generated Application resources need to be synced from a parent app-of-apps workflow, or otherwise controlled with explicit promotion, sync windows, or manual sync steps.
- The Kustomize component used `apiVersion: kustomize.config.k8s.io/v1beta1` with `kind: Component`. Kustomize components use `apiVersion: kustomize.config.k8s.io/v1alpha1`, so the snippet was corrected.
- The monitoring section described version parity, but the PromQL example uses Argo CD `sync_status` labels from `argocd_app_info`. Updated the wording, alert name, and summary to describe sync-status monitoring rather than deployed version compatibility.

## Review Notes
The examples are illustrative and assume existing Argo CD projects, registered clusters with `cluster-role` labels, Prometheus Operator CRDs, Argo CD metrics scraping, and a `local-path` StorageClass in edge clusters. The ApplicationSet examples use the default fasttemplate-style syntax, which is still documented, though Argo CD documentation recommends Go templating for newer and more complex ApplicationSets.
