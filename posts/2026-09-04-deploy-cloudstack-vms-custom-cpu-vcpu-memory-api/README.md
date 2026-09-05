# How to Deploy CloudStack VMs with Custom CPU, vCPU, and Memory Through the API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, API, Virtual Machine, KVM, Virtualization, Troubleshooting

Description: Select the right CloudStack compute-offering type, pass custom vCPU and memory details correctly, understand KVM CPU shares, verify allocation, and recover safely from failures.

---

CloudStack does not accept arbitrary CPU and memory overrides for every VM deployment. The selected compute offering defines whether values are fixed, customizable within administrator limits, or fully customizable. The API then carries custom values inside the `details` map, using exact detail names such as `cpuNumber`, `cpuSpeed`, and `memory`.

The fields also need careful interpretation. `cpuNumber` is the guest vCPU count, `memory` is expressed in MB by the API and offering workflow, and `cpuSpeed` is expressed in MHz. On KVM, however, CloudStack documents that CPU speed and CPU count are used to calculate libvirt CPU shares. The speed value is not a promise that a vCPU will run at a fixed physical clock rate.

## Identify the Compute-Offering Type

CloudStack exposes three compute-offering models:

| Type | Caller controls | Appropriate use |
| --- | --- | --- |
| Fixed | Nothing; CPU count, speed, and memory come from the offering | Standard sizes, predictable policy, simple billing |
| Custom constrained | vCPU count and memory within administrator-defined minimums and maximums; CPU speed is set by the offering | Flexible tenant sizing with guardrails; recommended custom model |
| Custom unconstrained | vCPU count, CPU speed, and memory supplied at deployment | Trusted use cases needing arbitrary combinations |

The official administration guide recommends custom constrained over custom unconstrained because the administrator can bound requests.

Inspect the selected offering before constructing the deployment:

```bash
cmk list serviceofferings id=SERVICE_OFFERING_UUID
```

Read the returned `iscustomized`, `cpunumber`, `cpuspeed`, `memory`, and `serviceofferingdetails`. For constrained offerings, the details can include `mincpunumber`, `maxcpunumber`, `minmemory`, and `maxmemory`. Also record storage type/tags, host tags, HA, dynamic-scaling, and CPU-limit settings because they affect placement or runtime behavior.

Do not infer offering type from its display name. An offering called `custom-medium` can still be fixed or have limits different from its name.

## Create Guardrailed Offerings as an Administrator

Tenants normally consume offerings rather than create them. A root administrator can define a constrained offering with a fixed CPU-speed policy and bounded vCPU/RAM choices:

```bash
cmk create serviceoffering \
  name=custom-constrained-general \
  displaytext='1-8 vCPU and 1-32 GiB RAM' \
  customized=true \
  mincpunumber=1 \
  maxcpunumber=8 \
  minmemory=1024 \
  maxmemory=32768 \
  cpuspeed=2000 \
  storagetype=shared \
  offerha=true
```

Use `cmk create serviceoffering -h` and the API reference for the installed CloudStack version before creating it. The presence of bounds distinguishes the constrained design. Confirm the returned offering rather than assuming the server accepted every optional field.

An unconstrained offering uses `customized=true` without those CPU/RAM bounds and expects the caller to supply all dynamic values. Restrict its visibility to trusted domains when possible. Resource limits remain necessary even when the offering itself is unconstrained.

Do not change or delete an offering already in use as a quick repair. Create a new versioned offering, test it, migrate controlled workloads, and retain the prior offering for rollback.

## Preflight Capacity and Compatibility

The capacity and host queries require an administrator role or explicit API permissions; tenants should ask their administrator to check these when access is unavailable.

```bash
cmk list zones id=ZONE_UUID
cmk list templates id=TEMPLATE_UUID templatefilter=executable
cmk list serviceofferings id=SERVICE_OFFERING_UUID
cmk list capacity zoneid=ZONE_UUID
cmk list hosts zoneid=ZONE_UUID state=Up
cmk list networks id=NETWORK_UUID
```

