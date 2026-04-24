# Validation Summary: How to Automate Cluster Scaling in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Kubernetes API (RK-API)
- Kubernetes
- Horizontal Pod Autoscaler (HPA)
- Cluster Autoscaler
- Vertical Pod Autoscaler (VPA)
- Amazon EKS
- Kubernetes CronJob
- Prometheus Operator
- kube-state-metrics
- Bash
- `kubectl`
- `jq`

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Amazon EKS cluster upgrade guidance, including Cluster Autoscaler version matching: https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html
- Cluster Autoscaler AWS provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Vertical Pod Autoscaler installation guide: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- Vertical Pod Autoscaler quickstart and update mode guidance: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Rancher RK-API quickstart: https://ranchermanager.docs.rancher.com/api/quickstart
- Rancher previous v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher Nodes and Machine Pools guide: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/nodes-and-machine-pools
- Rancher RKE2 cluster configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics node metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The overview and API-scaling section were too broad for current Rancher. The post claimed Rancher API-based node-pool scaling for on-premises/custom infrastructure in general, but current Rancher docs distinguish Rancher-provisioned machine pools from imported/custom nodes. I narrowed the scope to Rancher-provisioned RKE2/K3s clusters with machine pools backed by an infrastructure provider and clarified that imported/custom node clusters are scaled outside Rancher.
- The Rancher API example used a legacy `v3/nodepools` flow that is not the current documented Rancher automation path. I replaced it with an RK-API example that patches `.spec.rkeConfig.machinePools[].quantity`, which matches the current Rancher cluster configuration model.
- The scheduled scaling CronJobs did not match the script they were invoking. The original jobs passed no positional arguments, and the second CronJob omitted the authentication and target configuration needed by the script. I updated both CronJobs to mount an RK-API kubeconfig secret and provide the full environment expected by the corrected script.
- The Cluster Autoscaler Deployment example was missing `spec.template.metadata.labels`, which is required to match the Deployment selector. I added the pod-template labels.
- The Cluster Autoscaler image tag was pinned to `v1.28.0` without version guidance. AWS EKS docs require using the latest Cluster Autoscaler patch release that matches the cluster’s Kubernetes major/minor version. I updated the example to a current 1.34.x release and added an explicit version-matching note.
- The HPA section implied that CPU, memory, and custom metrics work without prerequisites. I clarified that resource metrics require Metrics Server and custom metrics require a custom/external metrics adapter, and I corrected the custom-metric comment to describe the Kubernetes custom metrics API rather than implying native Prometheus support.
- The VPA install comment used `kubectl apply -f` against a GitHub `tree` URL, which would not work. I replaced it with the upstream install flow from the VPA installation docs.
- The VPA example used `updateMode: Auto`, which upstream VPA docs now mark as deprecated. I changed it to the explicit `Recreate` mode.

## Review Notes
- The Prometheus alert expression is valid with kube-state-metrics, but kube-state-metrics recommends the kube-scheduler `kube_pod_resource_requests` metric as a more precise source than `kube_pod_container_resource_requests`.
- The EKS Cluster Autoscaler example still uses explicit `--nodes=min:max:asg-name` configuration, which is supported, but the upstream AWS provider documentation prefers node group auto-discovery for many EKS setups.
- The CronJob schedules do not set `spec.timeZone`. If the cluster controller manager timezone differs from the intended business-hours timezone, adding `timeZone` would make the schedules deterministic.
