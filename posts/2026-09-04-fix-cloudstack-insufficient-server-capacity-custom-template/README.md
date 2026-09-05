# How to Fix `InsufficientServerCapacity` When Deploying from a Custom CloudStack Template

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Virtualization, Storage, KVM, Troubleshooting

Description: Decode CloudStack allocation failures for a custom template by testing compute, architecture, tags, storage, network, and template readiness constraints before changing capacity.

---

`InsufficientServerCapacity` does not always mean the cluster has no free CPU or RAM. It means CloudStack's deployment planners and allocators found no complete placement that satisfies all constraints. A host can have spare memory but be excluded by architecture, host tags, CPU compatibility, state, or network reachability. A storage pool can have free bytes but fail tags, scope, format, or template access.

Custom templates expose these mismatches because their hypervisor, architecture, firmware, root-disk size, HVM requirements, and direct-download mode may differ from known-good images.

## Preserve the Failed Deployment Job

Record the job ID, VM UUID if one was allocated, zone, template, service offering, disk offering, network, affinity groups, and account/project. Using a configured CloudMonkey (`cmk`) administrator profile, query the job once and search it in the management log (replace the UUID placeholders with actual values):

```bash
cmk query asyncjobresult jobid=JOB_UUID
sudo grep -nE 'JOB_UUID|VM_UUID|TEMPLATE_UUID' \
  /var/log/cloudstack/management/management-server.log | tail -n 300
```

CloudStack's troubleshooting guide recommends following job IDs through `management-server.log`. Logs commonly use an internal numeric identifier such as `job-1076`, which differs from the API job UUID. Use the UUID search to locate related entries, then follow their `job-N` identifiers; if it finds nothing, correlate the request timestamp and VM instance name. The useful line is often an allocator rejection immediately before the final capacity exception.

Do not submit many identical deployments. Failed records and concurrent reservations can add noise and consume temporary capacity.

## Verify the Template First

```bash
cmk list templates id=TEMPLATE_UUID templatefilter=all listall=true
```

Check:

- `isready=true` in the target zone, unless this is a valid KVM direct-download template;
- hypervisor matches the cluster;
- `arch` matches available hosts (`x86_64` versus `aarch64`);
- format is supported by that hypervisor/storage path;
- OS type, HVM, bits, boot mode, and firmware expectations are correct;
- reported size fits the root-disk offering and storage; and
- the image is visible to the caller and target zone.

For KVM direct download, each candidate host must resolve, trust, and reach the template URL and the selected primary storage must have space. A record can be available immediately while the later host download fails.

Compare with one known-good template using the same offering and network. Then deploy the custom template with the smallest number of optional constraints. This is a diagnostic matrix, not a reason to remove required security or availability controls permanently.

## Check Actual Compute Capacity and Host State

```bash
cmk list capacity zoneid=ZONE_UUID
cmk list hosts zoneid=ZONE_UUID state=Up
cmk list clusters zoneid=ZONE_UUID
cmk list serviceofferings id=SERVICE_OFFERING_UUID
```

Capacity figures are aggregates. A 16 GiB request cannot fit when 20 GiB is free only as 10 GiB on each of two hosts. Check per-host memory, CPU, allocated/reserved capacity, maintenance/resource state, and the cluster's CPU and memory overprovisioning ratios.

On KVM candidates, compare:

```bash
lscpu
virsh capabilities
virsh cpu-models x86_64 | head
free -h
sudo systemctl is-active libvirtd cloudstack-agent
```

`virsh cpu-models` lists models known to libvirt, not proof that the host can run them; use `virsh domcapabilities` to inspect the hypervisor capabilities. Current CloudStack requires homogeneous hosts within a KVM cluster. Safe migration with a host-passthrough CPU model also requires matching hardware, QEMU, microcode, and configuration. Do not enable more aggressive overprovisioning until you have measured workload risk.

## Reconcile Host Tags, Affinity, and Scope

Host tags on compute offerings normally direct VMs to compatible hosts; explicit host selection can bypass ordinary tag checks unless strict host tags are configured. With ordinary storage tags, disk/root offerings require a pool with all specified tags. These are allocation tags, not ordinary resource labels.

```bash
cmk list hosttags
cmk list storagetags
cmk list affinitygroups virtualmachineid=VM_UUID
```

The 4.23 `listHostTags` and `listStorageTags` APIs do not accept a host or pool filter. Filter the returned records locally by their `hostid` and `poolid` fields, and compare their tags with the compute and disk offerings.

