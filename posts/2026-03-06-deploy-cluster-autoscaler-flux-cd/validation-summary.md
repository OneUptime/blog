# Validation Summary: How to Deploy Cluster Autoscaler with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Cluster Autoscaler
- Kubernetes Helm releases
- Kustomize
- AWS EKS and Auto Scaling Groups
- GCP/GKE Managed Instance Groups
- Azure AKS and VM Scale Sets
- PodDisruptionBudget
- Prometheus ServiceMonitor

## Sources Consulted
- Kubernetes Autoscaler Helm chart README and values: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler/charts/cluster-autoscaler
- Kubernetes Autoscaler chart release 9.43.3 metadata: https://github.com/kubernetes/autoscaler/releases/tag/cluster-autoscaler-chart-9.43.3
- Cluster Autoscaler releases and Kubernetes version compatibility: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler#releases
- Cluster Autoscaler FAQ and command-line parameters: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Cluster Autoscaler AWS cloud provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Cluster Autoscaler Azure cloud provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/azure/README.md
- Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/

## Issues Found
- The prerequisites implied any Kubernetes v1.25+ cluster was suitable for chart `9.43.x`. Updated this to note that Cluster Autoscaler should match the Kubernetes minor version, and chart `9.43.x` deploys Cluster Autoscaler `1.31.x`.
- The AWS Helm values used an unsupported `leaderElection.enabled` chart value. Replaced it with the supported `extraArgs.leader-elect` flag.
- The comment for `max-graceful-termination-sec` described scaling down multiple nodes. Corrected it to describe the pod termination wait time during node scale-down.
- The AWS Helm values configured `priorityConfigMapAnnotations` as though it supplied priority expander data. Replaced this with the chart-supported `expanderPriorities` value and set the expander chain to `priority,least-waste`.
- The chart PodDisruptionBudget override used `minAvailable`, which would merge with the chart default `maxUnavailable` and produce an invalid PDB spec. Changed it to `maxUnavailable: 1`.
- The GCP example used `autoscalingGroups` with short MIG names and an unsupported `gcp-project-id` argument. Changed it to the chart-supported `autoscalingGroupsnamePrefix` shape for GCE/GKE MIG discovery and removed the unsupported flag.
- The Azure example used `azureVMType: AKS`, but the chart expects VMSS mode as `vmss`. Updated the value to `"vmss"`.
- The priority ConfigMap example did not state that it only applies when the priority expander is enabled. Added the required `extraArgs.expander` guidance.
- The Flux Kustomization manifest was shown as `clusters/my-cluster/cluster-autoscaler/kustomization.yaml`, which conflicts with Kustomize's reserved `kustomization.yaml` file. Added a proper Kustomize `kustomization.yaml` in the workload directory and moved the Flux Kustomization CR example to `clusters/my-cluster/flux-system/cluster-autoscaler-kustomization.yaml`.
- The tuning recommendation mentioned only `least-waste`, while the corrected priority example uses `priority,least-waste`. Updated the recommendation to include both patterns.

## Review Notes
- The Prometheus `serviceMonitor.enabled` value is valid for the chart, but it requires the Prometheus Operator ServiceMonitor CRD to be installed in the cluster.
- The Azure credentials shown inline are technically valid chart values, but production GitOps setups should usually source these from encrypted secrets or Flux `valuesFrom`.
