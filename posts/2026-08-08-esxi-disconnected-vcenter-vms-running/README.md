# ESXi Disconnected from vCenter While VMs Run: First Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, VMware vCenter, Management Plane, Host Connectivity, Troubleshooting, High Availability

Description: Diagnose an ESXi host that vCenter cannot manage while its VMs still run, starting with workload safety, connection state, network paths, and agents.

---

Running VMs and a disconnected ESXi host are not contradictory. Guest execution happens on ESXi, while vCenter communicates with the host through a separate management path and agents. A break in that control plane can leave workloads serving traffic even though vCenter has stale or no host state.

Do not reboot the host merely to clear the red icon. First confirm workload health, distinguish **Not Responding** from **Disconnected**, determine the incident scope, and preserve evidence. The loss of management also limits safe migration, maintenance, monitoring, and some availability behavior, so a VM that still answers is not proof that the host is healthy.

## Protect the Workloads First

Use monitoring, application checks, and guest access to confirm which VMs are actually healthy. Do not trust only the greyed-out vCenter inventory because its state may be stale.

Establish these controls immediately:

- freeze nonessential VM reconfiguration, snapshot, backup, and migration jobs for the host;
- stop automated remediation from repeatedly reconnecting or rebooting it;
- verify that no administrator is also changing management networking or firewalls;
- record the time of the last successful heartbeat and recent infrastructure changes; and
- confirm out-of-band console and power access without cycling power.

If the host runs critical VMs on local storage, a reboot can turn a management incident into an outage with no evacuation path. If shared storage is showing APD or PDL symptoms, storage recovery policy needs to guide workload handling before any host restart.

## Check Which Connection State vCenter Reports

Broadcom distinguishes the states:

- **Not Responding** means vCenter stopped receiving host heartbeats. Network loss, blocked UDP 902, failed `hostd` or `vpxa`, resource exhaustion, storage trouble, or host failure can cause it. It can recover automatically when the underlying problem clears.
- **Disconnected** is a vCenter-side state that suspends monitoring. It can follow an explicit disconnect, an unsuccessful connect attempt from Not Responding, or an expired host license. After the cause is fixed, an administrator must connect the host again.

This distinction matters for HA. Broadcom documents that vCenter has no current health knowledge for a disconnected host, does not treat it as a guaranteed failover target, and disables HA on that host as part of disconnection. Do not assume the still-running VMs have their normal cluster protection until the host is healthy and reconnected.

Read **Monitor > Tasks and Events** for the transition and exact error. Search for `Cannot synchronize host`, missed heartbeat, SSL trust, license, timeout, or manual disconnect events.

## Use the Blast Radius to Choose the First Test

The pattern usually narrows the fault domain:

- **One host only:** inspect that host's management VMkernel path, physical uplinks, duplicate IP, agents, storage latency, and resource pressure.
- **Every host in one vCenter:** inspect vCenter services, vCenter networking, DNS, certificate changes, appliance storage, and any recent vCenter backup or restore.
- **Hosts on one management VLAN or site:** inspect routing, VLANs, MTU, ACLs, firewalls, LACP, and site transport.
- **Regular intermittent drops:** correlate timing with UDP 902 heartbeats, security scans, backup snapshots of vCenter, network loss, and log storms.

Broadcom's current intermittent-disconnect KB says ESXi sends heartbeat traffic to vCenter over UDP 902 every 10 seconds and vCenter expects at least one heartbeat in a 60-second window. A roughly 60-second pattern is a strong reason to trace UDP 902, but it is not permission to increase the timeout and declare the network healthy.

## Establish Direct Host Reachability

From an administration system on the intended management path, test the ESXi management IP and open `https://<esxi-management-ip>/ui`. Also test the DCUI through the server's remote console.

The results separate layers:

- guest reachable, Host Client reachable, vCenter disconnected suggests a vCenter path, `vpxa`, identity, or trust problem;
- guest reachable, Host Client unreachable, SSH or DCUI reachable suggests `hostd`, HTTPS proxy, or resource trouble;
- guest reachable, no management IP response, DCUI reachable suggests management network configuration or physical path trouble; and
- no DCUI response or a diagnostic screen suggests a host-level failure, not only a vCenter connection issue.

