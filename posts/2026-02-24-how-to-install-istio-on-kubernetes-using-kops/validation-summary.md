# Validation Summary: How to Install Istio on Kubernetes Using Kops

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- kOps
- Kubernetes
- Istio
- AWS
- AWS cloud provider load balancers
- Calico CNI

## Sources Consulted
- kOps installing documentation: https://kops.sigs.k8s.io/getting_started/install/
- kOps create cluster CLI reference: https://kops.sigs.k8s.io/cli/kops_create_cluster/
- kOps Calico networking documentation: https://kops.sigs.k8s.io/networking/calico/
- kOps production setup recommendations: https://kops.sigs.k8s.io/getting_started/production/
- kOps instance group CLI reference: https://kops.sigs.k8s.io/cli/kops_create_instancegroup/
- kOps validation/troubleshooting documentation: https://kops.sigs.k8s.io/operations/troubleshoot/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio command-line documentation: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio installation compatibility notes: https://istio.io/latest/docs/setup/install/
- Kubernetes well-known AWS Service annotations: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes AWS cloud provider service controller documentation: https://cloud-provider-aws.sigs.k8s.io/service_controller/
- Kubernetes AWS cloud provider NLB security groups documentation: https://cloud-provider-aws.sigs.k8s.io/nlb_security_groups/

## Issues Found
- The Linux kOps install command pinned `v1.29.0`, which is outdated. Changed it to the official latest-release download pattern from the kOps install docs and moved the binary to `/usr/local/bin/kops`.
- The HA cluster creation command used three zones and a control-plane count of three, but did not explicitly set `--control-plane-zones`. Added the same three AZs to make the intended HA placement explicit and aligned with the kOps HA example.
- The Istio install command downloaded the latest release but then changed into `istio-1.24.0`, which would fail when the downloaded latest release is not 1.24.0. Pinned the download and directory to Istio `1.30.0`, the latest release verified during review.
- The post described Calico as the recommended CNI plugin for kops with Istio. Current kOps production docs describe Cilium as the default production-suitable networking option, while Calico remains supported. Changed the wording to "a supported CNI plugin."
- The security group guidance assumed every NLB has a load balancer security group. The AWS cloud provider docs state managed NLB security groups are opt-in. Clarified that NLBs without managed security groups require the relevant node security group rules.

## Review Notes
The tutorial is technically sound after the fixes. The exact Istio version and compatibility matrix should be rechecked when the post is updated, because Istio and Kubernetes support windows move with each minor release.
