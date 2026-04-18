# Validation Summary: How to Troubleshoot IPv6 Storage Connectivity Issues

## Status
validated

## Post Type
Technical Guide / Troubleshooting Tutorial

## Technologies Covered
- IPv6 networking (ping6, traceroute6, ip -6, ss, nc, tcpdump)
- ICMPv6 / NDP / PMTUD (RFC 4443, RFC 4861, RFC 4890)
- ip6tables firewall rules
- NFS (v3 rpcbind, v4; showmount, rpcinfo, mount options)
- iSCSI (iscsiadm, open-iscsi)
- Ceph (mon v1/v2, osd; ceph CLI)
- SMB/CIFS
- Linux kernel diagnostics (dmesg, journalctl)

## Sources Consulted
- RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification (40-byte header)
- RFC 4443 — ICMPv6 (Type 2 = Packet Too Big, Type 135/136 NS/NA)
- RFC 4890 — Recommendations for Filtering ICMPv6 Messages in Firewalls
- Linux iputils ping(8) / ping6(8) manual (-s, -M do flags)
- tcpdump/pcap-filter(7) syntax (icmp6 expression)
- nfs(5) manual (rsize/wsize mount options)
- open-iscsi iscsiadm(8) manual (-m discovery, -m session -P, --op=update)
- Ceph documentation — Mon v1 port 6789 / msgr2 v2 port 3300
- IANA service port registry — NFS 2049, rpcbind 111, iSCSI 3260, SMB 445

## Issues Found
- **Incorrect jumbo-frame ping6 payload size**: The post had `ping6 -s 8972` for a 9000-byte jumbo MTU with the comment "Jumbo frame (9000 - overhead)". The value 8972 is the IPv4 math (9000 − 20-byte IPv4 header − 8-byte ICMP header). For IPv6 the overhead is 40 (IPv6 header) + 8 (ICMPv6) = 48, so the correct maximum unfragmented payload at MTU 9000 is **8952**. Updated the value and clarified the overhead comment (also clarified the 1400 "standard MTU" comment to reflect the actual 48-byte IPv6+ICMPv6 overhead).

## Review Notes
- Port numbers (NFS 2049, rpcbind 111, iSCSI 3260, Ceph mon 6789 / msgr2 3300, SMB 445) are correct per IANA/vendor docs.
- The `icmp6 and icmp6[0] == 2` tcpdump filter is valid; an equivalent portable form is `icmp6 and ip6[40] == 2`.
- `ping6` is the legacy command name; on newer iputils it is commonly a symlink/alias to `ping -6`. Both still work on current major distributions, so no change required.
- The ICMPv6 "must allow" list (types 2, 135, 136) is a reasonable minimum for storage troubleshooting. RFC 4890 lists additional types (1, 3, 4, 128/129, 133/134) that are typically also required for correct IPv6 operation; the post presents this as the storage-critical subset, which is acceptable.
- `ss -tlnp | grep -E "2049|111|3260|6789|445"` can theoretically match unrelated numeric matches (e.g., PIDs); anchoring with `:` prefixes would be more precise but the current form is acceptable for diagnostic use.
- The introduction's claim that MTU mismatches cause "silent data corruption in NFS" is somewhat strong — MTU issues more commonly produce hangs/timeouts/performance loss than data integrity loss (TCP/NFSv4 handles segmentation). Left unchanged as it is a rhetorical framing, not a technical command error.
