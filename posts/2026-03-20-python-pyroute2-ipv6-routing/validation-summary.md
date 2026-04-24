# Validation Summary: How to Manage IPv6 Routing with Python pyroute2

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Python
- pyroute2
- Linux rtnetlink / netlink sockets
- IPv6 addressing
- IPv6 routing
- Linux capabilities (`CAP_NET_ADMIN`)

## Sources Consulted
- pyroute2 RTNL classes: https://docs.pyroute2.org/iproute_intro.html
- pyroute2 Linux RTNL API: https://docs.pyroute2.org/iproute_linux.html
- pyroute2 general docs: https://docs.pyroute2.org/general.html
- pyroute2 NDB intro: https://docs.pyroute2.org/ndb.html
- pyroute2 NDB address management: https://docs.pyroute2.org/ndb_addresses.html
- pyroute2 NDB routes management: https://docs.pyroute2.org/ndb_routes.html
- pyroute2 documentation index (`IPDB` listed under Deprecated): https://docs.pyroute2.org/index.html
- Linux capabilities manual (`CAP_NET_ADMIN`): https://man7.org/linux/man-pages/man7/capabilities.7.html
- Linux rtnetlink manual: https://man7.org/linux/man-pages/man7/rtnetlink.7.html

## Issues Found
- The route-watcher example said `ipr.get()` was non-blocking with a timeout, but current pyroute2 sync socket behavior blocks on `recv()` until a message arrives. I changed the example to use `IPRSocket` with `select.select()` and `RTMGRP_IPV6_ROUTE`, which matches the current RTNL socket documentation.
- The `IPDB` section used a deprecated API. Current pyroute2 documentation marks `IPDB` as deprecated, and current 0.9.x releases keep it only as a compatibility wrapper around `NDB`. I replaced that section with an `NDB` example using `ndb.interfaces[...]` and `ndb.routes.create(...).commit()`.
- The conclusion claimed all operations require root privileges or `CAP_NET_ADMIN`. That was too broad for read-only listing and monitoring. I narrowed the statement so it applies to changing routes, addresses, or interface configuration.
- The IPv6 address example used the numeric family value directly. I updated it to use `socket.AF_INET6` consistently so the code matches the explanation and current examples elsewhere in the post.

## Review Notes
- The official pyroute2 docs site currently publishes a `0.9.3rc1` documentation set, while PyPI currently lists `0.9.6`. I cross-checked the locally installed `0.9.6` package source to confirm the documented command names and deprecation status still match current behavior.
- The remaining `IPRoute` examples are still valid in current pyroute2 0.9.x sync API.
- The updated `NDB` default-route example includes `oif`, which is especially useful for IPv6 default routes where the outgoing interface may need to be explicit.
