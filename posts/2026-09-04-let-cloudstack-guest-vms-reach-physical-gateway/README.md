# How to Let CloudStack Guest VMs Reach the Physical Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Networking, KVM, Virtualization, Troubleshooting

Description: Choose the correct CloudStack guest network model, carry its VLAN through KVM bridges and physical switches, and verify that VMs reach the intended physical gateway safely.

---

Before changing routes, decide what “reach the physical gateway” means for the CloudStack network model.

- In an **isolated network**, the guest's default gateway is normally the CloudStack virtual router. The VR reaches the physical/public gateway and provides services such as source NAT, DHCP, firewalling, and port forwarding.
- In a **shared network**, guests can be placed directly on an administrator-defined physical VLAN/subnet and use its physical gateway.
- In an **L2 network**, CloudStack supplies layer-2 connectivity but not the same virtual-router L3 services; addressing and gateway services must exist elsewhere.

Putting the physical router's address into an isolated guest by hand bypasses the intended design and commonly fails because the guest VLAN is not the public/physical subnet. Choose or create the right network instead.

## Document the Intended Path

For a shared-network example:

| Item | Example |
| --- | --- |
| Physical network | `physnet-guest` |
| VLAN | `210` |
| Guest CIDR | `192.0.2.0/24` |
| Physical gateway | `192.0.2.1` |
| CloudStack allocation range | `192.0.2.100-192.0.2.199` |
| DNS | `192.0.2.53` |

Reserve the CloudStack range in the site's IPAM and exclude it from every other DHCP server. Verify the physical gateway actually has the chosen VLAN interface and routes replies to the guest range. Do not use a documentation address range in production.

## Verify the Physical Network and Traffic Label

In an Advanced zone, CloudStack maps traffic types to one or more physical networks. The guest traffic label used by the KVM cluster must resolve to the same bridge on every host. Inspect CloudStack and each host before creating a network:

```bash
cmk list physicalnetworks zoneid=ZONE_UUID
cmk list traffictypes physicalnetworkid=PHYSICAL_NETWORK_UUID

ip -br link
bridge link
bridge vlan show
```

CloudStack's KVM guide stresses consistent networking across hypervisors. If one host maps the guest label to a different bridge or its switch port lacks VLAN 210, VMs will work on some hosts and fail after migration.

On the physical switch, permit only the planned guest VLANs on the KVM trunk. Confirm native/untagged VLAN behavior explicitly. Do not solve a missing VLAN by allowing every VLAN everywhere.

## Create a Shared Guest Network Deliberately

Use a network offering whose guest type and services match the desired shared network. In the UI, create a shared guest network and set its physical network, VLAN, gateway, netmask, allocation range, and DNS. The current Advanced Zone guide defines these fields and makes the administrator responsible for the routable range.

The equivalent API shape can be explored with CloudMonkey before submission:

```bash
cmk help create network
cmk create network \
  name=shared-vlan210 \
  displaytext='Shared VLAN 210' \
  zoneid=ZONE_UUID \
  networkofferingid=SHARED_OFFERING_UUID \
  physicalnetworkid=PHYSICAL_NETWORK_UUID \
  acltype=Domain \
  domainid=DOMAIN_UUID \
  vlan=210 \
  gateway=192.0.2.1 \
  netmask=255.255.255.0 \
  startip=192.0.2.100 \
  endip=192.0.2.199 \
  dns1=192.0.2.53
```

This example deliberately creates a domain-scoped shared network. Confirm the intended domain and allocation range before submission; use the account/project scope supported by the selected offering when the network must be narrower. Check `cmk help` for the local 4.23 command parameters rather than pasting IDs or ranges from another cloud.

If tenant isolation is required on the shared network, enable a security-group-capable zone/offering and define least-privilege rules. Shared layer 2 is not itself tenant isolation.

## Deploy a Controlled Test VM

Deploy one disposable VM on the new network. Record its host, NIC, MAC, assigned address, prefix, and gateway:

```bash
cmk list nics virtualmachineid=VM_UUID
cmk list networks id=NETWORK_UUID
```

