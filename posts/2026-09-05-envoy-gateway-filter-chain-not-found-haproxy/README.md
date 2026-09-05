# Envoy Gateway Returns `NR filter_chain_not_found` Behind HAProxy: Preserve SNI and Listener Matching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy Gateway, Envoy, HAProxy, TLS Passthrough, TLS Inspection, Proxy Protocol, SNI, Troubleshooting

Description: Diagnose Envoy Gateway filter-chain misses behind HAProxy by preserving TLS and SNI, matching listeners, and aligning PROXY protocol on both peers.

---

Envoy's `NR` response flag can mean no HTTP route, but for a downstream connection it can also mean that no listener filter chain matched. When connection details say `filter_chain_not_found`, debug the bytes and metadata available at listener selection time, before looking at backend routes.

Envoy chooses a filter chain from properties including destination port and IP, SNI server name, transport protocol, ALPN application protocol, and source attributes. All criteria on a chain must match. If no chain matches and there is no default filter chain, Envoy closes the connection.

HAProxy can change several of those properties. It may pass TLS through unchanged, terminate TLS and send plaintext, terminate and create a new TLS connection without the original SNI, or prepend a PROXY protocol header. The correct fix is to choose one explicit hop design and configure both ends to agree.

## Confirm This Is a Filter-Chain Miss

Capture Envoy Gateway logs and Gateway API status around one test connection:

```bash
kubectl -n envoy-gateway-system logs \
  -l gateway.envoyproxy.io/owning-gateway-name=edge \
  --since=10m --timestamps --prefix

kubectl -n gateways get gateway edge -o yaml
kubectl -n gateways get tlsroute,httproute -o yaml
```

Record the listener address and port, requested hostname, connection termination details, response flags, and source peer. A `404 NR` after a completed TLS handshake can be an HTTP routing miss. A connection close during handshake with `filter_chain_not_found` is a listener selection problem.

Test with a real TLS ClientHello and explicit SNI:

```bash
openssl s_client \
  -connect edge.example.net:443 \
  -servername api.example.com \
  -alpn h2,http/1.1 \
  -verify_return_error </dev/null
```

Compare with a request that omits SNI only as a diagnostic. Do not use `-k`; certificate verification is a separate check worth preserving. Capture HAProxy connection logs with the same timestamp, but avoid logging client certificates or request authorization headers.

## Inspect the Gateway Listener and Attached Routes

Read the desired listener:

```bash
kubectl -n gateways get gateway edge -o json |
  jq '.spec.listeners[] |
      {name, hostname, port, protocol, tls, allowedRoutes}'
```

Then inspect status conditions on the Gateway and routes. Confirm `Accepted`, `Programmed`, and route-parent conditions are true for the exact listener section. A valid-looking TLSRoute that is not attached cannot create the expected filter chain.

The two common TLS models are different:

- A terminating `HTTPS` listener owns a certificate and decrypts the request. HTTPRoute then matches the decrypted authority, path, and headers.
- A `TLS` listener with `tls.mode: Passthrough` does not own the application certificate. TLSRoute matches SNI and sends the encrypted bytes to a backend that terminates TLS.

Do not attach an HTTPRoute and expect it to inspect payload inside a passthrough TLS connection. Conversely, after TLS termination, an SNI-only TLSRoute is not the HTTP routing layer.

Inspect Envoy's generated listener with the Envoy Gateway CLI version matching the control plane:

```bash
egctl config envoy-proxy listener \
  --labels gateway.envoyproxy.io/owning-gateway-name=edge,\
gateway.envoyproxy.io/owning-gateway-namespace=gateways \
  -o yaml
```

Check `egctl ... --help` for the installed version's exact resource subcommand. In the listener output, find port 443 and compare filter-chain `server_names`, `transport_protocol`, and ALPN with the ClientHello. Envoy's TLS inspector must see a real TLS ClientHello to populate SNI.

## Decide What HAProxy Should Do with TLS

Draw the intended topology before editing either proxy:

