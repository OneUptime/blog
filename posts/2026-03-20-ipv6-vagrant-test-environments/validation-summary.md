# Validation Summary: How to Create IPv6 Test Environments with Vagrant

## Status
validated

## Post Type
Guide

## Technologies Covered
- Vagrant
- VirtualBox
- IPv6
- Ubuntu 22.04 (`ubuntu/jammy64`)
- FRRouting (FRR)
- Bash shell provisioners

## Sources Consulted
- Vagrant private network documentation: https://developer.hashicorp.com/vagrant/docs/networking/private_network
- Vagrant VirtualBox networking documentation: https://developer.hashicorp.com/vagrant/docs/providers/virtualbox/networking
- Vagrant shell provisioner documentation: https://developer.hashicorp.com/vagrant/docs/provisioning/shell
- Vagrant provisioning behavior documentation: https://developer.hashicorp.com/vagrant/docs/provisioning/basic_usage
- Vagrant CLI references for `ssh`, `provision`, `suspend`, `resume`, and `destroy`: https://developer.hashicorp.com/vagrant/docs/cli/ssh , https://developer.hashicorp.com/vagrant/docs/cli/provision , https://developer.hashicorp.com/vagrant/docs/cli/suspend , https://developer.hashicorp.com/vagrant/docs/cli/resume , https://developer.hashicorp.com/vagrant/docs/cli/destroy
- Oracle VirtualBox manual, Chapter 6 "Virtual Networking": https://www.virtualbox.org/manual/ch06.html
- FRR Debian repository instructions: https://deb.frrouting.org/
- FRR OSPFv3 documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- Ubuntu `apt-key` man page: https://manpages.ubuntu.com/manpages/jammy/man8/apt-key.8.html
- `ping(8)` Linux man page: https://man7.org/linux/man-pages/man8/ping.8.html
- `pcap-filter(7)` Linux man page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- RFC 3849, IPv6 documentation prefix `2001:db8::/32`: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The single-VM example tried to `ping6` an unconfigured `2001:db8:1::1` "gateway" even though the shown `private_network` setup does not define one. I replaced that check with `ip -6 route show`, which matches what Vagrant actually configures.
- The router lab used `ip -6 addr add` and `>> /etc/sysctl.d/...`, which makes reprovisioning noisy and non-idempotent despite the later `vagrant provision r1` example. I made the loopback assignment tolerant of reruns and changed the sysctl persistence write to a deterministic overwrite.
- The FRR installation snippet used the deprecated `apt-key add` flow. I updated it to FRR's current keyring-plus-`signed-by` repository format and installed `curl`, `ca-certificates`, and `lsb-release` before using them.
- The reusable Bash provisioner used `ping6`, which modern iputils has folded into `ping -6`. I updated the command and also persisted IPv6 forwarding there so the script matches the article's stated automation goal.
- The connectivity test section contained commands that would not work with the published lab: `r1` could not reach `r3` with no routes configured, `vtysh -c 'show ipv6 ospf6 neighbor'` on `r2` depended on FRR and OSPFv3 configuration that the post never set up, and the `tcpdump` example relied on tooling and filters not established by the post. I replaced those with direct neighbor-reachability tests and route inspection that work with the shown Vagrantfile.
- The conclusion referred readers to VirtualBox host-only adapters even though the examples use `virtualbox__intnet`, which is VirtualBox internal networking. I corrected that explanation.
- The lifecycle note for `vagrant suspend` said it "saves RAM." I corrected the phrasing to reflect Vagrant's documented behavior: it preserves VM state and frees host RAM while using disk space.

## Review Notes
- Vagrant's IPv6 private-network documentation recommends ULA space for live environments, but the post's use of `2001:db8::/32` is still appropriate in documentation because RFC 3849 reserves it for examples.
- `virtualbox__intnet` is VirtualBox-specific. The corrected post is accurate for the tagged VirtualBox workflow, but readers using a different Vagrant provider would need provider-specific networking changes.
- The post now installs FRR with a current repository setup, but it still does not configure a dynamic routing protocol. That is technically fine after the verification section was narrowed to checks the published lab actually supports.
