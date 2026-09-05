# gRPC Through Istio Fails with 503 UR: Diagnose HTTP/2 Negotiation, mTLS, and Upstream Resets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Envoy, gRPC, HTTP/2, mTLS, 503, Service Mesh, Troubleshooting

Description: Diagnose Envoy 503 UR responses for gRPC by locating the resetting hop and validating HTTP/2, Service ports, mTLS, endpoints, and timeouts.

---

In an Envoy access log, `503 UR` has a specific meaning: the response code is 503 and the `UR` flag is `UpstreamRemoteReset`. The upstream connection or stream was reset by the remote peer. It does not prove that the application process sent the reset. The remote peer might be the backend sidecar, the backend gRPC server, a gateway, or another load balancer.

For gRPC, investigate these possible causes of resets and related upstream failures. Depending on the failure stage, Envoy may report `UF`, `UC`, `UPE`, or a timeout flag instead of `UR`:

- Envoy opens HTTP/1.1 to a backend that requires HTTP/2;
- plaintext h2c and TLS-wrapped HTTP/2 are confused;
- Istio mTLS policy or transport configuration disagrees across the hop; or
- an intermediary or timeout resets a legitimate long-lived HTTP/2 stream.

Trace one request in both directions and identify the first component that emits the reset.

## Preserve the Detailed Access-Log Evidence

The short flag is only a category. A useful log record includes protocol, upstream protocol, response code details, upstream cluster and host, request attempt count, and gRPC status. If structured access logging is already enabled, capture those fields for the failure. Otherwise preserve the default line and correlate it with proxy logs:

```bash
kubectl -n callers logs deploy/checkout \
  -c istio-proxy --since=10m --timestamps
kubectl -n grpc-backends logs deploy/payments-grpc \
  -c istio-proxy --since=10m --timestamps
kubectl -n grpc-backends logs deploy/payments-grpc \
  -c server --since=10m --timestamps
```

Record the request ID or trace ID, authority, method path, source proxy, selected upstream host, reset time, and whether response headers had started. Envoy's `%RESPONSE_CODE_DETAILS%` can distinguish an upstream reset before headers from one after response began. Do not enable body logging or publish authorization metadata; gRPC messages and headers may contain credentials.

If connection-level evidence confirms the request never reached the selected backend sidecar, investigate the caller-to-backend-proxy path. A missing HTTP access-log entry alone does not establish this: TLS failures can occur before HTTP logging, and HTTP/2 can reuse an existing connection. The Deployment log commands above select one Pod by default; correlate the actual caller Pod and selected backend Pod when replicas are present. A backend sidecar log at the same time can show whether it rejected downstream TLS, failed to reach localhost, or observed an application reset.

## Reproduce with a Protocol-Correct Client

Use `grpcurl` only with a non-sensitive health or test method and the correct transport mode. For a plaintext h2c listener:

```bash
grpcurl -plaintext \
  -authority payments.grpc-backends.svc.cluster.local \
  payments.grpc-backends.svc.cluster.local:9090 \
  list
```

For application-managed TLS:

```bash
grpcurl \
  -cacert /path/to/approved-ca.pem \
  -authority payments.example.com \
  payments.example.com:443 \
  list
```

Server reflection may be disabled, so `list` can fail even when transport is healthy. In that case provide the service descriptor and invoke an approved, idempotent method. Do not use `-plaintext` merely because it makes one test connect, and do not use certificate-skip flags in the final test.

Separate client-to-sidecar application TLS from Istio mTLS. A typical in-mesh gRPC application sends plaintext HTTP/2 to its local sidecar, while Istio independently encrypts proxy-to-proxy traffic. An application that owns its own TLS has a different passthrough model and should be documented explicitly.

## Verify Kubernetes and Istio Protocol Selection

Inspect the backend Service's port name, `appProtocol`, Service port, and target port:

