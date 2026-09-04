# How to Recover CloudStack System VMs Stuck in the Starting State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Virtualization, Networking, Storage, Troubleshooting

Description: Diagnose CloudStack Console Proxy and Secondary Storage VMs stuck in Starting by tracing the async job through template, capacity, storage, hypervisor, and control-network dependencies.

---

CloudStack System VMs are ordinary-looking virtual machines with extraordinary dependencies. The Console Proxy VM (CPVM) carries browser console sessions to hypervisor VNC ports. The Secondary Storage VM (SSVM) downloads templates and ISOs, copies templates between zones, and backs up snapshots. If either remains in `Starting`, retrying or destroying it before fixing the underlying dependency usually produces another stuck System VM.

Use a dependency-first recovery: preserve the first failure, determine whether a domain was created on a hypervisor, and work backward through host capacity, primary storage, the System VM template, and the system/public networks.

## Record State Before Changing It

From the UI, capture the System VM's UUID, type, zone, pod, host (if assigned), private and link-local addresses, template, and latest job/event. With CloudMonkey, begin with read-only calls:

```bash
cmk list systemvms state=Starting
cmk list events type=VM.START level=ERROR
cmk list asyncjobs
```

CloudMonkey command spelling can vary between profiles and versions; `cmk help list systemvms` shows the locally supported parameters. Search the exact UUID and job ID in the management log:

```bash
sudo grep -nE 'SYSTEM_VM_UUID|ASYNC_JOB_ID' \
  /var/log/cloudstack/management/management-server.log
```

Also save current infrastructure state. Do not edit the CloudStack database to force `Running` or `Stopped`; that changes the record without changing the VM.

## Determine How Far Startup Reached

On the assigned KVM host, if any:

```bash
sudo virsh -c qemu:///system list --all
sudo virsh -c qemu:///system dominfo SYSTEM_VM_DOMAIN
sudo journalctl -u cloudstack-agent -u libvirtd -n 250 --no-pager
sudo tail -n 250 /var/log/cloudstack/agent/agent.log
```

Use the exact domain returned by `virsh list --all`. On KVM, SSVM domains use the `s-<id>-VM` form, while CPVM domains use `v-<id>-VM`; `SYSTEM_VM_DOMAIN` represents whichever type is being diagnosed.

The result separates two paths:

- No libvirt domain was defined: investigate allocation, template readiness, storage, or an agent command failure.
- A domain exists but never reports ready: inspect its console, NICs, boot disk, link-local network, and System VM agent logs.

Never start or redefine the domain manually with `virsh`; CloudStack must remain the source of truth.

## Verify Hosts and System Capacity

A System VM needs an `Up`, enabled host and capacity that satisfies its system service offering and storage/host tags. Check:

```bash
cmk list hosts zoneid=ZONE_UUID state=Up
cmk list capacity zoneid=ZONE_UUID
cmk list serviceofferings issystem=true
cmk list storagepools zoneid=ZONE_UUID
```

Look for disabled/disconnected hosts, exhausted memory or CPU, a storage pool in maintenance, mismatched tags, or an architecture mismatch. Current CloudStack supports both `x86_64` and `aarch64` System VM templates; the preferred architecture and available hosts must align.

Do not solve capacity by shrinking the System VM below documented requirements. The official guide says the 64-bit System VM template should use an offering with at least 512 MB of memory, and real environments may need more.

## Verify the Correct System VM Template

The template must match the zone's hypervisor and CPU architecture and must be ready on usable secondary storage. Inspect it in **Images > Templates** or via the API:

```bash
cmk list templates templatefilter=all listall=true zoneid=ZONE_UUID
cmk list imagestores zoneid=ZONE_UUID
```

Current releases automatically register and seed required templates during zone deployment and upgrades. If automatic seeding failed, fix repository reachability, name resolution, proxy/TLS trust, or secondary storage first. The official guide permits manual registration/seeding with `cloud-install-sys-tmplt` when an SSVM is unavailable, but the template URL and hypervisor flag must match the installed release.

