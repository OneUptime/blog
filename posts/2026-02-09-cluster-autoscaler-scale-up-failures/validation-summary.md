# Validation Summary: How to Handle Cluster Autoscaler Scale-Up Failures and Unschedulable Pods

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Cluster Autoscaler
- Amazon EKS
- AWS CLI
- Amazon EC2 Auto Scaling
- AWS Service Quotas
- AWS IAM
- Prometheus Operator alert rules
- jq

## Sources Consulted
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes resource requests documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Amazon EKS Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Cluster Autoscaler AWS cloud provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Cluster Autoscaler FAQ and flag reference: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Cluster Autoscaler priority expander documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md
- Cluster Autoscaler metrics source: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/metrics/metrics.go
- AWS CLI Service Quotas get-service-quota reference: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/get-service-quota.html
- AWS CLI EC2 Auto Scaling update-auto-scaling-group reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html

## Issues Found
- The IAM policy example placed mutating Auto Scaling permissions in the same unrestricted statement as read-only permissions. Updated the example so `autoscaling:SetDesiredCapacity` and `autoscaling:TerminateInstanceInAutoScalingGroup` are scoped with Cluster Autoscaler ASG tag conditions, matching AWS EKS least-privilege guidance.
- The instance availability section described the priority expander as configuring fallback instance types in a node group. Updated the wording and snippet to show that the priority expander must be enabled and that it prioritizes fallback node groups by matching node group names.
- The "Resource Request Mismatches" section was missing a Markdown heading marker. Changed it to a level-2 heading so the document structure is correct.
- The retry behavior snippet used the non-current flag `--scale-up-from-zero-enabled=true`. Replaced it with the documented Cluster Autoscaler flag `--scale-up-from-zero=true`.
- The Prometheus alert used `rate()` while its annotation described attempts over the last five minutes. Changed it to `increase(cluster_autoscaler_failed_scale_ups_total[5m]) > 0` so the expression matches the annotation.

## Review Notes
The local environment did not have `kubectl` or `aws` installed, so CLI verification was performed against official command references and upstream Cluster Autoscaler documentation/source. The AWS examples use placeholder role, cluster, ASG, subnet, and instance values that must be adapted before use.
