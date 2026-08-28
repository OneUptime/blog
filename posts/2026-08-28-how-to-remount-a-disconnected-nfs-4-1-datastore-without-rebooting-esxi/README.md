# How to Remount a Disconnected NFS 4.1 Datastore Without Rebooting ESXi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, NFS 4.1, Datastore, Storage Recovery, ESXCLI, Troubleshooting

Description: Recover an NFS 4.1 datastore that remains inaccessible by safely removing its stale ESXi mount and re-adding the same export without rebooting the host.

---

An NFS 4.1 datastore can remain present in ESXi with `Accessible: false` and `Mounted: false` after a storage outage, network interruption, or failed boot-time mount. When the server and network are healthy again, simply re-adding the same server does not always refresh that stale mount state.

Broadcom's documented recovery is to remove the disconnected NFS 4.1 mount from ESXi and add the same export again. Removing the mount does not delete files on the NFS server, but it is still a disruptive metadata operation: every VM, ISO, scratch location, backup job, and script using the datastore must be stopped or moved first.

This runbook covers ESXi 7.0.x and 8.0.x and uses the `nfs41` ESXCLI namespace. The similar `esxcli storage nfs` commands are for NFS version 3 and are not interchangeable.

## Decide Whether This Is the Right Recovery

Use this procedure when:

- the NFS server and export are available again;
- another host can reach the same export, or the storage team has verified it;
- `esxcli storage nfs41 list` shows the target volume as inaccessible and unmounted;
- there are no active consumers on this host;
- a stale mount, rather than missing data or a storage-side rollback, is the remaining problem.

Do not remove the mount if its state is still `Accessible: true`, if VMs are running from it, or if you have not identified the exact server and export. If only one host is affected, compare it with a healthy host before changing anything.

## Capture the Existing Definition

Open SSH only for the approved maintenance window and record the full NFS 4.1 list:

```bash
esxcli storage nfs41 list
```

For the affected row, record at least:

- `Volume Name`;
- every entry under `Host(s)`;
- `Share`;
- `Vmknics`;
- `Connections`;
- `Security`;
- `Accessible` and `Mounted`.

Also record the host build:

```bash
vmware -vl
```

The examples below use a single NFS server, `/exports/vsphere`, the volume label `NFS41-Data`, and `AUTH_SYS`. If the real mount uses Kerberos, multiple server addresses, an explicit VMkernel mapping, or a non-default connection count, reconstruct it with those exact original properties.

## Restore the Underlying Path First

A remount will fail again until the cause of the disconnect is fixed. Verify:

- the NFS service and export are online;
- DNS still resolves the same address if the mount uses a host name;
- VLANs, switch links, routing, and firewalls permit NFS traffic;
- the ESXi source address remains authorized by the export policy;
- time and Kerberos dependencies are healthy when Kerberos is used.

If the datastore uses a known VMkernel adapter, test the server through that source:

```bash
vmkping -I vmk2 192.0.2.50
```

Inspect recent NFS messages before clearing the state:

```bash
grep -iE 'NFS41|SunRPC|socket disconnected|Timeout|Permission denied' \
  /var/run/log/vmkernel.log
```

After a boot-time failure, also inspect `/var/run/log/boot.log`. Save logs before recovery if the root cause will require vendor support.

## Remove Every Consumer

Before unmounting, check vCenter and the host for:

- powered-on, suspended, or registered VMs using the datastore;
- mounted VM or content-library ISO files;
- host scratch, core-dump, syslog, or locker locations;
- Storage DRS, HA heartbeat, replication, backup, monitoring, or third-party scripts;
- open datastore-browser or shell sessions.

Evacuate or stop those consumers according to their product procedures. A failed removal with `Unable to Unmount filesystem: Busy` is a safety signal. Do not keep retrying or jump to a force-removal command while an owner is unknown.

## Remove the Disconnected NFS 4.1 Mount

Confirm immediately before removal that the target is still the intended inaccessible volume:

```bash
esxcli storage nfs41 list
```

Then remove it by its exact volume label:

```bash
esxcli storage nfs41 remove -v NFS41-Data
```

This unmounts the share from this ESXi host. It does not delete the export or its files. Verify that the stale row is gone before re-adding it:

```bash
esxcli storage nfs41 list
```

