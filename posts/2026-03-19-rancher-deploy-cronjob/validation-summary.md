# Validation Summary: How to Deploy a CronJob in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes CronJob
- Kubernetes Job
- `kubectl`
- YAML

## Sources Consulted
- Rancher docs, "Deploying Workloads": https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods/deploy-workloads
- Rancher docs, "Kubernetes Workloads and Pods": https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods
- Kubernetes docs, "CronJob": https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes docs, "Jobs": https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes docs, "`kubectl create job`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- Kubernetes docs, "`kubectl logs`": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes docs, "Well-Known Labels, Annotations and Taints": https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The Rancher UI navigation was outdated. The post said to go to `Workloads > CronJobs`, but current Rancher documentation uses `Cluster Management > Explore > Workload`, then `Create`, then choose the workload type. I updated the navigation and creation steps to match the documented flow.
- The manual trigger command used a non-canonical argument order for `kubectl create job`. I changed it to `kubectl create job manual-backup --from=cronjob/db-backup-cron -n default` to match the official `kubectl` reference.
- The job-listing example used `kubectl get jobs -l job-name -n default`. The `job-name` label is deprecated in newer Kubernetes versions, and that selector does not meaningfully isolate jobs created by a specific CronJob. I replaced it with `kubectl get jobs -n default` and adjusted the surrounding text.
- Rancher log-viewing and suspension steps still referenced the older `Workloads` submenu structure. I updated those references to the current cluster `Workload` view wording for consistency with current Rancher docs.

## Review Notes
- The CronJob YAML uses the current stable `batch/v1` API and valid `CronJobSpec` fields.
- Kubernetes CronJobs run on the controller's time zone unless `.spec.timeZone` is set. The post's schedule examples are still technically valid, but this is a useful caveat for multi-region environments.