For ordinary tags, check that candidates contain the required offering tags; extra candidate tags are allowed. If flexible tags (`istagarule=true`) are configured, evaluate the resource’s rule against the offering tags instead. Also check dedicated hosts/clusters/pods/zones, account/project scope, affinity and anti-affinity groups, and offering zone/domain scope. A strict anti-affinity group may exclude the only host with the required CPU or storage.

Do not add a tag to every host as a shortcut. Either correct the erroneous offering/template selection or place the tag only on resources that truly provide that capability.

## Reconcile Primary Storage

```bash
cmk list storagepools zoneid=ZONE_UUID
cmk list storagepoolsmetrics zoneid=ZONE_UUID
cmk list volumes virtualmachineid=VM_UUID
```

An eligible pool must be `Up`, in the correct scope, reachable by the chosen host, satisfy the storage tag requirements (or configured flexible tag rule), support the volume format/features, and have enough physical/provisionable capacity. Check root-disk size overrides and any data disk requested during deployment.

For NFS, inspect CloudStack agent errors and mount health on every candidate host. For Ceph/RBD, verify monitor/pool/auth access and libvirt integration. For local storage, remember that HA and migration choices are constrained by the volume's host locality.

Putting a pool into maintenance stops new provisioning and may stop or migrate guests. Do not toggle maintenance just to refresh a failed mount without planning its impact.

## Reconcile Network Capacity and Reachability

A deployment can fail allocation when no candidate host can implement the selected network. Verify physical-network traffic labels, bridge names, VLAN ranges, IP availability, network state, and VR/System VM capacity:

```bash
cmk list networks id=NETWORK_UUID
cmk list physicalnetworks zoneid=ZONE_UUID
cmk list traffictypes physicalnetworkid=PHYSICAL_NETWORK_UUID
cmk list capacity zoneid=ZONE_UUID type=4
```

The `listCapacity` API expects a numeric capacity type; `4` is public IP address capacity. Do not pass the descriptive label as though it were an enum accepted by the API.

On KVM hosts, compare bridge/VLAN mappings. If only one host lacks a trunk or bridge, fix or disable that host rather than weakening network isolation.

## Use a Constraint Matrix

Test one variable at a time with disposable deployments that you actually start, then stop after the check. Creating a VM with `startvm=false` skips the start path and does not validate complete placement:

| Test | What it isolates |
| --- | --- |
| Known-good template + same offering/network | template-specific constraints |
| Custom template + smaller compatible offering | contiguous compute capacity |
| Custom template + no optional affinity | optional affinity exclusion; dedication still applies |
| Same request in another suitable cluster | cluster host/storage/network scope |
| Direct-download URL from every candidate host | host egress/TLS/image fetch |

Do not move a production request to an incompatible zone merely to make the error disappear. The selected placement must still satisfy data, latency, and availability policy.

## Repair, Verify, and Roll Back

Apply the smallest truthful repair: correct template metadata, use the intended offering, align a missing tag, restore an eligible host/storage pool, free or add capacity, fix a bridge/trunk, or publish the template to the target zone. Track one new async deployment.

After it starts, verify reported CPU/RAM, root volume, NIC/network, template ID, host, storage pool, reboot, and migration/HA behavior where supported and required. A VM that boots only on one anomalous host is not a complete repair.

Rollback by deleting the disposable failed/test VMs through CloudStack and reverting only the tag/offering/template metadata changed during diagnosis. Never delete allocated volumes or edit capacity records directly in MySQL.

## Conclusion

`InsufficientServerCapacity` means no full placement satisfied every constraint. Follow the job's allocator messages, validate custom-template metadata, then intersect eligible hosts, contiguous compute, allocation tags, storage, network, scope, and affinity. Fix the first false or unavailable constraint and prove the workload can start, and migrate if required, on the intended resource class.

## Official Documentation

- [Apache CloudStack: Troubleshooting and Job IDs](https://docs.cloudstack.apache.org/en/latest/adminguide/troubleshooting.html)
- [Apache CloudStack: Host and Storage Tags](https://docs.cloudstack.apache.org/en/latest/adminguide/host_and_storage_tags.html)
- [Apache CloudStack: Compute and Disk Service Offerings](https://docs.cloudstack.apache.org/en/latest/adminguide/service_offerings.html)
- [Apache CloudStack: Working with Templates](https://docs.cloudstack.apache.org/en/latest/adminguide/templates.html)
- [Apache CloudStack: Storage Overview](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html)
