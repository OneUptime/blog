# Validation Summary: How to Set Up Flagger with Linkerd on EKS Step by Step

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- eksctl
- Kubernetes
- kubectl
- Helm
- Linkerd
- Linkerd Viz
- Linkerd SMI
- Flagger
- SMI TrafficSplit
- Prometheus metrics

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- eksctl cluster creation and managed node group documentation: https://eksctl.io/usage/creating-and-managing-clusters/ and https://eksctl.io/usage/nodegroup-managed/
- Linkerd supported Kubernetes versions: https://linkerd.io/2-edge/reference/k8s-versions/
- Linkerd SMI extension documentation: https://linkerd.io/2.19/tasks/linkerd-smi/
- Flagger Linkerd canary deployment tutorial: https://docs.flagger.app/main/tutorials/linkerd-progressive-delivery
- Flagger install documentation: https://docs.flagger.app/main/install/flagger-install-on-kubernetes
- Flagger metrics documentation: https://docs.flagger.app/main/usage/metrics
- curl official Docker image documentation: https://hub.docker.com/r/curlimages/curl

## Issues Found
- The EKS cluster command used Kubernetes `1.29`, which is no longer available for new Amazon EKS clusters on the validation date. Updated the command to use Kubernetes `1.34`, which is in Amazon EKS standard support and supported by current Linkerd releases.
- The Linkerd setup omitted the Linkerd SMI extension, which is required for the TrafficSplit-based Flagger flow on current Linkerd versions. Added the SMI CLI install, cluster install, and check commands.
- The canary rollout steps did not generate any requests during analysis, leaving Flagger without Linkerd metrics to evaluate in a fresh demo environment. Added a small curl-based load pod and cleanup command.

## Review Notes
The Linkerd SMI extension and TrafficSplit flow are still documented and usable, but Linkerd marks the SMI extension as deprecated and recommends newer routing approaches for long-term setups. The post is valid as a TrafficSplit-focused tutorial after the fixes above.
