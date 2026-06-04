# Validation Summary: How to Set Up Kubernetes Network Policies That Allow Only Specific CIDR Ranges

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes `networking.k8s.io/v1` API
- CIDR and `ipBlock` policy rules
- `kubectl`
- CNI network policy implementations
- Cilium policy monitoring
- AWS S3 public IP ranges

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg bpf policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/
- AWS IP address ranges documentation: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html
- AWS IP range JSON syntax documentation: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-syntax.html
- AWS current IP ranges feed: https://ip-ranges.amazonaws.com/ip-ranges.json

## Issues Found
- The post did not mention that Kubernetes recommends `ipBlock` for cluster-external IPs and that ingress source IP matching can be affected by Service, load balancer, or CNI source-address rewriting. Added a short caveat in the CIDR explanation.
- The default deny wording said no ingress traffic reaches pods after applying the policy. Kubernetes NetworkPolicies are additive, and selected pods can still receive traffic allowed by other policies. Updated the wording to say the pods are isolated for ingress unless another NetworkPolicy allows traffic.
- The testing section implied that `kubectl run` creates a test pod in an allowed CIDR range. That is not generally true, and `ipBlock` rules are not intended for arbitrary in-cluster pod IP testing. Updated the testing guidance to use a host in the allowed external CIDR for ingress tests.
- The Cilium monitoring commands used `cilium monitor` and `cilium policy get`. Current Cilium docs show `cilium-dbg monitor --type drop` for drop inspection and `cilium-dbg bpf policy get --all` for policy map entries. Updated both commands and the accompanying comment.

## Review Notes
The YAML snippets parsed successfully as `networking.k8s.io/v1` NetworkPolicy manifests. The AWS S3 CIDR example `52.216.0.0/15` is present in the current AWS `ip-ranges.json` feed for service `S3` in `us-east-1`, but AWS IP ranges are dynamic and should be generated from the feed for production policy maintenance.
