# Restore Console Access to Unreachable CloudStack System VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Networking, KVM, Security, Troubleshooting

Description: Trace a failed CloudStack console session from the browser through the Console Proxy VM to the hypervisor VNC socket, then repair DNS, TLS, routing, or host access safely.

---

A `Running` Console Proxy VM does not prove that users can reach it or that it can reach a guest's hypervisor console. CloudStack console traffic has two separate legs:

```text
browser -> Console Proxy VM HTTP/WebSocket endpoint
Console Proxy VM -> VNC port on the hypervisor hosting the guest
```

There is no console traffic to the guest's virtual NIC, and the guest does not need a VNC server. That is why console access can fail while the guest network works, or work while ping and SSH fail.

## Identify Which Leg Is Broken

Start a fresh console request with the browser developer tools open. Record the generated console URL, HTTP status, WebSocket error, host, port, and time. Do not share its token. In CloudStack, capture the guest UUID, host, selected Console Proxy VM (CPVM), and relevant management log entries. `createConsoleEndpoint` is synchronous and does not return an async job ID.

Use CloudMonkey to inventory the path and generate a fresh console endpoint (CloudStack 4.18 or later):

```bash
cmk list systemvms systemvmtype=consoleproxy state=Running
cmk list virtualmachines id=GUEST_UUID
cmk create consoleendpoint virtualmachineid=GUEST_UUID
```

`createConsoleEndpoint` returns a generated console URL plus WebSocket connection options. If `consoleproxy.extra.security.validation.enabled` is true, also supply the `token` parameter required by that validation flow. Treat the complete response as a credential because the URL or options can carry the short-lived access token. If endpoint creation itself fails, inspect the management server before debugging browser routing.

Search the management log by guest or CPVM UUID:

```bash
sudo grep -nE 'GUEST_UUID|CPVM_UUID' \
  /var/log/cloudstack/management/management-server.log | tail -n 200
```

## Test Browser-to-CPVM Reachability

Resolve the console hostname from the same network as the user:

```bash
getent ahosts CONSOLE_HOSTNAME
curl -vI https://CONSOLE_HOSTNAME/
```

This HTTPS HEAD request checks the frontend on port 443; it does not test a WebSocket upgrade. Use the generated endpoint's scheme and port when they differ, and test its WebSocket connection in the browser. Keep certificate and hostname verification enabled while reproducing the browser path. For an internal CA, use `curl -vI --cacert /path/to/ca.pem https://CONSOLE_HOSTNAME/` with the trusted CA bundle. Check:

- DNS resolves the generated name to the intended CPVM or load balancer.
- Firewalls permit the configured console ports from user networks.
- A reverse proxy preserves WebSocket upgrade headers and does not rewrite the signed path.
- The browser is not blocking an insecure WebSocket from an HTTPS UI.
- The certificate covers the exact generated hostname and has a complete chain.

CloudStack normally selects secure port 8443 only when `consoleproxy.sslEnabled` is true, `consoleproxy.url.domain` is set, and a CPVM certificate exists in the keystore; otherwise it uses port 8080 for the WebSocket boot argument. Do not assume a global setting change altered an already-running CPVM.

For wildcard console DNS, CloudStack documents names that encode the CPVM IPv4 address, such as `203-0-113-40.console.example.net`, resolving to `203.0.113.40`. If you use a load balancer and fixed FQDN instead, follow the official CPVM/SSVM load-balancing port mapping and restrict direct public access to System VM addresses.

## Inspect the CPVM Itself

The UI's **Get Diagnostics** action retrieves a bundle with IP addresses, routes, firewall state, `cloud.log`, and Console Proxy properties. If direct access is required on KVM, connect from the hosting KVM host to the System VM link-local address on SSH port 3922 with the documented key:

```bash
sudo ssh -i /root/.ssh/id_rsa.cloud \
  -p 3922 root@CPVM_LINK_LOCAL_IP
```

Inside the CPVM, inspect rather than alter:

