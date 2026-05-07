# Validation Summary: How to Configure Apollo Server with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apollo Server 4
- GraphQL
- Node.js
- IPv6
- Uvicorn
- curl
- UFW
- ip6tables
- DNS AAAA records

## Sources Consulted
- Apollo Server `startStandaloneServer` API reference: https://www.apollographql.com/docs/apollo-server/api/standalone
- Apollo Server getting started guide: https://www.apollographql.com/docs/apollo-server/getting-started
- Node.js `net.Server.listen()` documentation: https://nodejs.org/api/net.html
- Uvicorn settings documentation: https://www.uvicorn.org/settings/
- curl man page: https://curl.se/docs/manpage.html
- UFW framework man page: https://manpages.ubuntu.com/manpages/noble/man8/ufw-framework.8.html
- ip6tables man page: https://manpages.ubuntu.com/manpages/focal/man8/ip6tables.8.html
- Local CLI help output for `ping`, `curl`, and `ip`

## Issues Found
- The original Node.js example used a generic `server.listen(...)` snippet instead of Apollo Server 4's actual `startStandaloneServer()` API. I replaced it with an Apollo Server 4 example that binds through `listen: { host: '::', port: 4000, ipv6Only: false }`, which matches Apollo's official API and Node's supported listen options.
- The explanation of `::` as simply the IPv6 equivalent of `0.0.0.0` was imprecise for dual-stack behavior. I corrected it to describe `::` as the IPv6 unspecified address and noted that many platforms also accept IPv4 connections unless IPv6-only mode is enabled.
- The Linux connectivity check used `ping6`, which is less current and less portable than `ping -6`. I updated the command to `ping -6 -c 3 ::1`.
- The GraphQL test request targeted `/graphql`, but Apollo Server's standalone server listens at the base URL `/` by default. I updated the `curl` example to target `/`.
- The UFW example did not mention that IPv6 handling depends on UFW's IPv6 setting. I added a note to ensure IPv6 is enabled in `/etc/default/ufw`.

## Review Notes
- Apollo's current docs cover both Apollo Server 4 and 5. The post remains valid for Apollo Server 4 after these fixes, but Apollo Server 5 is the current latest line.
- The `req.socket.remoteAddress` example is correct for direct connections. If Apollo Server is deployed behind a reverse proxy, proxy-aware client IP handling may be needed in a future revision.