Check account and project CPU/RAM limits, host and storage tags, affinity groups, dedicated resources, template architecture, and network capacity. CloudStack must fit the requested CPU and memory together on one eligible host. Aggregate zone totals can look sufficient even when no eligible host has enough available CPU and memory together.

For KVM, hosts in a cluster should be homogeneous. Compare capabilities on candidate hosts:

```bash
lscpu
virsh capabilities
virsh cpu-models x86_64 | head -n 30
free -h
```

Use the architecture reported by the host and template. Replace `x86_64` in `virsh cpu-models` for another supported architecture.

## Deploy with a Custom Constrained Offering

For a constrained offering whose bounds allow four vCPUs and 8192 MB, pass the two caller-controlled values in the `details` map. These examples use manual job polling, so first run `cmk set asyncblock false`; CloudMonkey otherwise waits for asynchronous jobs by default:

```bash
cmk deploy virtualmachine \
  zoneid=ZONE_UUID \
  serviceofferingid=CONSTRAINED_OFFERING_UUID \
  templateid=TEMPLATE_UUID \
  networkids=NETWORK_UUID \
  name=app-custom-01 \
  displayname=app-custom-01 \
  'details[0].cpuNumber=4' \
  'details[0].memory=8192'
```

The shell quotes prevent brackets from being treated as glob characters. The nested detail names use the CloudStack spelling and case shown in the current code and examples. CloudStack API field names are generally case-insensitive, but map keys can be consumed as named VM details, so preserve `cpuNumber` and `cpuSpeed` exactly.

Do not include `cpuSpeed` for a constrained offering where the administrator controls it. A value outside a minimum or maximum should fail rather than silently clamp; inspect both immediate API errors and the async job result when a job is created.

## Deploy with a Custom Unconstrained Offering

When the selected offering is explicitly custom unconstrained, include CPU count, CPU speed, and memory:

```bash
cmk deploy virtualmachine \
  zoneid=ZONE_UUID \
  serviceofferingid=UNCONSTRAINED_OFFERING_UUID \
  templateid=TEMPLATE_UUID \
  networkids=NETWORK_UUID \
  name=compute-custom-01 \
  displayname=compute-custom-01 \
  'details[0].cpuNumber=4' \
  'details[0].cpuSpeed=2200' \
  'details[0].memory=8192'
```

For a direct signed query API client, the equivalent logical parameters are:

```python
params = {
    "command": "deployVirtualMachine",
    "response": "json",
    "zoneid": "ZONE_UUID",
    "serviceofferingid": "UNCONSTRAINED_OFFERING_UUID",
    "templateid": "TEMPLATE_UUID",
    "networkids": "NETWORK_UUID",
    "name": "compute-custom-01",
    "details[0].cpuNumber": "4",
    "details[0].cpuSpeed": "2200",
    "details[0].memory": "8192",
}
```

Add the API key and signature using CloudStack's documented signing algorithm, then send the form body over verified HTTPS. Brackets must be URL-encoded by the client library as part of the outer parameter name. Do not manually flatten the `details` map into a single comma-delimited value.

## Do Not Override a Fixed Offering

For a fixed offering, omit all three custom details:

```bash
cmk deploy virtualmachine \
  zoneid=ZONE_UUID \
  serviceofferingid=FIXED_OFFERING_UUID \
  templateid=TEMPLATE_UUID \
  networkids=NETWORK_UUID \
  name=app-fixed-01
```

Modern CloudStack versions reject dynamic CPU or memory details supplied with a non-custom offering. Treat that rejection as a policy safeguard. Do not retry without first choosing the correct offering.

## Follow the Asynchronous Job

An accepted `deployVirtualMachine` API request returns a resource ID and `jobid` before deployment completes. With `asyncblock=false`, CloudMonkey exposes that initial response. Request-validation errors can instead be returned immediately without a job. Poll the job rather than repeatedly submitting the deployment:

