# How to Choose Local, NFS, or Ceph Primary Storage for CloudStack VM High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Storage, KVM, NFS, Ceph, High Availability, Virtualization

Description: Compare local disks, NFS, and Ceph RBD for CloudStack KVM primary storage, then validate failure domains, migration, recovery, and rollback before production use.

---

CloudStack high availability can restart a failed VM, but it cannot make an inaccessible root disk available on another host. The primary-storage design therefore decides which recovery actions are possible after a host, switch, storage server, or entire rack fails.

For KVM, local disks, NFS, and Ceph RBD are all useful choices. They solve different problems. Select one by failure domain and recovery objective, not by a single throughput benchmark.

## Start with the Recovery Contract

Write down the failures the platform must survive and the maximum acceptable interruption and data loss. At minimum, answer:

- Must a VM restart automatically after its KVM host is lost?
- Must live migration work during planned host maintenance?
- Can the storage service span racks or sites without sharing a power or network failure domain?
- How much application write latency is acceptable?
- Who operates storage at 03:00, and how will they restore a deleted or corrupt volume?
- Are snapshots and backups independent of the primary-storage failure domain?

CloudStack HA is orchestration. It detects failure and schedules recovery according to the VM and service-offering settings. Shared or otherwise cross-host-accessible storage, spare compute capacity, working fencing, and healthy system VMs are separate prerequisites. A storage replica is also not a backup: deletion, corruption, and compromised credentials can propagate to every replica.

## Compare the Three Designs

| Property | Local KVM storage | NFS primary storage | Ceph RBD primary storage |
| --- | --- | --- | --- |
| Data location | One KVM host | Shared filesystem export | Distributed block objects |
| Host-failure restart | The original disk is normally unavailable to another host | Possible when another host can mount the export | Possible when another host can reach the RBD pool |
| Live migration | Constrained by host-local disks and the supported storage migration path | Straightforward when source and destination share the pool | Supported when both hosts share compatible Ceph and libvirt configuration |
| Operational complexity | Low | Moderate; NFS service must itself be redundant | High; monitors, OSDs, placement groups, recovery, and client keys need operations |
| Common bottleneck | Host disk/controller | NFS head or network path | OSD/network design and recovery traffic |
| Failure blast radius | Usually one host | Potentially every VM on an export | Depends on CRUSH failure domains and pool health |
| Best fit | Disposable, replicated, or performance-local workloads | Small and medium environments needing simple shared storage | Larger environments that can operate distributed storage well |

These are architectural tendencies, not performance guarantees. Benchmark the exact server, media, network, mount, Ceph pool, QEMU, and workload combination.

## When Local Storage Is the Right Choice

Local NVMe or SSD avoids a shared storage network and can provide excellent latency at low operational cost. It works well for stateless workers, replicated databases whose application layer owns failover, build runners, and other workloads that can be recreated from an image plus external data.

Its physical limitation is important: when a host is unavailable, its disk is unavailable too. A CloudStack HA restart on a different host cannot use a root volume that exists only on the failed host. Planned migration may require copying storage and depends on the supported KVM and CloudStack workflow.

Inventory the configured local pools on every host:

```bash
cmk list storagepools scope=HOST zoneid=ZONE_UUID
cmk list hosts zoneid=ZONE_UUID state=Up
sudo virsh pool-list --all
findmnt -T /PATH/TO/LOCAL/STORAGE
```

Keep local paths and pool UUIDs unique and stable. Do not use a shared filesystem while declaring it as local, or bind-mount unrelated paths to make pool discovery pass. CloudStack must have an accurate model of where each volume lives.

CloudStack cannot migrate a local data volume to another host, either by itself or with its VM. Host maintenance therefore stops VMs that use local storage instead of transparently relocating them. Choose local storage only when the application recovery plan accepts host-local volume loss, and use application replication or a tested backup-and-recreate workflow for relocation. Marking the VM HA-enabled does not change this storage fact.