```text
Option A: client TLS ==================> HAProxy TCP ==================> Envoy
          original ClientHello and SNI preserved end to end

Option B: client TLS ==> HAProxy terminates ==> HTTP ==> Envoy HTTP listener

Option C: client TLS ==> HAProxy terminates ==> new TLS + SNI ==> Envoy TLS listener
```

Each can work, but mixing their configuration cannot.

### Option A: TCP TLS Passthrough

HAProxy must operate in TCP mode and forward the stream without terminating TLS:

```haproxy
frontend edge_tls
  bind :443
  mode tcp
  default_backend envoy_tls

backend envoy_tls
  mode tcp
  server envoy-gateway 192.0.2.40:443 check
```

The example omits production timeouts, redundancy, health-check TLS, and DNS handling; add them according to HAProxy's official configuration guidance. Because HAProxy copies the byte stream, the original ClientHello and SNI reach Envoy. Envoy Gateway can terminate TLS or perform TLS passthrough according to its own listener.

Do not configure `ssl` on the HAProxy `bind` line for this option. That would terminate the client TLS session. Do not configure `ssl` on the backend server line unless you deliberately want a new TLS layer.

### Option B: Terminate at HAProxy and Send HTTP

If HAProxy owns the public certificate, point it at an Envoy Gateway HTTP listener, not an HTTPS/TLS listener that expects a ClientHello. Preserve the HTTP `Host` header and use trusted proxy settings for client IPs. Secure the HAProxy-to-Envoy network with an appropriate boundary; plaintext across an untrusted network is not acceptable.

In this design, Envoy cannot recover the original SNI from HTTP bytes for filter-chain selection. It routes on HTTP authority after an HTTP filter chain has been selected.

### Option C: Terminate and Re-encrypt

HAProxy can establish a new TLS connection to Envoy, but it must send an SNI value matching the Envoy listener and verify Envoy's certificate. In HTTP mode, HAProxy supports deriving backend SNI from the Host header:

```haproxy
backend envoy_https
  mode http
  server envoy-gateway 192.0.2.40:443 \
    ssl verify required ca-file /etc/haproxy/envoy-ca.pem \
    sni req.hdr(Host)
```

This is a new TLS connection; it preserves a hostname value by policy, not the original encrypted session. Validate the Host-to-SNI mapping, especially when HAProxy rewrites Host. Never use `verify none` as the permanent resolution.

For pure TCP routing after terminating TLS, the HTTP Host header may not exist. Use an explicitly configured SNI value or a validated HAProxy sample based on captured ClientHello metadata, consistent with your HAProxy version.

## Align PROXY Protocol on Both Sides

PROXY protocol preserves the original client address by adding a header before the application stream. Both sender and receiver must have it enabled.

If HAProxy uses `send-proxy-v2` but Envoy does not have the PROXY protocol listener filter, Envoy sees the binary PROXY header where it expected a TLS ClientHello. TLS inspection and SNI matching can fail. If Envoy requires PROXY protocol but HAProxy sends none, Envoy Gateway documentation says the connection is closed.

Envoy Gateway can enable downstream PROXY protocol through a `ClientTrafficPolicy` attached to the Gateway. Current CRDs prefer `proxyProtocol`; the older `enableProxyProtocol` boolean is deprecated. Inspect the installed schema before applying:

```bash
kubectl explain clienttrafficpolicy.spec.proxyProtocol \
  --api-version=gateway.envoyproxy.io/v1alpha1
kubectl explain clienttrafficpolicy.spec.proxyProtocol.optional \
  --api-version=gateway.envoyproxy.io/v1alpha1
kubectl explain clienttrafficpolicy.spec.enableProxyProtocol \
  --api-version=gateway.envoyproxy.io/v1alpha1
```

Attach it only after every downstream sender to that listener is known to emit the header. In a current CRD, an empty settings object enables required PROXY protocol; leave `optional` false so non-PROXY senders are rejected:

```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: ClientTrafficPolicy
metadata:
  name: edge-proxy-protocol
  namespace: gateways
spec:
  targetRefs:
  - group: gateway.networking.k8s.io
    kind: Gateway
    name: edge
  proxyProtocol: {}
```

