# Validation Summary: Groundcover Pricing with Karpenter and Spot Nodes

## Status

validated

## Post Type

Technical guide and cost-planning reference

## Technologies Covered

- Groundcover pricing, billing, eBPF sensors, and BYOC architecture
- Karpenter NodePools, consolidation, drift, expiration, and interruption handling
- Amazon EC2 Spot Instances
- Kubernetes DaemonSets, nodes, taints, tolerations, and PodDisruptionBudgets
- ClickHouse, VictoriaMetrics, persistent volumes, and object storage

## Sources Consulted

- [Groundcover: Pricing](https://www.groundcover.com/pricing)
- [Groundcover: Billing](https://docs.groundcover.com/use-groundcover/billing)
- [Groundcover: Configuring sensor Deployment on Kubernetes](https://docs.groundcover.com/customization/customize-deployment/configuring-sensor-deployment-coverage)
- [Groundcover: Architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover: BYOC - Bring Your Own Cloud](https://docs.groundcover.com/architecture/byoc)
- [Groundcover: BYOC high availability](https://docs.groundcover.com/architecture/byoc/high-availability)
- [Groundcover: BYOC disaster recovery](https://docs.groundcover.com/architecture/byoc/disaster-recovery)
- [Groundcover: Kernel requirements for eBPF sensor](https://docs.groundcover.com/getting-started/requirements/kernel-requirements-for-ebpf-sensor)
- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Karpenter: Concepts](https://karpenter.sh/docs/concepts/)
- [Karpenter: NodePools](https://karpenter.sh/docs/concepts/nodepools/)
- [Karpenter: Disruption](https://karpenter.sh/docs/concepts/disruption/)
- [AWS: Amazon EC2 Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)

## Issues Found

- The cost-separation section said BYOC infrastructure was affected only when the backend itself used Spot. This omitted indirect effects from Spot-driven node churn. The text now distinguishes direct backend compute pricing from possible changes in telemetry volume, cardinality, storage, and query load.
- The replacement-overlap section described Karpenter's disruption sequence too generally. It now reflects the documented distinction: graceful consolidation and drift pre-spin replacement capacity and wait for readiness, while Spot interruption handling provisions replacement capacity in parallel with draining the interrupted node.
- The BYOC section referred to database quorum requirements. Groundcover's current high-availability documentation says database redundancy is still forthcoming, so the wording was changed to the accurate, implementation-neutral "database state."
- The conclusion said "Groundcover becomes cheaper," which could conflate the host subscription with separately billed BYOC infrastructure. It now specifically states that the Groundcover subscription becomes cheaper when average monitored node usage falls.

## Review Notes

- The public pricing page showed Pro at $30, Enterprise at $35, and On Premise at $50 per host per month on the validation date. Contracted pricing may differ, as the post already notes.
- Groundcover's public pricing page describes Pro as BYOC, while its BYOC architecture page says BYOC is available only on Enterprise. Because the official sources are inconsistent, readers should confirm deployment-mode eligibility in their order form or with Groundcover.
- Karpenter's reviewed documentation was the current v1.14 documentation. The post does not pin a Karpenter version, so policy options and defaults should be rechecked when upgrading.
