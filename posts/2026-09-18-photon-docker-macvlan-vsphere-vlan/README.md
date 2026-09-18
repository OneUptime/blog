# How to Run Docker macvlan Containers Across VLANs on Photon OS and a vSphere vDS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Docker, Networking

Description: Run Photon Docker macvlan networks on vSphere VLAN trunks with correct vDS MAC policies, IP allocation, and routed connectivity.

---

Macvlan gives each container a separate MAC address on the surrounding network. Inside a Photon VM, those additional addresses must pass through the virtual NIC, distributed switch, and physical network. A working Docker network definition is therefore only one part of the setup.

“Across VLANs” also requires a routing distinction: macvlan does not route between VLANs by itself. Create a network per VLAN and let an approved router or firewall provide inter-VLAN connectivity.

## Design the VLAN and address plan

This example uses a dedicated data NIC named `eth1`, leaving management traffic on another interface. VLAN 120 uses `192.0.2.0/24`, and VLAN 130 uses `198.51.100.0/24`. Replace these documentation addresses with your real network allocation.

Reserve container addresses outside overlapping DHCP pools. Docker's local IP allocation does not automatically coordinate with the corporate DHCP server or with another Docker host using the same macvlan subnet. Maintain per-host ranges or another explicit address-allocation process.

Docker's [macvlan documentation](https://docs.docker.com/engine/network/drivers/macvlan/) requires network equipment that can handle multiple MAC addresses behind one interface. Confirm this design is supported by the physical switching and security policy before deploying applications.

## Configure the vDS port group

Connect the Photon data NIC to a distributed port group configured for VLAN trunking, with only the required VLAN IDs allowed. Ensure the physical uplinks also permit those VLANs. In this design the guest creates tagged subinterfaces; a port group configured as an access port for one VLAN represents a different design and should not be combined accidentally with guest tagging.

Broadcom's [macvlan connectivity guidance](https://knowledge.broadcom.com/external/article?articleNumber=401823) describes two security configurations. Where the vDS supports MAC learning, enable MAC learning and allow forged transmits while keeping promiscuous mode rejected. Its alternative uses promiscuous mode with forged transmits accepted when MAC learning is unavailable.

Apply the chosen policy to the dedicated workload port group, not indiscriminately to the whole switching environment. The extra source MACs explain forged-transmit requirements; receiving traffic for those MACs explains the learning or promiscuous-mode requirement. Do not change MAC Address Changes simply because an unrelated tutorial enables all three settings.

## Create one Docker network per VLAN

On the Photon host, verify the data interface name and link state:

```bash
ip -br link
ip -d link show eth1
```

Then create the networks:

```bash
docker network create -d macvlan \
  --subnet=192.0.2.0/24 --gateway=192.0.2.1 \
  --ip-range=192.0.2.128/27 \
  -o parent=eth1.120 vlan120

docker network create -d macvlan \
  --subnet=198.51.100.0/24 --gateway=198.51.100.1 \
  --ip-range=198.51.100.128/27 \
  -o parent=eth1.130 vlan130
```

The dotted parent names tell Docker to use 802.1Q subinterfaces. The ranges are examples of reserved allocation blocks; verify them against your actual network plan before running the commands.

Inspect both networks and the resulting links. A successful creation confirms local configuration, not that the trunk carries frames or that the gateway is reachable.

## Test each network before cross-VLAN traffic

Run a disposable approved diagnostic image on VLAN 120 with a reserved address:

```bash
docker run --rm -it --network vlan120 \
  --ip 192.0.2.130 alpine:3.22 sh
```

Inside it, inspect `ip address` and `ip route`, then test its gateway and a known host in the same VLAN. Repeat from VLAN 130. Pin the diagnostic image by digest in a controlled production procedure.

Only after both local VLAN paths work should you test traffic between them. The router must have both networks connected or routed, a return path, and a firewall policy permitting the chosen protocol. A default gateway configured in Docker does not create that router or its rules.

Packet captures on the Photon parent and VLAN interface can help distinguish missing tags, unanswered ARP, and routed traffic blocked elsewhere. Compare both directions; a successful outgoing packet is not evidence that replies can return.

## Account for host isolation and operations

Linux normally isolates a macvlan container from direct communication with its own host through the parent interface. Test from another machine rather than assuming a failed host-to-container ping proves vDS failure. If host communication is required, Docker documents an additional host macvlan interface or a second bridge attachment as possible designs.

Monitor MAC-table capacity and address consumption. A large number of containers can stress assumptions designed for one MAC per VM. Test VM migration between ESXi hosts as part of acceptance, since each destination uplink must carry the same VLANs and policies.

Keep the address ranges, port-group policy, trunk allowances, and routing rules with the application deployment record. That shared configuration is what makes the network reproducible after a host rebuild.
