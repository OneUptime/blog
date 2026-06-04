# Validation Summary: How to Use PodGroup and Gang Scheduling for Distributed ML Training

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Kubernetes scheduler-plugins
- Coscheduling / gang scheduling
- PodGroup custom resources
- Helm
- PyTorch distributed training
- TensorFlow distributed training
- Kubeflow MPI Operator / MPIJob
- Kubernetes Cluster Autoscaler

## Sources Consulted
- Scheduler Plugins Coscheduling documentation: https://scheduler-plugins.sigs.k8s.io/docs/plugins/coscheduling/
- Scheduler Plugins installation documentation: https://scheduler-plugins.sigs.k8s.io/docs/user-guide/installation/
- Kubernetes scheduler configuration documentation: https://kubernetes.io/docs/reference/scheduling/config/
- Scheduler Plugins PodGroup API source: https://github.com/kubernetes-sigs/scheduler-plugins/blob/master/apis/scheduling/v1alpha1/types.go
- Scheduler Plugins Helm chart release notes: https://github.com/kubernetes-sigs/scheduler-plugins/releases
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- PyTorch distributed documentation: https://docs.pytorch.org/docs/stable/distributed.html
- TensorFlow MultiWorkerMirroredStrategy documentation: https://www.tensorflow.org/api_docs/python/tf/distribute/MultiWorkerMirroredStrategy
- Kubeflow MPIJob documentation: https://www.kubeflow.org/docs/components/trainer/legacy-v1/user-guides/mpi/
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The PodGroup API group was incorrect. Changed `scheduling.sigs.k8s.io/v1alpha1` to the current scheduler-plugins API group, `scheduling.x-k8s.io/v1alpha1`.
- The pod labels used to attach pods to a PodGroup were incorrect. Replaced `pod-group.scheduling.sigs.k8s.io/name` and `pod-group.scheduling.sigs.k8s.io/min-available` with `scheduling.x-k8s.io/pod-group`.
- The scheduler-plugins Helm repository URL was outdated/incorrect. Updated it to `https://scheduler-plugins.sigs.k8s.io`.
- The Helm install command set a non-existent `controller.enabled` value. Removed that setting and kept the Coscheduling plugin override.
- The PyTorch example used deprecated `torch.distributed.launch`, an invalid `node_rank` source, and a Service selector that did not match the StatefulSet pods. Updated it to use `torchrun`, derive the ordinal from the StatefulSet hostname, and point the master address at the correct StatefulSet DNS name.
- The TensorFlow example referenced worker DNS names without the StatefulSet headless service and did not set worker task indexes. Added the needed Services, corrected worker DNS names, and used the StatefulSet pod-index label through the Downward API.
- The MPI example mixed a manually-created PodGroup with MPI Operator scheduling. Reworked it to use `runPolicy.schedulingPolicy`, which is the documented MPIJob mechanism for passing PodGroup settings to gang schedulers.
- The priority example placed priority on the PodGroup, but the scheduler-plugins PodGroup spec does not include `priorityClassName`. Removed that field and kept `priorityClassName` on the pod template.
- The queue configuration used outdated/incorrect Coscheduling extension points and an obsolete argument. Updated it to use current scheduler configuration style with `multiPoint`, Coscheduling queue sorting, `podGroupBackoffSeconds`, and `podGroupRejectPercentage`.
- The Cluster Autoscaler example showed flags inside a standalone ConfigMap that Cluster Autoscaler would not consume by itself. Changed it to a Deployment args snippet.
- The monitoring example referenced `.status.scheduled`, which is not part of the current scheduler-plugins PodGroup status type. Updated it to use `.status.scheduleStartTime`.

## Review Notes
- The snippets are illustrative and still assume that supporting objects such as namespaces, ConfigMaps, PVCs, GPU device plugins, training scripts, and the Kubeflow MPI Operator are installed separately.
- `helm` was not installed in the local workspace, so the Helm chart was verified against official documentation and release notes rather than rendered locally.
