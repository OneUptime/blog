# Validation Summary: How to Use Spot Instances with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes scheduling, taints, tolerations, affinity, and PodDisruptionBudgets
- AWS EC2 Spot Instances
- AWS Auto Scaling mixed instances policies
- AWS Node Termination Handler
- Helm
- Prometheus Operator alerting rules
- Azure Spot Virtual Machines
- Google Cloud Spot VMs

## Sources Consulted
- AWS CLI Command Reference: `ec2 create-launch-template` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template.html
- AWS CLI Command Reference: `autoscaling create-auto-scaling-group` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- Amazon EC2 Auto Scaling allocation strategies - https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html
- Amazon EC2 Spot Instance interruption notices - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS Node Termination Handler README and Helm chart values - https://github.com/aws/aws-node-termination-handler
- Talos Linux node labels and node taints guide - https://docs.siderolabs.com/kubernetes-guides/advanced-guides/node-labels
- Kubernetes taints and tolerations documentation - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes NodeRestriction admission controller documentation - https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#noderestriction
- Kubernetes PodDisruptionBudget documentation - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Google Cloud Spot VMs documentation - https://cloud.google.com/compute/docs/instances/spot
- Azure Spot Virtual Machines documentation - https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms
- Prometheus querying functions documentation - https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The introduction referred to Google Cloud's current interruptible VM offering as "Preemptible VMs." Google Cloud now recommends Spot VMs as the latest version, so the wording was changed to "Spot VMs on Azure and Google Cloud."
- The AWS launch template example used `ami-talos-linux-latest`, which is not a valid EC2 AMI ID. The example now uses a clearly named `<talos-ami-id>` placeholder and tells readers to replace it with a regional Talos AMI ID.
- The explanation of `capacity-optimized` said it selects the pool with the lowest interruption rate. AWS describes this strategy as selecting Spot pools with optimal or most available capacity, so the wording was corrected.
- The AWS Node Termination Handler Helm command used the older EKS chart repository and the non-existent value `enableRebalanceRecommendation`. It now uses the current public ECR OCI chart and the documented `enableRebalanceMonitoring` value.
- The Talos machine configuration used a top-level `machine.nodeTaints` field. Talos documents initial node taints through `machine.kubelet.extraConfig.registerWithTaints`, so the snippet was updated.
- The Prometheus alert used `rate()` on `kube_node_status_condition`, which is a gauge-style kube-state-metrics metric rather than a counter. The expression now uses `changes()` to count Ready=false transitions over the one-hour window.

## Review Notes
- The AWS Node Termination Handler snippet uses IMDS processor mode. Queue processor mode is also supported and is often preferred for broader EventBridge/SQS handling, but switching modes would require additional AWS resources and would be beyond a minimal correction.
- The cost calculation remains an illustrative example. Actual Spot prices vary by region, time, instance type, and capacity pool.
