# Validation Summary: How to Switch kube-proxy from iptables to IPVS Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes kube-proxy
- IPVS
- iptables
- nftables
- kubeadm
- Amazon EKS
- Google GKE
- Azure AKS
- kOps
- Linux kernel modules
- Prometheus metrics

## Sources Consulted
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes kube-proxy configuration API v1alpha1: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Amazon EKS best practices for running kube-proxy in IPVS mode: https://docs.aws.amazon.com/eks/latest/best-practices/ipvs.html
- Google Cloud GKE Dataplane V2 concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud using GKE Dataplane V2: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- Microsoft Learn AKS kube-proxy configuration: https://learn.microsoft.com/en-us/azure/aks/configure-kube-proxy
- kOps Cluster resource documentation: https://kops.sigs.k8s.io/cluster_spec/
- kOps API reference for KubeProxyConfig: https://pkg.go.dev/k8s.io/kops/pkg/apis/kops

## Issues Found
- The post presented IPVS as an unqualified current best-practice migration target. Upstream Kubernetes marks IPVS proxy mode as deprecated starting in Kubernetes 1.35 and recommends nftables as the replacement, so I added a current-version caveat and updated the closing recommendation.
- The performance section claimed IPVS rule updates are O(1) and gave unsupported exact service-count thresholds. I softened these to match the official explanation that IPVS uses hash tables and improves sync and packet-processing behavior at scale.
- The IPVS module examples loaded only a subset of scheduler modules while later recommending schedulers such as `lc`, `dh`, `sed`, and `nq`. I added the matching modules and fixed the immediate loading command.
- The EKS section incorrectly mentioned editing the `aws-node` DaemonSet and omitted the scheduler and conflict-resolution options from the official EKS add-on command. I changed it to update the `kube-proxy` add-on or `kube-proxy-config` ConfigMap and corrected the AWS CLI example.
- The GKE section showed a network-policy update command that does not switch kube-proxy to IPVS. I replaced it with GKE Dataplane V2 guidance and the official new-cluster creation command, noting that Dataplane V2 is not enabled in place on existing clusters.
- The AKS section used Azure CNI configuration as if it changed kube-proxy mode. I replaced it with the AKS preview `--kube-proxy-config` workflow and a valid IPVS config example.
- The kOps snippet used a nested `ipvs.scheduler` shape that is not the kOps API. I changed it to `proxyMode: ipvs` and `ipvsScheduler: rr`.
- The "kernel version too old" advice gave an unsupported hard minimum. I replaced it with a requirement to use a supported distribution kernel with IPVS modules available.

## Review Notes
- The post remains technically relevant, but IPVS is now mostly legacy guidance for environments that already standardize on it. Future revisions should consider a separate nftables migration guide for Kubernetes 1.33+ and especially 1.35+ clusters.
