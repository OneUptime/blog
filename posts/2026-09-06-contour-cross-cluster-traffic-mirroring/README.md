# Mirror Contour Traffic Across Clusters Without Host 404s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, Traffic Mirroring, Multi-Cluster, ExternalName, HTTPProxy, Envoy, Troubleshooting

Description: Mirror a controlled traffic sample to another cluster while handling Envoy shadow Host suffixes, TLS, DNS, and side effects.

---

Contour can mark one HTTPProxy service as a mirror. Envoy sends a copy of matching requests to that service and ignores its response, so the primary response path does not wait for the shadow backend.

Cross-cluster mirroring adds two details that local examples often hide:

- the mirror needs a resolvable, routable Service abstraction in the source cluster; and
- Envoy appends `-shadow` to the mirrored request's Host or `:authority` by default.

If the receiving ingress recognizes only the original host, the mirror can reach the remote cluster and receive a 404 there. Since mirror responses are discarded, that failure can be invisible to the original client.

## Make the Remote Target Safe First

A mirrored request is not semantically read-only. It can contain a body and can trigger writes, emails, payments, or external API calls. Envoy's fire-and-forget behavior means only that the mirror response is not returned to the caller.

Point the remote route at a shadow application that has isolated data and disabled side effects. Redact secrets or choose only safe routes before mirroring. Do not mirror login credentials, session cookies, authorization headers, personal data, or regulated payloads into an environment that is not approved to receive them.

Start with a small percentage. Contour accepts mirror `weight` values from 1 through 100. Omitting weight mirrors 100 percent, and setting it explicitly to zero also results in 100 percent in Contour 1.33. To disable mirroring, remove the entire mirror service entry.

## Represent the Remote Endpoint

One direct option is a local `ExternalName` Service whose target is the other cluster's private ingress DNS name:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: orders-shadow-remote
  namespace: orders
spec:
  type: ExternalName
  externalName: shadow-ingress.cluster-b.example.net
  ports:
  - name: https
    port: 443
    protocol: TCP
```

Contour disables ExternalName Service processing by default because it can expose sensitive cluster-local endpoints, including an Envoy admin interface. Enabling `enableExternalNameService` is a cluster-administrator decision. Apply egress policy and an admission allowlist for approved external DNS suffixes.

A safer and more controllable alternative is a local shadow-relay Service. The relay accepts the mirror, removes sensitive headers, normalizes Host, and forwards through an authenticated cross-cluster channel. Contour then uses an ordinary ClusterIP Service and does not need broad ExternalName support.

Whichever pattern you use, prove DNS resolution and network reachability from Envoy's environment. Cross-cluster private DNS is often visible to application nodes but not to every cluster resolver or egress path.

## Configure One Mirror Service

An HTTPProxy route may nominate one mirror service:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: orders
  namespace: orders
spec:
  virtualhost:
    fqdn: api.example.com
    tls:
      secretName: api-example-com-tls
  routes:
  - conditions:
    - prefix: /v1/orders/read-model/
    services:
    - name: orders-primary
      port: 8080
    - name: orders-shadow-remote
      port: 443
      protocol: tls
      validation:
        caSecret: cluster-b-ingress-ca
        subjectName: shadow-ingress.cluster-b.example.net
        subjectNames:
        - shadow-ingress.cluster-b.example.net
      mirror: true
      weight: 5
```

The CA Secret is an Opaque Secret in `orders` with `ca.crt`. The ExternalName target supplies Envoy's upstream SNI, while validation independently checks the remote certificate against that DNS name and CA. If the remote endpoint uses a public certificate, explicitly configure the trust bundle required by your policy; do not assume Contour automatically uses a host operating-system trust store for this field.

Mirroring is not supported for HTTP CONNECT or upgraded connections. Do not use it to copy WebSockets.

## Account for Envoy's Shadow Host

For an incoming authority such as `api.example.com`, Envoy's request-mirror policy changes the mirror authority to:

```text
api.example.com-shadow
```

Contour 1.33's HTTPProxy mirror field does not expose Envoy's `disable_shadow_host_suffix_append` or mirror-only host rewrite controls. A normal route-level Host rewrite would affect the primary request too, and a mirror service's header policy is not a substitute for a mirror-policy host override.

Use one of these explicit designs:

1. Configure the remote ingress to accept the exact `api.example.com-shadow` authority on the TLS listener selected by SNI `shadow-ingress.cluster-b.example.net` and route it only to the shadow application. This requires an ingress that permits that SNI/Host combination. A normal Contour TLS virtual host binds Host to SNI, so merely adding a shadow-host HTTPProxy in cluster B does not make this example work; use the relay design in that case.
2. Point the mirror at a local relay that accepts the suffixed authority and sends the remote host expected by cluster B.

The relay pattern is usually cleaner when the remote ingress is shared or cannot claim the unusual shadow hostname. It also creates a good control point for redaction, authentication, sampling, and failure metrics.

Do not broaden the remote ingress to a catch-all host simply to suppress 404s. That can make unrelated or spoofed authorities reach the shadow workload.

## Observe the Mirror Separately

The original request can succeed even if the mirror cannot connect or returns 404. Monitor the mirror cluster, relay, and remote application directly.

Useful checks include:

```bash
kubectl -n orders describe httpproxy orders
kubectl -n projectcontour logs daemonset/envoy -c envoy --since=10m |
  grep 'api.example.com'
```

At the receiver, log the authority and a correlation ID, but not credentials or bodies. The mirror carries the request ID forwarded by the source Envoy, which may already have replaced a client-supplied `x-request-id`. A receiving edge proxy can replace it again, so verify ID propagation across both clusters before relying on it to correlate primary and shadow processing.

Watch mirror-cluster connection failures, TLS errors, request counts, remote 404s, and application side-effect guards. Because the source ignores mirror responses, receiver-side telemetry is essential.

## Roll Out and Roll Back

Use a controlled progression such as 1, 5, 25, then 100 percent only if the target can handle the extra load. Mirroring adds traffic without reducing primary traffic, so capacity for the shadow path is additional.

To stop mirroring, remove the mirror service entry. Do not use `weight: 0`, which means 100 percent for a mirror, and do not merely set `mirror: false`, which turns that entry into an ordinary load-balanced service. Confirm the HTTPProxy remains valid and mirror request counters stop.

Keep cross-cluster failures out of the primary availability path. A relay should use bounded queues and resource limits, and it must not create backpressure that stalls the original Envoy worker or application.

## Conclusion

Cross-cluster mirroring needs a safe receiver, an approved network target, explicit upstream TLS verification, and separate telemetry. Expect Envoy to append `-shadow` to the mirrored authority. Configure that exact remote host with compatible TLS SNI routing or place a relay in front of the remote cluster, since Contour 1.33 does not expose a mirror-only switch to disable the suffix.

## Official Documentation

- [Contour 1.33 traffic mirroring](https://projectcontour.io/docs/1.33/config/request-routing/#traffic-mirroring)
- [Contour 1.33 external service routing](https://projectcontour.io/docs/1.33/config/external-service-routing/)
- [Contour 1.33 upstream TLS](https://projectcontour.io/docs/1.33/config/upstream-tls/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Envoy request mirror policy](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html#config-route-v3-routeaction-requestmirrorpolicy)
- [Kubernetes ExternalName Services](https://kubernetes.io/docs/concepts/services-networking/service/#externalname)