```bash
cmk query asyncjobresult jobid=DEPLOY_JOB_UUID
```

CloudStack reports async status `0` while pending, `1` on success, and `2` on failure. For status `2`, capture `jobresultcode` and `jobresult`. Do not create a second VM when the first job is still pending or when the HTTP outcome is ambiguous.

After success:

```bash
cmk list virtualmachines id=VM_UUID
cmk list volumes virtualmachineid=VM_UUID
cmk list nics virtualmachineid=VM_UUID
```

Verify the returned `serviceofferingid`, `cpunumber`, `cpuspeed`, `memory`, host, and state. The response is the authoritative statement of what CloudStack allocated.

## Verify from Inside the Guest

```bash
nproc
lscpu
grep -E 'MemTotal|HugePages' /proc/meminfo
free -m
```

`nproc` may respect process affinity and can differ from the total reported by `lscpu`; check both. Guest-visible memory will be slightly lower than the configured amount because firmware, kernel, and device mappings consume address space.

Do not validate `cpuSpeed=2200` by expecting `/proc/cpuinfo` to remain at exactly 2200 MHz. Frequency scaling, virtualization, host power policy, and the KVM shares implementation make guest clock readings unsuitable for that assertion. Validate workload performance and contention separately.

A root administrator can correlate the guest with libvirt on its KVM host:

```bash
sudo virsh vcpucount VM_DOMAIN
sudo virsh dominfo VM_DOMAIN
sudo virsh dumpxml VM_DOMAIN | sed -n '/<vcpu/,/<\/cputune>/p'
sudo virsh dumpxml VM_DOMAIN | sed -n '/<memory/,/<\/memoryBacking>/p'
```

Inspect only. Do not edit CloudStack-managed domain XML with `virsh edit`; the next lifecycle operation can overwrite it and CloudStack's database will remain inconsistent.

## Keep CPU Model Separate from vCPU Sizing

The service offering determines quantity and scheduling policy. KVM guest CPU model and feature exposure are separate host-agent settings in `/etc/cloudstack/agent/agent.properties`:

```properties
guest.cpu.mode=host-model
# For an explicit common baseline instead:
# guest.cpu.mode=custom
# guest.cpu.model=SUPPORTED_MODEL
```

CloudStack also supports `host-passthrough`, but the KVM guide warns that it can cause migration failure unless destination CPUs match exactly. Before changing CPU mode, verify the model and required flags on every cluster host, migrate disposable VMs both directions, and follow the host maintenance/reconnect procedure. Never restart all agents simultaneously without preserving capacity.

A larger vCPU count does not expose a missing instruction set. Conversely, selecting host passthrough does not reserve more vCPUs.

## Understand CPU Shares and Caps on KVM

The `createServiceOffering` API documents that KVM uses `cpuSpeed` and `cpuNumber` to calculate libvirt `shares`, a relative weight when guests compete for host CPU. `shares` has no MHz unit. The offering's CPU-limit setting controls whether usage is restricted to the committed offering policy.

Consequences include:

- with CPU caps disabled, VMs with runnable work may burst beyond their relative share when capacity is free;
- a VM's relative entitlement matters most under contention;
- overprovisioning ratios affect placement accounting; and
- host power management can affect measured performance independently of CloudStack values.

Do not promise dedicated cores from `cpuNumber` alone. Dedicated CPUs, NUMA placement, huge pages, and latency isolation require separate supported hypervisor and CloudStack configuration plus workload testing.

## Scale an Existing VM Carefully

Record the old offering and custom values before scaling:

```bash
cmk list virtualmachines id=VM_UUID
cmk list serviceofferings id=OLD_OFFERING_UUID
```

Unless every dynamic-scaling prerequisite is explicitly satisfied by the hypervisor, template, guest tools, offering, and global configuration, stop the VM first. Run this sequence one operation at a time: repeat each job query until `jobstatus=1` before issuing the next operation, and stop the sequence if `jobstatus=2`:

