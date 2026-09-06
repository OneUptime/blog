# Route Raw TCP and TLS Passthrough with Contour TCPProxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, TCP, TCP Proxy, TCP Routing, TLS, TLS Passthrough, HTTPProxy, Envoy, Kubernetes, Gateway API

Description: Route non-HTTP protocols through Contour by choosing edge TLS termination or SNI-based TLS passthrough and testing the real connection path.

---

`HTTPProxy.spec.tcpproxy` forwards byte streams instead of HTTP requests, but it is not a general cleartext TCP listener. In Contour 1.33, an HTTPProxy TCP session must arrive inside TLS so Envoy can select a virtual host from Server Name Indication, or SNI.

There are two distinct designs:

- TLS termination: Envoy presents the certificate, decrypts the connection, then sends raw TCP bytes to the Service.
- TLS passthrough: Envoy reads enough of the TLS ClientHello to select the SNI name, then forwards the encrypted connection to the Service.

Choose the design before writing the HTTPProxy. It determines who owns the certificate, what Envoy can observe, and whether the backend receives cleartext or encrypted bytes.

## Terminate TLS at Envoy

Use a TLS Secret when Envoy should own the handshake. This works for MQTT over TLS or another TCP protocol whose client begins with a standard TLS ClientHello and whose server can accept the decrypted stream on the Service port:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: mqtt-edge
  namespace: messaging
spec:
  virtualhost:
    fqdn: mqtt.example.com
    tls:
      secretName: mqtt-edge-tls
  tcpproxy:
    healthCheckPolicy:
      intervalSeconds: 10
      timeoutSeconds: 3
      unhealthyThresholdCount: 3
      healthyThresholdCount: 2
    services:
    - name: mqtt
      port: 1883
```

The Secret must be a valid TLS certificate for `mqtt.example.com`. After Envoy terminates TLS, the backend receives a plain TCP stream. Configure backend port 1883 for that exact behavior. Do not terminate at Envoy if the application's wire protocol performs a protocol-specific negotiation before starting TLS. For example, PostgreSQL sends an SSL negotiation message before its TLS ClientHello, so it is not interchangeable with direct TLS-wrapped TCP.

When `tcpproxy` exists, HTTP routes on the same HTTPProxy are ignored. Use a dedicated hostname and a root HTTPProxy for the TCP service.

## Pass TLS Through to the Backend

Use passthrough when the backend must perform the handshake, own the private key, or enforce protocol-specific client certificates:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: mqtt-passthrough
  namespace: messaging
spec:
  virtualhost:
    fqdn: mqtt.example.com
    tls:
      passthrough: true
  tcpproxy:
    healthCheckPolicy:
      intervalSeconds: 10
      timeoutSeconds: 3
      unhealthyThresholdCount: 3
      healthyThresholdCount: 2
    services:
    - name: mqtt-tls
      port: 8883
```

Do not set `secretName` in passthrough mode. The Service endpoint must present a certificate valid for the SNI name and finish the TLS handshake itself.

Because Envoy does not decrypt the stream, HTTP-only controls do not apply. Contour cannot use an HTTP path, rewrite headers, run HTTP external authorization, enforce HTTP CORS, or emit HTTP response codes for this connection. The backend owns those concerns.

## SNI Is a Hard Requirement

The client must send SNI matching `spec.virtualhost.fqdn`. Connecting by IP with an old client that omits SNI cannot select this HTTPProxy reliably:

```bash
openssl s_client -connect ENVOY_ADDRESS:443 -servername mqtt.example.com -brief
```

Keep the hostname in the client configuration and point that hostname to Envoy. Test the application client itself because `openssl s_client` proves only the TLS handshake, not MQTT or another application protocol.

Passthrough preserves the original ClientHello and lets the backend see the TLS session. It does not necessarily preserve the original source IP. That depends on the load balancer, kube-proxy path, `externalTrafficPolicy`, and any configured PROXY protocol support.

## Balance Multiple Backends Deliberately

`tcpproxy.services` may contain weighted Services:

```yaml
tcpproxy:
  services:
  - name: mqtt-v1
    port: 1883
    weight: 90
  - name: mqtt-v2
    port: 1883
    weight: 10
```

Weights distribute new connections, not individual messages within a long-lived connection. A 90/10 split can converge slowly when sessions last hours. Drain old connections and observe connection counts before declaring a rollout complete.

The TCP health policy is connect-only. A successful TCP connection proves that a port accepts connections, not that a login, query, or application transaction succeeds. Keep protocol-aware health and readiness checks at the workload layer.

Contour also supports delegating TCPProxy configuration with the singular `tcpproxy.include` field. The older plural `includes` field remains for compatibility but is deprecated.

## Do Not Use HTTPProxy for Arbitrary Cleartext TCP

A cleartext Redis, MQTT, or database connection has no TLS SNI for the HTTPProxy virtual host to match. Wrapping the connection in TLS is one solution. Another is Gateway API `TCPRoute`, which binds to an explicit TCP listener instead of selecting by hostname.

`TCPRoute` belongs to Gateway API's experimental channel for the versions used by Contour 1.33. Installing experimental CRDs is a cluster-level decision, and the Gateway listener port must also be exposed by the Envoy Service. Use dynamic Gateway provisioning when practical because the provisioner keeps listener and Service ports aligned.

Do not label a plain HTTPProxy TCPProxy example as raw internet TCP without noting the TLS envelope. That omission commonly produces immediate connection resets or a listener that never matches.

## Validate Status and Both Ends

Check Contour's validation result before debugging the application:

```bash
kubectl -n messaging get httpproxy mqtt-passthrough \
  -o jsonpath='{.status.currentStatus}{"\n"}{.status.description}{"\n"}'

kubectl -n messaging get service mqtt-tls
kubectl -n messaging get endpointslice \
  -l kubernetes.io/service-name=mqtt-tls
```

Then confirm:

1. DNS resolves to the correct Envoy address.
2. The client supplies the expected SNI name.
3. NetworkPolicy permits Envoy to reach the backend port.
4. The Service `targetPort` reaches the port the process actually listens on.
5. Termination mode sends cleartext to the backend, while passthrough mode sends TLS.
6. A real client completes an application operation, not just a TCP handshake.

For passthrough, inspect the backend certificate through Envoy:

```bash
openssl s_client -connect ENVOY_ADDRESS:443 -servername mqtt.example.com \
  -showcerts </dev/null
```

For edge termination, the same command should show the certificate stored in the HTTPProxy's Secret. That simple comparison catches a large class of accidental mode changes.

## Conclusion

HTTPProxy TCPProxy routes TLS-encapsulated sessions by SNI. Terminate TLS at Envoy when the backend expects the decrypted stream, or pass it through when the backend owns TLS. Use Gateway API TCPRoute for arbitrary cleartext TCP, and validate the real application protocol in either design.

## Official Documentation

- [Project Contour 1.33 TLS session proxying and passthrough](https://projectcontour.io/docs/1.33/config/tls-termination/#tls-session-proxying)
- [Project Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Project Contour 1.33 upstream health checks](https://projectcontour.io/docs/1.33/config/health-checks/)
- [Project Contour 1.33 Gateway API implementation](https://projectcontour.io/docs/1.33/config/gateway-api/)
- [Gateway API TCPRoute documentation](https://gateway-api.sigs.k8s.io/reference/api-types/tcproute/)
- [Kubernetes Service documentation](https://kubernetes.io/docs/concepts/services-networking/service/)