```bash
ip -br address
ip route
ss -ltnp
sudo iptables-save
sudo tail -n 200 /var/log/cloud.log
```

Verify its public and management routes, DNS, listener, certificate time validity, and ability to reach the guest's KVM host. Do not add one-off routes or firewall rules inside a System VM: CloudStack can recreate it, losing those changes.

## Test CPVM-to-Hypervisor VNC Reachability

On the KVM host that runs the guest:

```bash
sudo virsh dominfo GUEST_DOMAIN
sudo virsh vncdisplay GUEST_DOMAIN
sudo virsh dumpxml GUEST_DOMAIN | sed -n '/<graphics/,/>/p'
sudo ss -ltnp | grep qemu
sudo journalctl -u libvirtd -u virtqemud -u cloudstack-agent -n 200 --no-pager
```

The VNC display/port is assigned by libvirt/QEMU and may change after a restart. Never hard-code it in an external firewall. CloudStack's KVM setup requires QEMU VNC to listen on an address reachable by the CPVM, controlled by the domain graphics listen address or the default in `/etc/libvirt/qemu.conf`, and the hypervisor firewall must permit the managed VNC range from the infrastructure network.

From the CPVM, test only the specific current host and VNC port:

```bash
nc -vz KVM_MANAGEMENT_IP CURRENT_VNC_PORT
```

If the TCP test fails, trace bridge/VLAN routing and host firewall counters. If it succeeds but proxying fails, inspect the CPVM log for token, VNC negotiation, or session assignment errors.

## Repair the Owning Configuration

Make the repair at the layer that owns it:

- Fix wildcard/fixed DNS or the external load balancer for browser reachability.
- Upload a valid PKCS#8 private key and certificate chain through CloudStack's supported SSL workflow.
- Correct `consoleproxy.url.domain`, `consoleproxy.sslEnabled`, or SSL-offload settings as documented.
- Fix physical routing and firewall policy between CPVM and KVM management/VNC networks.
- Correct the KVM QEMU VNC listen configuration and restart the active libvirt daemon (`libvirtd` or `virtqemud`) only in a maintenance window. A daemon restart does not change an existing QEMU process's listener; if needed, stop and start the affected guest through CloudStack during that window, then recheck its live graphics configuration.
- Replace a damaged or obsolete System VM template through the supported upgrade flow.

Changes to console proxy SSL/domain boot settings require CPVM recreation. Destroying CPVMs interrupts active console sessions, so schedule it and preserve at least one working proxy where the design permits.

## Verify Recovery and Rollback

After recreating or restarting the affected CPVM, wait for it to reach `Running` and connected. Generate a new console endpoint rather than reusing an old token, and verify:

1. DNS and certificate validation succeed from a user network.
2. The WebSocket upgrades successfully through any proxy.
3. The CPVM can reach the current VNC port on more than one KVM host.
4. Consoles work for guests on different hosts and across a guest migration.
5. No direct CPVM management or SSH port is exposed publicly.

Before configuration changes, record old global values, DNS targets, load-balancer rules, and certificate identifiers. Roll back those owning resources as a unit. Do not roll back by editing a live CPVM; it is replaceable infrastructure.

## Conclusion

Console recovery is a two-leg network investigation. Prove endpoint generation, browser-to-CPVM DNS/TLS/WebSocket access, and CPVM-to-hypervisor VNC access separately. Repair the configuration that CloudStack uses to build System VMs, recreate the CPVM when boot arguments change, and validate with a fresh token across multiple hosts.

## Official Documentation

- [Apache CloudStack: Console Proxy and Console Endpoints](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html#console-proxy)
- [Apache CloudStack: Accessing System VMs](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html#accessing-system-vms)
- [Apache CloudStack: KVM Host Installation](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html)
- [Apache CloudStack: API Reference](https://cloudstack.apache.org/api/)
- [libvirt: QEMU Driver](https://libvirt.org/drvqemu.html)
