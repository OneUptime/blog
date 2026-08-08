# Validation Summary: ESXi Disconnected from vCenter While VMs Run: First Checks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- VMware vSphere and vCenter Server
- VMware ESXi and the ESXi Host Client
- vSphere High Availability (HA)
- ESXi management VMkernel networking
- vSphere Distributed Switches, VLANs, LACP, MTU, routing, and firewalls
- `hostd` and `vpxa` management agents
- DNS, NTP, TLS certificates, and host identity
- ESXi storage paths, APD, and PDL
- ESXCLI, `vmkping`, `nc`, `pktcap-uw`, and `esxtop`

## Sources Consulted
- Broadcom KB 344682, ESXi host not responding or disconnected - VMware vSphere: https://knowledge.broadcom.com/external/article/344682
- Broadcom KB 337333, Understanding the difference between Not Responding and Disconnected ESXi hosts: https://knowledge.broadcom.com/external/article/337333
- Broadcom KB 303652, Changing an ESXi host's connection status in vCenter Server: https://knowledge.broadcom.com/external/article/303652
- Broadcom vSphere Web Services API, `HostSystem.ReconnectHost_Task`: https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.HostSystem.html
- Broadcom KB 318647, ESXi host disconnects intermittently from vCenter Server: https://knowledge.broadcom.com/external/article/318647
- Broadcom KB 318895, Port requirements for VMware vSphere ESXi: https://knowledge.broadcom.com/external/article/318895
- Broadcom ESXCLI Command Reference, network commands: https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html
- Broadcom ESXCLI Command Reference, storage commands: https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html
- Broadcom KB 344313, testing VMkernel network connectivity with `vmkping`: https://knowledge.broadcom.com/external/article/344313
- Broadcom KB 341568, packet capture with `pktcap-uw`: https://knowledge.broadcom.com/external/article/341568
- Broadcom KB 432374, ESXi firewall restrictions that omit the vCenter Server IP: https://knowledge.broadcom.com/external/article/432374
- Broadcom KB 369229, ESXi disconnects caused by vCenter Server DNS failures: https://knowledge.broadcom.com/external/article/369229
- Broadcom KB 413893, ESXi disconnects caused by duplicate management IP addresses: https://knowledge.broadcom.com/external/article/413893
- Broadcom KB 335066, vSphere ESXi 7.0 U3 and later VPXA configuration properties: https://knowledge.broadcom.com/external/article/335066
- Broadcom KB 306962, ESXi and vCenter Server log-file locations: https://knowledge.broadcom.com/external/article/306962
- Broadcom KB 320280, Restarting Management Agents in ESXi: https://knowledge.broadcom.com/external/article/320280
- Broadcom KB 313542, collecting an ESXi support bundle: https://knowledge.broadcom.com/external/article/313542
- Broadcom KB 318712, ESXi All Paths Down behavior and troubleshooting: https://knowledge.broadcom.com/external/article/318712
- Broadcom KB 319670, vCenter Server Appliance Bash and Appliance Shells: https://knowledge.broadcom.com/external/article/319670

## Issues Found
- The Disconnected-state description referred broadly to a "license issue." Broadcom identifies expiration of the ESXi host license as the relevant transition cause. Changed the text to "an expired host license."
- The `vmkping` caveat said a successful ping did not prove that a return path worked. Receiving an ICMP echo reply does prove a reply path for those packets, although it does not prove the intended or symmetric return path, a larger MTU, or TCP/UDP policy. Corrected the caveat accordingly.
- The vCenter Server Appliance examples did not identify the shell in which standard Linux utilities such as `nslookup` and `nc` run. Specified the VCSA Bash shell because the default Appliance Shell has a restricted command set.
- The reconnect step implied that credentials and a certificate are always requested. vCenter can reuse its stored connection parameters, and a certificate prompt is conditional. Changed the step to provide credentials if prompted and validate any presented certificate thumbprint against the expected host.

## Review Notes
All ESXCLI, `vmkping`, service-status, service-restart, `nc`, `nslookup`, and log-inspection examples match current Broadcom command references or KB procedures. The post correctly distinguishes the directional core-management flows: UDP 902 from ESXi to vCenter Server for heartbeats and TCP 902 from vCenter Server to ESXi. It also correctly warns that a successful UDP `nc` result is not conclusive and recommends packet capture for intermittent heartbeat loss.

The HA behavior, 10-second heartbeat interval, 60-second missed-heartbeat window, duplicate-IP evidence, DNS failure modes, release-dependent `vpxa` configuration storage, APD/PDL considerations, and warnings about broad management-agent restarts were verified. LACP checks apply when a vSphere Distributed Switch LAG is configured; the post does not claim that a standard vSwitch supports LACP. All seven URLs in the post's Official Documentation section returned HTTP 200 and led to the intended Broadcom articles on the validation date.
