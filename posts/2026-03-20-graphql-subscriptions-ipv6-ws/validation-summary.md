# Validation Summary: How to Configure GraphQL Subscriptions over IPv6 WebSocket

## Status
validated

## Post Type
Guide

## Technologies Covered
- GraphQL
- WebSocket
- IPv6
- Node.js
- Uvicorn / ASGI
- curl
- Linux networking tools
- UFW
- ip6tables
- DNS

## Sources Consulted
- GraphQL Specification draft: https://spec.graphql.org/draft/
- Node.js `net` module docs: https://nodejs.org/api/net.html
- Uvicorn settings: https://www.uvicorn.org/settings/
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- curl man page: https://curl.se/docs/manpage.html
- curl URL syntax docs: https://curl.se/docs/url-syntax.html
- `ping(8)` man page: https://man7.org/linux/man-pages/man8/ping.8.html
- `ip-address(8)` man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Ubuntu `ufw(8)` man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- `ip6tables(8)` man page: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html

## Issues Found
- The post described `::` as the IPv6 equivalent of `0.0.0.0` without noting dual-stack behavior. I changed this to identify `::` as the IPv6 unspecified address and added the current caveat that some servers and operating systems also accept IPv4 connections unless IPv6-only mode is enabled.
- The verification example used `ping6`. I changed it to `ping -6 -c 3 ::1` because current `ping(8)` documents IPv6 selection via the `-6` flag.
- The UFW example implied the rule always covered IPv6. I added a note that this applies when IPv6 is enabled in UFW, matching the UFW documentation.
- The testing comment was too broad for the command shown. I changed it to say the `curl` request tests the GraphQL HTTP endpoint over IPv6, which is what the command actually does.

## Review Notes
- GraphQL subscriptions are transport-agnostic in the specification. This post is technically an IPv6 binding and reachability guide for a GraphQL/WebSocket server rather than a full GraphQL subscription protocol setup guide.
- The `curl` examples validate IPv6 reachability and HTTP behavior, not a full WebSocket subscription handshake.
