# How to Combine On-Premises and Cloud Costs in One Showback Model

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Showback, Hybrid Cloud, Data Center

Description: Combine on-premises and public cloud costs in one showback model without hiding differences in billing, depreciation, capacity, and allocation.

---

A hybrid showback model should make on-premises and cloud services comparable without pretending their economics are identical. Public cloud supplies rated usage and invoices. A data center usually starts with purchased capacity, depreciation schedules, contracts, facilities, and operational labor. The common model must preserve those differences while mapping both environments to the same workloads and business owners.

The FinOps Foundation now applies the FinOps Framework across technology categories, including public cloud and data centers. Its data center guidance calls for visibility into hardware depreciation, power, cooling, facilities, software, and staff, together with consumption-based service reporting. FOCUS provides a common cost and usage schema that can support this combined view.

## Define the reporting purpose first

Do not mix three different questions into an unlabeled total:

- **Cash:** When did the organization pay for hardware, commitments, contracts, or cloud invoices?
- **Accounting:** When does Finance recognize depreciation, amortization, and operating expense?
- **Consumption economics:** What cost should a workload understand for the capacity and services it consumed?

Cloud `BilledCost` belongs in invoice and cash controls. Cloud `EffectiveCost` is generally more useful for commitment-aware ownership because it associates the applicable portion of prepaid purchases with covered usage. On-premises cost should follow Finance-approved depreciation and expense treatment, then use an internal rate or allocation policy for consumption showback.

Store these measures separately. A showback can use the consumption view while retaining a bridge to the accounting view and source payments.

## Build complete source cost pools

For public cloud, ingest final and current-period provider billing exports. Preserve billed, effective or amortized, list, and contracted measures where available. Keep tax, support, credits, marketplace charges, and commitment purchases distinguishable.

For each data center service, gather the costs that make the service possible:

- hardware depreciation or lease cost
- storage and network equipment
- virtualization, operating system, database, and platform licensing
- hardware and software support
- power and cooling
- facility space and related operations
- platform and facility labor approved for inclusion
- connectivity and shared network services
- backup, security, monitoring, and management platforms

The precise boundary is an accounting and management-policy decision. Document it. If labor is included for the data center but excluded from cloud application cost, a cloud-versus-on-premises comparison is not a like-for-like total cost comparison.

## Turn data center pools into services

Do not allocate a building or hardware invoice directly to applications. Define internal services that consumers recognize, such as:

- general-purpose virtual CPU and memory
- GPU capacity
- block or file storage
- database platform
- backup retention
- internal network transfer
- managed Kubernetes

For each service, define the consumed unit, service level, eligible capacity, cost-pool boundary, rate period, and treatment of unused capacity. Example units include vCPU-hours, GiB-months, GPU-hours, or database-instance-hours.

A basic internal rate is:

```text
service unit rate
= finance-approved service cost pool
/ practical capacity units for the rate period
```

Practical capacity is a governed denominator. It can reflect available capacity after required resilience and platform reserve rather than theoretical hardware maximum. Publish the definition and do not change it merely to force an attractive rate.

## Keep idle capacity visible

Most data center costs continue even when workloads are quiet. Public cloud can also contain idle resources and unused commitments, but the source and timing differ.

Choose one transparent data center policy:

- allocate consumed units at the rate and retain unused-capacity cost centrally
- allocate unused capacity to a platform owner
- spread an approved portion of reserve across consumers
- calculate a full-recovery rate using a planned-utilization denominator

Whichever policy is chosen, show consumed cost and idle or reserve cost separately. If every monthly cost is divided only among the workloads that happened to run, a drop in demand raises their apparent unit rate and hides the capacity decision.

## Use a common business identity

Create an effective-dated mapping that connects both environments to stable dimensions:

```text
resource or service instance
  -> workload_id
  -> application_id
  -> product_id
  -> team_id
  -> cost_center_id
  -> environment
```

Cloud evidence can include accounts, subscriptions, projects, resource IDs, tags, and Kubernetes labels. On-premises evidence can include CMDB relationships, virtualization folders, clusters, host groups, storage volumes, and service catalog records.

Do not depend on display names as keys. Ownership changes and reorganizations require valid-from and valid-to dates so historical reports do not silently move old cost to a new owner.

## Normalize both sources with FOCUS

FOCUS is designed to normalize cost and usage across cloud, data center, SaaS, and other technology sources. A data center can publish an internal FOCUS-aligned dataset even though no external provider generated an invoice.

A practical mapping includes:

| FOCUS concept | Public cloud | On-premises example |
| --- | --- | --- |
| Provider | AWS, Microsoft, or Google | Internal infrastructure organization |
| Billing account | Provider billing scope | Entity owning the data center estate |
| Subaccount | Account, subscription, or project | Data center, business unit, or service scope |
| Service | Provider service | Internal compute, storage, or database service |
| Resource | Provider resource ID | VM, host, volume, cluster, or service instance |
| Consumed quantity | Provider-metered usage | Metered vCPU-hours, GiB-months, or other units |
| Effective cost | Commitment-aware cost | Allocated internal service cost for the period |

Preserve source-system identifiers and add extension columns for depreciation cohort, asset class, facility, service level, and meter provenance when needed. Conformance should not erase evidence required for audit or optimization.

## Allocate direct and shared costs in stages

First assign directly identifiable cloud resources and on-premises service consumption. Then create named shared pools for platform, network, backup, security, and operational services.

Use the closest defensible demand driver for each pool:

- metered CPU and memory for shared compute
- capacity and operations for storage
- bytes or flow data for network where reliable
- protected capacity and retention for backup
- workload consumption for platform services
- a fixed or proportional rule when metering is unavailable

Retain unallocated cost when ownership or driver coverage is incomplete. Do not scale known workloads to absorb unknown usage, because that turns a data-quality problem into a false charge.

## Compare services with context

A unit rate alone is not a placement decision. Record the service characteristics that affect value:

- availability and disaster recovery
- performance class
- security and compliance controls
- support and operational responsibility
- scaling speed and minimum commitment
- data movement constraints
- reserve-capacity policy

An on-premises rate based on already purchased capacity and a cloud rate based on marginal consumption answer different planning questions. Show current consumption cost, full service cost, and relevant future or avoidable cost as distinct measures when making placement decisions.

## Reconcile each source before the combined report

Run separate controls first:

1. Reconcile cloud billed cost to each provider invoice and effective cost to native amortized views.
2. Reconcile data center pools to Finance-approved depreciation, contracts, expense, and labor sources.
3. Confirm internal service rates recover exactly the intended pool or leave a named idle, reserve, or variance amount.
4. Confirm allocation does not change either source pool.
5. Convert currencies only through a governed foreign-exchange table, while retaining original amounts.
6. Aggregate the sources by the shared business identity.

The resulting report should show public cloud, on-premises direct, shared service, idle or reserve, and unallocated components separately. A combined total is useful only when recipients can still see how each part was measured and governed.

## Official documentation

- [FinOps Foundation: FinOps for Data Center](https://www.finops.org/framework/technology-categories/data-center/)
- [FinOps Foundation: Practical Data Center Cost Modeling and FOCUS Alignment](https://www.finops.org/wg/finops-for-data-center-practical-cost-modeling-focus-alignment/)
- [FinOps Foundation: Allocation](https://www.finops.org/framework/capabilities/allocation/)
- [FOCUS: The unifying language for technology value](https://focus.finops.org/)
- [FOCUS specification v1.4](https://focus.finops.org/focus-specification/v1-4/)
