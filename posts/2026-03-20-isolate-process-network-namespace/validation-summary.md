# Validation Summary: How to Isolate a Process in a Network Namespace

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux network namespaces
- `iproute2` (`ip netns`)
- `unshare`
- `nsenter`
- Linux capabilities (`CAP_SYS_ADMIN`, `CAP_NET_ADMIN`)
- Bash

## Sources Consulted
- `ip-netns(8)` man page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `unshare(1)` man page: https://man7.org/linux/man-pages/man1/unshare.1.html
- `nsenter(1)` man page: https://man7.org/linux/man-pages/man1/nsenter.1.html
- `network_namespaces(7)` man page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- `capabilities(7)` man page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Local CLI help output for `ip netns`, `unshare`, and `nsenter`

## Issues Found
- The prerequisites listed only `CAP_SYS_ADMIN`, but the examples also bring interfaces up with `ip link set lo up`, which is a network-administration operation. Updated the prerequisite to mention both `CAP_SYS_ADMIN` and `CAP_NET_ADMIN`.
- The named-namespace example implied an external `curl` from a namespace that only had loopback configured. Updated the example to show that external connectivity fails until an interface or route is added.
- The section title "Move an Existing Process to a Namespace" was misleading because the body correctly states that a running process cannot be moved directly this way. Renamed the heading to "Enter an Existing Process's Namespace" to match what `nsenter` actually does.
- The "no network access" example claimed the namespace had only loopback, but it never brought `lo` up. Added `ip netns exec no-net ip link set lo up` so the example matches the explanation.
- The wrapper script used `PROGRAM="$@"` and then expanded it unquoted with `ip netns exec "$NS" $PROGRAM`, which breaks argument preservation and shell quoting. Replaced that with `ip netns exec "$NS" "$@"`.

## Review Notes
- `unshare --net` creates a new network namespace and runs the requested program in it, but unprivileged use still depends on the host's namespace and capability configuration.
- `ip netns exec` works with named namespaces and also applies the `/etc/netns/NAME/` configuration convention for namespace-unaware applications, as documented in `ip-netns(8)`.
