# Validation Summary: Sidecar or Separate Service? A Decision Checklist for Failure Isolation and Scaling

## Status
validated

## Post Type
Architecture decision guide

## Technologies Covered

- Kubernetes Pods and multi-container Pods
- Native and legacy sidecar container patterns
- Kubernetes Services and service discovery
- Deployments, StatefulSets, DaemonSets, and Jobs
- Horizontal Pod Autoscaling and Pod disruption controls
- Container probes, startup ordering, restart behavior, and termination
- CPU and memory resource requests
- ServiceAccounts, Secrets, security contexts, shared process namespaces, and NetworkPolicy

## Sources Consulted

- [Kubernetes: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes: Disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes: Share Process Namespace between Containers in a Pod](https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/)
- [Kubernetes: Configure a Security Context for a Pod or Container](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)

## Issues Found

- The comparison implied that every separate workload could choose replicas and use an HPA or manual replica scaling. A DaemonSet, which the post lists as a possible separate workload, is not horizontally scalable and instead runs Pods on eligible nodes. The comparison now describes the replica model as workload-dependent and limits HPA or manual scaling to scalable workloads.
- The deployment section stated that any sidecar image or configuration change modifies the Pod template and triggers replacement Pods. A Deployment rollout is triggered only when `.spec.template` changes; for example, changing data in a referenced, volume-mounted ConfigMap does not itself change the Pod template. The comparison now describes the coupling without assuming an automatic rollout for every controller strategy, and the deployment example now specifically refers to a Deployment Pod-template change.

## Review Notes

- Native sidecar containers use `initContainers` entries with container-level `restartPolicy: Always`. The feature is stable starting with Kubernetes 1.33 and has been enabled by default since Kubernetes 1.29, so the version statement and older-cluster compatibility warning are current.
- Native sidecar startup ordering, probe support, independent container restarts, termination ordering, and Job-completion behavior match the official documentation.
- The `100m` CPU and `128Mi` memory quantities are valid. The calculated totals of 2 CPU and 2.5 GiB at 20 replicas, and 40 CPU and 50 GiB at 400 replicas, are correct.
- The post contains no executable commands or configuration manifests requiring syntax validation; the fenced block is an arithmetic illustration.
- All links in the post resolve to the intended Kubernetes documentation or author profile.
