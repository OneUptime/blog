# Validation Summary: How to Size Kubernetes Termination Grace Periods for Spot Nodes

## Status

validated

## Post Type

Guide

## Technologies Covered

- EC2 Spot interruption notices
- Kubernetes Pod lifecycle and disruption budgets
- Karpenter node termination deadlines
- AWS FIS

## Sources Consulted

- [Spot interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [EC2 hibernation behavior](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html)
- [Kubernetes Pod termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)
- [Kubernetes disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Karpenter disruption](https://karpenter.sh/docs/concepts/disruption/)
- [FIS Spot interruption tutorial](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html)

## Issues Found

No technical issues found.

## Review Notes

- Confirmed the two AWS pages still disagree about hibernation notice timing, supporting the article's explicit uncertainty.
- Recomputed the illustrative allowances: 120 - 8 - 17 - 20 = 75 seconds available; 10 + 40 + 10 + 10 = 70 seconds configured.
- Verified the distinction between EC2, Pod, and node-controller deadlines and the NodeClaim drift caveat. The YAML fragment parsed; actual delay distributions and concurrent checkpoint throughput were not measured.