Use `enableProxyProtocol: true` only with an older installed CRD that lacks `proxyProtocol`. If both fields exist and are set, current Envoy Gateway gives `proxyProtocol` precedence.

On HAProxy, the corresponding backend server line uses `send-proxy-v2`. Roll out one side only during a coordinated maintenance step or use a separate canary listener; an asymmetric change can break every connection immediately.

PROXY protocol preserves client address, not SNI. The TLS ClientHello must still follow the header and contain a server name matching a filter chain.

## Check Port Translation and Health Checks

Follow the HAProxy backend address through the Envoy Gateway Service:

```bash
kubectl -n envoy-gateway-system get service \
  -l gateway.envoyproxy.io/owning-gateway-name=edge -o yaml
kubectl -n envoy-gateway-system get endpointslice \
  -l kubernetes.io/service-name=ENVOY_SERVICE -o yaml
```

Replace the placeholder after reading the Service name. Confirm HAProxy reaches the Service or node port that maps to the Gateway listener. A load balancer health check hitting HTTP on a TLS port can produce noisy filter-chain misses without affecting real clients. Configure a TLS-aware check with appropriate SNI or use Envoy Gateway's supported listener health-check facility.

Compare behavior by HAProxy instance and Envoy endpoint. Intermittent failures can mean only one HAProxy backend omits SNI, one configuration generation lacks the route, or one listener address family differs.

## Verify SNI on the Wire Without Capturing Secrets

If configuration looks correct, take a short, tightly filtered packet capture at the HAProxy-to-Envoy hop under an approved procedure. A TLS ClientHello exposes SNI in ordinary TLS 1.2/1.3 handshakes unless encrypted client hello is used. Confirm:

- the first bytes are a PROXY header only when Envoy expects one;
- a TLS ClientHello follows;
- its SNI is `api.example.com` exactly; and
- the destination port is the listener inspected in Envoy.

Do not capture application payload unnecessarily. Use a short duration and snap length, restrict host and port, encrypt the artifact, and delete it according to incident retention policy. With TLS passthrough, no decryption key is needed to inspect the conventional ClientHello metadata.

## Verify the Repair Across Hostnames and Paths

After applying the chosen model, wait for Gateway and route status to show accepted and programmed. Verify generated listener filter chains and run tests for:

- the intended hostname with SNI, which should succeed;
- an unknown hostname, which should follow the deliberate default or be rejected;
- clients with HTTP/1.1 and HTTP/2 ALPN where both are supported;
- each HAProxy replica and Envoy Gateway endpoint; and
- PROXY and non-PROXY sources according to the listener's explicit contract.

Monitor `NR`, `filter_chain_not_found`, TLS handshake failures, and route attachment status. A catch-all default filter chain can make the error disappear while routing unknown names to the wrong tenant, so add one only when that behavior is explicitly safe.

## Conclusion

`NR filter_chain_not_found` occurs before normal HTTP routing. Behind HAProxy, first decide whether TLS is passed through, terminated to HTTP, or terminated and re-encrypted. Preserve or deliberately recreate SNI, align the Envoy listener's port and match criteria, and configure PROXY protocol symmetrically. The best proof is the generated filter chain plus a ClientHello whose transport, SNI, ALPN, and prefix bytes match it.

## Official Documentation

- [Envoy: Listener Filter Chain Match](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener_components.proto.html#config-listener-v3-filterchainmatch)
- [Envoy: Listener Filters](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/listeners/listener_filters.html)
- [Envoy: Configuring SNI for Listeners](https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/sni.html)
- [Envoy: Substitution Formatter and Response Flags](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html)
- [Envoy Gateway: TLS Passthrough](https://gateway.envoyproxy.io/docs/tasks/security/tls-passthrough/)
- [Envoy Gateway: Client Traffic Policy](https://gateway.envoyproxy.io/docs/tasks/traffic/client-traffic-policy/)
- [HAProxy: Enable the PROXY Protocol](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/enable-proxy-protocol/)
- [HAProxy: Server-Side Encryption](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/server-side-encryption/)