## When NFS Is the Right Choice

NFS is usually the simplest shared primary storage for a small CloudStack KVM deployment. Every host in the intended scope mounts the same export, so a VM's disks remain reachable during host maintenance or host loss.

The NFS service must not be a single point of failure. A redundant virtual IP in front of one non-redundant server merely moves the address. Validate server failover, stable file handles, export identity, locking, UID/GID behavior, root-squash policy, and mount recovery under load.

From each candidate KVM host, inspect rather than remounting a live pool:

```bash
getent ahosts NFS_SERVER
showmount -e NFS_SERVER
nfsstat -m
findmnt -t nfs,nfs4
sudo virsh pool-list --all
sudo journalctl -k -n 200 --no-pager | grep -Ei 'nfs|stale|not responding|I/O error'
```

CloudStack supports NFS mount options such as `vers` and `nconnect` in the primary-storage definition. The first mount to a server and NFS version on a Linux client can determine the effective `nconnect` value for subsequent mounts. Confirm the effective options with `nfsstat -m` on every host.

Do not change an export path, mount over a CloudStack-managed target, or force-unmount a pool used by running VMs. Use CloudStack maintenance and migration workflows, and test server-side failover with disposable workloads first.

## When Ceph RBD Is the Right Choice

Ceph RBD distributes block data across OSDs and lets KVM/libvirt clients access a common pool. It avoids a single NFS head and can tolerate failures according to the pool's replica or erasure-coding policy and CRUSH failure domains.

That resilience depends on sound operation. Place monitors and OSDs across real host, rack, network, and power domains. Reserve capacity and bandwidth for backfill and recovery. Protect CephX keys, use least-privilege client capabilities, and monitor health before allowing CloudStack to schedule more writes.

Run read-only checks from every KVM host with the same client identity CloudStack/libvirt will use:

```bash
ceph --id CLOUDSTACK_CLIENT health detail
ceph --id CLOUDSTACK_CLIENT osd df tree
rbd --id CLOUDSTACK_CLIENT pool stats CLOUDSTACK_RBD_POOL
rbd --id CLOUDSTACK_CLIENT ls CLOUDSTACK_RBD_POOL
sudo virsh secret-list
```

Do not paste CephX keys into shell history or log output. Install keys and libvirt secrets using the documented CloudStack storage workflow and restrict file permissions. `HEALTH_WARN` is not automatically harmless: resolve whether it affects redundancy, capacity, placement groups, or client I/O before adding workload.

Ceph replication protects availability, not historical versions. Retain independent CloudStack snapshots or backups in a different failure and credential domain.

## Model the Failure Domains

Draw a dependency map from VM to KVM host, top-of-rack switches, storage client network, NFS server or Ceph monitors/OSDs, secondary storage, management servers, and power feeds. Two storage nodes in one chassis or two network paths through one switch do not constitute independent failure domains.

For each candidate design, test at least:

1. Graceful host maintenance and live migration where supported.
2. Abrupt loss of one KVM host after fencing is proven.
3. Loss of one storage path or switch.
4. NFS service failover or one Ceph OSD/host failure.
5. Storage recovery while foreground VM I/O continues.
6. Exhaustion thresholds for bytes, inodes, and Ceph fullness states.
7. Restore of a deleted test volume from an independent backup.

Use disposable VMs with a continuous write-and-verify workload. Record recovery time and verify data, not just whether the VM state returns to `Running`.

## Add a Pool Deliberately

First discover the exact zone, pod, cluster, and provider values available in the running CloudStack release:

```bash
cmk list zones
cmk list pods zoneid=ZONE_UUID
cmk list clusters zoneid=ZONE_UUID
cmk list storageproviders type=PRIMARY
cmk help create storagepool
```

Then create the pool with the URL syntax documented for that provider and version. A generic API shape is:

