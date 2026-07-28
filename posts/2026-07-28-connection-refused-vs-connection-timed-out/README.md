# Connection Refused vs Timed Out: What Each Error Reveals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Network Troubleshooting, Connection Timeout, Linux, Kubernetes

Description: Use refused and timed-out TCP connections as different path signals, then verify the listener, packet exchange, and network policy from the failing client.

---

`Connection refused` and `connection timed out` both mean that an application did not establish the connection it wanted, but they describe different observations at the transport layer.

For a TCP stream connection:

- **refused** normally means the client received a definitive negative answer, commonly a TCP reset;
- **timed out** means the client did not receive a conclusive answer before its connection deadline expired.

That distinction narrows an investigation. It does not identify the faulty machine by itself. A firewall, load balancer, service mesh sidecar, or NAT can reject or silently drop traffic on behalf of the apparent destination.

## What `Connection Refused` Actually Says

RFC 9293 specifies that a TCP endpoint in the closed state sends a reset in response to an incoming segment other than another reset. On Linux, `connect(2)` describes `ECONNREFUSED` as finding no listener at the remote address.

A typical exchange is short:

```text
client -> server: SYN
server -> client: RST,ACK
client:           ECONNREFUSED
```

The quick negative response proves that something returned an answer for that address and port. Common explanations are:

- the service is stopped or has crashed;
- it listens on another port;
- it is bound only to `127.0.0.1`, `::1`, or the wrong interface;
- a deployment published a port before the new process began listening;
- a Kubernetes Service or external load balancer points at a stale or wrong target;
- a host firewall uses `REJECT` rather than silently dropping the packet;
- an intermediary actively rejects the connection.

Do not overstate the conclusion as “the packet reached the application host.” A firewall can synthesize a TCP reset, and a proxy can accept the client-side connection but later report that its own upstream connection was refused. Always identify which connection the error describes.

Check the listener on the destination:

```bash
ss -lntp
```

Pay attention to both address and port:

```text
LISTEN 0 4096 127.0.0.1:8080 0.0.0.0:*
```

That process is reachable only through the local IPv4 loopback interface. A connection to the host's private IP on port 8080 can be refused even though a local health check succeeds.

## What `Connection Timed Out` Actually Says

A connection timeout usually means the TCP handshake did not complete before the OS or client library stopped waiting:

```text
client -> destination: SYN
client -> destination: SYN (retransmission)
client -> destination: SYN (retransmission)
...
client:                ETIMEDOUT
```

The absence of a reply is ambiguous. Possibilities include:

- an egress firewall or network policy drops the SYN;
- an ingress firewall drops the SYN or its response;
- routing sends the request or reply down the wrong path;
- the destination address is no longer assigned;
- a security group, ACL, or NAT drops the flow;
- the return path is asymmetric and stateful filtering rejects it;
- packets are lost or the destination is unreachable without a useful ICMP error reaching the client;
- the server is sufficiently overloaded that connection handling or its queues cannot keep up.

Linux documentation notes that `ETIMEDOUT` can take a long time and can also occur when a server is too busy to accept new connections. Therefore, “timeout means firewall” is only a hypothesis. It is a useful starting point because silent filtering is common, not a protocol guarantee.

The timer is also implementation-specific. A kernel TCP connect timeout, a library connect timeout, and an outer application deadline can expire at different times and produce different exception text.

## First Separate Name Resolution from TCP

Neither error should be diagnosed until you record the address actually selected. A hostname can resolve differently by:

- client network or DNS search domain;
- IPv4 versus IPv6;
- region or resolver location;
- split-horizon DNS;
- stale local or JVM/runtime caches;
- a Kubernetes namespace and search suffix.

From the same container, VM, or network namespace as the failure:

```bash
getent ahosts api.example.internal
curl -v --connect-timeout 3 https://api.example.internal/health
```

curl's current documentation defines its connection phase broadly: DNS lookup plus the requested TCP and TLS or QUIC handshakes. Thus a curl connect-timeout is not proof that the TCP SYN itself timed out. Its verbose output and timing data are needed to identify the last completed phase.

To force a known address while preserving the hostname used for TLS and HTTP:

