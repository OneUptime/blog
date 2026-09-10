# Validation Summary: How to Spread Kubernetes Replicas Across Spot Capacity Pools

## Status

validated

## Post Type

Guide

## Technologies Covered

- Kubernetes topology spread and node affinity
- Karpenter NodePools
- EC2 Spot capacity pools

## Sources Consulted

- [EC2 Spot concepts](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [Kubernetes topology spread](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Kubernetes 1.33 topology spread reference](https://v1-33.docs.kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Kubernetes node assignment](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Karpenter NodePools](https://karpenter.sh/docs/concepts/nodepools/)

## Issues Found

No technical issues found.

## Review Notes

- Verified the capacity-pool definition and minDomains/global-minimum behavior; node inclusion policies became stable in Kubernetes 1.33.
- Checked the hard zone rule, preferred hostname rule, and NodePool requirement keys. Their interaction can intentionally leave a replica Pending; the article correctly separates eligible capacity from actual placement.
- Both YAML fragments parsed successfully and shell snippets passed bash -n. No API server admission or autoscaler provisioning experiment was performed.
