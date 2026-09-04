# How to Replace or Readdress CloudStack Secondary Storage Without Breaking Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Storage, NFS, Backup, Troubleshooting

Description: Add a replacement CloudStack image store, cordon the old store, migrate tracked templates and snapshots, verify every object, and retire the old address without database edits.

---

CloudStack secondary storage contains tracked templates, ISOs, snapshot backups, and transfer metadata. Changing an NFS hostname in DNS or editing a database URL while jobs are active can strand those objects even if the bytes still exist. The safe pattern is storage replacement, not an in-place identity trick:

```text
prepare new store -> add it to CloudStack -> make old store read-only
-> migrate tracked objects -> verify -> delete old store through CloudStack
```

Current CloudStack supports multiple secondary stores, whole-store balancing/migration, selective template and snapshot migration, and a read-only image-store state. Use those control-plane operations so database records and bytes move together.

## Inventory Before the Change

Record the zone, old image-store UUID, provider, exact URL, capacity, read-only state, SSVM health, and all tracked objects:

```bash
cmk list imagestores id=OLD_STORE_UUID
cmk list imagestoreobjects id=OLD_STORE_UUID
cmk list systemvms systemvmtype=secondarystoragevm zoneid=ZONE_UUID
cmk list templates templatefilter=all listall=true zoneid=ZONE_UUID
cmk list isos isofilter=all listall=true zoneid=ZONE_UUID
cmk list snapshots listall=true zoneid=ZONE_UUID showunique=false
```

Export the JSON results to the change record and calculate counts plus reported physical sizes by resource type. The image-store browser can reveal files that have no obvious resource association, but the documentation warns that unassociated-looking files may still be used. Do not delete them manually.

Pause bulk template copies, imports, and snapshot schedules if the maintenance policy permits. Record every in-flight async job and let it finish or fail cleanly.

## Prepare a Distinct New NFS Export

Use a new export identity, such as `nfs02.internal.example:/cloudstack-secondary`, even if the eventual goal is to reuse an IP. Ensure it is in the same zone and reachable on all required infrastructure paths. Current installation guidance requires a secondary store to serve all hosts in its zone.

On the NFS server:

```bash
sudo exportfs -v
df -h /cloudstack-secondary
df -i /cloudstack-secondary
```

From each relevant network, test DNS and a read-only mount with the intended NFS version/options:

```bash
getent ahosts nfs02.internal.example
showmount -e nfs02.internal.example
sudo mkdir -p /mnt/new-secondary-check
sudo mount -t nfs -o ro \
  nfs02.internal.example:/cloudstack-secondary /mnt/new-secondary-check
findmnt /mnt/new-secondary-check
sudo umount /mnt/new-secondary-check
```

Use the export and security options required by the official CloudStack NFS setup, but scope client CIDRs to infrastructure networks. Do not expose a writable secondary store to tenant networks.

## Add the New Store Through CloudStack

Use **Infrastructure > Secondary Storage > Add Secondary Storage**, or inspect and invoke the local API command:

```bash
cmk help add imagestore
cmk add imagestore \
  provider=NFS \
  name=secondary-nfs02 \
  url=nfs://nfs02.internal.example/cloudstack-secondary \
  zoneid=ZONE_UUID
```

Confirm the exact URL syntax and command parameters with 4.23 API help before execution. Adding storage is a destructive onboarding action for pre-existing contents according to the installation guide, so the new export must be empty and dedicated to CloudStack.

Verify CloudStack reports the new store and that the zone's SSVM can mount/write it. Register a small private checksum-pinned test object, wait for `Ready`, and delete it through CloudStack.

## Cordon the Old Store

Set the old image store read-only so CloudStack stops placing new templates, ISOs, and snapshot copies there:

```bash
cmk updateImageStore id=OLD_STORE_UUID readonly=true
cmk list imagestores id=OLD_STORE_UUID
```

The camel-case form above is the example used in current CloudStack storage documentation. Check the local CloudMonkey profile if it normalizes command names differently.

Read-only does not migrate existing objects. It creates a stable source inventory while new placement goes elsewhere. Confirm no new object appears on the old store after the cordon.

## Migrate CloudStack-Tracked Data

In the image-store **Browser**, use the supported secondary-storage migration workflow. Choose full migration when replacing the store, or selectively move templates and snapshots with `migrateResourceToAnotherSecondaryStorage` when a staged cutover is safer.

Before starting, review these global settings documented by CloudStack:

- `image.store.imbalance.threshold`
- `secstorage.max.migrate.sessions`
- `max.ssvm.count`
- `max.data.migration.wait.time`

Do not raise concurrency simply because the copy is slow. Migration competes for SSVM CPU, NFS throughput, and network capacity with normal template and snapshot work. Start with one representative large template, track its asynchronous job, and verify it before scaling.

```bash
cmk list asyncjobs
cmk query asyncjobresult jobid=MIGRATION_JOB_UUID
sudo grep -nE 'MIGRATION_JOB_UUID|OLD_STORE_UUID|NEW_STORE_UUID' \
  /var/log/cloudstack/management/management-server.log
```

If an individual copy fails, keep both stores online and fix the first error. Do not rsync CloudStack's object directories as a substitute for the migration API; copying bytes does not relocate CloudStack's datastore records.

## Reconcile Every Object

After migration, repeat the original inventory. Require:

- every template and ISO is `Ready` on the intended store/zone;
- every retained snapshot reports `BackedUp` and the new datastore;
- counts and reported physical sizes reconcile, accounting for deduplication or sparse files;
- no async migration/copy job remains pending;
- newly registered objects and snapshots land on writable storage; and
- a test VM deploys from both a small and a representative large template.

Test a restore from a retained snapshot into a new volume and attach it to a disposable VM. Listing files is not proof that restore metadata and chains are valid.

## Handle an Address-Only Change

If hardware stays the same but its address must change, the safest CloudStack procedure is still to present a new stable name/export, add it as a new store, and migrate. Avoid a DNS flip while old NFS mounts and long-running jobs cache the prior address. If policy forces a storage-side move, maintain the old endpoint until CloudStack no longer references it and all clients have cleanly remounted.

Never update the image-store URL directly in MySQL. CloudStack's database, SSVM mounts, object-store records, and running jobs must transition together.

## Retire and Roll Back Safely

Keep the old export mounted, read-only in CloudStack, and unchanged through an agreed rollback window. If verification fails, stop migration, correct the new-store problem, and continue serving objects from the old store. Do not make both sides independently writable copies of the same identity.

Only after reconciliation and restore/deploy tests should you delete the old image store through CloudStack:

```bash
cmk help delete imagestore
cmk delete imagestore id=OLD_STORE_UUID
```

Confirm the UI/API result before unexporting or repurposing the old filesystem. Archive the pre/post inventories and change record.

## Conclusion

Secondary storage has both bytes and control-plane identity. Add a clean replacement, prove SSVM access, mark the old store read-only, migrate through CloudStack, and validate deploy plus restore operations. Retire the old endpoint only after CloudStack has no tracked dependency on it, keeping the unchanged source as the rollback path.

## Official Documentation

- [Apache CloudStack: Secondary Storage and Migration](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html#secondary-storage)
- [Apache CloudStack: Configuring Secondary Storage](https://docs.cloudstack.apache.org/en/latest/installguide/configuration.html#add-secondary-storage)
- [Apache CloudStack: System VMs and SSVM](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html#secondary-storage-vm)
- [Apache CloudStack: API Reference](https://cloudstack.apache.org/api/)
- [Red Hat: Deploying an NFS Server](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services)
