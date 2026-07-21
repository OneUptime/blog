# Groundcover Cost at Scale: Nodes, Storage, and BYOC Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Observability Cost, BYOC, Kubernetes, FinOps

Description: Model Groundcover total cost at scale by separating monitored-host subscription fees from customer-paid BYOC compute, storage, and operations.

---

Groundcover's public pricing is based on monitored hosts rather than ingested bytes, but that is only the subscription meter. In Bring Your Own Cloud (BYOC), the backend runs in the customer's cloud account, so compute, block storage, object storage, load balancing, snapshots, and related provider charges remain part of total cost.

Groundcover pricing and architecture details in this article were researched from public documentation on 2026-07-21. Prices, plan names, entitlements, and deployment requirements can change. Treat the published page as a planning input, not a quote or contract.

## Start With the Published Subscription Meter

On the research date, Groundcover's public pricing page displayed these list rates:

| Plan | Displayed rate | Deployment label on pricing page |
|---|---:|---|
| Free | $0 | BYOC |
| Pro | $30 per host per month | BYOC |
| Enterprise | $35 per host per month | BYOC |
| On Premise | $50 per host per month | Full On-Prem |

The same page says billing uses the monthly average number of Kubernetes nodes or Linux hosts actively monitored by the Groundcover sensor. Host size and machine type do not change that meter. Groundcover's Billing documentation says its usage view reports node count over time and monthly average node count.

The planning formula is:

`subscription = contracted host rate x billable monthly average hosts`

Use the contracted rate, not a public list rate, for a business case. Account for billing frequency, taxes, marketplace terms, minimums, support, discounts, and custom terms in the order form.

The public pages use BYOC entitlement terminology inconsistently as of the research date. The pricing page labels Free, Pro, and Enterprise as BYOC, while a managed BYOC architecture page says BYOC is Enterprise-only. Confirm whether the selected plan includes managed BYOC or a different self-managed mode instead of resolving that discrepancy by assumption.

## Understand Monthly Average Hosts

An average host meter behaves differently from a fixed peak or per-byte meter. If a cluster scales during business hours and contracts overnight, the observed host count over the month determines the average. Short-lived peaks contribute for the time they exist instead of automatically becoming the full-month count.

For an independent estimate, calculate monitored node-hours and divide by hours in the billing period. Groundcover's actual bill is based on its own node-count measurements, so reconcile your estimate with the Billing usage page.

Include every monitored environment in the inventory:

- production, staging, development, and test clusters;
- separate clusters by region or business unit;
- transient autoscaled nodes;
- GPU and other specialized nodes;
- standalone Linux hosts; and
- migration overlap where old and new environments are monitored together.

Groundcover documents sensors on every monitored Kubernetes node, with Fargate excluded from default sensor coverage. A workload that cannot run the sensor should not be counted as covered merely because its cluster is connected.

## Add BYOC Infrastructure as a Separate Cost Center

Groundcover's BYOC architecture places a centralized backend in a customer-owned cloud environment and uses a managed control plane to configure and maintain it. Setup guides describe cloud resources such as a managed Kubernetes service, VPC or virtual network, object storage, and load balancing.

The customer therefore has at least two cost components, even if marketplace billing puts them on one invoice:

`Groundcover subscription + cloud-provider cost of Groundcover BYOC resources`

Tag the dedicated account, project, subscription, cluster, volumes, buckets, load balancers, snapshots, and network paths so this cost can be measured directly. Do not estimate backend infrastructure only as a percentage of the observability license.

The Groundcover pricing calculator includes a vendor estimate for BYOC hosting, but calculator output depends on its assumptions. Replace it with observed cloud billing during a proof of concept and include provider discounts and taxes consistently.

## Know What Drives Backend Compute

Groundcover's detailed architecture lists ingestion, transformation, monitoring, and database workloads in the backend. The current Requirements page says Groundcover sizes ClickHouse resources according to data usage. Backend demand can therefore respond to telemetry throughput and query patterns even though the license does not charge per byte.

Measure at least:

- CPU and memory requests, usage, and peak throttling;
- node count and machine families in the backend cluster;
- ingestion throughput by signal;
- active metrics series and label cardinality;
- trace and log processing rates;
- monitor evaluation and dashboard query concurrency; and
- high-availability and replica overhead.

Do not publish a universal "cost per gigabyte" from one trial. Compression, event shape, labels, parsing, indexes, replicas, retention, query load, and cloud prices all affect the result.

## Model Storage by Signal

