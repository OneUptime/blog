# NSG Allows SSH or RDP, but the Azure VM Still Times Out

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Network Security Group, SSH, RDP

Description: Trace SSH and RDP timeouts beyond an NSG allow rule through public IP mappings, effective rules, routes, firewalls, listeners, and guest health.

---

An effective inbound NSG Allow result for TCP 22 or 3389 proves only that one Azure packet-filtering layer permits matching traffic. It does not create a public endpoint, start `sshd` or Remote Desktop Services, open the guest firewall, repair a route, or make the operating system boot.

Troubleshoot the path in order:

```text
client
  -> corporate or ISP edge
  -> Azure public IP or load-balancer frontend
  -> NIC and subnet effective NSG rules
  -> route and network virtual appliance
  -> guest firewall
  -> listening SSH or RDP service
```

## Classify the client symptom

Run a TCP test instead of relying on ping. ICMP can be filtered or deprioritized independently.

Windows:

```powershell
Test-NetConnection 203.0.113.10 -Port 3389 -InformationLevel Detailed
Test-NetConnection 203.0.113.10 -Port 22 -InformationLevel Detailed
```

Linux or macOS:

```bash
nc -vz -w 5 203.0.113.10 22
nc -vz -w 5 203.0.113.10 3389
ssh -vvv azureuser@203.0.113.10
```

A timeout suggests a drop or missing route. `Connection refused` suggests that the destination responded but no service accepted the port. An SSH permission error or RDP sign-in error means basic network connectivity succeeded and the investigation should move to identity and authorization.

## Confirm the VM and endpoint

Check that the VM is running and that the address belongs to its current path:

```bash
az vm get-instance-view \
  --resource-group myResourceGroup \
  --name myVM \
  --query "instanceView.statuses[].{code:code,status:displayStatus}" \
  --output table

az vm list-ip-addresses \
  --resource-group myResourceGroup \
  --name myVM \
  --output table
```

A VM with no public IP is not directly reachable from the internet. It may require Azure Bastion, VPN, ExpressRoute, a load-balancer inbound NAT rule, or another jump path.

For a load balancer, verify that the frontend, rule or inbound NAT rule, backend NIC, and port mapping agree. Opening 22 on the VM NSG does not make a frontend listen on 22.

## Evaluate effective NSG rules

NSGs can be associated with both the subnet and NIC. Inbound traffic must be allowed at each scope. Rules are evaluated by priority, with lower numbers evaluated first. A priority 100 deny wins before a priority 300 allow.

Use Network Watcher IP flow verify with the source IP Azure sees: the client's public NAT address for an internet connection, or the source address presented over VPN or ExpressRoute:

```bash
az network watcher test-ip-flow \
  --resource-group myResourceGroup \
  --vm myVM \
  --direction Inbound \
  --protocol TCP \
  --local 10.0.0.4:22 \
  --remote '198.51.100.25:*' \
  --output json
```

Repeat for port 3389 when applicable. The result identifies the matching rule. Also inspect **Effective security rules** on the NIC in Network Watcher.

Common mistakes include:

- source prefix does not include the client's current NAT address;
- an earlier deny shadows the allow;
- the allow is attached to another NIC or subnet;
- UDP was allowed instead of TCP;
- a custom SSH or RDP port is configured;
- an application security group has the wrong NIC membership;
- an Azure Firewall or NVA rule is mistaken for an NSG rule.

NSGs are stateful. Return traffic for an allowed inbound flow does not require a mirror outbound rule, but another firewall or asymmetric path can still drop it.

## Verify routes and appliances

Review effective routes on the NIC and use Network Watcher **Next hop**. A user-defined route can send traffic through Azure Firewall or an NVA. That appliance needs:

- an allow policy for the flow;
- correct IP forwarding and routing;
- a symmetric return path;
- healthy interfaces and scale;
- appropriate source or destination NAT.

If a public IP is attached directly to the NIC, forcing the VM's default route through an appliance can alter return traffic. Diagnose the intended architecture rather than adding more NSG rules.

For private connections, verify that the office route, VNet peering, VPN, and DNS all select the VM's private address. Overlapping address spaces can send packets to the wrong network.

## Check the guest listener

Use Serial Console, Bastion, Run Command when the agent works, or another approved management path.

Linux:

```bash
sudo systemctl status sshd
sudo ss -ltnp | grep -E ':(22|2222)[[:space:]]'
sudo sshd -T | grep -E '^(port|listenaddress)'
```

Some distributions name the service `ssh` rather than `sshd`. The `ss` output is authoritative for listening sockets.

Windows:

```powershell
Get-Service TermService
Get-NetTCPConnection -State Listen -LocalPort 3389
Get-NetFirewallRule -PolicyStore ActiveStore -Group '@FirewallAPI.dll,-28752' |
  Select-Object DisplayName, Enabled, Direction, Action, Profile
```

If nothing listens, fix the service configuration before changing Azure networking. If it listens only on loopback or another address, remote packets cannot reach it.

## Check the guest firewall and security software

An NSG does not override:

- Windows Defender Firewall;
- `nftables`, `iptables`, `firewalld`, or `ufw`;
- endpoint protection;
- host intrusion prevention;
- local source-IP restrictions such as TCP wrappers on older systems.

Review active rules and profiles. On Windows, a NIC that unexpectedly changed from Domain to Public profile can activate a different firewall policy. On Linux, confirm rules after configuration-management or package updates.

Do not disable the entire guest firewall as a permanent fix. Add a scoped rule for the approved management source and port, then test.

## Check guest health

Boot diagnostics can distinguish a network problem from a VM stuck in recovery, filesystem check, kernel panic, Windows Update, or BitLocker recovery. Check the serial log and screenshot.

If the guest is healthy but inaccessible:

1. use Serial Console to repair the listener or firewall;
2. use VMAccess to reset SSH/RDP only if the VM Agent is Ready;
3. use offline OS-disk repair when both network access and the agent path are unavailable.

Redeploying moves the VM to another Azure host and can help with an underlying host issue, but it loses data on temporary disks and ephemeral OS disks and updates dynamic IP addresses associated with the NIC. It is not the first fix for a clearly stopped service.

## Secure the final design

Avoid permanent `0.0.0.0/0` rules on ports 22 and 3389. Prefer:

- Azure Bastion;
- VPN or ExpressRoute;
- Just-in-Time VM access;
- source-restricted NSG rules;
- Microsoft Entra login and least-privilege VM login roles where supported.

The right question is not merely whether the NSG is open. It is which component first fails to pass a TCP SYN to the correct listening process.

## Official Documentation

- [Detailed SSH troubleshooting for an Azure VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/detailed-troubleshoot-ssh-connection)
- [Troubleshoot SSH connection issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-ssh-connection)
- [Troubleshoot RDP connections](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-rdp-connection)
- [Diagnose VM traffic filtering](https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem)
- [Azure VM guest firewall blocks inbound traffic](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/guest-os-firewall-blocking-inbound-traffic)
