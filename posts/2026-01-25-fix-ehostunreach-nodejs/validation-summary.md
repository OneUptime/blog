# Validation Summary: How to Fix 'Error: EHOSTUNREACH' in Node.js

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Node.js
- Native Fetch API / Undici behavior
- Node.js `http` and `dns` modules
- Docker and Docker Compose networking
- Kubernetes service DNS
- Linux, macOS, and Windows network troubleshooting commands
- Linux firewall tools: iptables, UFW, and firewalld

## Sources Consulted
- Node.js Errors documentation: https://nodejs.org/api/errors.html
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js Fetch with Undici guide: https://nodejs.org/learn/getting-started/fetch
- Undici documentation: https://undici.nodejs.org/
- Docker Desktop networking documentation: https://docs.docker.com/desktop/features/networking/networking-how-tos/
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Local Linux man pages for `errno(3)`, `nc(1)`, and `iptables(8)`

## Issues Found
- Several JavaScript snippets declared `const response` or `const API_URL` more than once in the same code block. Renamed the illustrative variables so the snippets are syntactically valid.
- The Docker `localhost` example claimed the failure would be `EHOSTUNREACH`. From inside a container, `localhost` points to the container itself, so the error can vary or connect to the wrong process. Updated the comment to describe the actual networking behavior.
- The Docker bridge IP example implied `172.17.0.1` is always the host IP. Updated it to specify the default Linux Docker bridge case.
- The VPN/interface-binding and debug-agent snippets passed a Node `http.Agent` to native `fetch`, but native Node fetch uses Undici dispatcher semantics and does not use the `agent` option. Reworked those snippets to use `http.get`, where `http.Agent` and `localAddress` apply.
- The retry logic checked only `error.code`; native Node fetch network failures are commonly surfaced through `error.cause.code`. Updated the logic to check both `error.code` and `error.cause?.code`.
- The health-check snippet did not consume the response body from `http.get`. Added `res.resume()` so the response stream is drained.
- The firewall "allow" examples mixed outbound rules with inbound service-opening commands. Reworded the text to target inbound connections on the target host and adjusted the iptables and UFW commands accordingly.

## Review Notes
The diagnostic commands are broadly correct, but availability and output vary by operating system and installed packages. The article intentionally uses generic examples; production retry logic should usually add jitter and avoid retrying unsafe non-idempotent operations without additional safeguards.
