# Validation Summary: How to Configure iSCSI with IPv6 Targets

## Status
validated

## Post Type
Guide

## Technologies Covered
- iSCSI
- IPv6
- Linux LIO target (`targetcli-fb` / `rtslib-fb`)
- Open-iSCSI (`iscsiadm`, `iscsid.conf`)
- systemd
- `ip6tables`
- ext4 and `/etc/fstab`

## Sources Consulted
- Open-iSCSI `targetcli` man page: https://github.com/open-iscsi/targetcli-fb/blob/master/targetcli.8
- Open-iSCSI `rtslib-fb` systemd unit (`target.service`): https://github.com/open-iscsi/rtslib-fb/blob/master/systemd/target.service
- Debian `rtslib-fb-targetctl.service` unit: https://sources.debian.org/src/python-rtslib-fb/2.1.76-3/debian/python3-rtslib-fb.rtslib-fb-targetctl.service/
- Open-iSCSI upstream README: https://github.com/open-iscsi/open-iscsi/blob/master/README
- Open-iSCSI sample `iscsid.conf`: https://github.com/open-iscsi/open-iscsi/blob/master/etc/iscsid.conf
- systemd `udev-builtin-path_id.c` iSCSI path construction: https://github.com/systemd/systemd/blob/main/src/udev/udev-builtin-path_id.c
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291

## Issues Found
- The post described `/iscsi/.../tpg1` as creating a TPG, but upstream `targetcli` creates `tpg1` automatically when the target is created. I changed the text to reflect that this step moves into the default TPG.
- The original portal commands attempted to add new IPv6 portals without accounting for the default `[::0]:3260` portal that `targetcli` creates automatically. I changed the example to delete the default wildcard portal before creating the specific IPv6 portal, which avoids an overlapping listener configuration.
- The post offered a file-backed backstore as an alternative, but the later LUN command only mapped the block backstore. I added the matching `fileio` LUN example so both variants are technically complete.
- The service section referred to enabling the target service imprecisely. I changed it to the restore/persistence units actually used to reload saved LIO configuration on boot: `rtslib-fb-targetctl.service` on Debian/Ubuntu and `target.service` on RHEL/CentOS.
- The firewall example used `2001:db8:storage::/48`, which is not a valid IPv6 prefix because `storage` is not a hexadecimal hextet. I replaced it with the valid documentation prefix `2001:db8:100::/48`.
- The firewall persistence command was written as if it were generic. I clarified that `ip6tables-save > /etc/ip6tables/rules.v6` is the Debian/Ubuntu `iptables-persistent` style.
- The `/etc/fstab` section formatted `/dev/sdc` but then mounted a `-part1` `by-path` device, which was inconsistent. It also used bracketed IPv6 notation in `/dev/disk/by-path`, but systemd's iSCSI path construction uses `ip-<address>:<port>-iscsi-...` without brackets. I replaced the example with a consistent IPv6 iSCSI `by-path` device and used the same path for `mkfs.ext4` and `/etc/fstab`.

## Review Notes
- The `ip6tables` commands are still valid, but some current distributions default to `nftables` or `firewalld` instead of persisting legacy iptables rules directly.
- The post configures CHAP for normal iSCSI sessions. If authenticated SendTargets discovery is also required, Open-iSCSI and LIO use separate discovery-auth settings.
