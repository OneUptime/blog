# Envoy Reports `WRONG_VERSION_NUMBER` During TLS Origination: Align Application, ServiceEntry, and DestinationRule Ports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Envoy, TLS Origination, Service Mesh, TLS Handshake, Traffic Management, Troubleshooting

Description: Diagnose TLS wrong-version errors by separating application and Envoy connections, then aligning port protocols, targets, SNI, and trust.

---

`WRONG_VERSION_NUMBER` sounds like an obsolete TLS protocol, but in an Istio egress path it more often means that one side expected a TLS record and received plaintext bytes. Raising the minimum or maximum TLS version will not turn an HTTP response into a TLS handshake.

TLS origination creates two independent connections:

```text
application -- plaintext HTTP --> local Envoy
local Envoy  -- TLS/HTTPS ------> external server
```

The application URL, ServiceEntry port protocol and target, and DestinationRule TLS policy must all describe the same boundary. One failure is double encryption: the application sends HTTPS through a TLS/opaque service port while a DestinationRule tells Envoy to originate another TLS layer. If that service port is instead classified as HTTP, the encrypted ClientHello can fail HTTP parsing before the originating cluster is even selected. Another mismatch is sending originated TLS to an upstream plaintext port.

## Capture Which Hop Produced the Error

With Envoy access logging enabled, collect the application error and proxy access log for one request:

```bash
kubectl -n clients logs deploy/egress-client \
  -c app --since=10m --timestamps
kubectl -n clients logs deploy/egress-client \
  -c istio-proxy --since=10m --timestamps
```

Record the URL scheme, hostname, destination port, source Pod, response flag, response code detail, and upstream host. The application's OpenSSL error may be about its connection to local Envoy, while Envoy's TLS error may be about the upstream connection. Do not merge them into one handshake.

Run a controlled verbose request without credentials:

```bash
kubectl -n clients exec deploy/egress-client -c app -- \
  curl -sv --connect-timeout 3 --max-time 10 \
  http://api.example.test:8080/health -o /dev/null
```

Use the actual intended scheme and port. Avoid `-k` or `--insecure`; skipping verification can hide a second problem and does not repair a plaintext/TLS mismatch. Do not put API tokens in the command line or verbose output.

## Draw the Intended Port Contract

Write down four values before editing configuration:

| Layer | Question | Example origination value |
| --- | --- | --- |
| Application | What bytes does the client send? | HTTP to port 8080 |
| ServiceEntry | How does Istio classify that service port? | `HTTP` on 8080 |
| Endpoint target | Which remote port receives Envoy's connection? | 443 |
| DestinationRule | Does Envoy add TLS? | `SIMPLE` on service port 8080 |

The DestinationRule port selector refers to the destination service port to which the policy applies. The ServiceEntry `targetPort` can map that logical port to a different upstream endpoint port.

One explicit origination model is:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.example.test
  location: MESH_EXTERNAL
  ports:
  - number: 8080
    name: http-origination
    protocol: HTTP
    targetPort: 443
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: api.example.test
  trafficPolicy:
    portLevelSettings:
    - port:
        number: 8080
      tls:
        mode: SIMPLE
        sni: api.example.test
        caCertificates: system
        subjectAltNames:
        - api.example.test
```

This is an example, not a universal patch. Verify that the deployed Istio version supports `caCertificates: system`, that the proxy image has the intended trust store, and that the upstream certificate identity is `api.example.test`. Use your organization's CA bundle for private endpoints.

The application must call `http://api.example.test:8080` in this model. If it calls `https://...:8080`, it sends an inner TLS ClientHello to a port Envoy has classified as HTTP and configured to originate TLS, creating a protocol mismatch.

## Inspect the Live Istio Objects

Find every overlapping ServiceEntry and DestinationRule, including resources in other namespaces that may be visible to the caller:

```bash
kubectl get serviceentry,destinationrule,virtualservice -A -o yaml
istioctl analyze --all-namespaces
```

Filter carefully in a real incident rather than publishing a cluster-wide dump. Check:

- exact and wildcard hosts that both match the hostname;
- `ports[].number`, `name`, `protocol`, and `targetPort`;
- DestinationRule `host` resolution, especially short names;
- top-level and port-level TLS policies;
- `exportTo` and Sidecar import scope; and
- an egress gateway rule that may originate TLS a second time.

Istio's official troubleshooting guide shows that declaring port 443 as `HTTP` while an application sends HTTPS makes Envoy try to parse encrypted bytes as HTTP. Conversely, `TLS` or `HTTPS` protocol declarations generally describe already-encrypted traffic, not plaintext traffic that should transparently be upgraded.

## Inspect the Effective Envoy Configuration

Query the caller's proxy, because that is where sidecar origination occurs:

```bash
istioctl proxy-config clusters \
  pod/egress-client-7b5c86f78f-9rx4v.clients \
  --fqdn api.example.test -o json > /tmp/api-clusters.json

jq '.[] | {name, type, loadAssignment, transportSocket,
           transportSocketMatches}' /tmp/api-clusters.json
```

A TLS-originating cluster should have an upstream TLS transport socket. Verify the cluster name contains the logical ServiceEntry port you intended and its endpoint resolves to the remote target port:

