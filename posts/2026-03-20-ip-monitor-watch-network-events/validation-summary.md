# Validation Summary: How to Use ip monitor to Watch Network Events in Real Time

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `iproute2`
- `ip monitor`
- RTNETLINK
- NetworkManager (`nmcli monitor`)

## Sources Consulted
- `ip-monitor(8)` upstream-derived manual page: https://man7.org/linux/man-pages/man8/ip-monitor.8.html
- `ip(8)` upstream-derived manual page: https://man7.org/linux/man-pages/man8/ip.8.html
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Local command help in the review environment: `ip monitor help`, `man ip-monitor`

## Issues Found
- The sample output in the "Monitor All Network Events" section used `[LINK]`, `[ADDR]`, and `[ROUTE]` prefixes even though those labels are only shown when the `label` option is used. I replaced the sample with unlabeled output consistent with plain `ip monitor`.
- The `ip monitor link` use case said it would show "new addresses". Link monitoring reports link-state changes; address events belong to `ip monitor address`. I removed the address claim from that example.
- The `ip monitor` and `nmcli monitor` comparison overstated the scope of `ip monitor` and described `nmcli monitor` too narrowly. I reworded the section to match the documentation: `ip monitor` watches kernel RTNETLINK events, while `nmcli monitor` watches NetworkManager activity.
- The introduction and conclusion used broader language than the documentation supports. I tightened `netlink` to `RTNETLINK`, clarified neighbor-table terminology, and changed "the lowest-level" to "a low-level" network monitoring tool.
- The file-logging example wrote to `/var/log/ip-monitor.log`, which commonly requires elevated write permissions. I changed it to `~/ip-monitor.log` so the example works as shown for a typical user shell.

## Review Notes
- `ip monitor` supports more object types than the post lists, including `rule`, `stats`, `nsid`, and `nexthop`, but the subset covered in the article is valid for an introductory guide.
- `-timestamp` is valid and prints timestamps for monitor output; `-ts` is also available if the post ever wants to show the short inline timestamp format.
