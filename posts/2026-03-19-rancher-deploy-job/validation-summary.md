# Validation Summary: How to Deploy a Job Workload in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Manager
- Kubernetes Jobs
- `kubectl`
- YAML

## Sources Consulted
- SUSE Rancher Manager docs, Deploying Workloads: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/cluster-admin/kubernetes-resources/workloads-and-pods/deploy-workloads.html
- SUSE Rancher Manager docs, Kubernetes Workloads and Pods: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/cluster-admin/kubernetes-resources/workloads-and-pods/workloads-and-pods.html
- Kubernetes docs, Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes docs, Indexed Job for Parallel Processing with Static Work Assignment: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes docs, `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes docs, Automatic Cleanup for Finished Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/

## Issues Found
- The Rancher UI steps were not aligned with the current documented workflow. I changed the navigation from `Workloads > Jobs` to the current `Explore > Workload` flow, updated the create step to explicitly choose the `Job` workload type, and changed the final submit action from `Create` to `Launch` to match the current Rancher documentation.
- The parallel batch example used `JOB_COMPLETION_INDEX` without setting `completionMode: Indexed`. I added `completionMode: Indexed` because Kubernetes only defines the completion index for Indexed Jobs.
- The multi-pod logging example used `kubectl logs job/batch-processor -n default --all-containers`, which does not request logs from every Pod in the Job. I changed it to `kubectl logs job/batch-processor -n default --all-pods=true` to match the current `kubectl logs` reference.

## Review Notes
- Rancher UI labels can vary slightly by release. The post is now aligned with the current SUSE Rancher Manager documentation flow.
- Indexed Jobs are stable in Kubernetes v1.24 and later, and `ttlSecondsAfterFinished` is stable in Kubernetes v1.23 and later. These behaviors depend on the Kubernetes version of the managed cluster, not just the Rancher version.
