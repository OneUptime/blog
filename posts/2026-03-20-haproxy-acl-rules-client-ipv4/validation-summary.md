# Validation Summary: How to Configure HAProxy ACL Rules Based on Client IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- HAProxy ACLs
- IPv4 networking
- HTTP routing and access control
- curl

## Sources Consulted
- HAProxy Configuration Manual (3.2 LTS): https://docs.haproxy.org/3.2/configuration.html
- HAProxy Management Guide (3.2 LTS): https://docs.haproxy.org/3.2/management.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The admin access example used `http-request deny code 403`, which does not match the current documented `deny` action syntax. I changed it to `http-request deny status 403`.
- The TCP rejection explanation said HAProxy rejects connections before the handshake completes. I changed the sentence to describe rejection at the TCP connection stage before traffic is forwarded to the backend.
- The multiple-conditions example omitted `mode http` even though it uses HTTP path ACLs and `http-request` rules. I added `mode http`.
- The multiple-conditions deny logic allowed `/api/v2/` requests from untrusted clients to fall through to the default backend. I split the deny rules so API traffic is limited to internal or partner networks, and partner networks are restricted to `/api/v2/`.
- The rate-limiting example omitted `mode http` and used the compatibility-form `deny_status`. I added `mode http` and changed the rule to `http-request deny status 429`.
- The logging example omitted `mode http` and claimed to capture the client source IP while actually capturing the `X-Real-IP` request header. I added `mode http` and changed the capture to `src len 15`.
- The testing section used `show info | grep -i deny`, but HAProxy documents the relevant deny counters under `show stat` as `dreq`, `dcon`, and `dses`. I replaced the command with a `show stat` query that includes the CSV header and the `http_in` frontend row.

## Review Notes
- The `curl --interface <ip>` examples are valid according to curl's documentation, but they only work if the specified source address is actually configured on the host or otherwise usable in the current network namespace or VRF.
- HAProxy was not installed in this workspace, so verification was performed against the official documentation rather than by running `haproxy -c` locally.
