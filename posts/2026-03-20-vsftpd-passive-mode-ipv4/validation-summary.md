# Validation Summary: How to Enable vsftpd Passive Mode with IPv4 Address Configuration

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon)
- FTP protocol (active vs passive mode, PASV/PORT)
- iptables (INPUT rules, NAT PREROUTING, DNAT)
- ufw (Uncomplicated Firewall)
- systemd (`systemctl restart vsftpd`)
- `ss` socket statistics tool
- `ftp`, `lftp`, `curl` FTP clients

## Sources Consulted
- vsftpd.conf(5) man page — https://manpages.debian.org/unstable/vsftpd/vsftpd.conf.5.en.html
- vsftpd configuration reference — https://security.appspot.com/vsftpd/vsftpd_conf.html
- RFC 959 (File Transfer Protocol) — control port 21, active-mode data port 20 behavior
- netfilter NAT-HOWTO — https://www.netfilter.org/documentation/HOWTO/NAT-HOWTO-6.html (DNAT port-range mapping)
- curl manpage — https://curl.se/docs/manpage.html (FTP passive/EPSV default behavior)

## Issues Found
1. **Misleading `port_enable=YES` comment (Basic Passive Mode Configuration section).** The original snippet set `port_enable=YES` with the comment `# Promote PASV over PORT (active mode)`. This is technically backwards: `port_enable=YES` *enables* PORT (active) mode — it does not promote PASV over it. Per vsftpd.conf(5), setting `port_enable=NO` is what disallows PORT/active data connections. Changed the example to `port_enable=NO` with an accurate comment explaining that this forces passive-only operation, and noted that the default is YES. This matches the author's apparent intent (promoting passive mode).

2. **Inaccurate phrasing in Introduction.** The sentence "Active mode requires the server to initiate a data connection back to the client, which breaks through NAT and firewalls" is ambiguous/backwards — "breaks through" colloquially means "penetrates," but the intent was that active mode *fails* because of NAT/firewalls. Reworded to "which typically fails through NAT and firewalls" to make the meaning clear.

## Review Notes
- `pasv_addr_resolve=YES` is valid (vsftpd 2.1.0+; widely available in 3.x). The post's "(vsftpd 3.x+)" annotation is a reasonable, conservative lower bound.
- `allow_writeable_chroot=YES` was added in vsftpd 3.0.0 to address the "refusing to run with writable root inside chroot()" error introduced by the 2.3.5 chroot security fix — correct and widely used.
- PASV port calculation `117*256 + 49 = 30001` is arithmetically correct.
- `ftp -p` for passive mode is correct on BSD/GNU inetutils `ftp`; on many distros passive is already the default, but `-p` explicitly forces it.
- `curl` defaults to EPSV then falls back to PASV for FTP, so the "defaults to passive" claim is accurate.
- The iptables DNAT port-range mapping (`--dport 30000:31000 -j DNAT --to-destination 10.0.0.5:30000-31000`) preserves a 1:1 port mapping when the source and destination ranges are equal size — correct per the netfilter NAT-HOWTO.
- The example uses RFC 5737 documentation IP `203.0.113.10`, which is appropriate for a tutorial.
- Future improvement: the post could mention FTPS (`ssl_enable=YES`, `rsa_cert_file`, etc.) for production use, since plain FTP transmits credentials in cleartext. The `ssl_enable=NO` line hints at this but does not elaborate.
