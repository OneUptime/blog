# Groundcover Pricing with Karpenter and Spot Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Karpenter, Spot Instance, Kubernetes, Observability Cost

Description: Understand how autoscaled and interrupted Spot nodes affect Groundcover's average-host subscription, sensor coverage, and separate BYOC costs.

---

Karpenter and Amazon EC2 Spot Instances can reduce Kubernetes workload compute cost, but they do not turn a monitored Spot node into a cheaper Groundcover license unit. Groundcover's published meter is the monthly average of actively monitored nodes or hosts, regardless of node size or machine type.

Groundcover pricing and feature details in this article were checked against public documentation on 2026-07-21. Karpenter and Groundcover change over time, Spot prices vary, and contract terms can differ from public list rates. Validate the result against your Groundcover usage page and AWS bill.

## Separate Three Cost Questions

Model these independently:

1. **Workload cluster compute:** EC2 instance, storage, and network charges for Karpenter-provisioned nodes.
2. **Groundcover subscription:** contracted rate multiplied by Groundcover's measured monthly average monitored hosts.
3. **Groundcover BYOC infrastructure:** the separate cloud cost of the centralized Groundcover backend in your account.

Spot affects the first category directly. It affects the subscription only when scaling or replacement changes how many monitored nodes exist over time. It affects BYOC compute pricing directly only if the supported backend design itself uses Spot, which should not be assumed for a Groundcover-managed deployment. Node churn can also affect BYOC cost indirectly by changing telemetry volume, cardinality, storage, or query load.

On the research date, Groundcover's public pricing page displayed Pro at $30 and Enterprise at $35 per host per month, with On Premise at $50. Use your order form for actual pricing.

## Translate Autoscaling Into Average Hosts

Karpenter creates nodes for pods that Kubernetes marks unschedulable and removes or replaces nodes through processes such as consolidation, drift, expiration, and interruption handling. Groundcover deploys its sensor as a DaemonSet and requires it on every node intended for monitoring.

As Karpenter adds a node, Kubernetes schedules an eligible sensor pod on it. While that node is actively monitored, it contributes to Groundcover's node count. When the node is removed, the DaemonSet pod is garbage collected and the node stops contributing after Groundcover's metering reflects the change.

For planning, monthly average monitored nodes can be approximated as:

`monitored node-hours / hours in the billing month`

Groundcover's Billing page says the actual monthly average is calculated from its node-count measurements. Reconcile any node-hour estimate to that page, especially around nodes that start, fail initialization, or live only briefly.

The useful insight is that short peaks are time-weighted. A peak does not automatically become a full-month charge, but repeated daily bursts can still create a meaningful average.

## Spot Price Does Not Change the Host Unit

Groundcover's pricing page says a monitored Kubernetes node of any size or machine type is a host. A small Spot node and a large On-Demand node therefore count as one host each when both are actively monitored.

This creates a design tradeoff. Packing the same workload onto fewer larger nodes can lower the host-based subscription while increasing blast radius or reducing scheduling flexibility. Spreading workloads across many small Spot nodes can lower EC2 compute cost yet increase average monitored hosts. Neither configuration is universally cheaper or more reliable.

Model both curves:

`total = EC2 and cluster cost + Groundcover subscription + Groundcover BYOC cost`

Do not optimize node count solely for an observability bill. Account for availability zones, pod disruption budgets, resource fragmentation, daemon overhead, scheduling latency, and failure impact.

## Replacement Overlap Can Raise the Average

For graceful disruptions such as consolidation and drift, Karpenter can taint an old node, launch replacement capacity and wait for it to become Ready, and then drain and terminate the old node. During Spot interruption handling, Karpenter provisions replacement capacity in parallel with draining the interrupted node. During part of either transition, old and new nodes may coexist. Both can be monitored at the same time.

This overlap is correct for availability, but frequent consolidation, drift, node expiry, or Spot interruptions can add monitored node-time. The effect may be small or material depending on churn duration and fleet size. Measure it rather than assuming monthly averaging cancels it.

Track:

- provisioned node count;
- Ready node count;
- Groundcover monitored node count;
- nodes cordoned or terminating;
- replacement overlap duration;
- Karpenter disruption reason; and
- monthly average from Groundcover Billing.

