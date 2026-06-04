# Validation Summary: How to Configure Karpenter Spot-to-On-Demand Fallback for Cost-Optimized K8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Karpenter
- Amazon EKS
- Amazon EC2 Spot and On-Demand Instances
- Helm
- AWS CloudFormation
- Prometheus / Grafana monitoring

## Sources Consulted
- Karpenter NodePools documentation: https://karpenter.sh/v1.12/concepts/nodepools/
- Karpenter NodeClasses documentation: https://karpenter.sh/v1.12/concepts/nodeclasses/
- Karpenter Getting Started with Karpenter guide: https://karpenter.sh/v1.12/getting-started/getting-started-with-karpenter/
- Karpenter Settings reference: https://karpenter.sh/v1.12/reference/settings/
- Karpenter Metrics reference: https://karpenter.sh/v1.12/reference/metrics/
- Karpenter FAQ on interruption handling and Node Termination Handler: https://karpenter.sh/v1.12/faq/
- Karpenter CloudFormation reference: https://karpenter.sh/v1.12/reference/cloudformation/
- Amazon EC2 Spot Instance interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html

## Issues Found
- The post used deprecated Karpenter `Provisioner` and `AWSNodeTemplate` resources. Updated the examples to current `karpenter.sh/v1` `NodePool` and `karpenter.k8s.aws/v1` `EC2NodeClass` resources.
- The post stated that the order of `values: ["spot", "on-demand"]` determines capacity preference. Current Karpenter behavior uses fixed capacity-type priority: reserved, then Spot, then On-Demand. Updated the explanation.
- The Helm install command used the legacy `https://charts.karpenter.sh` repository and old chart settings. Updated it to use the OCI chart `oci://public.ecr.aws/karpenter/karpenter` and `settings.clusterName` / `settings.interruptionQueue`.
- The IAM setup attached `AmazonEKSWorkerNodePolicy` to the Karpenter controller role, which is not sufficient or appropriate for the controller. Replaced this with the official Karpenter CloudFormation bootstrap template flow.
- The NodePool examples used removed fields such as `ttlSecondsAfterEmpty`, `consolidation.enabled`, `providerRef`, and `limits.resources`. Updated them to `disruption.consolidationPolicy`, `disruption.consolidateAfter`, `template.spec.nodeClassRef`, and current `limits` syntax.
- The workload example included a toleration for `karpenter.sh/capacity-type=spot`, but the shown NodePools did not taint nodes with that key. Removed the unnecessary toleration.
- The Spot interruption section recommended a standalone AWS Node Termination Handler DaemonSet. Karpenter documentation recommends using native interruption handling and not running Node Termination Handler alongside it for the same events. Replaced the DaemonSet with the Karpenter interruption queue configuration.
- The monitoring example used non-current metric examples labeled by `capacity_type` on `karpenter_nodes_created`. Updated it to current Karpenter metric examples that expose capacity type through pod state and NodePool usage metrics.

## Review Notes
- The EC2NodeClass example uses `al2023@latest` for brevity. For production, pinning a tested AL2023 alias version is safer than tracking the latest AMI automatically.
