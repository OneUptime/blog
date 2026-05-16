# Validation Summary: How to Use AWS Cloud Provider with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- AWS cloud-provider-aws
- AWS IAM
- AWS EC2
- AWS Elastic Load Balancing
- AWS EBS CSI driver
- Helm

## Sources Consulted
- Talos Linux MachineConfig reference for `cluster.externalCloudProvider`: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux AWS installation guide: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/cloud-platforms/aws
- Kubernetes AWS Cloud Provider prerequisites and IAM policies: https://kubernetes.github.io/cloud-provider-aws/prerequisites/
- Kubernetes AWS Cloud Provider getting started guide and required external cloud provider flags: https://cloud-provider-aws.sigs.k8s.io/getting_started/
- Kubernetes AWS Cloud Provider repository and compatibility notes: https://github.com/kubernetes/cloud-provider-aws
- Kubernetes well-known AWS Service annotations: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes AWS Cloud Provider service controller annotation reference: https://cloud-provider-aws.sigs.k8s.io/service_controller/

## Issues Found
- The post claimed the AWS cloud provider itself enables automatic EBS persistent volume provisioning. Updated this to state that EBS persistent volumes should use the AWS EBS CSI driver, because the in-tree EBS volume plugin is deprecated/maintenance-only.
- The worker IAM guidance omitted the upstream ECR read permissions and included `ec2:DescribeRouteTables`, which is not part of the current upstream node policy. Replaced the worker guidance with the official node policy actions from the AWS cloud provider prerequisites.
- The Talos configuration example referenced `master/manifests/rbac.yaml` and `master/manifests/aws-cloud-controller-manager-daemonset.yaml`, which are not suitable current bootstrap URLs and are not version-pinned. Replaced this with a workflow that renders the official Helm chart into a single manifest, pins the cloud-controller-manager image tag, and has Talos fetch that rendered manifest during bootstrap.
- The Talos `gen config` example omitted AWS-relevant generation flags from the official Talos AWS guide. Added `--with-examples=false`, `--with-docs=false`, and `--install-disk /dev/xvda` so the generated config is suitable for EC2 user data and AWS disk naming.

## Review Notes
- The AWS cloud provider release should be kept aligned with the Kubernetes minor version. The example uses `v1.35.0` as a placeholder image tag and explicitly instructs readers to match their own Kubernetes version.
- The Service `service.beta.kubernetes.io/aws-load-balancer-type: "nlb"` annotation is still valid for the official AWS cloud provider. The default without that annotation is a Classic Load Balancer.
- Production deployments may prefer a GitOps or artifact-hosting workflow for the rendered cloud controller manager manifest rather than an ad hoc public URL.