Compare these on the same timeline. A billing count above Ready nodes may reflect transition timing, standalone hosts, other clusters, or metering cadence rather than an error.

## Preserve Sensor Coverage on Dynamic Nodes

Groundcover documents a default broad toleration so its sensor can run across tainted nodes, with Fargate as an exception. Karpenter NodePools often use taints, architectures, capacity types, and specialized hardware constraints. Confirm the sensor schedules and becomes Ready on every intended Linux node class.

A node can be too short-lived to provide useful coverage if image pulls, admission, networking, or sensor startup consume much of its life. Monitor time from node registration to sensor readiness. Test AMD64 and ARM64 NodePools separately and verify the kernel requirements for each image.

Do not label a cluster fully monitored just because the Groundcover data source is connected. Use a coverage ratio:

`Ready intended nodes with Ready sensor / Ready intended nodes`

Alert on gaps, but handle new-node startup grace periods so normal scale-out does not create noise.

## Treat Spot Interruptions as an Observability Test

AWS documents that Spot Instances can be interrupted when capacity is reclaimed. Karpenter can watch interruption events, taint and drain nodes, and start replacement capacity. This sequence should be visible in Kubernetes events and infrastructure telemetry.

Verify that:

- the sensor exports data before node termination;
- the centralized backend preserves data after a node disappears;
- pod and workload identity remains stable across replacement;
- alerts do not create duplicate incidents for expected drain behavior;
- dashboards distinguish workload failure from planned disruption; and
- short-lived node labels do not cause unnecessary metrics cardinality.

Spot churn may make node-level time series more numerous even if aggregate workload signals remain stable. Host-based subscription pricing is not cardinality-based, but higher cardinality can still increase customer-paid BYOC storage and query cost.

## Use Karpenter Consolidation Deliberately

Current Karpenter documentation describes consolidation policies that remove empty nodes, replace underutilized nodes, or balance savings against disruption. It also provides NodePool disruption budgets. These are reliability controls as much as cost controls.

Aggressive consolidation can reduce EC2 and Groundcover node-time when it removes genuine excess capacity. It can also increase replacement overlap and application churn when workloads move frequently. Choose `consolidateAfter`, policy, and budgets from workload behavior, then observe the effect on both cloud and Groundcover costs.

For Spot-to-Spot replacement, Karpenter applies capacity and instance-flexibility logic rather than always choosing the lowest nominal price. Do not predict savings from one Spot price alone.

## Keep BYOC Backend Policy Separate

Groundcover's managed BYOC backend is a stateful observability service using ClickHouse, VictoriaMetrics, persistent storage, and object storage according to its architecture docs. Do not apply a workload-cluster Spot policy to that backend without a supported design from Groundcover.

The backend's compute purchase model affects customer cloud cost, not the per-host license for monitored workload nodes. Availability, storage attachment, database state, and recovery requirements may make its capacity policy different from stateless application NodePools.

## Forecast With Real Histograms

Use at least a representative billing cycle of node-count data. Segment by cluster, NodePool, capacity type, architecture, and environment. Build a histogram of concurrent monitored nodes and calculate expected average, not only minimum and peak.

Run scenarios for workload growth, more small nodes, fewer large nodes, Spot interruption spikes, migration overlap, and changes to consolidation. Add BYOC infrastructure and platform labor to every scenario.

Karpenter and Spot can lower the compute part of total cost. The Groundcover subscription becomes cheaper only when they reduce monitored node-time enough to lower the monthly average, not because Spot nodes receive a different subscription rate.

## Official Documentation

- [Groundcover: Pricing](https://www.groundcover.com/pricing)
- [Groundcover: Billing](https://docs.groundcover.com/use-groundcover/billing)
- [Groundcover: Configure sensor deployment coverage](https://docs.groundcover.com/customization/customize-deployment/configuring-sensor-deployment-coverage)
- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Karpenter: Concepts](https://karpenter.sh/docs/concepts/)
- [Karpenter: Disruption](https://karpenter.sh/docs/concepts/disruption/)
- [AWS: Amazon EC2 Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
