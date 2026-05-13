# Validation Summary: How to Deploy Chaos Toolkit with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Chaos Toolkit
- Chaos Toolkit Kubernetes extension
- Kubernetes Jobs and CronJobs
- Kubernetes RBAC
- Kubernetes ConfigMaps
- Flux CD Kustomizations
- GitOps

## Sources Consulted
- Chaos Toolkit experiment API documentation: https://chaostoolkit.org/reference/api/experiment/
- Chaos Toolkit Kubernetes extension documentation: https://chaostoolkit.org/drivers/kubernetes/
- Chaos Toolkit Docker image documentation: https://chaostoolkit.org/deployment/local/docker/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Job TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The Job and CronJob used `chaostoolkit/chaostoolkit:latest` while the experiment calls `chaosk8s.pod.actions.terminate_pods`. Official Chaos Toolkit Docker documentation says the `latest` image does not contain extensions, and the Kubernetes extension must be installed in the runtime environment. Changed the examples and prerequisite to use `chaostoolkit/chaostoolkit:full` or a custom image with `chaostoolkit-kubernetes` installed.
- The Job used `CHAOSTOOLKIT_LOADER_PATH`, which is not the documented way for the Chaos Toolkit Kubernetes extension to use in-cluster service account credentials. Added `CHAOSTOOLKIT_IN_POD: "true"` to both the Job and CronJob examples.
- The CronJob comment said "during business hours" while the schedule `0 2 * * 1-5` runs at 2 AM on weekdays. Updated the comment to "Run every weekday at 2 AM."
- The Flux `Kustomization` example was shown as `clusters/my-cluster/chaos-toolkit/kustomization.yaml`, the same directory being reconciled. Flux treats a `kustomization.yaml` in the target path as a Kustomize file, so using that filename for a Flux custom resource in the reconciled path can break rendering. Moved the example to `clusters/my-cluster/flux-system/chaos-toolkit-kustomization.yaml` and added a short note to commit it in a path already reconciled by Flux.

## Review Notes
The Kubernetes API versions and fields shown for Namespace, ConfigMap, ServiceAccount, ClusterRole, ClusterRoleBinding, Job, CronJob, and Flux Kustomization are current and valid. In a production workflow, pinning the Chaos Toolkit image to a specific tag or digest would be preferable to using a mutable tag.
