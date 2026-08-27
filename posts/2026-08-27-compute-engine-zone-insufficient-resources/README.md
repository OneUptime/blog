# Recover from Compute Engine Zone Resource Shortages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Compute Engine, Virtual Machine, Capacity Planning, Reservation, Troubleshooting

Description: Diagnose Compute Engine zonal resource exhaustion, recover with the least disruptive option, and reduce the chance that critical VM starts fail again.

---

Compute Engine can reject a VM create, start, resize, or reservation request with an error such as:

```text
ZONE_RESOURCE_POOL_EXHAUSTED
The zone 'projects/PROJECT_ID/zones/ZONE' does not have enough resources available to fulfill the request.
```

This is a capacity error. It means that the requested combination of resources is not currently available in that zone. It is not evidence that the project has exhausted a quota, and increasing a CPU quota does not create physical capacity in a zone.

## First Identify the Failed Request

Record the complete error, including any `reason` field and suggested zones. Newer Compute Engine errors can identify the constrained resource more precisely, such as CPU, Local SSD capacity, or a GPU.

For an instance that failed to start, inspect its configuration before changing it:

```bash
gcloud compute instances describe VM_NAME \
  --project=PROJECT_ID \
  --zone=ZONE \
  --format='yaml(name,zone,machineType,scheduling,guestAccelerators,disks)'
```

For a failed zonal asynchronous operation, describe the operation named in the command output:

```bash
gcloud compute operations describe OPERATION_NAME \
  --project=PROJECT_ID \
  --zone=ZONE
```

Do not reduce the diagnosis to "the zone is full." Availability errors apply to the resources in one request, not necessarily every machine type or every project in that zone. A small general-purpose VM might succeed while a large accelerator VM fails.

Also rule out a different class of error. Quota failures normally name a quota or report `QUOTA_EXCEEDED`. Organization policies, IAM denials, invalid machine configurations, and exhausted IP ranges have their own errors. Treating all of them as capacity problems wastes recovery time.

## Recover in Least-Disruptive Order

Google documents the first four general remedies below in increasing order of disruption. For regional MIGs, it separately recommends considering a change to the distribution shape.

### 1. Retry later with backoff

Capacity changes as workloads start and stop. For a non-urgent request, retry after a delay. Automation should use bounded exponential backoff with jitter, not a tight loop:

```text
attempt 1: wait about 30 seconds
attempt 2: wait about 60 seconds
attempt 3: wait about 120 seconds
stop after the workload's recovery deadline
```

A retry is useful for transient availability. It is not a capacity guarantee, so an availability-sensitive service also needs a fallback placement plan.

### 2. Use another zone

If the workload and its dependencies are portable, request the same VM in another zone that supports the machine series and attached features:

```bash
gcloud compute machine-types list \
  --project=PROJECT_ID \
  --filter='name=MACHINE_TYPE AND zone:(us-central1-a us-central1-b us-central1-c)'
```

Check more than the machine type. GPUs, Local SSD, sole-tenancy, confidential-computing features, CPU platforms, and disk placement can narrow the valid zones. A zonal persistent disk cannot simply be attached to a VM in another zone. Recovery may require a snapshot, image, regional disk, or workload-level replication prepared in advance.

If low latency or data residency requires the same region, try another zone in that region first. If all suitable zones fail, use a documented cross-region disaster-recovery path rather than improvising data movement during the incident.

### 3. Change the requested hardware shape

When placement is more important than an exact shape, try one of these changes:

- request fewer instances in one operation;
- divide the requested vCPU and memory across smaller instances;
- choose another supported machine series or machine type;
- remove an optional accelerator or Local SSD requirement;
- relax a minimum CPU platform or other restrictive placement setting when the application permits it.

These are workload decisions, not interchangeable command-line tweaks. Confirm licensing, performance, NUMA behavior, accelerator compatibility, and minimum memory before changing a production shape.

### 4. Consider a different provisioning model

Google also recommends trying a different provisioning model when a standard VM request cannot be fulfilled. Flex-start and Spot VMs use different capacity pools and availability characteristics, so either can improve the chance of obtaining supported resources.

This is a workload contract change, not a transparent retry. Flex-start is intended for supported workloads that can wait for allocation and accept a limited run duration. Spot VMs can be preempted and still have no availability guarantee. Check machine-series support, quota, maximum run duration, shutdown behavior, and fault tolerance before changing the model.

### Regional MIGs: Change the distribution shape

A regional managed instance group can distribute creation attempts across zones. When a distribution policy is too restrictive for current capacity, Google recommends considering `BALANCED`, `ANY`, or `ANY_SINGLE_ZONE`, depending on the workload's availability and placement requirements.

Inspect the current policy before changing it:

```bash
gcloud compute instance-groups managed describe MIG_NAME \
  --project=PROJECT_ID \
  --region=REGION \
  --format='yaml(distributionPolicy,targetSize,instanceTemplate)'
```

`ANY` favors obtaining capacity and can place instances unevenly. `BALANCED` aims for a more even distribution where resources are available. `ANY_SINGLE_ZONE` concentrates the group in one zone and is not a multi-zone high-availability strategy. Choose deliberately rather than changing the shape only to make the current rollout green.

## When a Reservation Helps

A Compute Engine reservation can make matching resources available to eligible VMs when they need to start. Reservations are the main preventive control for predictable, critical capacity needs.

A reservation is not a repair for a request that has already failed. Creating the reservation itself requires available capacity and can receive the same resource availability error. Plan it before the maintenance window or traffic event, verify which projects can consume it, and ensure the VM properties match its consumption rules.

Reservations also incur charges for reserved resources while they are not consumed. They should be paired with ownership, expiration or cleanup procedures, and monitoring for unused capacity.

## Build a Reliable Placement Strategy

For services that must recover automatically, encode alternatives before an incident:

1. Use instance templates so that VM configuration can be reproduced.
2. Prefer regional managed instance groups for stateless replicated services.
3. Keep data on storage that supports the intended failover boundary.
4. Verify that every fallback zone supports required machine and accelerator features.
5. Reserve capacity for strict recovery objectives.
6. Alert separately on quota errors and resource availability errors.

Do not treat an alternate provisioning model as guaranteed capacity. Use Flex-start or Spot only when the workload accepts that model's scheduling, lifetime, and interruption semantics.

After recovery, record which property made the original request hard to place and whether a retry, alternate zone, different shape, or reservation resolved it. That evidence is more useful than a generic "capacity issue" postmortem.

## Official Documentation

- [Troubleshooting resource availability errors](https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-resource-availability)
- [Compute Engine provisioning models](https://cloud.google.com/compute/docs/instances/provisioning-models)
- [About Flex-start VMs](https://cloud.google.com/compute/docs/instances/about-flex-start-vms)
- [Spot VMs](https://cloud.google.com/compute/docs/instances/spot)
- [Compute Engine reservations overview](https://cloud.google.com/compute/docs/instances/reservations-overview)
- [Regional managed instance group target distribution shape](https://cloud.google.com/compute/docs/instance-groups/regional-mig-set-target-distribution-shape)
- [Troubleshoot creating, updating, and deleting VMs](https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-vm-creation)
- [Persistent Disk snapshots](https://cloud.google.com/compute/docs/disks/create-snapshots)

## Conclusion

`The zone does not have enough resources available` is a request-specific capacity failure, not a quota failure. Retry with backoff, move to a compatible zone, relax the hardware shape, use an acceptable alternative provisioning model, or let a regional MIG use a suitable distribution policy. For workloads with strict recovery objectives, prepare portable storage and reserve matching capacity before it is needed.
