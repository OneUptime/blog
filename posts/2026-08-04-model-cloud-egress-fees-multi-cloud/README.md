# Model Cloud Egress Fees Before Building Multi-Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Egress, Multi-Cloud, FinOps, Network Pricing, Data Transfer, Cloud Architecture, Cost Modeling

Description: Model billable network paths, replication, retries, responses, and migration bursts with current provider rates before multi-cloud traffic becomes an architectural tax.

---

Multi-cloud diagrams often draw one arrow between providers. Bills see a set of metered paths: source data transfer, destination processing, load balancers, NAT, private connectivity, inter-zone traffic, requests, and the response direction.

Egress price is not one global constant. It depends on provider, source service, source location, destination, public or private path, volume tier, contract, and date. Build a model from traffic flows and current official price tables, then reconcile it with billing exports.

## Draw a Metered Traffic Graph

Represent every recurring and recovery path as a directed edge:

```text
AWS application -> Azure database
Azure database  -> AWS application responses
AWS object store -> GCP analytics import
GCP analytics -> users
region A -> region B replication
zone 1 -> zone 2 application calls
private link -> interconnect -> target VPC
```

For each edge record:

```yaml
name: source-api-to-target-database
source_provider: gcp
source_service: compute-engine
source_location: europe-west1
destination: azure/uksouth
path: public_internet
monthly_gib: 22000
peak_gib_per_hour: 120
response_ratio: 3.4
retry_multiplier: 1.03
compression_factor: 0.62
```

The response is a separate edge. A small database request can return a large result, so counting only request payloads can reverse the estimate.

## Use the Full Cost Equation

For one edge and one month:

```text
billable volume
  = logical bytes
  * serialization factor
  * compression factor
  * retry and replay factor
  * replication fan-out

edge cost
  = source transfer charge
  + destination ingress or processing charge
  + intermediary per-GB charges
  + request charges
  + fixed connection charges
```

Ingress is commonly listed as free on broad provider network pages, but the resource receiving or processing traffic can still charge. Load balancers, NAT gateways, private endpoints, cross-cloud interconnects, and data services have their own price pages.

Use GiB or GB consistently. Provider pages do not all use the same unit. Preserve the price table's unit in raw inputs and convert once in the model.

## Model Tiered Prices Correctly

Do not multiply all volume by the last tier's rate. Apply each bracket:

```python
def tiered_cost(volume_gib, tiers):
    # tiers contains ordered (capacity_gib, rate_per_gib) values.
    remaining = volume_gib
    total = 0
    for capacity, rate in tiers:
        used = min(remaining, capacity)
        total += used * rate
        remaining -= used
        if remaining <= 0:
            return total
    raise ValueError("volume exceeds modeled tiers")
```

Keep this as calculation logic, not a hard-coded price source. Load current tiers from approved pricing data, record retrieval time, currency, region, service, tax treatment, and contract discount.

Provider calculators are estimates. Google Cloud's calculator, for example, explicitly notes that estimates might not match the final bill. Use calculators for scenarios and billing exports for calibration.

## Include East-West Cloud Traffic

Even a single-cloud architecture can pay for traffic between zones or regions. Multi-cloud designs often add both:

- application spans zones for availability;
- cross-zone load balancing reaches another zone;
- NAT or inspection appliances process the flow;
- replication crosses a region;
- a second copy then leaves the provider.

AWS documents categories including internet data transfer out, inter-Region transfer, and data transfer across Availability Zones for selected services. Azure's bandwidth page distinguishes same-zone, inter-region, and internet paths. Google Cloud VPC pricing distinguishes intra-zone, inter-zone, inter-region, internet, and interconnect routes.

Price the exact service path. A general compute-network table may not be the applicable price for an object store, CDN, database, or specialized transfer service.

## Model Four Workload Shapes

### Synchronous cross-cloud calls