```bash
kubectl -n grpc-backends get service payments -o json |
  jq '.spec.ports[] | {name, appProtocol, protocol, port, targetPort}'

kubectl -n grpc-backends get endpointslice \
  -l kubernetes.io/service-name=payments -o yaml
```

Istio recognizes `grpc` and `http2` as HTTP/2 protocols. Protocol can be selected by a `name: <protocol>-<suffix>` convention or Kubernetes `appProtocol`; when both exist, `appProtocol` takes precedence. Ensure the Service says what the server really speaks:

```yaml
ports:
- name: grpc-api
  appProtocol: grpc
  port: 9090
  targetPort: grpc
```

The corresponding Pod should define the named target:

```yaml
ports:
- name: grpc
  containerPort: 9090
```

Container-port metadata does not start the server, so also verify the process listens on the Pod IP or all interfaces, not only an unexpected loopback address.

Gateways deserve special attention. Istio documents that gateways do not automatically determine the backend HTTP version in all cases and ordinarily forward HTTP using HTTP/1.1 unless the backend Service explicitly selects `http2` or `grpc`, or a carefully chosen `useClientProtocol` policy applies. An external client can negotiate HTTP/2 with the gateway while the gateway still opens HTTP/1.1 upstream.

`useClientProtocol` is not a universal fix: an HTTPS gateway may advertise both HTTP/1.1 and HTTP/2 to clients, and preserving HTTP/2 toward a server that supports only HTTP/1.1 will break it. Prefer an explicit backend protocol.

## Inspect Listener, Route, Cluster, and Endpoint

Query the proxy that logged `UR`:

```bash
istioctl proxy-config listeners \
  pod/checkout-6b69987df8-mq7rs.callers
istioctl proxy-config routes \
  pod/checkout-6b69987df8-mq7rs.callers
istioctl proxy-config clusters \
  pod/checkout-6b69987df8-mq7rs.callers \
  --fqdn payments.grpc-backends.svc.cluster.local -o json \
  > /tmp/payments-cluster.json
istioctl proxy-config endpoints \
  pod/checkout-6b69987df8-mq7rs.callers \
  --cluster 'outbound|9090||payments.grpc-backends.svc.cluster.local'
```

Copy the actual cluster name from the cluster listing. In its JSON, inspect typed extension protocol options for HTTP/2, the transport socket or transport socket matches for mTLS, and circuit-breaker limits. Use the endpoint output for the selected address; EDS endpoint addresses are not generally embedded in the cluster JSON. The complete chain should show:

1. an HTTP-aware listener accepting the request;
2. a route matching the `:authority` and RPC path;
3. the intended outbound cluster;
4. HTTP/2 upstream protocol options; and
5. a ready endpoint on the server's listening port.

Repeat on an ingress gateway if one is present. A correct sidecar cluster cannot repair a gateway-to-backend protocol mismatch.

## Confirm HTTP/2 and ALPN at TLS Boundaries

At an application-managed TLS endpoint, inspect negotiation without sending credentials:

```bash
openssl s_client \
  -connect payments.example.com:443 \
  -servername payments.example.com \
  -alpn h2 \
  -CAfile /path/to/approved-ca.pem \
  -verify_hostname payments.example.com \
  -verify_return_error </dev/null
```

The negotiated ALPN should be `h2` for gRPC over TLS. This command offers only `h2`, so a conforming peer cannot select `http/1.1`. No negotiated ALPN or a negotiation failure warrants checking the TLS listener or intermediary. A close after the handshake alone is inconclusive because this command sends no HTTP/2 preface and closes its input. This test does not apply directly to Istio workload mTLS, whose certificates and ALPN are managed between proxies; use proxy configuration and logs there rather than extracting private keys.

For plaintext gRPC, the backend expects HTTP/2 prior knowledge, commonly called h2c. Sending an HTTP/1.1 Upgrade request is not equivalent to every gRPC client's behavior. Test with a real gRPC client or `grpcurl -plaintext`.

## Check mTLS Independently from gRPC

