# Validation Summary: SSH Tunnel Opens but the Application Cannot Connect: Debug Bind Addresses, `localhost`, IPv4/IPv6, and the Final Hop

## Status

validated

## Post Type

Technical troubleshooting guide with SSH, Linux socket inspection, and HTTPS diagnostic commands.

## Technologies Covered

- OpenSSH static local (`-L`) and remote (`-R`) TCP forwarding, connection sharing, and ProxyJump.
- OpenSSH client configuration, server forwarding policy, and authorized-key restrictions.
- TCP, IPv4/IPv6, DNS resolution, loopback addresses, and Linux network namespaces.
- iproute2 `ss`, firewall rejection, and source NAT.
- curl, HTTPS, TLS certificate verification, SNI, and HTTP application identity.

## Sources Consulted

- [OpenBSD 7.6 ssh(1)](https://man.openbsd.org/OpenBSD-7.6/ssh.1): forwarding directions, IPv6 syntax, jump hosts, configuration inspection, and CLI options.
- [OpenBSD 7.6 ssh_config(5)](https://man.openbsd.org/OpenBSD-7.6/ssh_config.5): ControlPath, Match exec, ForkAfterAuthentication, and ExitOnForwardFailure.
- [OpenBSD 7.6 sshd_config(5)](https://man.openbsd.org/OpenBSD-7.6/sshd_config.5): AddressFamily, GatewayPorts, AllowTcpForwarding, DisableForwarding, and PermitOpen.
- [OpenBSD 7.6 sshd(8)](https://man.openbsd.org/OpenBSD-7.6/sshd.8#AUTHORIZED_KEYS_FILE_FORMAT): authorized-key forwarding restrictions.
- [OpenSSH portable 9.9p1 channels.c](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/channels.c): listener acceptance, channel creation, destination resolution, and outgoing socket handling; inspected the raw tagged source.
- [OpenSSH portable 9.9p1 sshd-session.c](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/sshd-session.c): channel address-family initialization; inspected the raw tagged source.
- [OpenSSH portable 9.9p1 serverloop.c](https://github.com/openssh/openssh-portable/blob/V_9_9_P1/serverloop.c): direct TCP forwarding authorization; inspected the raw tagged source.
- [iproute2 6.11.0 ss(8)](https://raw.githubusercontent.com/iproute2/iproute2/v6.11.0/man/man8/ss.8): listening, TCP, numeric, process-display, and source-port filter syntax.
- [Linux network_namespaces(7)](https://man7.org/linux/man-pages/man7/network_namespaces.7.html): isolation of network devices, protocol stacks, routes, and sockets.
- [Linux connect(2)](https://man7.org/linux/man-pages/man2/connect.2.html): connection refusal and timeout interpretation.
- [RFC 9293, TCP](https://www.rfc-editor.org/rfc/rfc9293.html#section-3.10.7.3): reset handling during connection establishment.
- [nftables manual](https://netfilter.org/projects/nftables/manpage.html): active rejection using TCP reset.
- [nftables NAT documentation](https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29): source address translation and masquerading.
- [curl command-line manual](https://curl.se/docs/manpage.html): connect-to, timeout scopes, proxy bypass, default configuration suppression, output formatting, and HTTP error handling.
- [curl option history](https://curl.se/docs/optionswhen.html): connect-to introduced in 7.49.0.
- [curl certificate verification](https://curl.se/docs/sslcerts.html): URL-hostname verification and trusted CA configuration.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The post is technically relevant and its explicit version scope is appropriate; the named historical versions are not presented as the latest releases.
- Confirmed the listener and final-hop locations for both forwarding directions, including the ultimate SSH server when ProxyJump is used. Server GatewayPorts can alter remote binding.
- Confirmed that forwarding setup success and listener TCP acceptance do not prove backend connectivity. In the tagged source, accept() precedes the forwarding-channel request.
- Confirmed that the server initializes its channel address family from its own configuration and uses it for destination resolution. Client `ssh -4` therefore does not force the server-side local-forward destination to IPv4.
- Confirmed the distinction between login authorization and forwarding permission, including literal PermitOpen matching without DNS lookups.
- Namespace, loopback, backend source-address, NAT, refusal, and timeout explanations are consistent with the cited sources.
- The curl example preserves application hostname identity while redirecting the TCP connection. Its timeout explanations, proxy bypass, first-position `-q`, CA guidance, and warning that HTTP error statuses can still yield exit code zero are correct.
- All three Bash code blocks passed `bash -n`. An isolated configuration-only check using installed OpenSSH 10.3p1 accepted both local-forward examples and the reverse-forward example. This supplemental parser check did not connect to any SSH host or evaluate user SSH configuration; version-specific behavior was reviewed against the 9.9p1 source and OpenBSD 7.6 manuals.
- Linux `ss` syntax was verified against the pinned manual, not executed on this macOS host. No end-to-end SSH/backend or TLS health test was performed because the post uses illustrative endpoints and provides no live test deployment. Actual success depends on the reader's routing, permissions, service, and certificates.
- The cited technical documentation URLs resolved to the intended resources, with the nftables NAT URL undergoing normal URL normalization.
