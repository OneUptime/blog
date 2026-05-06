# Validation Summary: How to Use ss and netstat to Check IPv4 Listening Ports on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking tools
- `ss`
- `netstat`
- IPv4 sockets
- TCP
- UDP

## Sources Consulted
- `ss(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- `netstat(8)` Linux manual page: https://man7.org/linux/man-pages/man8/netstat.8.html
- Local command help output from `ss --help`
- Local command help output from `netstat --help`

## Issues Found
- The port-80 example used `grep ":80"`, which can produce false positives such as matching `:8080`. I changed it to `ss -4 -H -t -l -n sport = :80` and added a process-aware variant using `-p`, because `ss` documents `sport` and `dport` filters explicitly.
- The destination-port example used `dst :5432`. While `ss` accepts host-based filtering, `dport = :5432` is the direct documented predicate for matching a destination port, so I changed the example to use `dport`.
- The `netstat -a` description said it showed `listening + established`, but the `netstat(8)` manual says `-a` shows both listening and non-listening sockets. I corrected the description to avoid understating what the command returns.
- The port-443 one-liner used `grep -q ":443"`, which can also match unrelated ports such as `1443` or `4430`. I changed it to `ss -4 -H -t -l -n sport = :443 | grep -q .` so it performs an exact port check without matching the header row.
- The conclusion recommended `grep` for filtering specific ports. I updated it to recommend `sport = :port` filters, which is the precise documented approach in `ss`.

## Review Notes
- `netstat` remains usable, but its manual page describes it as mostly obsolete and points users to `ss` as the replacement.
- `netstat` may not be installed by default on newer Linux distributions because it is typically provided by the separate `net-tools` package.
