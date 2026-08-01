# Validation Summary: Why Setting `minSize` and `maxSize` Does Not Automatically Scale a kOps Node Group

## Status
validated

## Post Type
Technical guide and troubleshooting reference

## Technologies Covered
- kOps
- Kubernetes
- Kubernetes Cluster Autoscaler
- Kubernetes Horizontal Pod Autoscaler
- Karpenter
- Amazon EC2 Auto Scaling
- AWS CLI
- kubectl

## Sources Consulted
- [kOps: Managed addons and Cluster Autoscaler](https://kops.sigs.k8s.io/addons/#cluster-autoscaler)
- [kOps: InstanceGroup resource](https://kops.sigs.k8s.io/instance_groups/)
- [kOps: Working with InstanceGroups](https://kops.sigs.k8s.io/tutorial/working-with-instancegroups/)
- [kOps: Karpenter](https://kops.sigs.k8s.io/operations/karpenter/)
- [kOps CLI: `kops edit cluster`](https://kops.sigs.k8s.io/cli/kops_edit_cluster/), [`kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/), and [`kops get instances`](https://kops.sigs.k8s.io/cli/kops_get_instances/)
- [kOps source: generated Cluster Autoscaler arguments](https://github.com/kubernetes/kops/blob/master/upup/models/cloudup/resources/addons/cluster-autoscaler.addons.k8s.io/k8s-1.15.yaml.template) and [eligible InstanceGroup selection](https://github.com/kubernetes/kops/blob/master/upup/pkg/fi/cloudup/template_functions.go)
- [kOps source: InstanceGroup manager defaulting](https://github.com/kubernetes/kops/blob/master/upup/pkg/fi/cloudup/populate_instancegroup_spec.go) and [Karpenter NodePool field mapping](https://github.com/kubernetes/kops/blob/master/upup/pkg/fi/cloudup/template_functions_karpenter.go)
- [Kubernetes: Node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes Autoscaler: Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md)
- [Kubernetes Autoscaler: AWS provider](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md)
- [AWS: Set scaling limits for an Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-capacity-limits.html)
- [AWS API: UpdateAutoScalingGroup](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_UpdateAutoScalingGroup.html)
- [AWS CLI: `describe-auto-scaling-groups`](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html)
- [Kubernetes CLI references: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and [`kubectl describe`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)

## Issues Found
- The opening statements applied ASG behavior to every AWS InstanceGroup. This is no longer universally correct because kOps also supports Karpenter-managed InstanceGroups. The text now scopes the minimum/maximum/desired-capacity explanation to ASG-backed InstanceGroups using the default `CloudGroup` manager.
- The addon-application note implied that enabling the kOps-managed Cluster Autoscaler may require adjusting ASG discovery tags. Current kOps generates explicit `--nodes` entries for eligible InstanceGroups, so the managed addon does not depend on AWS auto-discovery tags. The unsupported implication was removed; the IAM and Kubernetes-resource changes remain documented.
- The Karpenter section described a positive `minSize` only as selecting a static NodePool, then repeated the ASG interpretation that `minSize` and `maxSize` are merely bounds. In kOps 1.36 and later, a positive `minSize` maps to `NodePool.spec.replicas`, while `maxSize`, when set, maps to `NodePool.spec.limits.nodes`. The section and conclusion now state those semantics accurately.

## Review Notes
- Karpenter-managed InstanceGroup generation and the static-capacity mapping described here apply to kOps 1.36 and later. Earlier kOps releases used a different legacy Karpenter integration.
- The remaining InstanceGroup YAML, managed-addon fields, shell commands, AWS CLI query, controller behavior, scheduling explanations, and scale-down blockers match the current official documentation and CLI syntax reviewed on 2026-08-01.
