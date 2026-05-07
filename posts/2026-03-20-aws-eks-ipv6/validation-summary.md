# Validation Summary: How to Configure IPv6 for AWS EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- `eksctl`
- AWS CLI
- Kubernetes Services and Deployments
- AWS VPC CNI
- AWS Load Balancer Controller
- IPv6 networking on AWS

## Sources Consulted
- Amazon EKS User Guide, "Learn about IPv6 addresses to clusters, Pods, and services" https://docs.aws.amazon.com/eks/latest/userguide/cni-ipv6.html
- Amazon EKS User Guide, "Deploying an Amazon EKS IPv6 cluster and managed Amazon Linux nodes" https://docs.aws.amazon.com/eks/latest/userguide/deploy-ipv6-cluster.html
- Eksctl User Guide, "IPv6 Support" https://docs.aws.amazon.com/eks/latest/eksctl/vpc-ip-family.html
- Amazon EKS User Guide, "Create an Amazon EKS cluster" https://docs.aws.amazon.com/eks/latest/userguide/create-cluster.html
- Amazon EKS User Guide, "Cluster API server endpoint" https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html
- Amazon EKS Best Practices, "Running IPv6 EKS Clusters" https://docs.aws.amazon.com/eks/latest/best-practices/ipv6.html
- Amazon EKS User Guide, "Route internet traffic with AWS Load Balancer Controller" https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html
- Amazon EKS User Guide, "Install AWS Load Balancer Controller with Helm" https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS User Guide, "Route TCP and UDP traffic with Network Load Balancers" https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- Kubernetes Documentation, "IPv4/IPv6 dual-stack" https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- AWS Amazon VPC CNI for Kubernetes README https://github.com/aws/amazon-vpc-cni-k8s

## Issues Found
- The post used `eksctl create cluster --ip-family IPv6`, but current `eksctl` documentation states IPv6 is configured in the `ClusterConfig` file, not a CLI flag. I removed the invalid CLI example and corrected the `eksctl` configuration example.
- The `eksctl` IPv6 cluster config was incomplete. AWS documents that IPv6 clusters need managed add-ons defined and `iam.withOIDC: true`. I added those required fields.
- The cluster version in the example was outdated. I updated it to a currently supported EKS version used in the AWS documentation at validation time.
- The introduction said IPv6 clusters still use IPv4 for control plane communication and some services. That is no longer generally accurate for new IPv6 clusters, and it also missed the documented host-local IPv4 behavior for pods. I corrected the explanation to match current EKS IPv6 behavior.
- The node verification command assumed `kubectl get nodes -o wide` would show IPv6 in the `INTERNAL-IP` column. EKS nodes are documented as dual-stack, so I replaced that with a command that shows both node address families explicitly.
- The pod verification snippet depended on `ip -6` being available inside the `nginx` container. I replaced it with a direct `jsonpath` lookup of the pod IP so the example does not rely on container tooling.
- The `awk` field selection in the all-pods listing was wrong for `kubectl get pods -A -o wide`; it printed the node column instead of the pod IP column. I corrected the field index.
- The Service example implied dual-stack service guidance inside EKS IPv6 content. Amazon EKS does not support dual-stack pods or services, so I corrected the comments to describe single-stack IPv6 behavior accurately.
- The `LoadBalancer` Service example conflated ALB and NLB behavior. In EKS, a Service of type `LoadBalancer` with AWS Load Balancer Controller provisions an NLB, while ALBs are created from Ingress or Gateway resources. I corrected the description and annotations accordingly.
- The load balancer Service example omitted the `aws-load-balancer-nlb-target-type: "ip"` annotation that AWS requires for load balancing to IPv6 pods. I added it.
- The load balancer Service exposed port `443` without a matching backend port in the sample Deployment. I removed the non-working port from the example.
- The AWS Load Balancer Controller installation snippet was incomplete because it used `serviceAccount.create=false` without first creating the IAM-backed service account. I added the documented IAM policy, IAM service account, and Helm chart version steps from the official installation guide.
- The VPC CNI troubleshooting section used a `ConfigMap` lookup and `IP_FAMILY` key that do not match how current EKS/VPC CNI IPv6 configuration is exposed. I replaced those commands with daemonset-based checks for `ENABLE_IPv6` and `ENABLE_PREFIX_DELEGATION`, and added the documented `serviceIpv6Cidr` cluster check.
- The conclusion said pod IPv6 addresses came directly from the VPC `/56` block and referenced the invalid `--ip-family` flag. I corrected this to the documented `/80` per-node prefix delegation model and the `ipFamily: IPv6` configuration.

## Review Notes
- The post is now technically correct for standard Amazon EKS clusters using the AWS VPC CNI and AWS Load Balancer Controller. It does not cover Amazon EKS Auto Mode, which changes some networking and load balancing setup steps.
- AWS Load Balancer Controller and EKS version numbers will continue to age. The examples were aligned to the current AWS documentation as validated on 2026-05-07.
