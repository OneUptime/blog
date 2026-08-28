# How to Configure iSCSI Port Binding and Round-Robin Multipathing on ESXi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, iSCSI, VMkernel, Port Binding, Multipathing, Round Robin, Storage

Description: Configure supported software-iSCSI port binding on ESXi, verify redundant paths, and apply Round Robin only where the storage array supports it.

---

iSCSI port binding and Round Robin solve different parts of a multipathing design. Port binding makes the ESXi software iSCSI initiator establish sessions through specific VMkernel adapters. Round Robin (`VMW_PSP_RR`) is an NMP path selection policy configured per NMP-controlled storage device.

A correct configuration normally has one iSCSI VMkernel adapter per physical uplink, with every VMkernel adapter pinned to a different active uplink. It is not an active/active NIC team. ESXi discovers multiple storage paths and NMP decides which eligible path carries each I/O.

This guide applies to the software iSCSI adapter on ESXi 7.x and 8.x. ESXi 7.x reached End of General Support on October 2, 2025. Menu labels below reflect the vSphere 8 client.

## Confirm That Port Binding Fits the Topology

Use iSCSI port binding when all of the following are true:

- the iSCSI VMkernel adapters are in the same IP subnet and broadcast domain;
- the adapters are on the same vSwitch;
- each VMkernel adapter maps one-to-one to a physical NIC;
- every configured target portal is reachable from every bound VMkernel adapter;
- the target design is supported by the array vendor.

Do not use this procedure merely because two storage NICs exist. This same-subnet procedure does not apply when the bound VMkernel adapters span different subnets or broadcast domains. vSphere 6.5 and later supports specific routed port-binding designs that use static routes or per-VMkernel gateways to reach target portals in other subnets, but those designs are outside this guide and must follow Broadcom and array-vendor guidance. VMkernel adapters on multiple iSCSI VLANs should use separate vSwitches rather than being bound together, and software-iSCSI multipathing must not use LACP or another link-aggregation group.

For example, this is a suitable same-subnet design:

| Component | Address | Active uplink | Other uplink |
| --- | --- | --- | --- |
| `vmk1` / `iSCSI-A` | `192.0.2.11/24` | `vmnic2` | Unused |
| `vmk2` / `iSCSI-B` | `192.0.2.12/24` | `vmnic3` | Unused |
| Array portal | `192.0.2.50/24` | Array-defined | Array-defined |

Replace every example address and device identifier in this guide. Do not copy the documentation subnet into production.

## Prerequisites and Change Safety

Before changing storage networking:

- verify the ESXi server, NICs, drivers, firmware, and array against the Broadcom Compatibility Guide and the storage vendor's interoperability matrix;
- confirm that the vendor supports `VMW_PSP_RR` for the exact array personality, firmware, and LUN type;
- confirm that the LUN is owned by VMware NMP rather than HPP or a third-party multipathing plug-in, whose policy commands and support rules differ;
- use a maintenance window and preserve independent host-management access;
- do not enable the Management traffic service on VMkernel adapters dedicated to iSCSI port binding;
- record the current vSwitch, port-group, VMkernel, discovery, path, SATP, and PSP configuration;
- make the configuration consistent on every cluster host that accesses the same LUNs;
- confirm the MTU is identical end to end if jumbo frames are used.

Do not begin by changing the path policy on every `naa.*` device. A host can see boot, local, vSAN, FC, and multiple vendors' devices at the same time. Scope every policy change to a verified iSCSI LUN.

Useful read-only baselines are:

```bash
esxcli network ip interface list
esxcli network vswitch standard list
esxcli iscsi adapter list
esxcli storage nmp device list
```

## Create and Pin the iSCSI VMkernel Adapters

In the vSphere Client, select the ESXi host and open **Configure > Networking > Virtual switches**.

1. Create or select the standard switch used for iSCSI and attach both intended physical NICs.
2. Create two VMkernel port groups, such as `iSCSI-A` and `iSCSI-B`, on that switch.
3. Give each VMkernel adapter a unique static address in the iSCSI subnet.
4. Edit `iSCSI-A`, open **Teaming and failover**, and enable the port-group override.
5. Leave `vmnic2` Active and move every other uplink, including `vmnic3`, to **Unused**.
6. Edit `iSCSI-B`, leave `vmnic3` Active, and move every other uplink to **Unused**.

Do not leave the alternate uplink in Standby. For software-iSCSI port binding, each VMkernel adapter needs one unique Active uplink and the other uplinks must be Unused.

Test every configured target portal from every source interface before binding them. For this single-portal example:

```bash
vmkping -I vmk1 192.0.2.50
vmkping -I vmk2 192.0.2.50
```

A successful ping proves IP reachability, not that authentication, target ACLs, LUN masking, MTU, or iSCSI itself is correct. Resolve asymmetric routing or failed source-interface tests before continuing.

## Bind the VMkernel Adapters to Software iSCSI

If the host does not yet have a software initiator, select **Configure > Storage > Storage Adapters**, choose **Add Software Adapter**, and add an iSCSI adapter. Record its `vmhba` identifier.

Then:

