# Azure VM Agent Not Ready: DHCP, WireServer, Firewalls, and Proxies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Guest Agent, DHCP, Troubleshooting

Description: Diagnose Azure VM Agent Not Ready by checking services, logs, guest DHCP, primary IP configuration, and WireServer access on required ports.

---

An Azure VM Agent status of `Not Ready` means Azure is not receiving a healthy agent report from inside the guest. The VM can still accept SSH or RDP because those services do not require the agent. However, extensions, password reset, backup integration, and other management operations may fail.

The fastest diagnosis checks four areas in order:

1. operating system and agent service;
2. agent logs and version;
3. DHCP and primary NIC consistency;
4. guest access to Azure WireServer at `168.63.129.16`.

## Understand the two guest agents

On Windows, Azure VM Agent includes services such as:

- **RdAgent**;
- **Windows Azure Guest Agent**.

The primary log is:

```text
C:\WindowsAzure\Logs\WaAppAgent.log
```

On Linux, the Azure Linux Agent is commonly packaged as `walinuxagent`, with process and command names based on `waagent`. Its main log is:

```text
/var/log/waagent.log
```

Cloud-init may perform provisioning on supported Linux images, but the Azure Linux Agent still handles the extension framework and communication with the Azure fabric.

## Confirm guest health and service state

Do not begin by reinstalling the agent. First confirm the OS is fully booted through Boot diagnostics, Serial Console, SSH, or RDP.

Windows:

```powershell
Get-Service RdAgent, WindowsAzureGuestAgent |
  Select-Object Name, Status, StartType

Get-Content C:\WindowsAzure\Logs\WaAppAgent.log -Tail 200
```

Linux:

```bash
sudo systemctl status walinuxagent --no-pager
sudo journalctl -u walinuxagent -n 200 --no-pager
sudo tail -n 200 /var/log/waagent.log
waagent -version
```

The Linux service unit can vary by distribution. Use `systemctl list-unit-files | grep -i wa` and the distribution's package tools when `walinuxagent` is not the unit name.

Look for the earliest repeated communication, certificate, dependency, permission, or disk-space error. Restarting a service can clear a transient problem, but preserve logs first.

## Test WireServer with TCP, not ping

`168.63.129.16` is a Microsoft-owned virtual public IP used for Azure platform communication. Among other functions, it enables VM Agent communication, Azure-provided DNS, DHCP, and load-balancer health probes.

The VM Agent requires outbound TCP access to WireServer on ports **80** and **32526**.

Windows:

```powershell
Test-NetConnection 168.63.129.16 -Port 80
Test-NetConnection 168.63.129.16 -Port 32526
```

Linux:

```bash
curl --noproxy '*' --connect-timeout 5 \
  'http://168.63.129.16/?comp=versions'

nc -vz -w 5 168.63.129.16 32526
```

The HTTP response content is less important than proving direct connectivity. Ping is not an appropriate health test because the platform endpoint's ICMP behavior does not represent the required TCP paths.

Do not confuse WireServer with Azure Instance Metadata Service. IMDS uses `169.254.169.254`; agent fabric communication in this diagnosis uses `168.63.129.16`.

## Keep DHCP enabled in the guest

Azure assigns the NIC's primary private address to the guest through platform DHCP. If a stable private IP is required, configure it as static on the Azure NIC, but normally leave the guest interface configured for DHCP.

A hard-coded guest IP can break:

- the route to the host and fabric;
- DNS configuration;
- primary address alignment;
- agent heartbeat and extension operations.

On Windows:

```powershell
Get-NetIPConfiguration
Get-NetIPInterface -AddressFamily IPv4 |
  Select-Object InterfaceAlias, Dhcp, ConnectionState
```

On Linux:

```bash
ip address
ip route
resolvectl status 2>/dev/null || cat /etc/resolv.conf
```

Compare the guest's primary address with the Azure NIC:

```bash
az network nic show \
  --resource-group myResourceGroup \
  --name myNic \
  --query "ipConfigurations[].{primary:primary,privateIP:privateIPAddress,method:privateIPAllocationMethod}" \
  --output table
```

For a NIC with multiple IP configurations, the primary address in the guest must align with Azure's primary configuration. Follow Microsoft's documented procedure for assigning multiple guest IPs rather than improvising static interface files.

## Inspect guest firewalls

Traffic to `168.63.129.16` is a special platform path and is not governed like ordinary internet traffic. It is not subject to user-defined routes. The most common customer-controlled blockers for the agent are inside the guest:

- Windows Defender Firewall;
- third-party endpoint firewall;
- `nftables`, `iptables`, `firewalld`, or `ufw`;
- security software that intercepts the agent process;
- a transparent or explicitly configured proxy.

Permit direct outbound TCP 80 and 32526 to `168.63.129.16`. Scope the rule tightly rather than disabling the entire firewall.

An ordinary NSG or route-table change is not enough evidence that WireServer is reachable. Test from the guest.

## Handle proxies carefully

The Windows Azure VM Agent does not provide general proxy support for redirecting its platform traffic. Its connection to `168.63.129.16` must not be forced through a web proxy. Configure proxy products and SSL inspection to bypass the platform IP.

The Azure Linux Agent exposes `HttpProxy.Host` and `HttpProxy.Port` settings for internet access, but WireServer must still be reachable correctly. Review `/etc/waagent.conf`:

```bash
sudo grep -E '^(HttpProxy|AutoUpdate|Logs.Verbose)' /etc/waagent.conf
```

Extensions are applications in their own right. Even when the agent reaches WireServer, a Custom Script that downloads from GitHub or an extension that calls another Azure service needs access to its own endpoints.

## Update or reinstall only after connectivity is sound

On Linux, Microsoft recommends installing the distribution's `walinuxagent` package first and keeping auto-update enabled:

```bash
sudo grep -i '^AutoUpdate.Enabled' /etc/waagent.conf
```

Use the distribution package manager and its supported repository. On Windows, check the documented installation prerequisites before uninstalling or reinstalling the agent.

Reinstallation will not fix a blocked WireServer path, incorrect guest IP, full filesystem, or unsupported customized image. Correct the underlying condition first.

## Recovery when there is no network login

If the agent is Not Ready and SSH or RDP also fails:

1. review Boot diagnostics;
2. use Azure Serial Console if prerequisites are met;
3. repair DHCP, route, firewall, service, disk space, and agent config;
4. if the guest cannot boot, attach a copy of the OS disk to a repair VM.

Run Command and VMAccess use the agent path, so they are not reliable fallbacks when the agent itself is unavailable.

## Official Documentation

- [Troubleshoot Azure Windows VM Agent issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/windows-azure-guest-agent)
- [Azure Linux VM Agent overview](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-linux)
- [Azure IP address 168.63.129.16 overview](https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16)
- [Azure VM extensions and features for Windows](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/features-windows)
- [Update the Azure Linux Agent](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/update-linux-agent)
