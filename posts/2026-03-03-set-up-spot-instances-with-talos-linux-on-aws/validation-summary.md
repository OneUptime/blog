# Validation Summary: How to Set Up Spot Instances with Talos Linux on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Amazon EC2 Spot Instances
- Amazon EC2 Auto Scaling mixed instances policies
- AWS CLI
- Kubernetes Deployments, PodDisruptionBudgets, topology spread constraints, taints, and tolerations
- AWS Node Termination Handler
- Helm

## Sources Consulted
- AWS EC2 Auto Scaling launch template advanced settings: https://docs.aws.amazon.com/autoscaling/ec2/userguide/advanced-settings-for-your-launch-template.html
- AWS EC2 Auto Scaling mixed instances groups: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-mixed-instances-group-manual-instance-type-selection.html
- AWS EC2 Auto Scaling InstancesDistribution API reference: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html
- AWS CLI create-launch-template command reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/create-launch-template.html
- AWS EC2 Spot interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS Node Termination Handler documentation: https://github.com/aws/aws-node-termination-handler
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod disruption documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/

## Issues Found
- The launch template configured `InstanceMarketOptions` for Spot while the ASG used a mixed instances policy. AWS documents that this combination is rejected. Removed the Spot market options from the launch template and clarified that the mixed instances policy controls Spot versus On-Demand launches.
- The ASG used `capacity-optimized`. This is valid, but AWS now recommends `price-capacity-optimized` for Spot allocation. Updated the example and explanation accordingly.
- The ASG handled rebalance recommendations in the termination handler but did not enable Auto Scaling Capacity Rebalancing. Added `--capacity-rebalance` and documented the behavior.
- The Node Termination Handler Helm install used the older `eks` chart repository. Updated it to the current public ECR OCI chart installation flow shown by the project documentation.
- The Node Termination Handler description said rebalance recommendations are cordoned and drained. In IMDS mode, rebalance recommendations cordon by default, while interruption and scheduled-event notices drain. Corrected the explanation.
- The Deployment example was missing the required `spec.selector` and matching pod template labels for `apps/v1`. Added both fields.
- The PDB explanation overstated availability guarantees for Spot interruptions. Updated it to describe PDBs as applying to voluntary evictions such as drains through the Kubernetes Eviction API.
- The Spot-node taint used `PreferNoSchedule` while saying only tolerating workloads would schedule there. Changed the taint and toleration to `NoSchedule` to match that behavior.

## Review Notes
The examples still use placeholder AMI, security group, subnet, IAM profile, and cluster names, which is appropriate for a guide but must be replaced before use. The `base64 -w 0` command is GNU coreutils syntax; macOS users may need a different base64 invocation.
