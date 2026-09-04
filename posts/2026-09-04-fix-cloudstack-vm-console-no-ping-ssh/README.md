# How to Fix a CloudStack VM That Has Console Access but No Ping or SSH Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Networking, SSH, KVM, Troubleshooting

Description: Diagnose a CloudStack guest that boots on the console but cannot ping or accept SSH by separating guest configuration, virtual NIC, network services, and external access policy.

---

A working CloudStack console proves that the VM booted and that the Console Proxy VM can reach its hypervisor VNC socket. It says nothing about the guest NIC, DHCP, security groups, virtual router, public IP, or SSH daemon. Treat the symptom as a network path with several independent policy points.

First decide what should be reachable from where. An isolated-network VM normally uses the CloudStack virtual router (VR) as its gateway and needs a public IP plus firewall and port-forwarding or static-NAT policy for inbound Internet access. A basic/shared-network VM may use security groups and the physical gateway instead. Testing the wrong address from the wrong source produces a false diagnosis.

## Capture CloudStack's Intended Network State

From the UI or CloudMonkey, record the VM UUID, host, NIC address, network, gateway/CIDR, MAC, public IP association, and applicable security groups:

```bash
cmk list virtualmachines id=VM_UUID
cmk list nics virtualmachineid=VM_UUID
cmk list networks id=NETWORK_UUID
cmk list securitygroups virtualmachineid=VM_UUID
cmk list portforwardingrules networkid=NETWORK_UUID listall=true
```

The 4.23 `listPortForwardingRules` API does not accept a VM filter. Filter the returned network rules locally for an exact `virtualmachineid` match, and verify the public IP and private port before changing anything.

Do not assume the guest's remembered address is still assigned. CloudStack's API/UI is the desired-state reference; the guest and hypervisor show what was applied.

## Diagnose Inside the Guest First

Use the console to inspect the OS without changing anything:

```bash
ip -br link
ip -br address
ip route
ip neigh
cat /etc/resolv.conf
systemctl status sshd --no-pager || systemctl status ssh --no-pager
ss -ltnp | grep ':22\b'
```

Check these in order:

1. The expected NIC exists and is `UP`.
2. Its MAC matches the CloudStack NIC record.
3. It has the expected address and prefix.
4. The default route points to the network's documented gateway.
5. The guest can ARP for and ping that gateway.
6. SSH is listening on the correct family/address and the guest firewall permits it.

If the NIC has no address, request DHCP while capturing the exchange:

```bash
sudo tcpdump -ni any -e -vv 'port 67 or port 68'
# In another console, use the distribution's network manager to renew DHCP.
```

Do not hard-code an address until you have confirmed whether the network is DHCP-managed and whether that address belongs to the VM. An IP conflict can disrupt another tenant.

## Separate SSH from General IP Reachability

Ping is not a universal liveness test; ICMP may be intentionally filtered. From another VM on the same intended network, test ARP/neighbor resolution and TCP 22:

```bash
ping -c 3 GUEST_PRIVATE_IP
nc -vz GUEST_PRIVATE_IP 22
ssh -vvv user@GUEST_PRIVATE_IP
```

If TCP connects but authentication fails, the CloudStack network is working. Fix user, key, `sshd_config`, permissions, or cloud-init inside the guest. If the guest listens only on `127.0.0.1:22`, correct the SSH listener. If neither ICMP nor TCP reaches it, continue down the network path.

## Check Security Groups on Basic or Shared Networks

Each account's default CloudStack security group denies inbound traffic and permits outbound traffic by default. Add only the required rules, for example ICMP from an operations CIDR and TCP 22 from a bastion CIDR. Never open SSH to `0.0.0.0/0` just to test.

After adding a rule, verify the CloudStack rule list and host-side application. Current CloudStack lets rules apply to running instances, while changing group membership requires the instance to be stopped.

On the KVM host, identify the VM interface and observe traffic without editing managed rules:

```bash
sudo virsh domiflist GUEST_DOMAIN
sudo bridge link
sudo tcpdump -ni VM_TAP_INTERFACE -e 'arp or icmp or tcp port 22'
```

If packets arrive at the tap but the guest does not respond, the fault is in the guest. If no packets arrive, inspect the host bridge, VLAN, and CloudStack-generated security rules. Do not insert permanent iptables/nftables rules by hand; CloudStack will not know about them and may overwrite them.

## Check the Virtual Router on an Isolated Network

For an isolated network, first ping the VR gateway from the guest. If that fails, inspect the VR and its network service state before public rules:

```bash
cmk list routers networkid=NETWORK_UUID
cmk list networks id=NETWORK_UUID
```

Use **Run Diagnostics** or **Get Diagnostics** on the virtual router to capture addresses, routes, dnsmasq state, leases, HAProxy configuration, and firewall tables. The official System VM guide recommends pinging the VR as a basic network test.

If the guest reaches the VR and the Internet outbound but inbound SSH fails, verify the complete public path:

- the public IP is associated with this account/network;
- a public firewall rule permits the source CIDR and TCP port;
- a port-forwarding rule maps the intended public port to this VM's private port 22, or static NAT is enabled;
- there is no conflicting rule; and
- upstream routing delivers that public range to CloudStack's public network.

Test from outside the private network to avoid NAT hairpin assumptions.

## Verify the KVM Bridge and VLAN

On the VM's current host:

```bash
sudo virsh domiflist GUEST_DOMAIN
ip -d link show
bridge vlan show
bridge fdb show br CLOUD_BRIDGE | grep -i GUEST_MAC
sudo journalctl -u cloudstack-agent -n 200 --no-pager
```

Compare a working VM on the same network. The bridge, VLAN tag, MTU, and physical trunk must be identical across cluster hosts. A VM that fails only after migration strongly suggests one host's bridge/trunk or MTU differs.

Use simultaneous captures on the guest tap and physical uplink to locate where frames disappear. Keep capture filters narrow and protect tenant data.

## Repair and Verify

Repair the smallest owning layer: guest network configuration, SSH service/firewall, CloudStack security group, public firewall/port-forwarding rule, VR state, or host VLAN mapping. If CloudStack rules are stale, restart the network without cleanup first so rules are reapplied. Reserve cleanup/recreation for a scheduled window because it can replace the VR and interrupt traffic.

Verify in both directions:

```bash
# Guest
ping -c 3 EXPECTED_GATEWAY
curl -4 --connect-timeout 5 https://example.com/

# Approved source
nc -vz PUBLIC_OR_PRIVATE_ADDRESS 22
ssh -o BatchMode=yes user@PUBLIC_OR_PRIVATE_ADDRESS true
```

Then migrate or reboot the guest if those events previously triggered the failure and confirm connectivity persists. Roll back temporary rules and packet captures. Never leave broad ingress rules as diagnostic residue.

## Conclusion

Console access narrows the problem to everything after VM boot, not to CloudStack as a whole. Reconcile desired NIC state, validate the guest and SSH daemon, identify whether security groups or a virtual router owns policy, and trace frames across the KVM tap, bridge, VLAN, and gateway. Fix the first boundary that drops traffic and verify from an explicitly allowed source.

## Official Documentation

- [Apache CloudStack: Security Groups](https://docs.cloudstack.apache.org/en/latest/adminguide/networking/security_groups.html)
- [Apache CloudStack: Advanced Zone Physical Networking](https://docs.cloudstack.apache.org/en/latest/adminguide/networking/advanced_zone_config.html)
- [Apache CloudStack: System VMs and Virtual Router Diagnostics](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html)
- [Apache CloudStack: KVM Networking](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html#configuring-the-networking)
- [OpenSSH: sshd_config Manual](https://man.openbsd.org/sshd_config)