```bash
cmk stop virtualmachine id=VM_UUID
cmk query asyncjobresult jobid=STOP_JOB_UUID

cmk scale virtualmachine \
  id=VM_UUID \
  serviceofferingid=NEW_CUSTOM_OFFERING_UUID \
  'details[0].cpuNumber=4' \
  'details[0].memory=8192'
cmk query asyncjobresult jobid=SCALE_JOB_UUID

cmk start virtualmachine id=VM_UUID
cmk query asyncjobresult jobid=START_JOB_UUID
```

For an unconstrained target, also pass `details[0].cpuSpeed`. For a fixed target, omit custom details. Check whether a root-volume change in the target offering requires storage migration and use the documented `automigrate` choice only after a capacity and rollback review.

## Roll Back Safely

For a disposable failed deployment, query the job and list the VM by returned UUID before destroying it:

```bash
cmk list virtualmachines id=VM_UUID listall=true
cmk destroy virtualmachine id=VM_UUID expunge=false
cmk query asyncjobresult jobid=DESTROY_JOB_UUID
```

Do not expunge automatically. Confirm the ownership of attached volumes, snapshots, addresses, and DNS records first.

For a failed scale, keep the VM stopped, inspect its actual offering/details, and scale back to the recorded old offering and old custom values. Start it only after the rollback job succeeds. If CloudStack reports the old offering but libvirt or the guest shows different resources, stop and reconcile management and agent logs rather than editing the domain manually.

## Troubleshooting Custom Deployments

- **Missing custom parameters:** confirm the offering is custom, then pass all values required by that type inside `details[0]`.
- **Parameter is rejected as invalid:** preserve camel-case detail names, verify URL encoding of brackets, check units, and compare against constrained min/max values.
- **Fixed offering rejects details:** omit overrides or select an approved custom offering.
- **`InsufficientServerCapacity`:** inspect available per-host CPU/RAM, overcommit ratios, tags, affinity, architecture, storage, and resource limits. Lowering the request is only valid if it meets the workload objective.
- **VM has the right vCPUs but unexpected performance:** inspect KVM shares/cap policy, host contention, steal time, NUMA, power management, and storage/network bottlenecks.
- **Guest sees less memory:** allow for guest overhead, then compare CloudStack, libvirt, and guest values. Large differences require agent/libvirt log review.
- **Migration fails:** compare CPU model/features, QEMU/libvirt versions, cluster homogeneity, storage reachability, and destination capacity. Avoid host passthrough across mismatched processors.
- **Scale succeeds but guest does not update:** check dynamic-scaling prerequisites or perform a controlled stop/start as documented for the environment.

## Conclusion

Custom CloudStack sizing starts with the offering contract. Prefer constrained offerings, pass `cpuNumber` and `memory` within their limits, and use `cpuSpeed` only when an unconstrained offering requires it. Follow the async job, verify CloudStack, libvirt, and guest views, and remember that KVM CPU speed contributes to scheduling shares rather than guaranteeing a fixed hardware frequency. Preserve the old offering and values so deployment or scaling can be rolled back without manual hypervisor edits.

## Official Documentation

- [Apache CloudStack: Service Offerings](https://docs.cloudstack.apache.org/en/latest/adminguide/service_offerings.html)
- [Apache CloudStack: deployVirtualMachine API](https://cloudstack.apache.org/api/apidocs-4.23/apis/deployVirtualMachine.html)
- [Apache CloudStack: createServiceOffering API](https://cloudstack.apache.org/api/apidocs-4.23/apis/createServiceOffering.html)
- [Apache CloudStack: listServiceOfferings API](https://cloudstack.apache.org/api/apidocs-4.23/apis/listServiceOfferings.html)
- [Apache CloudStack: scaleVirtualMachine API](https://cloudstack.apache.org/api/apidocs-4.23/apis/scaleVirtualMachine.html)
- [Apache CloudStack: KVM Host Installation and Guest CPU Models](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html)
- [libvirt: Domain CPU Tuning](https://libvirt.org/formatdomain.html#cpu-tuning)