These pay on every request and response and add latency plus another failure dependency. Capture payload percentiles, retry behavior, connection overhead, TLS, and the percentage of calls that cross the boundary.

Prefer moving cohesive service and data boundaries together. A chatty API split across clouds can be expensive and unreliable even when either side is cheap.

### Continuous replication

For a database or object stream:

```text
monthly transfer bytes
  = replicated change bytes
  + rewrite and replay bytes
  + protocol overhead bytes
```

Measure bytes on the wire. Logical replication can send before/after values or repeated updates that differ substantially from final database growth.

### Analytics export

Batch files can reduce per-request overhead and compress well, but repeated full extracts are expensive. Model partitions, late-arriving updates, compaction rewrites, and failed-job replays.

### Evacuation burst

An exit copies the current dataset, historical versions required by policy, logs, and a final delta. Add source read requests, export jobs, temporary staging, target writes, checksums, and transfer tooling.

Some providers currently publish conditional programs for eligible customers moving data away. Procedures, time windows, eligibility, and exclusions can change. Treat any waiver or credit as a commercial exception, not an architectural assumption; confirm the current provider policy and obtain approval before transfer.

## Add Capacity and Time

Cost is only one constraint. Estimate duration:

```text
hours = bytes * 8 / sustained_bits_per_second / 3600
```

Use sustained application-level throughput after encryption, checksums, small-object overhead, throttling, and contention. A lower-cost public path that cannot meet the migration window is not viable.

Private connectivity adds port, circuit, attachment, cross-connect, colocation, and sometimes provider data-transfer charges. Model redundant links because production connectivity commonly requires more than one circuit.

## Run Sensitivity Analysis

Create low, expected, and high cases:

| Variable | Low | Expected | High |
| --- | ---: | ---: | ---: |
| Monthly logical data | 10 TiB | 25 TiB | 60 TiB |
| Response ratio | 1.5 | 3.0 | 5.0 |
| Retry/replay | 1% | 4% | 12% |
| Replication destinations | 1 | 1 | 2 |
| Post-compression size | 50% | 70% | 90% |

Find the break-even point where moving compute next to the data, using a CDN, batching calls, changing retention, or buying a private connection costs less.

Do not optimize solely for egress. Account for engineering effort, availability, latency, security inspection, and contractual commitments.

## Validate Against Real Bills

Tag or allocate network resources and export billing line items. Compare modeled edges with observed usage:

```text
model edge -> provider SKU/usage type -> account/project -> service owner
```

Investigate unexplained transfer rather than applying a percentage adjustment. Common causes include health checks, backups, cross-zone routing, container pulls, telemetry, retries, and response traffic.

Set alerts on both spend and bytes. A negotiated rate can hide architectural traffic growth until the contract changes.

## Put a Transfer Budget in Architecture Reviews

Require every cross-cloud edge to declare:

- owner and business reason;
- monthly and peak byte budget;
- latency and availability impact;
- current price source and date;
- data classification and encryption path;
- fallback when the link is unavailable;
- growth trigger for redesign.

Review the model whenever locations, services, pricing, replication, retention, or traffic shape changes.

## Official Documentation

- [AWS data transfer pricing for EC2](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer)
- [AWS global network data transfer FAQ](https://aws.amazon.com/about-aws/global-infrastructure/global-network/faqs/)
- [Azure bandwidth pricing](https://azure.microsoft.com/en-us/pricing/details/bandwidth/)
- [Azure subscription cancellation and exit-transfer process](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/cancel-azure-subscription)
- [Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [Google Cloud VPC network pricing](https://cloud.google.com/vpc/network-pricing)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)

## Conclusion

Egress turns architecture arrows into recurring, directional bills. Model every traffic edge with current service-specific rates, both directions, intermediate processing, retries, and recovery bursts; then calibrate the result against billing data. Multi-cloud is affordable when service boundaries minimize chatty cross-cloud flows and the transfer budget is managed like any other capacity limit.