If removal reports that the filesystem is busy, stop. Find and release the remaining consumer. Broadcom mentions a legacy fallback only after validating that there is no active VM or data use, but escalating with logs is safer than forcing an unverified production mount out of the host.

## Re-add the Same Export

For a single-server, unbound `AUTH_SYS` mount, use the Broadcom-documented form:

```bash
esxcli storage nfs41 add \
  -H 192.0.2.50 \
  -s /exports/vsphere \
  -v NFS41-Data
```

On ESXi 8.0 Update 3 or later, if the recorded mount was bound to a specific VMkernel adapter, preserve that mapping with the documented `-I <server>:<vmk>` form instead:

```bash
esxcli storage nfs41 add \
  -I 192.0.2.50:vmk2 \
  -s /exports/vsphere \
  -v NFS41-Data
```

Use one form or the other according to the captured configuration. Do not silently change the datastore label, export path, security mode, endpoint set, binding, or connection count during an incident. A different label can leave VMs pointing to the old datastore identity, and a wrong export can expose unrelated data under a familiar-looking name.

For Kerberos or a multi-endpoint NFS 4.1 mount, consult the current NFS datastore documentation and the storage vendor's procedure for the required ESXCLI parameters. The short examples above are not complete templates for those configurations.

## Verify Recovery Before Returning Workloads

Check the mount state:

```bash
esxcli storage nfs41 list
esxcli storage filesystem list
```

The intended NFS 4.1 row should show `Accessible: true` and `Mounted: true`, with the same server, share, security, and VMkernel mapping recorded before removal.

Then verify in the vSphere Client:

1. Refresh **Storage > Datastores** and open the datastore browser.
2. Confirm a known directory and file are present.
3. Confirm previously registered VMs no longer show as inaccessible.
4. If an inventory entry remains stale, refresh it before unregistering anything.
5. Perform a controlled read/write test only if the change plan and storage owner allow it.

Monitor the logs while returning workloads:

```bash
grep -iE 'NFS41|SunRPC|APD|Timeout|Permission denied' \
  /var/run/log/vmkernel.log
```

Do not format, rename, or create a new datastore because the recovered mount looks empty. Stop and compare the server and export with the captured definition.

## Rollback and Escalation

If the re-added mount points to the wrong endpoint or uses the wrong options, keep consumers stopped, remove that mount by the exact volume label, and re-add the original recorded definition. Since the remove operation does not modify NFS share contents, the principal rollback risk is mounting the wrong share or returning workloads before verifying identity.

Escalate to Broadcom and the storage vendor when:

- the mount remains busy after all known consumers are removed;
- the export is healthy for other hosts but the add operation repeatedly times out;
- the server returns a different filesystem identity or stale file handles;
- the mount repeatedly disconnects after recovery;
- logs show APD, session, locking, or server-identity errors that are not explained by the network outage.

Generate a support bundle before rebooting or making additional low-level changes.

## Prevent a Repeat After Boot

Broadcom documents an ESXi 8.x case where the NFS 4.1 mount is attempted before its physical network is ready. The mount times out and remains unavailable because the ESXi 8.x NFS 4.1 client in that scenario does not perform the automatic retry added in ESX 9.0. A manual remove and add restores service, but it does not fix the network initialization delay.

Investigate link negotiation, LAG readiness, physical NIC speed, switch convergence, DNS, and export availability during boot. Upgrade to a fixed release when a Broadcom KB identifies the host build as affected. Do not automate repeated remove/add operations as a substitute for fixing the underlying path.

## Official Documentation

- [Remounting a disconnected NFS datastore from the ESXi command line](https://knowledge.broadcom.com/external/article/344470)
- [NFS 4.1 datastore fails to remount after ESXi Host reboot on ESXi 8.x](https://knowledge.broadcom.com/external/article/416172)
- [NFS 4.1 Datastores using Custom NFS TCP/IP Stack become inaccessible after upgrading to ESXi 8.0.2](https://knowledge.broadcom.com/external/article/380337)
- [NFS shares do not automatically remount after a reboot or an upgrade](https://knowledge.broadcom.com/external/article/397252)

## Conclusion

To recover a stale NFS 4.1 mount without rebooting ESXi, first restore network and server health, capture the exact mount definition, eliminate every consumer, remove the inaccessible `nfs41` volume, and re-add the same export with the same options. Verify its identity and live mount state before returning any VM or host service to it.
