# How to Repair VM Network Rules After a CloudStack Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Networking, Virtualization, High Availability, Troubleshooting

Description: Reconcile and safely reapply CloudStack security, firewall, NAT, DHCP, and load-balancer rules after an upgrade without replacing virtual routers prematurely.

---

After a CloudStack upgrade, the database may contain the right firewall, NAT, security-group, DHCP, and load-balancer objects while a KVM host or virtual router (VR) still has old or incomplete runtime rules. The repair is not to hand-edit iptables. CloudStack must remain the source of truth so that rules survive the next restart, migration, or VR replacement.

Current CloudStack upgrade guidance supports live patching System VMs in eligible upgrade paths. For virtual routers, live patching initiates a network restart without cleanup so rules are reapplied. When live patching is unsupported or fails, the official fallback is the traditional System VM/VR upgrade and a network restart with or without cleanup, which can cause downtime.

## Freeze Changes and Capture Desired State

Pause tenant network changes during diagnosis. Record the affected network UUID, VR UUID/version, redundant VR state, and representative VM/IP. Export the desired rules with read-only API calls:

```bash
cmk list networks id=NETWORK_UUID
cmk list routers networkid=NETWORK_UUID
cmk list firewallrules networkid=NETWORK_UUID listall=true
cmk list egressfirewallrules networkid=NETWORK_UUID listall=true
cmk list portforwardingrules networkid=NETWORK_UUID listall=true
cmk list loadbalancerrules networkid=NETWORK_UUID listall=true
cmk list publicipaddresses associatednetworkid=NETWORK_UUID listall=true
```

For security-group networks, also capture:

```bash
cmk list securitygroups virtualmachineid=VM_UUID
cmk list nics virtualmachineid=VM_UUID
```

Save JSON output in the incident workspace outside the repository. Scrub credentials and tenant data before sharing. This snapshot is your comparison and rollback reference, not a script to replay blindly.

## Establish the Scope

Test a small matrix:

| Scope | What it suggests |
| --- | --- |
| One VM | guest firewall/NIC or one host's security-group rules |
| All VMs on one KVM host | host bridge, security-group agent, upgrade drift |
| One isolated network | that network's VR/runtime state |
| Many networks in one zone | System VM template, physical network, management rollout |
| Only inbound public traffic | public firewall/NAT/load-balancer path |

Use a known allowed flow and a known denied flow. A repair that makes the allowed flow work but opens the denied flow is a security regression.

## Compare Runtime State with CloudStack

Use **Get Diagnostics** on the affected virtual router. The documented bundle includes addresses, routes, dnsmasq configuration and leases, HAProxy configuration, iptables, and service logs. Search its `cloud.log` and `routerServiceMonitor.log` for failed rule applications.

From a KVM host on a security-group network, inspect CloudStack agent logs and rules without modifying them:

```bash
sudo grep -Ei 'security.?group|iptables|nft|network|failure|exception' \
  /var/log/cloudstack/agent/agent.log | tail -n 250
sudo iptables-save > /tmp/iptables-after-upgrade.txt
sudo nft list ruleset > /tmp/nft-after-upgrade.txt
```

The active backend depends on distribution and CloudStack packaging. Do not flush either ruleset. Also compare host bridge/VLAN mappings after agent-package upgrades:

```bash
bridge link
bridge vlan show
ip -d link show
```

## Verify System VM Template and Router Version

Check the upgrade guide for the exact source-to-target path. Confirm required System VM templates are registered and ready for the zone's hypervisor/architecture, then compare every VR's reported version/state.

```bash
cmk list templates templatefilter=all listall=true zoneid=ZONE_UUID
cmk list routers zoneid=ZONE_UUID
cmk list systemvms zoneid=ZONE_UUID
```

Do not assume `Running` means upgraded. Older VRs may keep existing services running, but the management server may be unable to perform new operations until the VR is upgraded.

## Reapply Rules with the Least Disruptive Action

For an eligible network and healthy VR, restart the network **without cleanup** first:

```bash
cmk help restart network
cmk restart network id=NETWORK_UUID cleanup=false
```

This tells CloudStack to reapply managed rules while retaining the existing VR. Track the returned asynchronous job and do not submit repeated restarts:

```bash
cmk query asyncjobresult jobid=JOB_UUID
```

CloudMonkey profiles expose API names differently; verify the local `cmk help` output before executing. Observe management, VR, and agent logs throughout the operation.

If the official upgrade matrix calls for **Upgrade Router Template**, use the UI/API in a controlled group (zone, pod, cluster, account, or single router). With redundant VRs, verify which node is master and confirm failover health rather than upgrading both blindly.

## Escalate to Cleanup Only When Needed

A network restart with cleanup can recreate the VR and rebuild configuration from CloudStack's database. It is appropriate when the VR image/configuration is damaged or the upgrade specifically requires replacement. It is not the first diagnostic step.

Before cleanup:

- verify the desired API rule inventory is complete;
- ensure the correct System VM template is `Ready`;
- confirm host, storage, and system/public network capacity;
- notify users of possible DHCP, NAT, VPN, load-balancer, and connection interruption;
- validate redundant VR health or schedule downtime; and
- preserve diagnostics from the old VR.

Then run the UI action or, after checking syntax:

```bash
cmk restart network id=NETWORK_UUID cleanup=true
```

Never “repair” state by changing CloudStack database rows or by copying iptables-save output into a new VR. The generated rules incorporate current instance, IP, and service state.

## Repair Security-Group Hosts Separately

Security-group enforcement lives on the hypervisor path, not an isolated-network VR. If only migrated VMs or one host fail, reconnect the healthy agent or reapply a harmless CloudStack security-group rule through the supported API, then watch agent processing. Confirm every cluster host ran the supported agent upgrade and shares the same bridge/firewall backend.

Changing a VM's security-group membership requires it to be stopped. Adding or removing rules on an existing group applies to its running members. Use a narrow canary group rather than broadening the default group.

## Verify and Roll Back

Repeat the exact pre-upgrade tests:

1. DHCP renewal and DNS succeed.
2. The VM reaches its VR or physical gateway.
3. Allowed egress works and prohibited egress remains blocked.
4. Public firewall plus port forwarding/static NAT works from an external source.
5. Load-balancer health and VIP behavior are correct.
6. A security-group VM retains policy after migration between hosts.

Compare API objects to runtime diagnostics and watch for new rule-application errors. If a non-cleanup restart makes behavior worse, preserve evidence and correct the desired CloudStack rule or offering; do not paste back transient rules. If a newly recreated VR is broken, the rollback target is the supported prior System VM template/release procedure and database backup for that upgrade, not the deleted VR disk.

## Conclusion

Post-upgrade network repair is reconciliation. Capture desired rules, locate whether drift is in a VR or KVM host, verify the System VM/agent upgrade, and restart the network without cleanup to reapply state. Use cleanup only when replacement is required and validate both allowed and denied traffic afterward.

## Official Documentation

- [Apache CloudStack: Upgrade Guide](https://docs.cloudstack.apache.org/en/latest/upgrading/)
- [Apache CloudStack: System VMs and Virtual Routers During Upgrade](https://docs.cloudstack.apache.org/en/latest/upgrading/upgrade/_sysvm_restart.html)
- [Apache CloudStack: System VM Diagnostics](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html)
- [Apache CloudStack: Security Groups](https://docs.cloudstack.apache.org/en/latest/adminguide/networking/security_groups.html)
- [Apache CloudStack: API Reference](https://cloudstack.apache.org/api/)