Inspect policy resources and the backend configuration, then correlate them with the effective proxy configuration:

```bash
kubectl get peerauthentication -A -o yaml
kubectl get destinationrule -A -o yaml
istioctl x describe pod payments-grpc-POD.grpc-backends
```

`PeerAuthentication` controls what TLS mode the destination sidecar accepts. DestinationRule or auto mTLS controls what the source sidecar sends. Under `STRICT`, a caller without a sidecar cannot connect directly to the application through the intercepted Pod port using plaintext. Conversely, an explicit DestinationRule that disables mTLS can override the automatic behavior and make a meshed caller fail.

Port-level `PeerAuthentication` uses the workload port, not the Kubernetes Service port. DestinationRule port-level settings select the service port. Confusing those number spaces can make only one gRPC port fail.

Check that both Pods have sidecars, valid workload certificates, trusted certificate chains, compatible trust-domain identities (including any configured aliases), and synchronized clocks. Do not switch the whole namespace to `PERMISSIVE` as a first diagnostic; that widens the accepted traffic. If a narrow temporary policy is approved, time-bound it and verify the final state returns to `STRICT`.

## Find the Component Sending the Reset

Follow the selected endpoint and compare both sides:

- Does the backend sidecar accept the downstream connection?
- Does it open a connection to `127.0.0.1` or the Pod address on the correct port?
- Does the application log the RPC or immediately close the HTTP/2 connection?
- Does a load balancer between proxies enforce an idle or maximum connection age?
- Is the reset triggered only after a fixed interval or message size?

HTTP/2 GOAWAY is a connection-level signal used for graceful shutdown or connection errors; inspect its error code and last-stream ID. RST_STREAM terminates an individual stream. Envoy may retry some failures only before response headers and only according to route policy. Blind retries can duplicate non-idempotent RPCs and amplify overload.

For streaming RPCs, inspect route timeout, maximum stream duration, and idle timeout separately. A total request timeout can terminate a healthy long-lived stream; an idle timeout should account for expected quiet periods. HTTP/2 PING behavior and application messages are not interchangeable under every timer. Change one timer only after the failure duration matches it.

Also check Pod termination and server graceful-shutdown behavior. A backend that exits without sending GOAWAY or allowing streams to drain can generate a burst of upstream failures such as `UC` or `UR` during rollouts even with correct steady-state configuration.

## Verify the Repair

Analyze candidate Service and Istio changes before applying:

```bash
istioctl analyze -f grpc-routing.yaml
kubectl apply --dry-run=server -f grpc-routing.yaml
```

With a canary backend and caller, verify the effective cluster uses HTTP/2 and the intended mTLS transport, then run unary and streaming test RPCs. Exercise a rollout to confirm graceful drain. Monitor `UR`, upstream resets before and after headers, gRPC status, backend GOAWAY/reset logs, and latency.

Success means more than removing the 503: certificate verification remains enabled, strict policy remains effective, non-idempotent requests are not duplicated, and long-lived streams survive the expected idle period and either finish within the rollout drain window or reconnect as designed.

## Conclusion

`503 UR` says the observing Envoy received an upstream remote reset. It does not name the reset's original author. Preserve response details and the selected endpoint, verify explicit HTTP/2 protocol selection at every gateway and Service, evaluate Istio mTLS as a separate proxy-to-proxy layer, and correlate both sidecars with the application. The first component that sees a healthy connection and then emits a reset is where the investigation should focus.

## Official Documentation

- [Envoy: Substitution Formatter and Response Flags](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html)
- [Envoy: HTTP Response Code Details](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/response_code_details)
- [Istio: Protocol Selection](https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/)
- [Istio: Understanding TLS Configuration](https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/)
- [Istio: PeerAuthentication](https://istio.io/latest/docs/reference/config/security/peer_authentication/)
- [Istio: Destination Rule](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [gRPC: Debugging](https://grpc.io/docs/guides/debugging/)
