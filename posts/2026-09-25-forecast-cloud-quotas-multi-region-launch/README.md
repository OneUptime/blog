# How to Forecast Quota Needs and Request Increases Before a Multi-Region Launch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Service Quotas, AWS, Azure, GCP

Description: Build per-region quota forecasts from rollout and failover scenarios, then verify approved ceilings before a multi-region launch.

---

A quota request made on launch day is already a schedule risk. A request made weeks earlier for the wrong region, machine family, or unit can be just as ineffective.

Forecast the allocation peak in each destination and make the applied quota an explicit launch dependency. Keep this separate from physical capacity and application performance testing.

## Build a quota dependency inventory

For every launch region, identify the account or subscription or project, service, quota identifier, scope, unit, current applied value, current use, owner, and observation time. Include global quotas separately instead of copying them into every regional budget.

Start with the deployment graph. Compute can require vCPUs, accelerators, disks, addresses, load balancers, network interfaces, and managed-service resources. A sufficient CPU quota does not remove a bottleneck in any of those dependencies.

Use the provider's own accounting model. [Azure VM quotas](https://learn.microsoft.com/en-us/azure/virtual-machines/quotas) include both regional and VM-family ceilings. [Google Compute Engine quotas](https://docs.cloud.google.com/compute/quotas-limits) include regional and project-wide dimensions. [AWS Service Quotas](https://docs.aws.amazon.com/servicequotas/latest/userguide/request-quota-increase.html) distinguishes account-level and resource-level requests. Preserve those identities throughout the forecast and approval process.

## Model scenarios rather than one growth percentage

For each quota, estimate several concurrent-allocation scenarios:

1. Normal launch with the initial replica or instance count.
2. Launch during a rolling replacement, when old and new resources coexist.
3. Maximum planned autoscaling and overlapping batch work.
4. Loss of a region or zone, with the surviving destinations taking the agreed additional load.
5. Rollback or recovery, including temporary resources needed to restore service.

A practical calculation is:

```text
required ceiling = maximum projected usage across credible scenarios
                 + explicit operating margin
```

Within each scenario, count resources that coexist at the same time. Do not add every mutually exclusive disaster together, and do not average a demanding failover scenario away with a quiet normal day.

For example, suppose each of two regions normally runs ten eight-vCPU instances. In the chosen failover design, either survivor must reach twenty instances, with four additional instances allowed during replacement. Each region then needs a modeled peak of 192 vCPUs before margin. An illustrative sixteen-vCPU margin produces a requested ceiling of 208 per region for the relevant quota category.

This is an example scenario, not a provider requirement. Validate whether the application can actually handle the transferred traffic with that fleet and whether other quotas grow at the same rate.

## Translate traffic forecasts into resource allocations

Use measured throughput and latency results to map expected load to instances or replicas. Include the expensive request mix, cache warmup, background processing, and dependency capacity. A forecast of twice the requests does not necessarily imply exactly twice the CPU or memory.

Then convert resource counts into the provider's quota unit. Distinguish vCPUs from machines and logical storage allocations from physical bytes billed. Account for resources that remain charged while stopped, reserved, or in a transitional state according to the service's rules.

Maintain assumptions alongside the numbers: instance type, failure model, launch date, replacement strategy, and expected retention of temporary resources. A quota review should reveal which assumption must change when a budget is too high or too low.

## Submit increases with a complete scope and rationale

Request the needed total ceiling, not merely the increment, where the API expects a desired total. Submit a separate request for each independently scoped limit, and retain request and support-case identifiers beside the inventory.

Explain current use, projected peak, phased adoption, and timing. Request early enough for review and a fallback decision; do not promise a universal approval turnaround. Some quotas are fixed or have service-specific adjustment processes, and approval is not guaranteed.

Assign an owner to unresolved requests and define the date at which the team will reduce scope, phase the launch, or choose a supported alternative. A pending ticket should not quietly become an assumed dependency in the launch plan.

## Verify applied values and capacity separately

Track request state, then query the applied quota again in the target scope. AWS's [request-state reference](https://docs.aws.amazon.com/servicequotas/2019-06-24/apireference/API_RequestedServiceQuotaChange.html), for example, distinguishes approval from support-case closure. Retain both the decision and the observed applied value.

Run a controlled rehearsal using representative resources where appropriate. Confirm that identity, policy, quota accounting, and resource selection match the forecast. Recheck usage close to launch because unrelated deployments may have consumed the planned headroom.

A quota increase permits allocation; it does not secure physical inventory. Assess reservations, supported alternative zones or types, and service-specific capacity controls separately. Google's [resource-availability guidance](https://docs.cloud.google.com/compute/docs/troubleshooting/troubleshooting-resource-availability) illustrates why zonal shortages can occur despite sufficient quota.

## Make headroom a maintained launch signal

Report each required quota as ready, awaiting approval, insufficient, or unknown, with an owner and evidence timestamp. “Unknown” should remain distinct from zero usage or unlimited capacity.

After launch, compare the modeled and observed peaks. Investigate unexpected growth, lingering temporary resources, and new machine families before copying the forecast to another region. The strongest outcome is a repeatable inventory and scenario model that makes the next expansion's quota needs visible before provisioning starts.
