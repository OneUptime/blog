# How to Route NFS 4.1 Through a Dedicated ESXi VMkernel Adapter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, NFS 4.1, VMkernel, VMkernel Port Binding, Storage Networking, ESXi 8.0 U3

Description: Bind an NFS 4.1 datastore to a dedicated VMkernel adapter on ESXi 8.0 Update 3 or later and verify the actual NFS connection path.

---

ESXi normally chooses an egress VMkernel adapter from its TCP/IP routing state. That can be surprising when the NFS server is on another subnet or accepts mounts only from a dedicated storage address. Starting with ESXi 8.0 Update 3, the NFS 4.1 client supports VMkernel port binding, allowing a datastore to use an explicitly selected VMkernel adapter.

This guide uses that supported `vmkportbind` behavior. It does not recreate the custom NFS TCP/IP stack design used in older releases: Broadcom states that a custom TCP/IP stack for NFS is unavailable from ESXi 8.0. The dedicated NFS VMkernel adapter in this procedure therefore uses the Default TCP/IP stack.

## Scope and Example

The examples use:

| Item | Example value |
| --- | --- |
| ESXi release | 8.0 Update 3 or later |
| Dedicated adapter | `vmk2` |
| VMkernel address | `192.0.2.21/24` |
| NFS server | `192.0.2.50` |
| Export | `/exports/vsphere` |
| Datastore label | `NFS41-Data` |

Replace all values. The `-I` argument is a mapping in the form `<NFS-server-address>:<vmkernel-adapter>`; the address before the colon is the NFS server, not the VMkernel address.

NFS 4.1 port binding is not available on ESXi 8.0 Update 2 or earlier. On those releases, use a supported routing design or upgrade; do not copy the `-I` commands and assume they will work.

## Prerequisites

Before changing a datastore path:

- confirm the exact host build with **Host > Summary** or `vmware -vl`;
- verify that the NFS array supports NFS 4.1 for the ESXi release;
- ensure the export grants the dedicated VMkernel source address the required access;
- preserve management connectivity on a different, known-good path;
- use a maintenance window and evacuate workloads from an existing datastore before altering its binding;
- record the current server addresses, export, datastore label, authentication mode, VMkernel mappings, and connection count;
- apply the same supported design to every host that mounts the datastore.

For Kerberos, multiple server endpoints, session trunking, or vendor-specific authentication, preserve the complete existing mount definition. The simple commands below intentionally show a single endpoint and the default `AUTH_SYS` case.

## Create the Dedicated VMkernel Network

In the vSphere Client, select the host and open **Configure > Networking > VMkernel adapters**.

1. Add a VMkernel adapter to the standard or distributed port group dedicated to NFS.
2. Select the **Default TCP/IP stack**.
3. Assign the storage VLAN and static IP configuration required by the network design. Do not reuse a subnet already assigned to another VMkernel adapter on the Default TCP/IP stack.
4. If the NFS endpoint is routed, ensure `vmk2` has a supported forward path, using a per-adapter gateway override or destination-specific static route through the storage gateway when required.
5. In the port group's teaming policy, restrict the traffic to the intended storage uplink or uplinks.
6. Make the matching switch port, VLAN, MTU, routing, and ACL changes outside ESXi.

Do not move the management VMkernel adapter or replace the Default TCP/IP stack's existing default gateway as part of this storage change. If NFS crosses a router, confirm both the ESXi forward path through `vmk2` and the return route to the dedicated VMkernel subnet.

Test the exact source adapter before touching the datastore:

```bash
vmkping -I vmk2 192.0.2.50
```

Broadcom specifically recommends this source-bound `vmkping` check. A successful result confirms ICMP reachability from `vmk2`; it does not prove that TCP 2049, NFS authentication, export permissions, or NFS 4.1 server identity are correct.

## Record the Existing Mount and Connection

For an existing datastore, collect a baseline:

```bash
esxcli storage nfs41 list
esxcli network ip connection list
```

The NFS list includes `Host(s)`, `Share`, `Vmknics`, `Accessible`, `Mounted`, `Connections`, and `Security` on current ESXi 8 builds. Save the full line for the target volume.

To identify established NFS connections, inspect TCP connections whose remote port is 2049:

```bash
esxcli network ip connection list | grep -E 'Proto|:2049'
```

The local address shows which ESXi source address is actually carrying each connection. Treat this as the before-state for later verification. NFS 4.1 can share a session and TCP connection among datastores from the same server instance, so this is endpoint-level evidence and might not identify a socket unique to the target datastore; use it together with the target volume's `Vmknics` value.

## Bind a New NFS 4.1 Datastore

For a new, single-server `AUTH_SYS` datastore, bind the mount to `vmk2` while adding it:

```bash
esxcli storage nfs41 add \
  -I 192.0.2.50:vmk2 \
  -s /exports/vsphere \
  -v NFS41-Data
```

