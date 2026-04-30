# Validation Summary: How to Force Node.js HTTP Requests to Use IPv4 Only

## Status
validated

## Post Type
Guide

## Technologies Covered
- Node.js
- Node.js `http` and `https`
- Node.js `dns` / `dns/promises`
- Axios
- `NODE_OPTIONS`

## Sources Consulted
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js HTTPS documentation: https://nodejs.org/api/https.html
- Node.js DNS documentation: https://nodejs.org/api/dns.html
- Node.js CLI documentation: https://nodejs.org/api/cli.html
- Axios request config documentation: https://axios-http.com/docs/req_config

## Issues Found
- The global-agent section said all requests in the process would use IPv4. I corrected that to requests that use the default global agent, because Node.js only uses `http.globalAgent` / `https.globalAgent` when a request does not provide its own agent.
- The manual HTTPS-by-IP example treated the `Host` header as if it also handled TLS SNI. I added `servername: hostname` and corrected the comments, because Node.js does not automatically send SNI when the target host is specified as an IP address.
- The `NODE_OPTIONS` section incorrectly described `--dns-result-order=ipv4first` as an OS-level setting and implied a strict IPv4-only effect. I corrected it to a process-wide `dns.lookup()` preference and clarified that it reorders address results rather than forcing IPv4-only connections.
- The version note for `dns.setDefaultResultOrder()` was incomplete. I updated it to reflect availability starting in Node.js `v16.4.0` and `v14.18.0`.

## Review Notes
- `family: 4` on the request/agent path is the strictest approach in this post because it constrains hostname resolution to IPv4 for those requests.
- `dns.resolve4()` is technically valid for the manual-resolution approach, but per Node.js DNS documentation it always performs network DNS queries and does not use the same name-resolution sources as `dns.lookup()` such as `/etc/hosts`.