Inside the guest:

```bash
ip -br address
ip route
ip neigh
ping -c 3 192.0.2.1
arping -I GUEST_INTERFACE -c 3 192.0.2.1
traceroute -n 198.51.100.10
```

If the network uses CloudStack-managed DHCP, the offered gateway must match the network record. If addressing is external, prove that exactly one authorized DHCP service answers. A static guest address must be within the administrator-approved range and not allocated elsewhere.

## Locate a Layer-2 Break

If ARP for the gateway fails, capture the same request at successive points:

```bash
# KVM host: identify the guest interface first
sudo virsh domiflist GUEST_DOMAIN

sudo tcpdump -eni GUEST_TAP 'arp or icmp'
sudo tcpdump -eni CLOUD_GUEST_BRIDGE 'vlan 210 and (arp or icmp)'
sudo tcpdump -eni PHYSICAL_UPLINK 'vlan 210 and (arp or icmp)'
```

Interpretation:

- Request absent on the tap: guest NIC/configuration problem.
- Present on tap but absent on bridge/uplink: host bridge, VLAN filter, or CloudStack network implementation problem.
- Leaves uplink but never returns: switch trunk, VLAN SVI/gateway, or IP conflict.
- ARP succeeds but routed traffic fails: gateway ACL, return route, MTU, or security policy.

Capture only the test VM and necessary protocols. Tenant VLAN captures may contain sensitive traffic.

## If the VM Is on an Isolated Network

Do not replace the guest's VR gateway with the physical router. Instead:

1. Verify the guest can reach the VR gateway.
2. Verify the VR is `Running` and its public NIC has the intended public address/gateway.
3. Use **Run Diagnostics** from the VR to ping or trace the upstream gateway.
4. Check source-NAT, egress firewall, physical public VLAN, and upstream return routing.

```bash
cmk list routers networkid=NETWORK_UUID
cmk list egressfirewallrules networkid=NETWORK_UUID
cmk list publicipaddresses associatednetworkid=NETWORK_UUID
```

The physical gateway should see traffic from the VR's public address, not directly from the private guest address, when source NAT is in use.

## Make Changes Safely

Changing bridge membership, host IPs, VLAN trunks, or network offerings can disconnect guests and the management plane. Place one KVM host into maintenance, keep an out-of-band console, apply and verify the change there, then roll through the cluster. Do not edit CloudStack-managed libvirt domain XML or transient host firewall rules.

For a new network that fails, stop the test VM, remove it and the unused network through CloudStack, then remove the VLAN from trunks. For an existing production network, restore the previous switch/bridge mapping and CloudStack offering instead of deleting the network. A VLAN assigned to an isolated network remains associated for its lifecycle when explicitly assigned.

## Verify the Finished Path

Require the test VM to reach the gateway, DNS, and an external destination; verify expected security-group behavior; then migrate it to another KVM host and repeat. Check ARP tables for one stable MAC-to-IP mapping and ensure no rogue DHCP responder exists. Finally, document the physical network, traffic label, bridge, VLAN, CIDR, gateway, allocation range, and responsible IPAM entry together.

## Conclusion

The correct gateway follows the network model. Use the CloudStack virtual router for isolated-network guests and an explicitly created shared or L2 design for direct physical-subnet access. Once the model is correct, trace ARP across the guest tap, KVM bridge, VLAN trunk, and gateway, and verify it again after migration.

## Official Documentation

- [Apache CloudStack: Advanced Zone Physical Network Configuration](https://docs.cloudstack.apache.org/en/latest/adminguide/networking/advanced_zone_config.html)
- [Apache CloudStack: Multiple Guest Networks](https://docs.cloudstack.apache.org/en/latest/adminguide/networking/multiple_guest_networks.html)
- [Apache CloudStack: Security Groups](https://docs.cloudstack.apache.org/en/latest/adminguide/networking/security_groups.html)
- [Apache CloudStack: KVM Networking](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html#configuring-the-networking)
- [Apache CloudStack: System VM Network Diagnostics](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html#troubleshoot-networks-from-system-vms)
