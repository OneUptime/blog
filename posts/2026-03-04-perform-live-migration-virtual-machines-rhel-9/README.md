# How to Perform Live Migration of Virtual Machines on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Live Migration, Virtualization, High Availability, Linux

Description: Learn how to perform live migration of KVM virtual machines between RHEL 9 hosts with zero downtime.

---

Live migration moves a running virtual machine from one physical host to another without shutting down the VM. The VM's memory and device state are transferred while its disk images remain available from shared storage or are copied with a non-shared storage migration option. On RHEL 9, live migration is essential for hardware maintenance, load balancing, and high availability.

## Prerequisites

- Two RHEL 9 hosts with KVM installed
- Same CPU architecture and compatible CPU features
- Shared storage accessible from both hosts (NFS, iSCSI, Ceph, or GFS2)
- Network connectivity between hosts on the required libvirt and QEMU migration ports
- Same libvirt version on both hosts (recommended)

## Configuring Shared Storage

VMs being migrated must have their disk images on shared storage accessible from both hosts:

```bash
# Example: NFS shared storage on both hosts

sudo mount nfs-server:/vm-images /var/lib/libvirt/images
```

## Configuring libvirt for Migration

For SSH-based migration on a fresh RHEL 9 installation, make sure the modular QEMU libvirt socket is enabled on the destination host:

```bash
sudo systemctl enable --now virtqemud.socket
```

If you want to use a TCP connection instead of SSH, enable the virtualization proxy TCP socket on the destination host:

```bash
sudo systemctl enable --now virtproxyd-tcp.socket
```

On hosts upgraded from RHEL 8 that still use the monolithic `libvirtd` daemon, TCP listening is configured in `/etc/libvirt/libvirtd.conf`:

```text
listen_tls = 0
listen_tcp = 1
auth_tcp = "sasl"
```

Or use SSH-based migration, which is more secure and usually requires only SSH access plus the `virtqemud.socket` service on RHEL 9.

## Performing Live Migration via SSH

The simplest and most secure method:

```bash
sudo virsh migrate --live vmname qemu+ssh://destination-host/system
```

With additional options:

```bash
sudo virsh migrate --live --persistent --undefinesource \
    vmname qemu+ssh://destination-host/system
```

Options:

- `--live` - Perform live migration without shutting down the VM
- `--persistent` - Define the VM on the destination
- `--undefinesource` - Remove the VM definition from the source

## Monitoring Migration Progress

In another terminal:

```bash
sudo virsh domjobinfo vmname
```

Output:

```text
Job type:         Unbounded
Time elapsed:     5234        ms
Data processed:   1.234 GiB
Data remaining:   256.000 MiB
Memory processed: 1.234 GiB
Memory remaining: 256.000 MiB
```

## Setting Migration Speed and Bandwidth

Limit migration bandwidth:

```bash
sudo virsh migrate-setspeed vmname 100
```

This limits bandwidth to 100 MiB/s.

Set the maximum downtime allowed:

```bash
sudo virsh migrate-setmaxdowntime vmname 500
```

This allows up to 500 milliseconds of downtime during the final switchover.

## Offline Migration

For VMs that can tolerate downtime:

```bash
sudo virsh migrate --offline --persistent vmname qemu+ssh://destination-host/system
```

This only migrates the VM definition, not the running state.

## Troubleshooting Migration

### CPU Incompatibility

If migration fails due to CPU differences, calculate a common CPU baseline with `virsh hypervisor-cpu-baseline` and configure the VM to use that CPU model.

```bash
sudo virsh hypervisor-cpu-baseline domCaps-CPUs.xml
```

Then configure the VM to use the resulting common CPU model:

```xml
<cpu mode='custom' match='exact'>
  <model fallback='forbid'>IvyBridge-IBRS</model>
</cpu>
```

### Network Issues

Check connectivity:

```bash
virsh -c qemu+ssh://destination-host/system list
```

### Storage Not Accessible

Verify shared storage is mounted on the destination:

```bash
ssh destination-host "ls /var/lib/libvirt/images/"
```

## Summary

Live migration on RHEL 9 enables VM mobility between hosts with only a brief switchover pause. Use SSH-based migration for security, shared storage for disk images, and monitor progress with `virsh domjobinfo`. Set bandwidth limits and maximum downtime thresholds to control the migration behavior for your environment.
