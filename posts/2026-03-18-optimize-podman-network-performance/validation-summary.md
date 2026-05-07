# Validation Summary: How to Optimize Podman Network Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Podman networking modes
- Rootless networking with slirp4netns and pasta
- Podman bridge networks
- DNS resolver configuration
- Linux MTU and TCP sysctl tuning
- Podman pods and port publishing
- Network benchmarking and monitoring tools

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-network` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman-network-create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Linux `resolv.conf(5)` manual page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The opening performance claim used specific 10x throughput and 5x latency figures without a workload, Podman version, host setup, or benchmark source. I changed it to a qualitative statement about substantial throughput and latency improvements.
- The introduction said the default bridge network adds NAT and bridge overhead without qualifying rootful/rootless behavior. I changed it to "default rootful bridge networking" because current Podman rootless networking is configured separately.
- The article implied rootless Podman generally defaults to slirp4netns. Current Podman documentation says `default_rootless_network_cmd` can be set to `pasta` or `slirp4netns`, with `pasta` as the default in current releases. I narrowed the wording to older installations or custom configurations still using slirp4netns.
- The DNS example used `--dns-search=""` to disable search domains. Podman documents `--dns-search=.` for this behavior, so I corrected the command.
- The local DNS cache example pointed containers at `10.88.0.2`, which depends on an unstable default bridge container address. I changed the example to create a dedicated network and assign a static DNS cache IP.
- The port publishing section said standard publishing goes through iptables/nftables. That is only accurate for bridge/NAT-style publishing and not for all rootless modes, so I changed the comment to specify bridge port publishing.
- The conclusion overstated that configuration can eliminate container network overhead while retaining isolation benefits. I changed it to say configuration can reduce overhead and provide near-native performance where isolation requirements allow it.

## Review Notes
- Podman was not installed in the local workspace, so CLI validation was performed against upstream Podman documentation rather than local `--help` output.
- The post includes approximate performance ranges for network modes. These are reasonable as directional guidance, but actual performance is workload-, kernel-, backend-, and version-dependent, so production guidance should continue to recommend benchmarking in the target environment.
