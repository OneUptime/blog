# Validation Summary: How to Fix a CloudStack VM That Has Console Access but No Ping or SSH Connectivity

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Apache CloudStack 4.23 and CloudMonkey
- KVM, libvirt, Linux TAP interfaces, bridges, VLANs, and MTU
- IPv4, IPv6 neighbor resolution, DHCP, ICMP, TCP, NAT, and network ACLs
- CloudStack security groups, virtual routers, and console proxies
- OpenSSH, systemd, iproute2, tcpdump, netcat, and curl

## Sources Consulted
- CloudStack security groups: https://docs.cloudstack.apache.org/en/latest/adminguide/networking/security_groups.html
- CloudStack advanced zone physical networking: https://docs.cloudstack.apache.org/en/latest/adminguide/networking/advanced_zone_config.html
- CloudStack system VMs, console proxy architecture, and diagnostics: https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html
- CloudStack KVM networking: https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html#configuring-the-networking
- CloudStack guest networking, NAT, firewall rules, and VPC ACLs: https://docs.cloudstack.apache.org/en/latest/adminguide/networking_and_traffic.html
- CloudStack 4.23 API index: https://cloudstack.apache.org/api/apidocs-4.23/
- CloudStack listVirtualMachines: https://cloudstack.apache.org/api/apidocs-4.23/apis/listVirtualMachines.html
- CloudStack listNics: https://cloudstack.apache.org/api/apidocs-4.23/apis/listNics.html
- CloudStack listNetworks: https://cloudstack.apache.org/api/apidocs-4.23/apis/listNetworks.html
- CloudStack listSecurityGroups: https://cloudstack.apache.org/api/apidocs-4.23/apis/listSecurityGroups.html
- CloudStack listPortForwardingRules: https://cloudstack.apache.org/api/apidocs-4.23/apis/listPortForwardingRules.html
- CloudStack listRouters: https://cloudstack.apache.org/api/apidocs-4.23/apis/listRouters.html
- CloudStack restartNetwork: https://cloudstack.apache.org/api/apidocs-4.23/apis/restartNetwork.html
- Apache CloudMonkey repository and getting started guide: https://github.com/apache/cloudstack-cloudmonkey and https://github.com/apache/cloudstack-cloudmonkey/wiki/Getting-Started
- OpenSSH server and client manuals: https://man.openbsd.org/sshd_config, https://man.openbsd.org/ssh, and https://man.openbsd.org/ssh_config
- OpenBSD netcat manual: https://man.openbsd.org/nc
- libvirt virsh manual: https://libvirt.org/manpages/virsh.html#domiflist
- Linux iproute2 manuals: https://man7.org/linux/man-pages/man8/ip.8.html, https://man7.org/linux/man-pages/man8/ss.8.html, and https://man7.org/linux/man-pages/man8/bridge.8.html
- tcpdump and Linux packet socket manuals: https://man7.org/linux/man-pages/man8/tcpdump.8.html and https://man7.org/linux/man-pages/man7/packet.7.html
- iputils ping manual: https://man7.org/linux/man-pages/man8/ping.8.html
- systemd command manuals: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html and https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- curl command manual: https://curl.se/docs/manpage.html

## Issues Found
1. **Console access was treated as proof of completed OS boot.** A console connection verifies the hypervisor console path and can show an OS that is still booting or has failed. Corrected the introduction and conclusion to require confirming boot completion on the console.
2. **Gateway checks unconditionally required ARP and ping.** ARP applies to IPv4, IPv6 uses Neighbor Discovery, and a functioning gateway may filter ICMP. Qualified the checklist accordingly.
3. **A TCP connection was used to certify the entire CloudStack network.** Changed the statement to successful progress to SSH authentication verifying the particular tested path. This avoids ruling out unrelated network failures based on a TCP handshake.
4. **A packet seen at the host TAP interface conclusively blamed the guest.** Host capture visibility alone does not establish successful delivery through the virtual NIC. Changed the diagnosis to inspect the guest and virtual NIC, and confirm receipt inside the guest before assigning fault.
5. **Run Diagnostics and Get Diagnostics were presented as interchangeable.** The former executes ping, traceroute, or arping; the latter retrieves diagnostic files. Corrected their separate roles and described dnsmasq configuration and logs accurately.
6. **Inbound policy assumed a standalone isolated network.** Qualified the firewall check to include the tier network ACL used by VPC networks.
7. **Host networking was required to be literally identical.** Corrected this to consistent bridge mapping, VLAN connectivity, and supported path MTU, with the required VLAN present on each trunk. Physical trunk configurations need not be identical in every respect.
8. **Network restart was suggested for any stale CloudStack rules.** Restricted that recommendation to VR-backed network rules; restarting the network is not a general method for repairing host security-group rules.
9. **Final verification always used port 22.** Earlier instructions allow a different public forwarding port. Updated netcat and SSH verification to use an explicit SSH_PORT placeholder and explained when to use the public port or private port 22. Also clarified the authentication and host-key prerequisites of BatchMode=yes.

## Review Notes
- Confirmed that the published 4.23 listPortForwardingRules request accepts networkid and listall but has no virtualmachineid request filter; virtualmachineid is a response field suitable for local filtering. The other CloudMonkey command parameters match the API reference.
- Confirmed default security-group ingress/egress behavior, immediate application of rule changes to running instances, and the documented stopped-instance requirement for changing group membership.
- Reviewed shell syntax and documented options for the guest, host, and client commands. All fenced Bash blocks pass bash -n after corrections. The examples contain deployment-specific placeholders and require the named utilities, suitable privileges, and a configured CloudMonkey connection.
- This is documentation and static validation, not an integration test. No CloudStack environment was available, and no network changes, migrations, restarts, or packet captures were performed.
- The commands primarily illustrate Linux/systemd, Linux bridges, IPv4 DHCP, and conventional VR-backed NAT. Open vSwitch and alternative network providers require their corresponding inspection tools. A failed HTTPS probe can also reflect DNS, proxy, TLS, or egress policy; it does not independently locate a network fault.
- The original documentation links point to the intended resources. The latest documentation is mutable and returned both 4.23 and 4.22.1 page labels during review; the explicit API claim was checked against the versioned 4.23 reference. Some pages failed through the browser retrieval tool and were successfully checked by direct HTTPS retrieval instead.
- Preserved the post’s section structure and limited README changes to technical corrections.
