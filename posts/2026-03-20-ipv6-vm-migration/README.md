# How to Configure IPv6 for VM Migration (vMotion/Live Migration)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VM Migration, VMotion, Live Migration, VMware, Hyper-V, KVM

Description: Configure IPv6 for virtual machine live migration in VMware vMotion, Hyper-V Live Migration, and KVM QEMU migration, ensuring the migration network uses IPv6 and VMs retain connectivity after...

## Introduction

VM live migration moves running virtual machines between hypervisor hosts with minimal downtime. The migration network (vMotion in VMware, Live Migration in Hyper-V, QEMU migration in KVM) can use IPv6 for the migration data transfer, separating it from VM traffic. After migration, VMs typically retain the same IPv6 address and MAC address as long as the destination host has Layer 2 reachability to the VM network.

## VMware vMotion over IPv6

```bash
# Configure vMotion VMkernel adapter for IPv6

# Step 1: Enable IPv6 on the host and VMkernel adapter, then add a static IPv6 address

esxcli network ip set --ipv6-enabled=true
# Reboot the host before continuing if IPv6 was previously disabled
esxcli network ip interface ipv6 set \
    --interface-name vmk1 \
    --enable-ipv6=true \
    --enable-dhcpv6=false \
    --enable-router-adv=false
esxcli network ip interface ipv6 address add \
    --interface-name vmk1 \
    --ipv6 2001:db8:100::10/64

# Step 2: Enable vMotion traffic on the VMkernel adapter
# via vSphere Client: Host → Configure → Networking → VMkernel Adapters
# → Edit vmk1 → IPv6 settings → Add address
# → Port Services: check "vMotion"

# Step 3: Verify vMotion is using IPv6
# vSphere Client → Monitor → vMotion → Migration History
# Shows source and destination VMkernel addresses

# Step 4: Configure vMotion network CIDR on all hosts
# All hosts in the cluster must have vMotion VMkernel IPv6 addresses
# with reachable routes to one another
```

## Hyper-V Live Migration over IPv6

```powershell
# Configure Live Migration to use specific IPv6 network

# Enable Live Migration
# Repeat on each source and destination host
Enable-VMMigration -ComputerName "hyper-v-host1"

# Add IPv6 network for Live Migration
Add-VMMigrationNetwork -ComputerName "hyper-v-host1" `
    -Subnet "2001:db8:200::/64" `
    -Priority 1

# Verify migration networks
Get-VMMigrationNetwork -ComputerName "hyper-v-host1"
# Shows: 2001:db8:200::/64

# Hyper-V chooses from the configured migration networks on both hosts
# when it performs the Live Migration
Move-VM -Name "MyVM" `
    -DestinationHost "hyper-v-host2"

# Move the VM and its storage to another host
Move-VM -Name "MyVM" `
    -DestinationHost "hyper-v-host2" `
    -IncludeStorage `
    -DestinationStoragePath "C:\VMs\MyVM"
```

## KVM/QEMU Live Migration over IPv6

```bash
# QEMU supports live migration over IPv6 natively

# On destination host: listen for incoming migration
qemu-system-x86_64 \
    -drive file=myvm.qcow2,format=qcow2 \
    -m 2048 \
    -monitor stdio \
    -incoming "tcp:[2001:db8:300::20]:4444"
# [2001:db8:300::20] = destination host's IPv6 address on the migration network

# On source host: initiate migration and explicitly pin the
# migration stream to the destination host's IPv6 interface
virsh migrate --live --verbose myvm \
    "qemu+ssh://root@desthost.example.com/system" \
    "tcp://[2001:db8:300::20]/"

# QEMU monitor command:
# migrate tcp:[2001:db8:300::20]:4444
```

```bash
# libvirt migration with IPv6 (requires libvirt on both hosts)

# If the destination hostname resolves to an IPv6 address,
# the libvirt control connection and tunnel use IPv6

# Migrate VM between hosts using IPv6
virsh migrate --live --p2p --tunnelled myvm \
    "qemu+ssh://root@desthost.example.com/system"
```

## After Migration: IPv6 Address Continuity

```bash
# After live migration, the VM usually keeps the same IPv6 address
# as long as the destination host has Layer 2 access to the same VM network

# Verify VM still has its IPv6 after migration
virsh domifaddr myvm  # KVM, if guest agent or lease data is available
# or
qm guest exec 101 ip -6 addr show  # Proxmox, requires qemu-guest-agent

# If a stale neighbor entry is suspected, generate IPv6 traffic
# from the guest to refresh Neighbor Discovery state
ping -6 -c 3 2001:db8:400::1

# Check on a router or another host:
# show ipv6 neighbors | include 2001:db8:400::100
```

## Migration Network Firewall for IPv6

```bash
# Allow QEMU/libvirt native migration ports over IPv6
ip6tables -A INPUT -p tcp --dport 49152:49215 \
    -s 2001:db8:300::/64 -j ACCEPT

# Allow libvirt daemon communication if you use qemu+tcp://
ip6tables -A INPUT -p tcp --dport 16509 \
    -s 2001:db8:300::/64 -j ACCEPT

# Allow SSH for libvirt migration tunneling
ip6tables -A INPUT -p tcp --dport 22 \
    -s 2001:db8:300::/64 -j ACCEPT
```

## Verify IPv6 Migration

```bash
# KVM: test libvirt connectivity over IPv6
virsh -c "qemu+ssh://root@desthost.example.com/system" list --all

# VMware: check vMotion network connectivity
esxcli network diag ping \
    --host 2001:db8:100::20 \
    --netstack vmotion \
    --ipv6

# Hyper-V: compare the VM against the destination host before migration
Compare-VM -Name "MyVM" -DestinationHost "hyper-v-host2"
```

## Conclusion

VM live migration over IPv6 is supported natively by VMware vMotion (configure the vMotion VMkernel with IPv6 addresses), Hyper-V Live Migration (use `Add-VMMigrationNetwork` with an IPv6 CIDR), and KVM/libvirt migration (use IPv6-aware migration URIs or an explicit IPv6 migration URI). After migration, VMs generally keep their existing IPv6 addresses because the guest network configuration is unchanged. Use a dedicated IPv6 network segment for migration traffic to isolate it from VM data traffic and simplify firewall rules. The migration network IPv6 prefix must be reachable between all hosts in the cluster.