Do not enable SSH permanently for convenience. Use the supported access policy, record the change, and disable it after evidence collection.

## Validate the Management VMkernel Path

At DCUI, use **Test Management Network** and verify the configured management IP, prefix, gateway, DNS servers, and hostname. Do not change settings while another session is testing the same path.

Read-only shell checks include:

```bash
esxcli network ip interface list
esxcli network ip route ipv4 list
esxcli network nic list
vmkping -I vmk0 <management-gateway-ip>
vmkping -I vmk0 <vcenter-ip>
```

Replace `vmk0` if the management service is deliberately on another VMkernel adapter. A successful ping proves ICMP reachability and a reply path only for the tested packet size. It does not prove that the required TCP and UDP flows, larger MTU sizes, or the intended return path work.

Verify the active management uplink, standard or distributed port, VLAN ID, NIC link state, physical switch port, allowed VLANs, LACP state, and MTU end to end. Compare against a healthy peer, but do not copy its configuration blindly. Management adapters can legitimately use different uplinks or addresses.

Check `/var/run/log/vobd.log` for duplicate-IP events. Broadcom documents that another VM, host, or network device using the management address can cause intermittent disconnects even while forward and reverse DNS and port tests sometimes succeed. Use the reported owner MAC with the network team to locate the conflict.

## Test Ports in Both Directions

Broadcom's generic disconnected-host runbook calls for checking TCP and UDP 902 and TCP 443 between vCenter and ESXi. Validate the current release and topology against the official ports matrix, especially when proxies, NSX, or segmented management networks are present.

From the vCenter Server Appliance Bash shell, examples of TCP reachability checks are:

```bash
nslookup <esxi-fqdn>
nc -zv <esxi-management-ip> 443
nc -zv <esxi-management-ip> 902
```

From ESXi, check the reverse identity and path:

```bash
nslookup <vcenter-fqdn>
nc -z <vcenter-ip> 443
nc -zu <vcenter-ip> 902
```

A UDP `nc` result is not definitive because UDP has no connection handshake. For an intermittent heartbeat issue, Broadcom documents capturing UDP 902 on the ESXi uplink and vCenter appliance, then determining whether packets leave the host and arrive at vCenter. Use the official `pktcap-uw` procedure and select the real management uplink. Do not paste an example with `vmnicX` unchanged.

Review the ESXi firewall and every intervening firewall or ACL. Broadcom documents a specific failure where restricting the **vSphere Web Client (443, 902)** ruleset omits the vCenter IP and disconnects the host. Confirm the intended allowed list rather than disabling the firewall broadly.

## Verify DNS, Identity, Time, and Trust

Check forward and reverse resolution from both sides. The host FQDN in vCenter must resolve consistently to its management address, and the host must resolve the current vCenter identity. Broadcom documents intermittent host disconnects when vCenter DNS queries time out or return `NXDOMAIN`.

Also check:

- vCenter's managed IP and whether it changed after restore or network work;
- the ESXi hostname, domain, and DNS search configuration;
- NTP health and time difference between host, vCenter, and identity services;
- recent host or vCenter certificate replacement; and
- whether the host was rebuilt or its management address was reused.

Do not accept an unexpected certificate thumbprint merely to reconnect. Confirm why it changed and compare it through an independent trusted path. A certificate-name mismatch, wrong DNS answer, duplicate IP, or unintended endpoint can all present as a trust failure.

Do not hand-edit `vpxa` configuration as a generic fix. Configuration storage differs by ESXi release, and Broadcom's generic runbook points to version-specific procedures for managed-IP and `vpxa` properties.

## Check Agents Without Restarting Them Yet

Use the Host Client service view when available. Read-only shell status checks are:

```bash
/etc/init.d/hostd status
/etc/init.d/vpxa status
```

`hostd` provides local host management. `vpxa` is the vCenter agent and depends on host services. If `vpxa.log` says it cannot connect to `hostd`, restarting only `vpxa` without diagnosing `hostd` is unlikely to solve the cause.

Capture a timeline from both sides before changing services:

```bash
tail -n 200 /var/run/log/hostd.log
tail -n 200 /var/run/log/vpxa.log
tail -n 200 /var/run/log/vobd.log
tail -n 200 /var/run/log/vmkernel.log
```