```bash
istioctl proxy-config endpoints \
  pod/egress-client-7b5c86f78f-9rx4v.clients \
  --cluster 'outbound|8080||api.example.test'
```

Inspect routes and listeners when the application-facing side is HTTP-aware:

```bash
istioctl proxy-config listeners \
  pod/egress-client-7b5c86f78f-9rx4v.clients --port 8080
istioctl proxy-config routes \
  pod/egress-client-7b5c86f78f-9rx4v.clients
```

Copy actual cluster and route names from summary output; generated names vary. A declarative object existing in Kubernetes does not prove this proxy received it or selected the expected rule.

If an egress gateway is involved, repeat the cluster inspection on the gateway. There can be three connections—application to sidecar, sidecar to gateway, and gateway to external server—and TLS must be assigned explicitly to each. Istio documents that passthrough at one layer plus origination at an unintended layer can result in double encryption.

## Probe the Upstream Protocol Outside the Ambiguous Route

From an authorized diagnostic network, test the external endpoint directly to learn what it serves. Keep this separate from production egress enforcement and use no sensitive payload:

```bash
openssl s_client \
  -connect api.example.test:443 \
  -servername api.example.test \
  -verify_hostname api.example.test \
  -verify_return_error </dev/null

curl -sv --connect-timeout 3 --max-time 10 \
  https://api.example.test:443/health -o /dev/null
```

If port 443 returns a valid chain and HTTP response under TLS, the remote service is behaving as HTTPS. If the target port returns immediate readable HTTP to a TLS ClientHello, it is probably plaintext. Capture only public certificate data. Never disable certificate verification as the permanent resolution.

A direct test from a non-mesh Pod can be useful, but it follows different DNS, NetworkPolicy, and egress-gateway rules. It establishes upstream behavior, not whether the meshed route is correct.

## Recognize the Main Mismatch Patterns

### Application HTTPS plus DestinationRule `SIMPLE`

On a `TLS`/`HTTPS` or otherwise opaque service port, the application has already encrypted the request and the originating cluster can wrap those TLS records in another TLS connection. On a port classified as `HTTP`, the ClientHello is not an HTTP request and may instead fail at the downstream HTTP parser. Remove origination if end-to-end passthrough is intended, or change the application to plaintext on a dedicated HTTP logical port when transparent origination is the design. Never silently downgrade sensitive traffic without confirming the local Pod-to-proxy trust model.

### Application HTTP but ServiceEntry says `HTTPS` or `TLS`

Istio treats the bytes as already encrypted or opaque. HTTP routing and transparent origination may not occur as intended. Declare a distinct HTTP service port and apply TLS origination there.

### DestinationRule originates TLS to a plaintext target

Correct `targetPort` or the upstream service. A TLS version error can occur if the cleartext HTTP listener replies to Envoy's ClientHello with plaintext; other listeners may close or reset the connection instead.

### Port-level policy selects the wrong port

The selector uses the ServiceEntry's logical port. A policy written for target port `443` will not apply to a logical service port `8080` merely because `targetPort` is 443.

### Gateway terminates or passes through unexpectedly

Treat inbound and outbound gateway TLS independently. After HTTPS termination, routing is HTTP; terminating TLS for a non-HTTP protocol instead requires TCP routing. For TLS passthrough, routing uses TLS/SNI and the payload remains encrypted. Align VirtualService route type and DestinationRule with that decision.

## Apply and Verify a Single-Boundary Fix

Render the proposed configuration and analyze it:

```bash
istioctl analyze -f egress-api.yaml
kubectl apply --dry-run=server -f egress-api.yaml
```

Roll it out to a canary caller if scope allows. Verify the effective Envoy cluster has one expected TLS transport socket, the endpoint port is correct, SNI matches the upstream identity, and the controlled request succeeds with full certificate verification.

Then test failure cases: an untrusted certificate must fail, the wrong hostname must fail, and plaintext sent directly to the upstream TLS port must not be accepted. Monitor upstream connection failures, TLS errors, response flags, and certificate expiry.

Do not declare success solely because `WRONG_VERSION_NUMBER` disappeared. Replacing it with disabled verification or unintended plaintext removes the symptom at the cost of security.

## Conclusion

During TLS origination, the application-facing and upstream-facing connections have different protocols by design. `WRONG_VERSION_NUMBER` usually means those boundaries were collapsed or mapped to the wrong port. Write down the intended bytes on each hop, align ServiceEntry and DestinationRule service ports with the upstream target, inspect the effective caller and gateway clusters, and verify both successful and rejected TLS cases.

## Official Documentation

- [Istio: Traffic Management Problems and TLS Mistakes](https://istio.io/latest/docs/ops/common-problems/network-issues/#tls-configuration-mistakes)
- [Istio: Egress TLS Origination](https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/)
- [Istio: Understanding TLS Configuration](https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/)
- [Istio: Service Entry](https://istio.io/latest/docs/reference/config/networking/service-entry/)
- [Istio: Destination Rule](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio: Security Best Practices](https://istio.io/latest/docs/ops/best-practices/security/)
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
