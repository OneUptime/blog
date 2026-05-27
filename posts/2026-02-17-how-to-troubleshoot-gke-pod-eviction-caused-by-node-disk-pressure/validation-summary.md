# Validation Summary: How to Troubleshoot GKE Pod Eviction Caused by Node Disk Pressure

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes kubelet eviction and local ephemeral storage
- Google Cloud CLI
- GKE node system configuration
- Cloud Monitoring

## Sources Consulted
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Local Ephemeral Storage: https://kubernetes.io/docs/concepts/storage/ephemeral-storage/
- GKE Image Streaming: https://cloud.google.com/kubernetes-engine/docs/how-to/image-streaming
- GKE Custom Boot Disks: https://cloud.google.com/kubernetes-engine/docs/how-to/custom-boot-disks
- GKE Node System Configuration: https://cloud.google.com/kubernetes-engine/docs/how-to/node-system-config
- GKE NodeKubeletConfig API reference: https://cloud.google.com/kubernetes-engine/docs/reference/rest/v1/NodeKubeletConfig
- GKE Cloud Monitoring Kubernetes metrics: https://cloud.google.com/monitoring/api/metrics_kubernetes
- gcloud container node-pools create reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- gcloud container node-pools update reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- gcloud alpha monitoring policies create reference: https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create

## Issues Found
- The eviction threshold description incorrectly stated GKE defaults as 85% soft and 90% hard disk usage. Updated the text to use Kubernetes/GKE hard eviction signals such as `nodefs.available<10%` and `imagefs.available<15%`.
- The eviction ordering explanation was incomplete. Updated it to match kubelet behavior: usage above requests, Pod priority, and usage relative to requests.
- The post implied all evicted pods are directly rescheduled. Clarified that controller-managed workloads create replacement pods.
- The disk inspection commands emphasized `/var/lib/docker` before modern GKE's containerd path. Reordered the examples and marked Docker as legacy.
- The log-size command used `kubectl logs --tail=1 | wc -c`, which only measures the last returned log line. Replaced it with a node-level log file size check under `/var/log/pods`.
- The log rotation section claimed GKE log max size and file count configuration but showed a sidecar cleanup pattern instead. Replaced it with supported GKE node system configuration fields, `containerLogMaxSize` and `containerLogMaxFiles`, plus the `gcloud container node-pools update --system-config-from-file` command.
- The boot disk section said existing node pool disk size cannot be resized. Updated it to reflect current GKE support for changing node-pool machine attributes, while noting node update or recreation disruption.
- The image streaming section said image streaming reduces disk consumed by image layers. Updated it to clarify that GKE still downloads and caches the full image locally in the background.
- The image garbage collection section recommended a privileged CronJob using `crictl rmi --prune`, which was not a complete or recommended GKE configuration path. Replaced it with supported kubelet image GC settings in node system configuration.
- The monitoring command used unsupported `gcloud alpha monitoring policies create` flags and treated a byte metric as a ratio. Replaced the flags with `--if` and `--duration`, added `resource.type="k8s_node"` to the filter, and changed the threshold to bytes.

## Review Notes
The post is now technically valid for GKE Standard clusters. Several examples require cluster-specific values such as cluster name, node pool name, location, notification channel, and an appropriate byte threshold for the node disk size.
