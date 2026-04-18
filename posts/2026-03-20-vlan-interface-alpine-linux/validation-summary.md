# Validation Summary: How to Configure a VLAN Interface on Alpine Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Alpine Linux
- ifupdown-ng / busybox ifupdown
- 802.1Q VLAN tagging (8021q kernel module)
- `/etc/network/interfaces`
- OpenRC (`rc-service`)
- `iproute2` (`ip link`, `ip addr`)
- Docker macvlan driver

## Sources Consulted
- Alpine Linux Wiki — Configure Networking: https://wiki.alpinelinux.org/wiki/Configure_Networking
- Alpine Linux Wiki — VLAN: https://wiki.alpinelinux.org/wiki/Vlan
- Alpine package index (`vlan` package): https://pkgs.alpinelinux.org/package/edge/main/x86_64/vlan
- ifupdown-ng documentation: https://github.com/ifupdown-ng/ifupdown-ng
- iproute2 `ip-link(8)` man page
- Docker macvlan network driver docs: https://docs.docker.com/network/drivers/macvlan/
- Linux kernel `8021q` module documentation

## Issues Found

1. **Incorrect default networking stack.** The post originally stated "Alpine Linux uses a busybox-based `/etc/network/interfaces`". Modern Alpine Linux (since Alpine 3.17+) uses `ifupdown-ng` by default, not busybox ifupdown. Updated the intro to reflect this.

2. **Harmful recommendation to install `vlan` package.** The post recommended `apk add vlan`, but per the Alpine Linux Wiki, installing the `vlan` package on a system running `ifupdown-ng` (the default) will remove `ifupdown-ng` and break networking. Additionally, the `vlan` package contains only four ifupdown pre-up/post-down shell scripts — it does NOT include a `vconfig` binary, contrary to the original comment. Removed the `apk add vlan` step and added a caution note.

3. **Grammatical/technical error in Key Takeaways.** The bullet "Use `vlan-raw-device` is not an Alpine keyword..." was both grammatically broken and technically misleading. `vlan-raw-device` IS supported by Alpine's ifupdown-ng (it's the canonical form per the wiki), alongside the `eth0.10` shorthand. Rewrote the bullet to clarify both forms are supported.

4. **Updated Key Takeaways** to reflect the ifupdown-ng default and drop the now-removed `vlan` package recommendation.

## Review Notes
- The `modprobe 8021q` + `/etc/modules` persistence steps are correct for Alpine's OpenRC `modules` service.
- `rc-service networking restart`, `ifup eth0.10`, and all `ip link`/`ip addr` commands are syntactically correct.
- The Docker macvlan example with `-o parent=eth0.10` is valid per current Docker docs.
- `cat /proc/net/vlan/config` works only when the `8021q` module is loaded and at least one VLAN interface exists; otherwise the file does not exist. This is a minor caveat but acceptable in context.
- For users who really need to run busybox ifupdown (e.g., minimal custom images), the original `apk add vlan` approach would still apply — but that's an edge case, not the default Alpine experience the post is aimed at.