Do not add `-H` to this example. The Broadcom-documented port-binding form uses `-I` to supply the server-to-VMkernel mapping.

If the NFS 4.1 server has multiple addresses, use only the endpoint set the storage vendor documents as one NFS 4.1 server or trunking group. Map each documented server address explicitly, for example:

```bash
esxcli storage nfs41 add \
  -I 192.0.2.50:vmk2 \
  -I 192.0.2.51:vmk2 \
  -s /exports/vsphere \
  -v NFS41-Data
```

Do not invent additional server IPs to create redundancy. NFS 4.1 server identity, export consistency, and session trunking are storage-array properties.

## Bind an Existing NFS 4.1 Datastore

After evacuating or stopping its workloads and recording the original configuration, set the mapping on the existing volume:

```bash
esxcli storage nfs41 param set \
  -I 192.0.2.50:vmk2 \
  -v NFS41-Data
```

Broadcom documents `param set` for an existing NFS 4.1 datastore. Although the operation is supported at runtime, changing a production storage path can interrupt I/O if the new source address lacks reachability or export permission. Use a change window and do not treat a successful command return as the only validation.

The NFS 4.1 `nConnect` connection count is a separate setting. It does not replace VMkernel binding. Leave the connection count at the array-vendor-approved value unless performance testing and current Broadcom guidance justify a change.

## Verify the Binding and Data Path

Run:

```bash
esxcli storage nfs41 list
esxcli network ip connection list | grep -E 'Proto|:2049'
```

Confirm all of the following:

- the target datastore lists `vmk2` in the `Vmknics` column;
- `Accessible` and `Mounted` are both `true`;
- the connection output shows an established NFS connection from the address assigned to `vmk2`, and every connection attributable to the target uses that source; if shared sessions make attribution ambiguous or an unexpected source remains, treat the live path as unverified;
- the remote address is an approved NFS endpoint;
- the datastore browser can read an existing known file;
- a controlled non-destructive read/write test succeeds if the change plan permits one.

Also monitor `/var/run/log/vmkernel.log`. A `Permission denied` mount failure commonly means the NFS server saw an unapproved source address. A timeout points first to the VLAN, route, firewall, MTU, uplink, or server path rather than to datastore formatting.

## Failure and Rollback

If the new mapping makes the datastore inaccessible, stop the test immediately and restore the recorded configuration.

- If the datastore previously had explicit VMkernel mappings, restore every recorded mapping in one `esxcli storage nfs41 param set` command by repeating `-I <server>:<original-vmk>` for each mapping and supplying `-v <volume>`.
- If the datastore was previously unbound, there is no generic `clear binding` command documented in the cited Broadcom procedure. With all consumers stopped, remove and re-add the mount using its exact original server, export, security, and connection parameters.
- For a simple single-server `AUTH_SYS` mount, the unbound add form is `esxcli storage nfs41 add -H <server> -s <share> -v <volume>`.

Do not remove any datastore while virtual machines or templates are registered on it, swap files reside on it, or scripts or other consumers still reference it. Do not use the simple `-H` example to reconstruct a Kerberos or multi-endpoint mount; use the complete recorded configuration and current product documentation.

After rollback, repeat both verification commands and confirm the local TCP address matches the restored path.

## Troubleshooting Checklist

- **`-I` is rejected or absent from help:** verify the host is truly ESXi 8.0 Update 3 or later.
- **The mount is denied:** add the dedicated VMkernel source address to the NFS export policy and verify forward and return routing.
- **`vmkping -I` works but mounting fails:** test TCP 2049, NFS 4.1 support, export name, security mode, and array-side client permissions.
- **The `Vmknics` column is correct but the local TCP address is not:** capture the full command output and a support bundle before making more changes.
- **The design depended on a custom NFS TCP/IP stack:** redesign for the Default TCP/IP stack and supported VMkernel binding; custom NFS stacks are unavailable from ESXi 8.0.

## Official Documentation

- [NFS 4.1 Datastores using Custom NFS TCP/IP Stack become inaccessible after upgrading to ESXi 8.0.2](https://knowledge.broadcom.com/external/article/380337)
- [Unable to mount NFS4.1 datastores with error Permission denied](https://knowledge.broadcom.com/external/article/419497)
- [Support for nConnect feature added in ESXi's NFS41 client](https://knowledge.broadcom.com/external/article/370672)
- [NFS Support in VMware vSphere 8.0 and Beyond](https://knowledge.broadcom.com/external/article/370665)
- [After the Upgrade to vSphere 8 U3, vMotion fails with "Launch failure: Out of resources"](https://knowledge.broadcom.com/external/article/413049)

## Conclusion

On ESXi 8.0 Update 3 and later, NFS 4.1 VMkernel binding is the supported way to select a dedicated VMkernel adapter for a datastore. Build the adapter on the Default TCP/IP stack, prove source-specific reachability, apply the server-to-VMkernel mapping with `-I`, and verify both the datastore's `Vmknics` field and the live TCP local address.
