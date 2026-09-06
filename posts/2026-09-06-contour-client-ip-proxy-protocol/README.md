# Preserve Client IPs in Contour with PROXY Protocol and Trusted Hops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, Client IP, Source IP, Proxy Protocol, Envoy, Kubernetes, Ingress Controller

Description: Preserve trustworthy client addresses through a layer 4 load balancer or known HTTP proxy without accepting spoofed X-Forwarded-For.

---

The application-visible client address depends on every hop before Envoy. There are three common paths:

- a layer 4 load balancer preserves the TCP source address;
- a layer 4 load balancer replaces it but sends a PROXY protocol preamble; or
- a layer 7 proxy terminates HTTP and appends `X-Forwarded-For`.

Configure only the mechanism the upstream load balancer actually provides. PROXY protocol and trusted XFF hops solve different transport layers, and enabling either with the wrong topology can break traffic or trust an address supplied by the client.

## Record the Real Hop Chain

Write the path with exact products and protocols:

```text
client -> CDN -> cloud load balancer -> Envoy Service -> Envoy -> application
```

For each hop, determine whether it operates at layer 4 or layer 7, whether it preserves the source address, whether it emits PROXY v1 or v2, and how it handles an incoming XFF header. Use provider documentation for the deployed load-balancer mode, since behavior often changes with annotations or target type.

Capture a baseline from Envoy access logs. Include downstream peer address, downstream remote address, XFF, and `X-Envoy-External-Address`. Do not make the application log a raw client-supplied header as an authenticated identity.

## Prefer Native Source Preservation When Available

For a Kubernetes LoadBalancer or NodePort Service, `externalTrafficPolicy: Local` prevents kube-proxy from forwarding external traffic to a Pod on another node and preserves the source IP in supported topologies:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: envoy
  namespace: projectcontour
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
```

This has a tradeoff. Nodes without a local ready Envoy endpoint do not forward traffic, so the external load balancer needs correct health checks and Envoy must be distributed across enough nodes. Verify balancing and availability during rolling updates.

Some managed network load balancers already deliver the original source address. Contour's PROXY guide notes that this is the normal GKE network-load-balancer behavior. Do not enable PROXY protocol when direct preservation already works.

## Enable PROXY Protocol at Both Ends

When the load balancer supports PROXY v1 or v2, configure it to send the preamble and configure Contour with `--use-proxy-protocol`. The Contour setting applies to all Envoy listening ports:

```yaml
containers:
- name: contour
  args:
  - serve
  - --incluster
  - --use-proxy-protocol
```

Use the supported installation mechanism, such as Helm values or `ContourDeployment`, rather than hand-editing a generated Deployment.

Both sides must change together. If Envoy expects PROXY but a health checker sends raw HTTP or TLS, the check fails. If the load balancer sends a PROXY line to a listener that does not expect one, Envoy interprets it as application bytes and the connection fails.

Restrict direct network access to a PROXY-enabled listener. The protocol carries asserted address metadata but does not authenticate the sender. Only a trusted load balancer should be able to connect and claim a source address.

## Set Trusted XFF Hops for Known HTTP Proxies

When a CDN or another layer 7 proxy is in front of Envoy, it appends to `X-Forwarded-For`. Contour's `num-trusted-hops` tells Envoy how many additional addresses from the right side of XFF to trust when determining the remote client.

In the Contour configuration file:

```yaml
network:
  num-trusted-hops: 1
```

Use `1` only when exactly one trusted HTTP proxy is always immediately before Envoy. Count stable trusted proxies from the right, not all entries and not client-controlled intermediaries. Too small a value reports a proxy. Too large a value can select a spoofed address inserted by the client.

The upstream proxy should overwrite or sanitize incoming forwarding headers according to its official security guidance. Network policy or load-balancer controls should prevent users from bypassing that proxy and reaching Envoy directly.

PROXY protocol can provide the downstream transport address while XFF describes prior HTTP hops. If a topology uses both, derive the trusted-hop count from packet and header captures; do not assume the settings cancel each other out.

## Test Spoofing as Well as Success

Expose a temporary endpoint that reports the address as understood by the application, then compare it with Envoy's access log. Send a normal request and a spoof attempt:

```bash
curl --fail https://whereami.example.com/
curl --fail -H 'X-Forwarded-For: 203.0.113.99' \
  https://whereami.example.com/
```

The second request must not make the application believe `203.0.113.99` is the authenticated client. Repeat through every supported entry path, including IPv6, CDN bypass domains, direct load-balancer addresses, and health checks.

If access is controlled by IP, Contour's HTTPProxy IP filtering distinguishes:

- `source: Peer`, the direct network peer; and
- `source: Remote`, the client address Envoy derives through PROXY protocol or XFF.

Use `Remote` only after validating the trust chain. Keep `Peer` rules when the direct load-balancer identity is what matters.

## Diagnose Common Outcomes

| Result | Likely cause |
| --- | --- |
| Every client appears as a node IP | Kubernetes SNAT with `externalTrafficPolicy: Cluster` |
| Every client appears as the load balancer | Source is not preserved and no valid PROXY or XFF trust is configured |
| Listener immediately rejects every connection | PROXY expectation differs between load balancer and Envoy |
| Health checks fail after enabling PROXY | Health-check path does not send the required preamble |
| A supplied XFF value becomes the client | Trusted-hop count is too high or direct bypass is possible |
| Address is correct in Envoy but not the app | Application proxy-trust configuration is wrong |

Applications should trust forwarding headers only from Envoy and should use the framework's supported proxy middleware. Preserve the full chain for audit, but choose one canonical, validated address for rate limits and policy.

## Roll Out Without Losing Traffic

Test on a separate load balancer or private Contour class first. PROXY protocol changes the bytes at the start of every TCP connection and is not a safe one-sided rolling toggle.

After rollout, verify HTTP, HTTPS, health checks, long-lived connections, IPv4, IPv6, and each load-balancer target. Monitor listener connection errors and compare client-IP distributions before and after. Have a coordinated rollback that changes sender and receiver together.

## Conclusion

Preserve the source address natively when the load balancer and `externalTrafficPolicy: Local` support it. Otherwise enable PROXY protocol on both the trusted layer 4 sender and every Envoy listener it reaches. For layer 7 proxies, set an exact XFF trusted-hop count and prove that spoofed headers do not win. The correct client IP is a trust-chain result, not merely a header name.

## Official Documentation

- [Contour 1.33 PROXY protocol guide](https://projectcontour.io/docs/1.33/guides/proxy-proto/)
- [Contour 1.33 network configuration](https://projectcontour.io/docs/1.33/configuration/#network-configuration)
- [Contour 1.33 IP filtering](https://projectcontour.io/docs/1.33/config/ip-filtering/)
- [Kubernetes source IP behavior](https://kubernetes.io/docs/tutorials/services/source-ip/)
- [Envoy original IP detection](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers#x-forwarded-for)
- [PROXY protocol specification](https://www.haproxy.org/download/2.8/doc/proxy-protocol.txt)