```bash
curl -v \
  --resolve api.example.internal:443:10.20.30.40 \
  --connect-timeout 3 \
  https://api.example.internal/health
```

This is safer diagnostically than replacing the URL with an IP, which changes TLS SNI and the HTTP `Host`/`:authority` value.

## Capture Both Ends of the Attempt

Packet evidence makes the distinction concrete:

```bash
sudo tcpdump -ni any 'host 10.20.30.40 and tcp port 443'
```

Interpret the result carefully:

| Client capture | Destination capture | Likely boundary |
| --- | --- | --- |
| SYN, immediate RST | SYN and locally generated RST | No matching listener or local reject |
| SYN, immediate RST | No SYN | An intermediary rejected it |
| Repeated SYN only | No SYN | Drop or routing failure before destination |
| Repeated SYN only | SYN arrives, no SYN-ACK leaves | Destination firewall, overload, or TCP/listen issue |
| Repeated SYN only | SYN and SYN-ACK leave | Broken or filtered return path |
| Handshake completes | Handshake completes | Not a TCP connect failure; inspect TLS or HTTP |

Capture timestamps and the full five-tuple: source IP, source port, destination IP, destination port, and protocol. NAT means the tuple visible at the server might differ from the client tuple.

If production capture is restricted, use flow logs, firewall decision logs, load-balancer access logs, and Linux TCP counters. Avoid changing firewall policy merely to “see if it helps” without preserving before-and-after evidence.

## Debug Kubernetes from the Correct Boundary

In Kubernetes, test each hop separately:

```bash
kubectl get service api -n payments -o wide
kubectl get endpointslices \
  -n payments \
  -l kubernetes.io/service-name=api
kubectl get pods -n payments -l app=api -o wide
```

Then test:

1. the Pod IP and container port from another Pod;
2. the Service DNS name and Service port;
3. the ingress or load-balancer address;
4. the public hostname from the original client network.

Kubernetes' service-debugging guide recommends confirming EndpointSlices and then bypassing the Service to contact individual Pod endpoints. If the Pod IP works but the Service times out, focus on Service routing, policy, and node networking. If every Pod endpoint refuses, inspect the process listener and declared `targetPort`.

A readiness probe can also test a different interface, path, or port than real traffic. “Ready” is not evidence that the failing destination tuple has a listener.

## Do Not Mix Connect Failures with Later Timeouts

Once the TCP three-way handshake succeeds, later failures are different:

- TLS handshake timeout or certificate failure;
- timeout sending the request body;
- timeout waiting for response headers;
- inactivity while reading the response body;
- an intermediary's idle timeout;
- an application's total deadline.

A proxy-generated 504 means the client did connect to the proxy. It says that the proxy did not receive a timely upstream response; it is not equivalent to the original client receiving `ETIMEDOUT` from `connect()`.

## A Practical Decision Sequence

Use this order during an incident:

1. Save the exact exception, errno or library error type, timestamp, hostname, and port.
2. Reproduce from the same runtime and network namespace.
3. Record all resolved addresses and the one selected.
4. Determine whether TCP connected, using verbose client timing or a packet capture.
5. For a refusal, locate the reset generator and verify the listener binding.
6. For a timeout, compare both-direction captures or equivalent flow/firewall logs.
7. Test each proxy, Service, and endpoint boundary independently.
8. Only after the failure location is known, change listener, routing, policy, or capacity.

Retry policy should follow the diagnosis. Repeatedly retrying a wrong port that is consistently refused adds noise. A transient connection timeout may be retryable for an idempotent operation, but retries need a bounded deadline, backoff, and capacity budget. Neither error justifies an unlimited retry loop.

The useful signal is not simply “fast failure versus slow failure.” A refusal is an explicit negative response; a timeout is missing evidence. Find who produced that evidence, or failed to produce it, and the failure domain becomes much smaller.

## Official Documentation

- [RFC 9293: Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293.html)
- [Linux `connect(2)` manual page](https://man7.org/linux/man-pages/man2/connect.2.html)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [Linux kernel IP sysctl documentation](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)
- [Kubernetes: Debug Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
