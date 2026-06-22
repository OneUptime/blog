# Validation Summary: Kubernetes Cost Optimization with Helm

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm
- Kubernetes ResourceQuota and LimitRange
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Vertical Pod Autoscaler
- Kubecost
- OpenCost
- Goldilocks
- Karpenter
- Prometheus and Grafana
- AWS EKS and Spot Instances

## Sources Consulted
- Kubecost Helm chart repository and installation documentation: https://github.com/kubecost/kubecost
- AWS EKS Kubecost installation documentation: https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-kubecost.html
- OpenCost Helm chart documentation: https://opencost.io/docs/installation/helm/
- OpenCost Helm chart values: https://github.com/opencost/opencost-helm-chart/blob/main/charts/opencost/values.yaml
- OpenCost metrics documentation: https://opencost.io/docs/integrations/metrics/
- Fairwinds VPA Helm chart values: https://github.com/FairwindsOps/charts/blob/master/stable/vpa/values.yaml
- Kubernetes VPA CRD/API source: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- Kubernetes VPA known limitations: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md
- Fairwinds Goldilocks Helm chart values: https://github.com/FairwindsOps/charts/blob/master/stable/goldilocks/values.yaml
- Karpenter getting started documentation: https://karpenter.sh/docs/getting-started/getting-started-with-karpenter/
- Karpenter NodePool documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter NodeClass documentation: https://karpenter.sh/docs/concepts/nodeclasses/
- AWS EKS Karpenter best practices: https://docs.aws.amazon.com/eks/latest/best-practices/karpenter.html
- Kubernetes HPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/

## Issues Found
- Updated Kubecost Helm repository and install command from the old `cost-analyzer` chart path to the current `kubecost/kubecost` chart path, and replaced the obsolete token value with `global.clusterId`.
- Reworked the Kubecost values snippet to use current v3 chart keys such as `global.clusterId`, `finopsagent`, `localStore`, `frontend`, `networkCosts`, and `aggregator`.
- Corrected OpenCost values to use current chart keys for `cloudIntegrationJSON`, `exporter.cloudProviderApiKey`, AWS credentials, and extra environment variables.
- Adjusted the VPA policy so it does not control CPU while the HPA example scales on CPU, matching VPA known limitations around HPA on the same resource metric.
- Updated the Karpenter example from beta APIs to stable `karpenter.sh/v1` and `karpenter.k8s.aws/v1`, added the required `nodeClassRef` group/kind, replaced deprecated disruption policy values, and switched to a pinned AL2023 AMI alias.
- Fixed the Goldilocks ingress values to match the Fairwinds chart format.
- Fixed the spot-tolerant Deployment by adding the required selector, matching pod template labels, and a container image/command.
- Replaced invalid or outdated Grafana PromQL examples with queries based on OpenCost-generated cost metrics and correct CPU counter usage with `rate()`.
- Updated the Kubecost troubleshooting log command to reference a current v3 chart deployment name.

## Review Notes
The post is technically relevant and validated after fixes. Helm and kubectl were not installed in the local environment, so command verification was done against official documentation and chart values rather than local CLI execution.
