# Validation Summary: How to Configure Cluster Autoscaler in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher custom clusters
- Kubernetes Cluster Autoscaler
- AWS EC2 Auto Scaling Groups
- AWS IAM
- Kubernetes RBAC
- `kubectl`

## Sources Consulted
- Rancher docs: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/manage-clusters/install-cluster-autoscaler/use-aws-ec2-auto-scaling-groups
- Cluster Autoscaler AWS provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Cluster Autoscaler compatibility matrix and version guidance: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/README.md
- Cluster Autoscaler FAQ for event behavior: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Upstream AWS autodiscovery example manifest: https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
- AWS CLI `create-or-update-tags` reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-or-update-tags.html

## Issues Found
- The prerequisites implied the guide applied equally to AWS, GCP, and Azure, but the implementation is specifically for Rancher custom clusters on AWS EC2 Auto Scaling Groups. I narrowed the prerequisites to match the actual commands and manifests.
- The `aws autoscaling create-or-update-tags` example used invalid shorthand syntax. I rewrote it to the AWS CLI's documented `--tags` structure format so the command is runnable.
- The ASG discovery tag key/value pattern did not match Rancher's documented AWS setup or the Cluster Autoscaler AWS autodiscovery guidance. I changed it to `k8s.io/cluster-autoscaler/enabled` plus `k8s.io/cluster-autoscaler/<cluster-name>` and updated the autoscaler flag accordingly.
- The deployment pinned Cluster Autoscaler to `v1.28.2` without stating Kubernetes version compatibility. I replaced that with version-matching guidance and a placeholder image tag because upstream recommends using the latest Cluster Autoscaler release for the same Kubernetes minor version.
- The RBAC example was incomplete and would not work as written because it omitted the `ServiceAccount`, namespaced `Role`, and the required `RoleBinding` and `ClusterRoleBinding`, and it was missing several read permissions present in the upstream example. I replaced it with a complete working RBAC manifest based on the official autoscaler example.
- The verification step checked `TriggeredScaleUp` events only in `kube-system`, but Cluster Autoscaler emits those events on the affected workload pods. I changed the command to query events across all namespaces.
- The conclusion referenced a non-existent `--scale-down-delay` flag. I corrected it to the actual Cluster Autoscaler flags: `--scale-down-delay-after-add`, `--scale-down-delay-after-delete`, and `--scale-down-delay-after-failure`.

## Review Notes
- The post is now technically consistent for Rancher custom clusters that use AWS EC2 Auto Scaling Groups.
- Rancher also has a separate `rancher` cloud provider for RKE2-provisioned clusters; that is a different setup from the AWS-ASG approach documented here.
