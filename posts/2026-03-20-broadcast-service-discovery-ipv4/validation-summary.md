# Validation Summary: How to Implement IPv4 Broadcast for Service Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 broadcast
- UDP
- Python standard library (`socket`, `json`, `threading`, `time`)
- Local network service discovery

## Sources Consulted
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Python `json` documentation: https://docs.python.org/3/library/json.html
- Python `threading` documentation: https://docs.python.org/3/library/threading.html
- IANA Service Name and Transport Protocol Port Number Registry: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762.html
- RFC 919, Broadcasting Internet Datagrams: https://www.rfc-editor.org/rfc/rfc919.html

## Issues Found
- The original example used UDP ports `5353` and `5354`. `5353/udp` is reserved for Multicast DNS, and `5354/udp` is registered for mDNS Responder IPC. I changed the sample ports to `37020` and `37021` to avoid conflicts with well-known services.
- The active discovery section could not work as written because the service announcer only sent periodic broadcasts and never listened for `DISCOVER` requests. I updated the announcer example so it also binds the discovery port and replies with `ANNOUNCE` when it receives a discovery probe.
- The service announcer example exited immediately when run as written because it only started daemon threads, and Python exits once only daemon threads remain. I added `threading.Event().wait()` so the sample stays alive.
- The active discovery timeout logic could exceed the declared timeout after an early reply because each `recvfrom()` used the original full timeout. I changed the loop to recompute the remaining time before each receive.

## Review Notes
- The code examples use `dict | None`, which means the post effectively targets Python 3.10 or newer.
- Running multiple UDP listeners on the same port on a single host can behave differently across operating systems because socket reuse semantics are platform-dependent. The examples are most representative when services and clients run on separate machines on the same LAN.