Groundcover documents ClickHouse for persistent logs, traces, and Kubernetes events, and VictoriaMetrics for metrics. Its disaster-recovery documentation says older logs, traces, and events can be offloaded to object storage, while metrics are not currently offloaded through that mechanism.

That creates several cloud cost lines:

- database persistent volumes;
- object storage capacity;
- storage operations and retrieval;
- volume and database snapshots;
- cross-zone or cross-region replication if configured;
- backup retention; and
- network transfer between monitored environments and the backend.

A useful estimate for each signal is:

`retained bytes = daily source bytes x retained days x observed storage factor x replica factor`

The storage factor should come from a representative test and include compression plus index or metadata overhead. Use separate factors for logs, traces, metrics, and events. Metrics cardinality is often better modeled from active series, samples, and retention than raw wire bytes.

Groundcover supports simple and advanced retention policies for logs, traces, and events, while metrics currently use a global retention strategy according to its docs. Retention can lower customer-paid storage even when it does not change the host subscription.

## Include Network and Cloud Service Charges

BYOC keeps the data plane in the customer's environment, but "in your cloud" does not mean every byte moves for free. Monitor traffic between clusters, regions, availability zones, and the centralized backend. Include load-balancer processing, NAT, public endpoints where configured, object-storage operations, and data retrieval.

Topology matters. A multi-region organization with one backend may trade simpler operations for inter-region transfer and failure-domain considerations. A separate backend per region could change both infrastructure and subscription terms, so validate supported architecture with Groundcover before modeling it.

Use the chosen cloud provider's official calculator and actual billing export. Apply negotiated discounts or commitments only when the BYOC resources are eligible.

## Add Platform Labor and Risk

Groundcover describes managed BYOC as provisioned and maintained by its control plane, including automated scaling, health monitoring, and security patching. That can reduce work compared with self-operating a multi-component open source stack, but it does not eliminate customer responsibilities.

Include time for:

- cloud account or project setup and IAM review;
- network and private-access design;
- security, legal, procurement, and vendor-risk review;
- sensor rollout and compatibility testing;
- retention, redaction, access, dashboard, and monitor governance;
- cloud budgets, tagging, and cost allocation;
- incident coordination and capacity escalation; and
- migration, training, and eventual decommissioning of old tools.

Measure labor rather than assigning it a convenient percentage. Separate one-time migration work from recurring operation.

## Build a Complete TCO Worksheet

Use a monthly model with these rows:

| Cost group | Primary driver | Source of truth |
|---|---|---|
| Subscription | Average monitored hosts x contract rate | Groundcover bill and usage page |
| Backend compute | Workload requests, usage, replicas, uptime | Cloud bill and Kubernetes metrics |
| Block storage | Provisioned capacity and snapshots | Cloud bill |
| Object storage | Retained bytes, operations, retrieval | Cloud bill |
| Network | Transfer path and processed bytes | Cloud bill and flow data |
| Platform labor | Measured recurring and migration effort | Work tracking and staffing cost |
| Existing stack overlap | Dual-run duration and data duplication | Vendor and cloud bills |

Show expected, high, and low cases. Vary host growth, telemetry growth, retention, query load, replication, and cloud rates independently. Host-based licensing removes a per-byte subscription dimension, but it does not make the storage sensitivity disappear.

## Control Cost Without Hiding Incidents

Start with data policy, not indiscriminate dropping. Remove noisy health checks and duplicate logs, cap unsafe label cardinality, apply approved trace sampling, and retain high-value errors longer than routine traffic. Groundcover documents collection filters, sampling controls, custom retention, and storage customization.

Review monitored coverage deliberately. Excluding a cluster can reduce host licensing but creates a visibility boundary. Record the service-level and incident risk before treating it as a savings action.

At scale, Groundcover cost is predictable only when both meters are visible: monitored hosts for the subscription and data workload for customer-owned infrastructure. A credible forecast keeps them separate, then adds the people and risk needed to operate the whole service.

## Official Documentation

- [Groundcover: Pricing](https://www.groundcover.com/pricing)
- [Groundcover: Billing](https://docs.groundcover.com/use-groundcover/billing)
- [Groundcover: Architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover: BYOC architecture](https://docs.groundcover.com/architecture/byoc)
- [Groundcover: Disaster recovery](https://docs.groundcover.com/architecture/byoc/disaster-recovery)
- [Groundcover: Custom data retention](https://docs.groundcover.com/customization/customize-usage/custom-data-retention)
- [AWS Pricing Calculator](https://calculator.aws/)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
