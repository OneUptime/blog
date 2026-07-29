# Why Does Azure VM RDP Work on a Hotspot but Not at the Office?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, RDP, Networking, Troubleshooting

Description: Isolate an Azure RDP failure that occurs only on the office network by testing source IP rules, corporate egress controls, routes, and private DNS.

---

If RDP reaches the same Azure VM from a mobile hotspot but times out from the office network, the VM and Remote Desktop service are probably not the first suspects. The test changed the client-side network path and the public source IP. Focus on controls that differ between those paths.

The two most common causes are:

1. the Azure NSG permits the hotspot's public address but not the office's egress address;
2. an office firewall, proxy, VPN, or security appliance blocks outbound TCP 3389.

Keep the successful and failing tests close together in time so a VM restart, public-IP change, or RDP service failure does not invalidate the comparison.

## Prove which layer times out

From the office Windows client:

```powershell
Resolve-DnsName vm.example.com
Test-NetConnection vm.example.com -Port 3389 -InformationLevel Detailed
```

From macOS or Linux:

```bash
dig +short vm.example.com
nc -vz -w 5 vm.example.com 3389
```

Run the same tests on the hotspot. Record:

- resolved destination address;
- local interface and source address;
- office public egress address;
- whether the TCP handshake succeeds;
- RDP client error and UTC time.

An authentication or certificate error means the TCP path reached an RDP endpoint. A TCP timeout usually points to filtering, routing, NAT, or an endpoint that is not listening. A prompt refusal often means something actively rejected the connection.

## Check the destination first

Confirm both networks resolve the same name. Split-horizon DNS, a stale corporate resolver, or a manually pinned hosts entry can send the office client to an old Azure public IP.

Inspect the public IP attached to the VM's NIC:

```bash
az vm list-ip-addresses \
  --resource-group myResourceGroup \
  --name myVM \
  --output table
```

If the VM uses a dynamic public IP, deallocation or redeployment might have changed it. Fix stale DNS or attach a static Standard public IP. Do not widen firewall rules to compensate for an incorrect destination.

## Test the office's real public source IP

An NSG rule's source is evaluated after the office traffic exits to the internet. That source is normally a corporate NAT address, not the workstation's private `10.x`, `172.16/12`, or `192.168/16` address.

Large offices can use:

- multiple egress NAT addresses;
- different egress points by building or VLAN;
- secure web gateways that proxy only HTTP and HTTPS;
- VPN clients with full or split tunneling;
- IPv4 on one path and IPv6 on another.

Ask the network team for the exact egress prefix used for raw TCP 3389. A browser-based public-IP site may traverse a web proxy and report the proxy's address rather than the path RDP uses.

Review effective inbound NSG rules on both the NIC and subnet. If NSGs exist at both scopes, traffic must be allowed by both.

## Use IP flow verify with the failing source

Azure Network Watcher IP flow verify evaluates Azure's effective security rules for a hypothetical packet. Use the VM's private IP as the local address, the office public egress address as remote, and an arbitrary high client source port:

```bash
az network watcher test-ip-flow \
  --resource-group myResourceGroup \
  --vm myVM \
  --direction Inbound \
  --protocol TCP \
  --local 10.0.0.4:3389 \
  --remote 203.0.113.50:55000 \
  --output json
```

The response names the allowing or denying rule. Verify:

- a lower priority number has not created an earlier deny;
- the rule is TCP, not UDP;
- destination port is 3389 or the VM's configured custom RDP port;
- source contains every approved corporate egress address;
- both NIC and subnet NSGs permit the packet.

Restrict the source to approved prefixes. Do not temporarily change the source to `Any` on an internet-facing VM just to test. Azure Bastion or a time-limited, reviewed rule is safer.

## Inspect the office edge

Microsoft's RDP guidance explicitly calls out local routers and firewalls that block outbound TCP 3389. Corporate controls often permit web traffic but deny direct remote-administration protocols.

Give the network team a precise flow:

```text
source: office egress IP and ephemeral TCP port
destination: Azure public IP and TCP 3389
time: UTC timestamp
result: SYN retransmitted, no handshake
```

Ask them to check:

- egress firewall policy;
- secure access service edge policy;
- endpoint detection and response controls;
- VPN routes and kill switches;
- intrusion prevention or RDP category blocks;
- asymmetric routing through multiple WAN links;
- upstream ISP filtering.

An HTTP proxy setting does not make a native RDP client proxy-aware. If company policy requires remote access through a controlled gateway, use that architecture rather than tunneling around it.

## Check the Azure path beyond the NSG

An NSG Allow is only one gate. Review:

- the public IP to NIC or load-balancer NAT association;
- effective routes on the NIC;
- a user-defined route that sends replies through an NVA;
- Azure Firewall or third-party NVA policy;
- forced tunneling to on-premises;
- RDP listener and Windows Firewall inside the VM.

If the hotspot succeeds at the same time, the guest listener and return path work for at least one source. Source-specific Windows Firewall rules or NVA policies can still distinguish the office address.

For direct guest checks, use Azure Serial Console, Azure Bastion, or another approved management path:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3389
Get-NetFirewallRule -DisplayGroup 'Remote Desktop' |
  Select-Object DisplayName, Enabled, Direction, Action
```

If the listener uses a custom port, every layer and the RDP client must use that port.

## Prefer private administration

Directly exposing TCP 3389 creates a persistent attack surface. Microsoft recommends options such as:

- Azure Bastion;
- point-to-site or site-to-site VPN;
- ExpressRoute;
- Just-in-Time VM access;
- a controlled jump host with strong authentication.

With Bastion, the VM does not need a public IP and the browser connects to the Bastion service. With private office connectivity, test the VM's private address and make sure DNS and routes select the private path.

## A decisive troubleshooting sequence

1. Compare DNS results from office and hotspot.
2. Compare raw TCP 3389 tests at the same time.
3. identify the office's actual non-HTTP egress IP.
4. Run IP flow verify with that source.
5. Review subnet and NIC effective NSGs.
6. Ask the office network team for deny logs using the exact five-tuple and time.
7. Review UDR, NVA, guest firewall, and listener only if Azure security rules allow it.
8. Replace public RDP with Bastion or private connectivity.

The hotspot result is valuable evidence. It narrows the fault domain, but it does not justify opening RDP to the entire internet.

## Official Documentation

- [Troubleshoot RDP connections to an Azure VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-rdp-connection)
- [Troubleshoot RDP blocked by NSG rules](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-rdp-nsg-problem)
- [Diagnose VM traffic filtering with IP flow verify](https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem)
- [Azure network security groups overview](https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview)
- [Azure Bastion overview](https://learn.microsoft.com/en-us/azure/bastion/bastion-overview)

