# How to Enable HAProxy Sticky Sessions Using Source IPv4 Address Hashing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Sticky Sessions, IPv4, Load Balancing, Source Hash, Persistence

Description: Configure HAProxy sticky sessions using source IPv4 address hashing to route clients consistently to the same backend server for stateful application requirements.

## Introduction

Sticky sessions ensure that a client always reaches the same backend server. This is required for applications that store session state locally on the server. HAProxy supports source IP hashing, cookie-based persistence, and stick tables. Source IP hashing is the simplest method but is less precise when multiple clients share a NAT address.

## Source IP Hashing (balance source)

```text
# /etc/haproxy/haproxy.cfg

backend app-servers
    balance source
    hash-type consistent
    server app1 10.0.1.10:8080 check
    server app2 10.0.1.11:8080 check
    server app3 10.0.1.12:8080 check
```

`balance source` hashes the client's source IP to select a server. `hash-type consistent` uses consistent hashing (minimizes remapping when a server is added/removed).

## Cookie-Based Persistence (Preferred)

More accurate than IP-based - individual browser sessions stick regardless of NAT:

```text
backend app-servers
    mode http
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server app1 10.0.1.10:8080 check cookie app1
    server app2 10.0.1.11:8080 check cookie app2
    server app3 10.0.1.12:8080 check cookie app3
```

HAProxy inserts a `Set-Cookie: SERVERID=app1` header. Subsequent requests with that cookie route to `app1`.

## Stick Tables with Source IP

Stick tables provide configurable, stateful client-to-server mapping:

```text
backend app-servers
    balance roundrobin
    stick-table type ip size 200k expire 30m
    stick on src
    server app1 10.0.1.10:8080 check
    server app2 10.0.1.11:8080 check
    server app3 10.0.1.12:8080 check
```

- `type ip size 200k`: Table holds up to 204,800 entries keyed by IPv4
- `expire 30m`: Entry expires after 30 minutes of inactivity
- `stick on src`: Track the client's source IP

## Stick Table with Custom Key (Header)

Use a session token header as the stick key:

```text
backend app-servers
    mode http
    balance roundrobin
    stick-table type string len 32 size 100k expire 1h
    stick on req.hdr(X-Session-ID)
    server app1 10.0.1.10:8080 check
    server app2 10.0.1.11:8080 check
```

## Checking Stick Table Contents

```bash
echo "show table app-servers" | sudo socat stdio /run/haproxy/admin.sock
```

Output shows the table entries keyed by client IP, along with any stored counters or other data fields.

## Clearing Stick Table Entries

```bash
# Clear all entries for a specific IP

echo "clear table app-servers key 203.0.113.10" | sudo socat stdio /run/haproxy/admin.sock

# Clear all entries
echo "clear table app-servers" | sudo socat stdio /run/haproxy/admin.sock
```

## Fallback Behavior When Server Goes Down

With cookie-based persistence, if `app1` goes down, HAProxy routes the client to another server (cookie is ignored). The client gets a new cookie pointing to the new server.

With `balance source`, the client is redistributed to another server based on the hash.

## Comparison of Sticky Session Methods

| Method | Precision | Overhead | Stateless? |
|---|---|---|---|
| balance source | Low (NAT issue) | None | Yes |
| Cookie insert | High | Low | Yes |
| Stick table (IP) | Medium | Low | No |
| Stick table (token) | Exact | Low | No |

## Conclusion

Use `balance source` with `hash-type consistent` for simple IP-based stickiness. Prefer cookie-based persistence (`cookie SERVERID insert`) for web applications where browser sessions matter. Use stick tables for fine-grained control with configurable expiry and key types. Cookie-based stickiness survives server additions without remapping clients.
