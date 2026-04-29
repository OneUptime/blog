# How to Configure IPv6 in libvirt Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Libvirt, KVM, Virtual Network, DHCPv6, Linux

Description: Configure libvirt virtual networks with IPv6 subnets, DHCPv6 for guest address assignment, isolated IPv6 networks, and router advertisement configuration for VMs managed by libvirt.

## Introduction

libvirt manages virtual networks for KVM/QEMU VMs through its network configuration XML format. IPv6 addresses are supported in libvirt networks since version 0.8.7. DHCPv6 address assignment is supported since 1.0.1, static IPv6 routes since 1.0.6, and IPv6 NAT in `mode='nat'` requires libvirt 6.5.0 or later with `<nat ipv6='yes'>`. The `virsh net-*` commands manage IPv6 networks alongside IPv4.

## Create a libvirt Network with IPv6

```xml
<!-- /tmp/net-ipv6-dual.xml - Dual-stack network with DHCPv4 and DHCPv6 -->
<network>
  <name>dual-stack</name>
  <forward mode='nat'>
    <nat ipv6='yes'>
      <port start='1024' end='65535'/>
    </nat>
  </forward>
  <bridge name='virbr-ds' stp='on' delay='0'/>
  <mac address='52:54:00:aa:bb:cc'/>

  <!-- IPv4 subnet with DHCP -->
  <ip address='192.168.100.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.100.100' end='192.168.100.200'/>
    </dhcp>
  </ip>

  <!-- IPv6 ULA subnet with DHCPv6 -->
  <ip family='ipv6' address='fd42:1234:5678:100::1' prefix='64'>
    <dhcp>
      <range start='fd42:1234:5678:100::100' end='fd42:1234:5678:100::200'/>
    </dhcp>
  </ip>
</network>
```

```bash
# Define, start, and autostart the network

virsh net-define /tmp/net-ipv6-dual.xml
virsh net-start dual-stack
virsh net-autostart dual-stack

# Verify
virsh net-info dual-stack
virsh net-dumpxml dual-stack
```

## IPv6-Only isolated Network

```xml
<!-- /tmp/net-ipv6-only.xml -->
<network>
  <name>ipv6-only</name>
  <!-- No forward element = isolated network -->
  <bridge name='virbr-ipv6' stp='on' delay='0'/>

  <ip family='ipv6' address='2001:db8:100:1::1' prefix='64'>
    <dhcp>
      <range start='2001:db8:100:1::100' end='2001:db8:100:1::200'/>
      <!-- Static host reservation -->
      <host id='00:03:00:01:52:54:00:11:22:33' name='vm1' ip='2001:db8:100:1::10'/>
    </dhcp>
  </ip>
</network>
```

## Routed IPv6 Network (No NAT)

```xml
<!-- /tmp/net-ipv6-routed.xml -->
<network>
  <name>ipv6-routed</name>
  <!-- Routed: host routes between VM network and physical network -->
  <forward mode='route' dev='eth0'/>
  <bridge name='virbr-rt' stp='on' delay='0'/>

  <ip family='ipv6' address='2001:db8:100:2::1' prefix='64'>
    <!-- VMs can autoconfigure with SLAAC from the advertised prefix -->
    <!-- No dhcp element = SLAAC only -->
  </ip>

  <!-- The upstream router must have a route to 2001:db8:100:2::/64 via the host -->
</network>
```

## Manage Network with virsh

```bash
# List all networks
virsh net-list --all

# Show network details including IPv6
virsh net-dumpxml dual-stack

# Check DHCP leases (IPv4 and IPv6)
virsh net-dhcp-leases dual-stack
# Shows both DHCPv4 and DHCPv6 leases

# Add a DHCPv6 static reservation
virsh net-update dual-stack add ip-dhcp-host \
    '<host id="00:03:00:01:52:54:00:aa:bb:01" name="myvm" ip="fd42:1234:5678:100::50"/>' \
    --parent-index 1 --live --config

# Delete a network
virsh net-destroy dual-stack && virsh net-undefine dual-stack
```

## Router Advertisement Configuration in libvirt

```bash
# libvirt-managed networks advertise the IPv6 prefix to guests via
# Router Advertisement. The bridge interface acts as the IPv6 gateway.

# View the active network definition that controls the advertised prefix
virsh net-dumpxml dual-stack

# Check the per-network dnsmasq process used by libvirt
ps aux | grep '[d]nsmasq.*dual-stack'

# The RA provides the IPv6 default route to VMs
# With this network definition, VMs receive IPv6 addresses from DHCPv6
```

## VM Network Attachment with IPv6

```xml
<!-- VM network interface definition in domain XML -->
<interface type='network'>
  <source network='dual-stack'/>
  <model type='virtio'/>
  <mac address='52:54:00:11:22:33'/>
</interface>
```

```bash
# Attach network to running VM
virsh attach-interface myvm network dual-stack \
    --model virtio \
    --mac 52:54:00:11:22:33 \
    --persistent

# Check VM's IP addresses from DHCP lease data
virsh domifaddr myvm --source lease
# Should show both IPv4 and DHCPv6-leased IPv6 addresses

# Check DHCP leases for the VM
virsh net-dhcp-leases dual-stack | grep 52:54:00:11:22:33
```

## Troubleshooting libvirt IPv6 Networks

```bash
# Check bridge has IPv6 address
ip -6 addr show virbr-ds
# Should show: fd42:1234:5678:100::1/64

# Check Router Advertisements are being sent
tcpdump -i virbr-ds -n "icmp6 and icmp6[0] == 134"
# Type 134 = Router Advertisement

# Check DHCPv6 requests from VMs
tcpdump -i virbr-ds -n "udp and (port 546 or port 547)"
# 546 = DHCPv6 client, 547 = DHCPv6 server

# Restart libvirt network if IPv6 services are not working
virsh net-destroy dual-stack
virsh net-start dual-stack

# Check libvirt logs
journalctl -u virtnetworkd -u libvirtd -n 100 | grep -i ipv6
```

## Conclusion

libvirt networks support IPv6 via the `<ip family='ipv6'>` element in network XML, supporting DHCPv6 ranges, static host reservations by DUID/ID, and SLAAC when the IPv6 network omits a `<dhcp>` element. Three forwarding modes work with IPv6: isolated (no forward element), routed (`mode='route'`), and NAT (`mode='nat'` with `<nat ipv6='yes'>` when IPv6 NAT is desired). The `virsh net-dhcp-leases` command shows both IPv4 and IPv6 leases. VMs connect to IPv6 networks by being attached to a libvirt network with IPv6 configuration - the guest OS receives the IPv6 default route via Router Advertisement and, when configured, IPv6 addresses via DHCPv6.
