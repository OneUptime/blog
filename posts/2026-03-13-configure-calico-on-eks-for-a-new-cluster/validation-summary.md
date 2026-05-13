# Validation Summary: Configure Calico on EKS for a New Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- AWS VPC CNI
- Calico Open Source / Tigera operator
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- kubectl
- eksctl
- calicoctl

## Sources Consulted
- Calico documentation: Installing on EKS, https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/eks
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: NetworkPolicy resource reference, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Amazon EKS documentation: Assign IPs to Pods with the Amazon VPC CNI, https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html
- Amazon EKS best practices: Amazon VPC CNI, https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl reference: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl reference: kubectl expose, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The Calico operator install omitted the Project Calico CRDs and the required AWS VPC CNI pod IP annotation setup for AmazonVPC mode. Added the official `aws-node` patch permission, `ANNOTATE_POD_IP=true`, and CRD install commands.
- The Calico `Installation` resource did not set `kubernetesProvider: EKS`, and the comments inaccurately described `AmazonVPC` as the Calico CNI provider. Added the EKS provider field and corrected the comment.
- The post used Calico v3.27.0 URLs. Updated the operator and `calicoctl` download URLs to v3.32.0 to match current Calico documentation.
- The default-deny policy was named `default-deny-ingress` while denying both ingress and egress. Renamed it to `default-deny`.
- The Calico allow policy permitted backend ingress on port 8080, but the sample backend used nginx, which listens on port 80 by default. Changed the policy to allow TCP port 80.
- The verification commands used nginx for client pods, but the commands expected `curl` to be present and the pods to stay running. Changed the client pods to `curlimages/curl` with a long-running sleep command.
- The connectivity test used `http://backend` without creating a Kubernetes Service named `backend`. Added `kubectl expose pod backend --port=80 --target-port=80 -n production`.
- The namespace default-deny policy included egress, which would block frontend egress and DNS resolution. Added Calico egress allow rules for frontend-to-backend HTTP and DNS on TCP/UDP port 53.

## Review Notes
The Calico EKS documentation also shows optional resources for the Calico API server, Goldmane, and Whisker. The post remains focused on network policy installation and validation, so those optional observability/API server resources were not added.
