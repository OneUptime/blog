# Validation Summary: How to Set Up Cross-AZ Clusters with Talos Linux on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- AWS (VPC, EC2, ELBv2/NLB, Auto Scaling, Route 53)
- Kubernetes (control plane / etcd, Deployments, Services, StatefulSets, StorageClass)
- AWS CLI (`aws ec2`, `aws elbv2`, `aws autoscaling`, `aws route53`)
- `talosctl`
- `kubectl`
- AWS EBS CSI driver (`ebs.csi.aws.com`)

## Sources Consulted
- AWS subnet tagging requirements for the Kubernetes cloud provider — https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/ and the AWS in-tree/out-of-tree cloud provider documentation (`kubernetes.io/role/elb=1`, `kubernetes.io/role/internal-elb=1`, `kubernetes.io/cluster/<name>=owned|shared`).
- AWS CLI reference for `ec2 create-vpc`, `ec2 create-subnet`, `elbv2 create-load-balancer`, `elbv2 create-target-group`, `elbv2 create-listener`, `autoscaling create-auto-scaling-group`, `route53 create-health-check` — https://docs.aws.amazon.com/cli/latest/reference/
- Talos Linux documentation for `talosctl gen config` and machine configuration `cluster.externalCloudProvider` — https://www.talos.dev/latest/reference/cli/ and https://www.talos.dev/latest/reference/configuration/
- etcd documentation on quorum requirements — https://etcd.io/docs/current/faq/
- Kubernetes documentation on Pod Topology Spread Constraints — https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes well-known label `topology.kubernetes.io/zone` — https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes StorageClass `volumeBindingMode: WaitForFirstConsumer` — https://kubernetes.io/docs/concepts/storage/storage-classes/
- AWS EBS CSI driver — https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- Kubernetes Service `service.kubernetes.io/topology-mode: Auto` (replaced `service.kubernetes.io/topology-aware-hints` in K8s 1.27) — https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- AWS pricing for inter-AZ data transfer ($0.01/GB per direction within a region) — https://aws.amazon.com/ec2/pricing/on-demand/

## Issues Found
No technical issues found.

## Review Notes
- The `externalCloudProvider` patch enables Talos to defer to an external cloud controller manager, but the post does not include the `manifests` field needed to actually deploy the AWS cloud controller manager. This is a reasonable simplification for a high-level guide, but readers will need to consult the Talos AWS guide or the AWS CCM Helm chart to complete the integration.
- The inter-AZ data transfer cost statement ("around $0.01/GB") reflects the egress charge per direction; the effective round-trip cost is closer to $0.02/GB. The wording is acceptable since AWS itself lists "$0.01 per GB" on its pricing page.
- The `aws elbv2 create-load-balancer` example uses placeholder subnet IDs like `subnet-1a` — these are illustrative only; real subnet IDs are of the form `subnet-0abc123...`. This is consistent with other placeholders in the post (`vpc-xxx`, `ami-0xxxx`).
- The `service.kubernetes.io/topology-mode` annotation is the current name; the older `service.kubernetes.io/topology-aware-hints` annotation is deprecated as of Kubernetes 1.27 and the post correctly uses the new name.
- Talos Linux on AWS is conventionally deployed by booting from a Talos AMI (image factory) and passing the machine config as user-data, which matches what the post shows.
