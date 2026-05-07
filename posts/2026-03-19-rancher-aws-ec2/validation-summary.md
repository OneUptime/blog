# Validation Summary: How to Install Rancher on AWS EC2

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- AWS EC2
- AWS CLI
- Helm
- cert-manager
- Ubuntu 22.04

## Sources Consulted
- Rancher Installation Requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher Install/Upgrade on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm CLI Quick Start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Rancher Choosing a Rancher Version: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- Rancher Creating an Amazon EC2 Cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-an-amazon-ec2-cluster
- AWS CLI security groups user guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-ec2-sg.html
- AWS CLI run-instances reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Amazon EC2 AMI parameters: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami-parameter-store.html
- Ubuntu on AWS AMI lookup guide: https://documentation.ubuntu.com/aws/en/latest/aws-how-to/instances/find-ubuntu-images/
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s Server Roles: https://docs.k3s.io/installation/server-roles
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- Helm installation docs: https://helm.sh/docs/v3/intro/install

## Issues Found
- The post recommended a `t3.medium`, but Rancher's current installation requirements for a small K3s upstream cluster are 4 vCPUs and 16 GB RAM per node. I updated the guide to use `t3.xlarge` and aligned the cost section with that requirement.
- The AWS CLI examples used a hard-coded AMI ID and a security-group-by-name workflow that is not correct for non-default VPC usage. I updated the commands to use `--vpc-id`, `--subnet-id`, `--security-group-ids`, and a captured `GroupId`, and I replaced the stale AMI ID with the current region-aware `resolve:ssm:` form.
- The guide opened TCP port `6443` to `0.0.0.0/0`. Rancher's K3s port guidance only requires Kubernetes API access from cluster nodes or explicitly trusted clients. I removed the public rule and clarified that `6443` should only be opened for trusted source IP ranges when remote API access is needed.
- The K3s install step pulled the latest available K3s release with no version pin, which can drift outside Rancher's supported Kubernetes versions. I updated it to use `INSTALL_K3S_VERSION=<supported-k3s-version>` and `server --cluster-init` so the command matches Rancher's current quick-start guidance more closely.
- The article did not state that a single-node Rancher install is a testing or proof-of-concept topology. I added that caveat because Rancher recommends a highly available Kubernetes cluster for production deployments.

## Review Notes
- The `cert-manager` installation flow in the post is still valid, although upstream cert-manager documentation now recommends OCI charts and explicit version pinning for the newest releases.
- `bootstrapPassword=admin` is accepted by Rancher and matches Rancher installation examples, but using a unique bootstrap password is safer for any real environment.
- `nip.io` is still a plausible IP-based testing hostname. Rancher's current quick-start examples use `sslip.io` for the same purpose.