Check the template's `isready`, status/download details, architecture, hypervisor, and System/ROUTING type. A user template with the same display name is not a substitute.

## Verify Primary and Secondary Storage

The System VM's root disk must be created on primary storage, while the image originates from secondary storage. On every candidate KVM host, verify the storage paths without modifying CloudStack-managed contents:

```bash
df -hT
findmnt -t nfs,nfs4
sudo virsh pool-list --all
sudo journalctl -u cloudstack-agent -n 250 --no-pager | \
  grep -Ei 'storage|nfs|pool|volume|permission|space'
```

For NFS, check export authorization, consistent DNS, NFS version/mount options, server availability, free space, and root-squash behavior expected by the documented setup. For Ceph, check monitor quorum and the exact client/key/pool access. Do not rename template files, copy volumes by hand, or delete “orphan-looking” objects while CloudStack tracks them.

## Verify System and Public Networks

System VMs use link-local/control networking and also depend on correctly configured management/public traffic. Compare bridge names, physical-network labels, VLAN trunks, MTU, and routes across all KVM hosts:

```bash
ip -br address
ip -d link show
bridge vlan show
bridge link
sudo virsh domiflist SYSTEM_VM_DOMAIN
```

If the domain boots, inspect its console for DHCP, interface, route, or cloud service failures. A System VM is considered operational only after it can communicate with the management server, not merely after QEMU reports `running`.

When SSH diagnostics are possible, current CloudStack documents port 3922 and the per-host key `/root/.ssh/id_rsa.cloud` for KVM/XenServer System VMs:

```bash
sudo ssh -i /root/.ssh/id_rsa.cloud \
  -p 3922 root@LINK_LOCAL_IP
```

Use the **Run Diagnostics** or **Get Diagnostics** UI actions when available. The bundle includes network state and System VM logs. Do not expose port 3922 beyond the infrastructure path.

## Recover Only After the Dependency Is Healthy

Once the concrete fault is corrected, use the least disruptive action:

1. Reconnect or re-enable a healthy host if that was the only fault.
2. Cancel storage maintenance only after storage is truly available.
3. Retry/start the existing System VM if CloudStack presents that safe action.
4. Destroy and let CloudStack recreate the CPVM/SSVM only when its disk or boot-time configuration must be replaced.

Destroying a CPVM interrupts active console sessions. Destroying an SSVM pauses template, ISO, and snapshot-copy work. In a production zone, confirm another healthy System VM can carry the role or schedule the interruption.

Follow recreation in all three places:

```bash
sudo tail -F /var/log/cloudstack/management/management-server.log
sudo tail -F /var/log/cloudstack/agent/agent.log
sudo virsh -c qemu:///system list --all
```

## Verify Recovery

Require more than a green state:

- The System VM becomes `Running` and stays connected through multiple health intervals.
- The CPVM opens a new guest console through the intended HTTPS/WebSocket path.
- The SSVM downloads a small checksum-pinned test image and reports it `Ready`.
- Snapshot backup/copy jobs resume if they were pending.
- No fresh management or agent errors reference the new System VM UUID.

After a template or global boot setting change, recreate rather than merely reboot the affected System VM when the documentation requires new boot arguments.

## Conclusion

`Starting` means CloudStack has not completed the full System VM handshake. Trace the async job to the host, then validate capacity, the exact System VM template, both storage tiers, bridges/VLANs, and the link-local management path. Recreate the VM only after that chain is healthy; otherwise CloudStack will faithfully reproduce the same failure.

## Official Documentation

- [Apache CloudStack: System VMs](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html)
- [Apache CloudStack: Storage Overview](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html)
- [Apache CloudStack: Host and Storage Tags](https://docs.cloudstack.apache.org/en/latest/adminguide/host_and_storage_tags.html)
- [Apache CloudStack: System VMs and Virtual Routers During Upgrade](https://docs.cloudstack.apache.org/en/latest/upgrading/upgrade/_sysvm_restart.html)
- [Apache CloudStack: API Reference](https://cloudstack.apache.org/api/)