```bash
cmk create storagepool \
  name=POOL_NAME \
  zoneid=ZONE_UUID \
  clusterid=CLUSTER_UUID \
  scope=CLUSTER \
  provider=PROVIDER_NAME \
  url=PROVIDER_SPECIFIC_URL \
  tags=STORAGE_TAG
```

Do not invent a Ceph or NFS URL by copying an example from another release. Use `createStoragePool` help and the current provider documentation, and avoid credentials in command history. Storage tags must match the disk or service offering intentionally; a tag mismatch can make healthy capacity ineligible.

Create a separate test pool first. Deploy a disposable VM, attach a data volume, snapshot it using a supported path, migrate or restart the VM, and restore the data before admitting production workloads.

## Verify CloudStack Placement

```bash
cmk list storagepools id=STORAGE_POOL_UUID
cmk list storagepoolsmetrics id=STORAGE_POOL_UUID
cmk list volumes virtualmachineid=TEST_VM_UUID
cmk list virtualmachines id=TEST_VM_UUID
```

On the current KVM host, correlate the CloudStack volume with libvirt without editing it:

```bash
sudo virsh domblklist TEST_VM_DOMAIN --details
sudo virsh dumpxml TEST_VM_DOMAIN | sed -n '/<disk /,/<\/disk>/p'
```

Confirm that all intended destination hosts can access the same shared pool. A successful mount on one host does not prove cluster-wide reachability. Also confirm that a failed storage endpoint is not silently reachable through the same physical switch, DNS service, or authentication dependency you intended to test.

## Roll Back Safely

If the new pool fails validation, stop placing new volumes on it. Migrate or recreate every test volume through CloudStack, then confirm the pool has no volumes, templates, snapshots, or active jobs:

```bash
cmk list volumes storageid=STORAGE_POOL_UUID listall=true
cmk list snapshots listall=true
cmk list asyncjobs listall=true
```

Only then use the documented pool maintenance and delete operation. Never delete the backing directory, NFS export, RBD pool, or Ceph client key while CloudStack still references it. Keep the old pool intact until restored VMs have passed application-level checks and backup restore tests.

## Troubleshooting Selection Mistakes

- **HA restart has no destination:** verify the volume is on storage reachable from another compatible host, there is contiguous compute capacity, the host is fenced, and offering/affinity constraints permit placement.
- **NFS VM I/O freezes:** inspect server health, network loss, client mount state, latency, and kernel logs. Do not force-unmount a live QEMU path.
- **Ceph latency spikes during recovery:** check fullness, placement-group state, slow operations, client network saturation, and recovery tuning. Do not hide degraded redundancy by clearing health warnings.
- **A pool is healthy but never selected:** compare zone/cluster scope, provider, hypervisor, storage tags, disk-offering tags, and capacity thresholds.
- **Migration works one way only:** compare storage reachability, libvirt/QEMU versions, CPU compatibility, bridges, secrets, and client configuration on both hosts.

## Conclusion

Choose storage from the recovery objective outward. Local disks favor simplicity and host-local performance, NFS offers approachable shared storage when the NFS service is genuinely redundant, and Ceph RBD offers distributed block resilience when the team can operate it. Prove the choice with destructive failure drills on disposable workloads, independent restores, and end-to-end CloudStack placement checks before production use.

## Official Documentation

- [Apache CloudStack: Storage](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html)
- [Apache CloudStack: Virtual Machine High Availability](https://docs.cloudstack.apache.org/en/latest/adminguide/virtual_machines.html#vm-lifecycle)
- [Apache CloudStack: Service Offerings](https://docs.cloudstack.apache.org/en/latest/adminguide/service_offerings.html)
- [Apache CloudStack: createStoragePool API](https://cloudstack.apache.org/api/apidocs-4.23/apis/createStoragePool.html)
- [Ceph: RADOS Block Device](https://docs.ceph.com/en/latest/rbd/)
- [Ceph: Monitoring Cluster Health](https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- [libvirt: Storage Management](https://libvirt.org/storage.html)
