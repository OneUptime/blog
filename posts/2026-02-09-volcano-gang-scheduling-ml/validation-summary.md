# Validation Summary: How to Configure Volcano Batch Scheduler for Gang Scheduling ML Training Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Volcano batch scheduler
- VolcanoJob and Queue CRDs
- Gang scheduling
- PriorityClass and preemption
- PyTorch distributed training
- TensorFlow distributed training
- Prometheus metrics
- Helm and kubectl

## Sources Consulted
- Volcano installation docs: https://volcano.sh/en/docs/v1-12-0/installation/
- Volcano v1.8.2 scheduler introduction and default ConfigMap: https://volcano.sh/en/docs/v1-8-2/schduler_introduction/
- Volcano v1.8.2 actions docs: https://volcano.website.cncfstack.com/en/docs/v1-8-2/actions/
- Volcano v1.8.2 VolcanoJob docs: https://volcano.website.cncfstack.com/en/docs/v1-8-2/vcjob/
- Volcano Queue docs: https://volcano.sh/en/docs/v1-11-0/queue/
- Volcano Env plugin docs: https://volcano.sh/en/docs/user-guide/how_to_use_env_plugin/
- Volcano SVC plugin docs: https://volcano.sh/docs/userguide/user_guide_how_to_use_svc_plugin/
- Volcano Job TTL docs: https://volcano.sh/docs/userguide/user_guide_how_to_use_job_ttl/
- Volcano v1.8.2 CRD installer manifest: https://raw.githubusercontent.com/volcano-sh/volcano/v1.8.2/installer/volcano-development.yaml
- Volcano v1.8.2 scheduler metrics source: https://raw.githubusercontent.com/volcano-sh/volcano/v1.8.2/pkg/scheduler/metrics/queue.go and https://raw.githubusercontent.com/volcano-sh/volcano/v1.8.2/pkg/scheduler/metrics/metrics.go
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes PriorityClass kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_priorityclass/

## Issues Found
- The introduction described gang scheduling as requiring all pods in every job. Volcano uses `minAvailable` / PodGroup minimum membership semantics, so the wording was changed to "required number of pods."
- The `Queue.spec.reclaimable` comment said it reclaimed resources from lower-priority jobs. Volcano defines this as allowing other queues to reclaim this queue's extra resources, so the comment was corrected.
- The PyTorch example used only the bare master pod name and did not assign worker ranks. The master address now uses the service DNS name created by the `svc` plugin, and workers compute unique ranks from the `VC_TASK_INDEX` injected by the `env` plugin.
- The TensorFlow example only set `TF_CONFIG` on the chief and hard-coded worker hostnames. It now enables the `env` and `svc` plugins and builds `TF_CONFIG` from `/etc/volcano/*.host` files and `VC_TASK_INDEX`, following Volcano's documented pattern.
- The queue quota example used `spec.deserved`, which is not present in the Volcano 1.8.2 Queue CRD installed by the post's Helm version. That field was removed from the 1.8.2-focused example.
- Several Prometheus metric names did not exist in Volcano 1.8.2. They were replaced with the metric names from the Volcano scheduler metrics source: `volcano_queue_pod_group_pending_count`, `volcano_queue_pod_group_running_count`, `volcano_queue_allocated_milli_cpu`, and `volcano_queue_allocated_memory_bytes`.

## Review Notes
The YAML snippets were syntax-checked locally. `helm` and `kubectl` were not installed in the review environment, so CLI behavior was verified against official documentation and Volcano release manifests instead of a live cluster.
