# Validation Summary: How to Configure IPv6 for Storage Networks in Data Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and flow labels
- iSCSI with `open-iscsi` and `iscsiadm`
- NFSv4 with `nfs-utils`, `/etc/exports`, and `/etc/fstab`
- NVMe over Fabrics TCP with Linux `nvmet` configfs and `nvme-cli`
- Linux IPv6 firewalling with `ip6tables`

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291
- RFC 5952: A Recommendation for IPv6 Address Text Representation - https://www.rfc-editor.org/rfc/rfc5952
- RFC 6438: Using the IPv6 Flow Label for Equal Cost Multipath Routing and Link Aggregation in Tunnels - https://www.rfc-editor.org/rfc/rfc6438
- Ubuntu `iscsiadm(8)` man page - https://manpages.ubuntu.com/manpages/questing/en/man8/iscsiadm.8.html
- Ubuntu `exports(5)` man page - https://manpages.ubuntu.com/manpages/focal/en/man5/exports.5.html
- Ubuntu `nfs(5)` man page - https://manpages.ubuntu.com/manpages/focal/en/man5/nfs.5.html
- Ubuntu `nfs.systemd(7)` man page - https://manpages.ubuntu.com/manpages/questing/man7/nfs.systemd.7.html
- Ubuntu `nvme-discover(1)` man page - https://manpages.ubuntu.com/manpages/questing/man1/nvme-discover.1.html
- Ubuntu `nvme-connect(1)` man page - https://manpages.ubuntu.com/manpages/questing/man1/nvme-connect.1.html
- Linux kernel NVMe target configfs implementation - https://raw.githubusercontent.com/torvalds/linux/master/drivers/nvme/target/configfs.c

## Issues Found
- The post used invalid IPv6 literals such as `stor`, `app`, `backup`, `compute`, and `corp`, which are not legal hexadecimal hextets. I replaced them with valid documentation-prefix examples under `2001:db8::/32` and normalized the subnet examples accordingly.
- The `/etc/exports` single-host example incorrectly wrapped the IPv6 address in square brackets. I removed the brackets and corrected the NFS export client examples to match `exports(5)`, which explicitly forbids bracketed IPv6 literals in `/etc/exports`.
- The NFS client `fstab` example used the deprecated `nfs4` filesystem type and the ignored `intr` option. I changed it to `nfs` with `vers=4.2` and removed `intr`, which matches current `nfs(5)` guidance.
- The comment `NFSv4 with Kerberos over IPv6` was overstated because the snippet only set the `Domain` in `idmapd.conf`. I relabeled it as NFSv4 identity mapping so the text matches what the configuration actually does.
- The NVMe-oF discovery example incorrectly passed the target subsystem NQN to `nvme discover` via `-q`, but `nvme-discover(1)` defines `-q` as the host NQN. I removed that incorrect flag from discovery and kept `nvme connect -n ...` for the subsystem NQN.
- The firewall section claimed to allow `TCP/UDP 2049, portmap 111` for NFS, but the rules shown did not match that description and the rest of the post is using NFSv4-style examples. I updated the example to NFSv4 over TCP 2049 and clarified that the rule set assumes an existing default-drop policy rather than blocking everything by itself.
- The introduction overstated the flow-label benefit. I changed it to say IPv6 can participate in ECMP/LAG hashing when the network is configured to use the IPv6 flow label, which is a more accurate statement of RFC behavior.

## Review Notes
- `attr_allow_any_host=1` and `no_root_squash` are functional examples, but they are permissive choices for production storage networks and should usually be tightened.
- The firewall examples use `ip6tables`, which is still valid, though many current Linux distributions prefer nftables-compatible workflows.