On vCenter, correlate `/var/log/vmware/vpxd/vpxd.log` at the same timestamps. Look for missed heartbeats, name-resolution failures, TLS errors, HTTP failures, agent crashes, duplicate IP, APD or PDL, device timeouts, memory pressure, and excessive logging. Preserve a support bundle before logs roll over when the incident is recurring or severe.

## Rule Out Resource and Storage Stalls

A reachable management IP does not prove healthy management agents. Use `esxtop` and the Host Client performance views to look for sustained CPU or memory pressure. Check persistent log and scratch capacity and investigate a flood of dropped syslog messages.

Inspect datastore and path state:

```bash
esxcli storage filesystem list
esxcli storage core path list
```

Broadcom's generic runbook explicitly includes datastore latency, APD/PDL, and storage access problems because blocked host operations can make `hostd` or `vpxa` appear to be the problem. Do not rescan, detach, unmount, or restart storage as a connectivity experiment while VMs are active.

## Apply the Smallest Corrective Action

Use this order after evidence identifies the layer:

1. Correct the duplicate IP, VLAN, route, MTU, DNS, firewall, or vCenter service issue.
2. Confirm bidirectional management traffic and stable DNS.
3. If the host is **Not Responding**, allow it to recover or use **Connection > Connect** after the path is healthy.
4. If it is explicitly **Disconnected**, select **Connection > Connect**, provide authorized credentials if prompted, and validate any presented certificate thumbprint against the expected host.
5. Restart a single implicated management service only when logs and service status justify it.

Broadcom supports restarting `hostd` or `vpxa` individually through **Host > Manage > Services** or with:

```bash
/etc/init.d/hostd restart
/etc/init.d/vpxa restart
```

Do not run both automatically. If the Host Client works and only the vCenter agent is unhealthy, the narrower `vpxa` action may be sufficient. If `hostd` itself is unresponsive, collect evidence and assess workload and platform risks before restarting it.

Broadcom warns that management-agent restarts can disrupt tasks, affect guest performance, and in some cases require a host reboot. It specifically says not to use the broad `services.sh restart` or DCUI **Restart Management Agents** action on hosts using vSAN, LACP, NSX, or shared graphics; only single services should be restarted in those environments.

## Avoid Escalating the Incident

Do not remove and re-add the host as the first repair. That changes inventory relationships and can complicate distributed networking, HA, monitoring, licensing, and historical context while the original path problem remains.

Do not restart all vCenter services or raise the heartbeat timeout before showing where heartbeats are lost. Broadcom describes a longer timeout only as a temporary workaround and recommends fixing the underlying issue.

Reboot the host only when the diagnosed host-level condition requires it, VMs have been evacuated or shut down safely, active storage operations are clear, and out-of-band recovery is ready. If management is too impaired to collect evidence or evacuate critical VMs, open a Broadcom support case and involve the network, storage, and server vendors as indicated by the logs.

After reconnection, verify HA agent state, vSAN or storage health, distributed-switch membership, alarms, time, backup integration, and current VM inventory. Observe the host for several heartbeat intervals and through the event that previously triggered the disconnect.

## Official Documentation

- [Troubleshooting an ESXi host in Not Responding or Disconnected state](https://knowledge.broadcom.com/external/article/344682)
- [Difference between Not Responding and Disconnected ESXi hosts](https://knowledge.broadcom.com/external/article/337333)
- [Restarting ESXi management agents and current warnings](https://knowledge.broadcom.com/external/article/320280)
- [Troubleshooting intermittent ESXi heartbeat disconnects](https://knowledge.broadcom.com/external/article/318647)
- [ESXi firewall restrictions that block vCenter](https://knowledge.broadcom.com/external/article/432374)
- [ESXi disconnects caused by vCenter DNS failures](https://knowledge.broadcom.com/external/article/369229)
- [ESXi management disconnects caused by duplicate IP addresses](https://knowledge.broadcom.com/external/article/413893)

## Conclusion

When VMs run but vCenter loses an ESXi host, preserve the workload and diagnose the management plane in layers. Start with the exact connection state and blast radius, prove direct host and port reachability, correlate DNS and logs, and check agents, resources, and storage before restarting anything. Reconnect only after the path is trustworthy, then verify that cluster protection and integrations have recovered.
