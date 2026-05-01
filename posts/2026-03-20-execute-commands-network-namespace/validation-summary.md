# Validation Summary: How to Execute Commands Inside a Network Namespace

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux network namespaces
- `iproute2` and `ip netns`
- `nsenter`
- Bash scripting
- Linux network diagnostic tools (`ip`, `ping`, `ss`, `tcpdump`, `curl`)

## Sources Consulted
- `ip-netns(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `network_namespaces(7)` Linux manual page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- `nsenter(1)` Linux manual page: https://man7.org/linux/man-pages/man1/nsenter.1.html
- Local CLI help: `ip netns help`
- Local CLI help: `nsenter --help`

## Issues Found
- The heredoc example under "Script Multiple Commands Inside a Namespace" used `<< 'EOF'` while also referencing `$NS` inside the heredoc body. With a quoted heredoc delimiter, the outer shell does not expand `$NS`, and the inner `bash` process did not receive an `NS` variable, so the success message would print an empty namespace name. I changed the command to `ip netns exec "$NS" env NS="$NS" bash << 'EOF'` so the inner shell receives `NS` and the example works as described.

## Review Notes
- Per `ip-netns(8)`, `ip netns exec` also creates a mount namespace and bind-mounts files from `/etc/netns/<name>/` into `/etc` for namespace-unaware applications. That behavior supports the `/etc/resolv.conf` example in the post.
- The examples assume supporting tools such as `bash`, `nslookup`, `ss`, `tcpdump`, `curl`, `sudo`, and `python3` are installed in addition to `iproute2`.
