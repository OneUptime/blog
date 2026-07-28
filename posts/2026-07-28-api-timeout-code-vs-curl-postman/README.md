# Why Does an API Call Time Out in Code but Succeed with curl or Postman?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Troubleshooting, curl, Postman, HTTP Client, Timeout

Description: Make the program, curl, and Postman use the same environment and request semantics, then compare DNS, proxy, TLS, pooling, redirects, and timer behavior phase by phase.

---

If code times out while curl or Postman succeeds, the API has not passed an equivalent test yet.

The clients can differ in network, DNS, proxy, trust store, TLS, HTTP version, headers, body, redirects, connection reuse, retries, and timeout semantics. A manual request also does not reproduce application concurrency or pool state.

Treat the successful tool call as a comparison specimen. Make the two paths equivalent before changing the server or increasing the program timeout.

## Start with the Exact Failure Phase

Preserve the code's:

```text
exception class, code, and cause chain
elapsed monotonic duration
configured connect/read/total limits
resolved and selected remote IP
proxy address, if any
new or reused connection
HTTP version
bytes sent and received
redirect and retry count
```

Different libraries use the same words differently:

- Python Requests accepts connect and read timeout values; its read timeout is the interval between bytes, not a total wall-clock deadline.
- Go's `http.Client.Timeout` includes connection setup, redirects, and response-body reading. Its transport exposes separate TLS-handshake and response-header limits.
- Node.js documents that setting `http.request()`'s `timeout` or calling `setTimeout()` emits a timeout event but does not itself abort the request; application code must handle cancellation/destruction.
- curl's `--connect-timeout` covers DNS plus TCP and requested TLS or QUIC handshakes, while `--max-time` limits the full transfer.

Matching the number `5` in each client does not create matching behavior.

## Run the Tool in the Program's Environment

The most common invalid comparison is:

```text
application: Kubernetes pod in production
curl/Postman: developer laptop on VPN
```

Those paths can use different:

- DNS resolvers and split-horizon answers;
- IPv4/IPv6 connectivity;
- source IP allowlists;
- NAT gateways;
- service mesh or sidecar;
- corporate proxy;
- firewall and Kubernetes NetworkPolicy;
- CDN region;
- credentials and client certificates.

Run curl from the same pod image or a controlled debug container in the same namespace and node/network class. If that is impossible, record the differences rather than saying “curl works.”

Postman can use system or custom proxy settings, and its web app can use different agents. Record the agent and proxy.

## Compare DNS and the Selected Address

Record every A and AAAA result and which IP each client selected:

```bash
getent ahosts api.example.com
curl -v --connect-timeout 3 https://api.example.com/resource
curl -4 -v --connect-timeout 3 https://api.example.com/resource
curl -6 -v --connect-timeout 3 https://api.example.com/resource
```

curl's documented Happy Eyeballs behavior starts additional IPv4/IPv6 connection attempts after a delay when earlier attempts remain inconclusive. Another client can try addresses sequentially, cache DNS longer, or prefer a different family. Python Requests notes that its connect timeout applies to each attempted IP, so elapsed connect time can exceed one configured interval when several addresses are tried.

Force a test address without changing TLS SNI or HTTP host semantics:

```bash
curl -v \
  --resolve api.example.com:443:203.0.113.20 \
  https://api.example.com/resource
```

If one address fails, investigate DNS health, endpoint membership, routing, and address-family policy. Do not replace the hostname with an IP in the URL; that can change certificate validation, SNI, and virtual-host routing.

## Compare Proxy Behavior

Dump the program's effective proxy decision without exposing credentials. Check its service environment, runtime configuration, and `NO_PROXY` matching.

libcurl documents support for scheme-specific proxy environment variables, `ALL_PROXY`, and `NO_PROXY`. Go's default transport also uses `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`. Postman can use operating-system proxy settings, proxy environment variables, or a custom proxy.

Check for:

- different `NO_PROXY` matching;
- HTTP CONNECT versus direct HTTPS;
- local versus proxy-side SOCKS resolution;
- absent production proxy credentials;
- source-specific proxy policy;
- service-mesh egress bypass.

The successful proxy path might deliberately have network reachability that the direct code path lacks.

## Compare TLS, Trust, and Client Identity

Capture:

```text
TLS SNI hostname
negotiated TLS version and cipher
ALPN result (HTTP/1.1, HTTP/2, or HTTP/3)
server certificate chain
trust-store source
client certificate identity
TLS interception proxy
```

Postman supports custom CA certificates and host-specific client certificates. A developer might have installed an internal CA or mTLS certificate in Postman that is absent from the container. curl may use a different TLS backend and trust store than the language runtime.

Do not prove equivalence with:

```bash
curl -k https://api.example.com/
```

That disables certificate verification and demonstrates only that an insecurely configured client can continue. Supply the correct CA bundle and client identity instead.

A TLS verification failure is normally explicit. A middlebox or overloaded terminator can instead accept TCP and stall TLS; use phase timing.

## Make the HTTP Request Identical

Create a redacted comparison:

| Property | Program | curl/Postman |
| --- | --- | --- |
| Final URL after variables | | |
| Method | | |
| Host/`:authority` | | |
| Authorization type | | |
| Cookies | | |
| Content-Type/Accept | | |
| Body bytes and length | | |
| Transfer-Encoding | | |
| Accept-Encoding | | |
| Redirect policy | | |
| HTTP version | | |
| User-Agent | | |
| Idempotency key | | |

Common differences:

- unresolved variables or a different final URL;
- different body size, encoding, or transfer framing;
- `100 Continue` and upload behavior;
- redirects to another host;
- authentication challenges or token refresh;
- cookies selecting another backend;
- header-sensitive WAF or rate-limit policy.

Use a request ID to find both attempts in edge and origin logs. Never publish auth headers or full traces containing secrets.

## Inspect Redirects and Retries

A manual tool can display the first 301 quickly while code follows it to a slow destination, or the reverse. Record every hop:

```bash
curl -v --location --max-redirs 5 https://api.example.com/resource
```

Only use `--location` if the program also follows redirects, and compare how methods and sensitive headers are handled across hosts. Go's client documentation, for example, describes when sensitive headers such as `Authorization` and `Cookie` are not forwarded to an untrusted redirect target.

Likewise, SDK retries can make a five-second per-attempt timeout appear as a 20-second API call. Count physical attempts and keep them inside one end-to-end deadline.

## Compare Fresh and Reused Connections

A one-off curl process often creates a fresh connection. Long-running code reuses:

- DNS entries, pools, and TLS sessions;
- idle keepalive or multiplexed connections.

Code-only timeouts can come from:

- waiting for a local pool slot;
- creating a new client per request and exhausting sockets;
- not closing or consuming response bodies, preventing reuse;
- reusing a connection that an intermediary silently retired;
- too many streams on one connection;
- stale DNS associated with long-lived connections.

Go's `net/http` documentation recommends reusing clients and transports and notes that response bodies must be closed and generally read to EOF for keepalive reuse. Inspect pool-wait time and connection-reuse callbacks, not only network connect time.

Conversely, an interactive Postman session can retain cookies and connections. Use its Console to inspect the effective request and connection details.

## Reproduce Application Concurrency

One manual request does not test:

- application concurrency and pool limits;
- per-credential or per-source rate limits;
- retries from many instances;
- production payload and tenant distribution.

First compare one program request and one tool request under identical conditions. Then use a safe load test that matches production arrival rate, concurrency, payload distribution, and connection reuse. Avoid turning curl loops against a state-changing production endpoint.

If only concurrent code fails, inspect client pool acquisition, file descriptors, ephemeral ports, proxy capacity, server workers, and downstream pools with evidence from the failure window.

## Use a Side-by-Side Timing Probe

For curl:

```bash
curl -sS -o /dev/null \
  --connect-timeout 2 \
  --max-time 10 \
  -w 'ip=%{remote_ip} dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} first=%{time_starttransfer} total=%{time_total}\n' \
  https://api.example.com/resource
```

Add equivalent telemetry to code. Compare completed phases, not just totals:

```text
program: DNS 2 ms, pool wait 5,000 ms, no new TCP connection
curl:    DNS 4 ms, TCP 12 ms, TLS 25 ms, first byte 80 ms
```

That example points to the program's local pool, not the API network.

Or:

```text
program: selects IPv6, TCP never completes
curl:    starts IPv6, then succeeds to IPv4 via Happy Eyeballs
```

That points to address selection and IPv6 reachability.

## Fix the Difference, Not the Symptom

Typical evidence-based fixes are:

- correct DNS or broken IPv6 routing;
- align proxy and `NO_PROXY` configuration;
- install the proper CA or client certificate;
- match Host, auth, body encoding, and redirect behavior;
- reuse a correctly configured client and close response bodies;
- bound and instrument pool acquisition;
- add an explicit total deadline around libraries with only inactivity timers;
- handle Node.js timeout events by actually aborting according to the API contract;
- coordinate retries under one deadline;
- size capacity for real concurrency.

Increase a timeout only when the now-equivalent request proves healthy latency legitimately exceeds the current limit. Once code and the successful tool share the same network, address, proxy, TLS identity, HTTP request, connection mode, and timing model, the discrepancy usually becomes a specific configuration or pooling bug rather than an unexplained API timeout.

## Official Documentation

- [curl command-line manual](https://curl.se/docs/manpage.html)
- [libcurl environment variables](https://curl.se/libcurl/c/libcurl-env.html)
- [libcurl Happy Eyeballs timeout](https://curl.se/libcurl/c/CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS.html)
- [Python Requests advanced timeout documentation](https://docs.python-requests.org/en/latest/user/advanced/#timeouts)
- [Go `net/http` package documentation](https://pkg.go.dev/net/http)
- [Node.js HTTP documentation](https://nodejs.org/api/http.html)
- [Postman proxy configuration](https://learning.postman.com/docs/getting-started/installation/proxy/)
- [Postman certificate documentation](https://learning.postman.com/docs/sending-requests/authorization/certificates/)
- [Postman request troubleshooting](https://learning.postman.com/docs/sending-requests/response-data/troubleshooting-api-requests/)
