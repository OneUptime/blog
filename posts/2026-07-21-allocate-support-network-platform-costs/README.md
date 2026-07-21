# Allocating Support, Networking, and Platform Costs Across Cloud Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Shared Costs, Cloud Cost Allocation, Showback, Platform Engineering

Description: Allocate cloud support, shared networking, and internal platform costs with causal drivers, explicit pools, and reconciled showback rules.

---

Direct cloud costs are usually the easiest part of showback. A database in a dedicated project with a valid service label has a clear owner. Support plans, transit networks, observability, shared Kubernetes clusters, and platform services do not. They benefit several teams and often arrive on billing rows with no useful resource tag.

The answer is not one organization-wide percentage. Build separate cost pools, assign each pool a driver related to how teams cause or benefit from the cost, and keep the rules visible. The FinOps Foundation identifies fixed, proportional, proxy-based, and centrally funded treatments for shared costs. Most organizations need a mix.

## Define Pools Before Choosing Drivers

Start by grouping costs according to what creates them. A useful pool register might contain:

| Pool | Examples | Candidate driver |
|---|---|---|
| Cloud support | Provider support fees | Eligible direct cloud spend or documented coverage |
| Shared network baseline | Hub, transit, firewall, DNS, fixed gateway cost | Attachments, tenants, or fixed shares |
| Variable network | Processed bytes, egress, requests, connections | Metered traffic or flow data |
| Shared platform | Cluster, CI runners, registry, secrets, observability | Requests, jobs, artifacts, telemetry, or active tenants |
| Strategic overhead | Capacity or capability funded for organizational goals | Central budget with showback |

Record exactly which billing rows enter each pool. Include provider, billing account, service, charge type, tags, credits, refunds, and tax treatment. A rule cannot be audited if the source is just "networking total from the dashboard."

Use one governed cost basis. For operational showback, FOCUS `EffectiveCost` is useful because it includes negotiated and commitment discounts plus applicable amortized purchases. Keep `BilledCost` for invoice reconciliation. If a shared pool is built from another internal system, document how it maps to the cloud billing total.

## Follow a Direct-First Principle

Allocate a charge directly whenever reliable evidence identifies its consumer. Put only the residual into a shared pool.

Examples include:

- a dedicated load balancer assigned to its service;
- a disk or snapshot joined to an owning workload;
- a network circuit dedicated to one business unit;
- logging ingestion labeled with a service ID; or
- a CI runner reserved for one team.

Direct-first allocation preserves incentives. If all network cost is pooled by total cloud spend, a traffic-heavy service sees little relationship between architecture and cost. If dedicated egress and load-balancer charges follow that service, engineers can act on the signal.

Do not overstate precision. Cloud billing may attach traffic cost to a source, destination, or intermediary depending on the provider and service. Reconcile provider usage types with network telemetry before deciding which side should pay.

## Allocate Support With the Fee's Logic

Support plans often cover a broad billing scope, and their charges may depend on spend or contractual terms. Use the provider's invoice and support-plan documentation to identify the actual calculation base. Avoid applying a generic support percentage copied from another provider or agreement.

A defensible internal model usually chooses one of these treatments:

1. **Proportional to eligible direct effective cost:** useful when support cost broadly follows covered cloud consumption.
2. **Fixed base plus variable share:** useful when every team receives access but larger consumers create more support exposure.
3. **Incident or case-based allocation:** useful as a supplemental view when reliable case metadata exists, but it may not represent the value of ongoing coverage.
4. **Central funding:** useful when support is an enterprise capability and reallocating it would not improve decisions.

Exclude costs the provider excludes from the support calculation when that evidence is available. Decide how credits, marketplace purchases, taxes, and commitment purchases affect the internal base. Publish those decisions.

Do not allocate support in proportion to a total that already contains allocated support. Use a pre-allocation base to avoid circular calculations.

## Split Networking Into Fixed and Variable Components

Networking is rarely one homogeneous pool. Separate costs that arise from being connected from costs that scale with traffic.

Fixed or slowly changing components can include transit hubs, shared firewalls, VPN gateways, DNS infrastructure, and reserved circuits. Candidate drivers include the number of active attachments, environments, accounts, or an approved fixed share. A base allocation recognizes that a tenant receives connectivity even when monthly traffic is low.

Variable components can include processed data, internet egress, inter-zone or inter-region transfer, NAT processing, and request-based charges. Allocate these with provider billing dimensions, flow logs, gateway metrics, or service mesh and ingress telemetry where they are reliable.