1. Select the software iSCSI adapter.
2. Open **Network Port Binding**.
3. Click **Add**.
4. Select both iSCSI VMkernel adapters and confirm the change.
5. Configure dynamic or static discovery exactly as required by the array vendor.
6. Rescan the software iSCSI adapter.

If a VMkernel adapter is missing or ineligible, do not force the configuration. Recheck that both VMkernel adapters are on the same vSwitch and subnet and that each port group's teaming override has exactly one unique Active uplink with the others Unused.

## Verify That ESXi Has Multiple Paths

First inspect the sessions and find the exact NAA identifier for the intended LUN:

```bash
esxcli iscsi session list
esxcli storage nmp device list
```

Then inspect only that device:

```bash
esxcli storage core path list -d naa.60000000000000000000000000000000
esxcli storage nmp device list -d naa.60000000000000000000000000000000
```

The core-path output should show the paths the array design predicts. Stop here if paths are missing, dead, or mapped through an unexpected VMkernel adapter. Changing the PSP cannot repair an incorrect network, discovery, zoning, ACL, or LUN-masking design.

## Set Round Robin on the Intended LUN

In the vSphere Client:

1. Select the host and open **Configure > Storage > Storage Devices**.
2. Select the exact iSCSI device by its NAA identifier.
3. In the **Properties** tab, scroll to **Multipathing Policies** and click **Edit Multipathing**.
4. Select **Round Robin (VMware)** and save.

The equivalent per-device ESXCLI command documented by Broadcom is:

```bash
esxcli storage nmp device set \
  --device naa.60000000000000000000000000000000 \
  --psp VMW_PSP_RR
```

Verify the result:

```bash
esxcli storage nmp device list \
  -d naa.60000000000000000000000000000000
```

Look for `Path Selection Policy: VMW_PSP_RR` and review `Working Paths`. This setting is per host and per device, so repeat the validated change on each host that can run workloads on the datastore.

Round Robin rotates across eligible paths, not necessarily every path displayed by ESXi. With ALUA, active-optimized paths are normally used while active-non-optimized paths remain available for failover. On an active/passive array, seeing only paths to the active controller under `Working Paths` can be expected.

Do not change the Round Robin I/O switching limit from its default merely because examples on the internet use `IOPS=1`. Broadcom documents that adjustment for environments where the storage vendor recommends or requires it. Apply the array vendor's supported setting, not a generic tuning recipe.

## Test Failure Behavior Carefully

Perform a controlled path test only with the storage and network teams present and with current backups. Disable one array or switch path using the vendor-approved method, rather than pulling arbitrary cables from an active production host.

Do not unmap, delete, or power off the LUN as a path-failover test.

During the test, verify that:

- the datastore stays accessible;
- I/O continues without guest errors;
- the failed path changes state as expected;
- I/O uses the remaining eligible path;
- the recovered path returns to the state documented by the array vendor.

Capture `vmkernel.log` and `vobd.log` if the host reports All Paths Down, Permanent Device Loss, or loss of path redundancy. Do not continue testing after unexpected datastore or guest disruption.

## Roll Back Safely

If Round Robin is not supported or causes unexpected behavior, restore the previously recorded PSP on the exact LUN through **Edit Multipathing**. Verify the restored value with `esxcli storage nmp device list -d <naa-id>`.

If port binding itself must be removed, first evacuate or stop workloads that depend on the affected storage and follow the array's disconnect procedure. Remove the VMkernel bindings from the software iSCSI adapter, rescan, and verify the intended alternative paths before deleting a VMkernel adapter or port group. Never delete an iSCSI VMkernel adapter while it is carrying the only live path to an in-use datastore.

## Common Failure Patterns

- **No adapters appear in Network Port Binding:** the teaming policy is usually Active/Active, Active/Standby, or not overridden at the port-group level.
- **Only one path appears:** confirm both bindings, both source-interface pings, target portal configuration, array initiator ACLs, and LUN masking.
- **Rescans are slow or paths are unexpected:** recheck whether port binding was used across different subnets or broadcast domains.
- **Only optimized paths carry I/O:** this can be correct ALUA behavior, not a Round Robin failure.
- **The cluster behaves inconsistently:** compare bindings, SATP, PSP, discovery, and advanced settings on every host.

## Official Documentation

- [Configuring iSCSI port binding with multiple NICs in one vSwitch for VMware ESXi](https://knowledge.broadcom.com/external/article/323116)
- [Considerations for using software iSCSI port binding in ESXi](https://knowledge.broadcom.com/external/article/317719)
- [VMware Multipathing policies in ESXi/ESX](https://knowledge.broadcom.com/external/article/339621)
- [Unbalanced storage controller traffic and Round Robin multipathing configuration for ESXi hosts](https://knowledge.broadcom.com/external/article/452961)
- [Storage Configuration Should Be Consistent Throughout Cluster](https://knowledge.broadcom.com/external/article/317694)

## Conclusion

A reliable ESXi iSCSI design uses port binding only for the topology Broadcom documents, pins each VMkernel adapter to one physical uplink, and proves all expected paths before changing a LUN's path policy. Round Robin should then be applied per device, consistently across hosts, and only with explicit array-vendor support.