A hybrid formula is often clearer:

`team network cost = direct network charges + fixed access share + measured variable share`

Define how internal traffic is treated. Charging both source and destination the full amount double counts cost. Choose source-pays, destination-pays, or a documented split for each flow class. Keep telemetry retention aligned with the billing period so a late allocation can be reproduced.

Some networking cost cannot be attributed safely, such as a provider adjustment with no usable dimension. Leave it in an unallocated network bucket until a rule is approved rather than distributing it through an unrelated metric.

## Match Platform Drivers to the Service

"Platform" can include very different services, so one driver is unlikely to be fair.

- Shared Kubernetes compute can follow time-weighted CPU and memory requests or a published request-and-usage model, with idle shown separately.
- CI execution can follow runner minutes, machine class, or jobs when those metrics represent consumed capacity.
- Artifact storage can follow stored bytes and retention; transfer can follow delivered bytes.
- Observability can follow ingested, retained, or queried telemetry according to how the vendor charges and what teams control.
- A secrets or deployment control plane may use a fixed tenant fee plus a usage component.

Separate platform cloud spend from any labor or software cost included in a broader total-cost-of-service model. If internal staffing is included, state the source, accounting treatment, and allocation policy. Do not mix it into provider cloud cost without disclosure.

Show platform owners both recovered cost and efficiency residuals. Idle capacity, unallocated assets, and deliberate headroom should remain visible so a fully loaded team rate does not hide optimization opportunities.

## Choose Simplicity When Detail Has Little Value

A more granular driver is not automatically fairer. It creates instrumentation, storage, reconciliation, and dispute overhead. Use the most causal reliable driver whose operation costs less than the decisions it improves.

An even split can be reasonable for a small fixed service used similarly by all teams. A fixed percentage can reflect an agreed funding model. A proportional spend driver is easy to run for broad benefits. A telemetry driver is worthwhile when consumption varies materially and teams can change it.

Document the reason for the chosen resolution. Revisit it when the pool grows, usage becomes uneven, or teams report that the allocation does not match control.

## Execute Rules in a Controlled Order

Shared pools can depend on one another. Networking may support a platform that is then allocated to products. Establish a directed order and prevent cycles:

1. normalize and reconcile direct cloud cost;
2. identify and remove direct charges from shared pools;
3. allocate foundational pools such as network to direct consumers and platforms;
4. add those inputs to platform cost;
5. allocate platform pools to product teams; and
6. report central and unallocated residuals.

Store pre-allocation amount, driver quantity, driver total, rate, recipient amount, and rule version. Confirm that recipient allocations sum to each pool, allowing only documented rounding treatment.

Provider-native allocation features can help but have different output semantics. AWS Cost Category split charge rules support proportional, fixed, and even methods. AWS documents that the split results appear on the Cost Categories details page but do not affect Cost and Usage Reports or Cost Explorer. Azure Cost Management allocation rules can distribute shared service cost to subscriptions, resource groups, or tags and surface entries in exports, but they do not change the invoice or billing responsibility. For Google Cloud, detailed Cloud Billing export to BigQuery provides line-item data for building governed custom allocations.

## Make the Report Explain the Charge

For every team, show direct cost and each shared pool as separate lines. Include the driver quantity and rate where practical. A team should be able to answer, "Why did our platform allocation rise?" without asking FinOps to reconstruct a query.

Track disputes, rule changes, unallocated residuals, and the share of each pool based on estimates. Run changes in shadow mode before they affect formal chargeback. Give pool owners and recipient teams a review process, and use effective dates rather than silently recalculating closed periods.

A sound shared-cost model does not distribute every dollar through the same convenient denominator. It preserves the cause of direct cost, uses fit-for-purpose drivers for the residual, and leaves centrally funded or uncertain cost visible. That is what makes support, networking, and platform allocations credible enough to influence engineering decisions.

## Official Documentation

- [FinOps Foundation: Allocation capability](https://www.finops.org/framework/capabilities/allocation/)
- [FOCUS Specification 1.4](https://focus.finops.org/focus-specification/v1-4/)
- [AWS: Splitting charges within Cost Categories](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/splitcharge-cost-categories.html)
- [Azure: Create and manage cost allocation rules](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/allocate-costs)
- [Google Cloud: Export Cloud Billing data to BigQuery](https://cloud.google.com/billing/docs/how-to/export-data-bigquery)
