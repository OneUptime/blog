# Diagnose Envoy xDS gRPC Status 14 and `initial_fetch_timeout`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Envoy, XDS, gRPC, DNS, Kubernetes, Troubleshooting

Description: Diagnose an unready Istio data plane by tracing status 14 from Envoy bootstrap through DNS, Service routing, TLS, and xDS initialization.

---

An Istio-injected Pod can remain unready even though the application process is healthy. The proxy log may repeat an xDS connection error containing `rpc error: code = Unavailable`, `status 14`, a DNS failure, or a connection timeout. These messages all describe a failed control-plane path, but they do not identify which layer failed.

Status 14 is the gRPC code `UNAVAILABLE`. It is deliberately broad: the service cannot currently be used, often because name resolution, TCP reachability, TLS, authentication, or the remote process failed. Treat it as a starting point, not as proof that Istiod itself is down.

The useful path to trace is:

```text
Envoy bootstrap -> local pilot-agent xDS Unix socket
pilot-agent effective discoveryAddress
  -> DNS or configured address
  -> istiod Service and EndpointSlices
  -> TCP 15012
  -> TLS and workload authentication
  -> long-lived xDS gRPC stream
  -> first usable configuration
```

## Capture the Exact Failure Before Restarting

Restarting can erase the strongest evidence and create a healthy connection on a different node or Istiod replica. First record Pod state, events, and both current and previous proxy logs:

```bash
kubectl -n payments get pod checkout-7d9f6f7c8b-k2j9m -o wide
kubectl -n payments describe pod checkout-7d9f6f7c8b-k2j9m
kubectl -n payments logs checkout-7d9f6f7c8b-k2j9m \
  -c istio-proxy --since=20m --timestamps
kubectl -n payments logs checkout-7d9f6f7c8b-k2j9m \
  -c istio-proxy --previous --timestamps
```

Keep the complete error text. `no such host`, `connection refused`, `i/o timeout`, `connection reset`, `x509`, and `Unauthenticated` lead to different branches. Note the node, Pod IP, requested Istio revision, actual proxy image, and first failure time. A node-specific result usually points toward DNS, CNI, firewall, or routing; a revision-specific result points toward injection or control-plane configuration.

Ask Istio whether the proxy has a control-plane session:

```bash
istioctl proxy-status
istioctl proxy-status checkout-7d9f6f7c8b-k2j9m.payments
```

A missing proxy is not connected to the Istiod instances queried. Confirm the Kubernetes context, control-plane namespace, and revision (using `--revision` where needed) before treating absence as a connection failure. `STALE` means Istiod sent an update for which it has not received an acknowledgement. `NOT SENT` can be normal when Istiod has no resource of that type to send, so it is not by itself an outage signal.

## Identify Both xDS Hops

Do not assume every workload uses `istiod.istio-system.svc:15012`. External control planes, revisions, remote clusters, and per-workload overrides can change the address. First inspect the generated bootstrap used by Envoy:

```bash
istioctl proxy-config bootstrap \
  pod/checkout-7d9f6f7c8b-k2j9m.payments -o json > /tmp/checkout-bootstrap.json

jq '{dynamicResources: .bootstrap.dynamicResources,
     xdsClusters:
       [.bootstrap.staticResources.clusters[] |
        select(.name | test("xds|istio"; "i")) |
        {name, type, loadAssignment, transportSocket}]}' \
  /tmp/checkout-bootstrap.json
```

In the stock Istio 1.31 sidecar, Envoy's ADS cluster is `xds-grpc` and points to pilot-agent's local `./etc/istio/proxy/XDS` Unix-domain socket. The remote address is not the ADS cluster endpoint, but it is included in bootstrap node metadata at `.bootstrap.node.metadata.PROXY_CONFIG.discoveryAddress`. Inspect that value and correlate it with pilot-agent's startup log to distinguish the remote hop from Envoy's local socket.

Pilot-agent reads the remote address from its effective `ProxyConfig` and logs it when the xDS proxy starts. Capture that runtime evidence and the Pod-level overrides:

```bash
kubectl -n payments logs checkout-7d9f6f7c8b-k2j9m \
  -c istio-proxy --timestamps |
  grep -E 'Initializing with upstream address|connected to upstream XDS server|failed to connect to upstream'

kubectl -n payments get pod checkout-7d9f6f7c8b-k2j9m -o json |
  jq '{revision: .metadata.annotations["istio.io/rev"],
       proxyConfigOverride: .metadata.annotations["proxy.istio.io/config"],
       discoveryAddressOverride: .metadata.annotations["sidecar.istio.io/discoveryAddress"]}'
```

The injected `PROXY_CONFIG` environment value and the revision-matched Istio configuration explain where the base value came from; annotations can override it. If the startup line has rotated out, inspect previous logs and compare with a healthy Pod created by the same intended revision. Do not publish a full bootstrap or proxy configuration blindly: node metadata can contain environment-specific identifiers.

Confirm the requested and actual revision markers:

```bash
kubectl -n payments get pod checkout-7d9f6f7c8b-k2j9m \
  -o jsonpath='{.metadata.labels.istio\.io/rev}{"\n"}{.metadata.annotations.istio\.io/rev}{"\n"}'
kubectl -n payments get namespace payments --show-labels
```

Namespace labels influence which injector mutates a new Pod. The annotation on the resulting Pod represents the control-plane revision actually associated with the proxy. Recreate workloads only after correcting the owning Deployment or namespace selection; patching a running Pod cannot replace its bootstrap.

## Separate DNS Failure from Service Routing

If pilot-agent's upstream discovery address is a Kubernetes Service name, test that exact name from the affected Pod network. Distroless proxy images may lack a shell and DNS tools, so use an approved ephemeral debug image rather than changing the production image:

```bash
kubectl -n payments debug -it checkout-7d9f6f7c8b-k2j9m \
  --image=registry.k8s.io/e2e-test-images/dnsutils:1.3 \
  --target=istio-proxy -- sh

nslookup istiod.istio-system.svc.cluster.local
cat /etc/resolv.conf
```

Use an image pinned by digest in a real runbook. Ephemeral containers are persistent additions to Pod status and may be forbidden by policy; their use should be audited. Do not substitute a random Internet image during an incident.

Compare the failing Pod with a working Pod on the same node and with one on another node. Inspect CoreDNS only if the lookup actually fails:

```bash
kubectl -n kube-system get pods -l k8s-app=kube-dns -o wide
kubectl -n kube-system logs -l k8s-app=kube-dns \
  --since=10m --max-log-requests=10
```

Istio application DNS capture and pilot-agent's own resolution are not the same path in every case. The ephemeral container can run with a different UID from the sidecar, so its port-53 traffic may be redirected through Istio's DNS proxy while the sidecar process is excluded from application capture. Istio documentation also notes that DNS proxying for applications does not change how Envoy periodically resolves `ServiceEntry` hosts. For the agent's upstream xDS address, correlate the debug lookup with the agent's actual resolver and connection log rather than assuming that enabling application DNS capture repairs it.

If DNS returns an address, inventory the Service and all EndpointSlices:

```bash
kubectl -n istio-system get service istiod -o yaml
kubectl -n istio-system get endpointslice \
  -l kubernetes.io/service-name=istiod -o yaml
kubectl -n istio-system get pods -l app=istiod -o wide
```

Check that port `15012` maps to the intended target, endpoints are ready, and the addresses correspond to live Istiod Pods. A ClusterIP with no ready endpoint will not become healthy by changing Envoy timeouts.

## Test TCP and TLS Without Pretending It Is xDS

From an affected Pod, a TCP probe can provide adjacent evidence about whether routing reaches the port:

```bash
nc -vz -w 3 istiod.istio-system.svc.cluster.local 15012
```

If `nc` is unavailable, use an approved debug container. Success proves only a TCP accept. It does not prove gRPC, TLS identity, workload authentication, or xDS authorization. An ordinary application or ephemeral-container socket may also be captured by the sidecar, unlike pilot-agent's excluded control-plane connection, so record the capture mode and do not call this an exact reproduction of the xDS path.

Inspect the public server certificate and handshake without exposing workload credentials:

```bash
openssl s_client \
  -connect istiod.istio-system.svc.cluster.local:15012 \
  -servername istiod.istio-system.svc.cluster.local \
  -showcerts </dev/null
```

An unauthenticated diagnostic handshake does not reproduce the stock agent's complete authentication. In Istio 1.31's normal Kubernetes sidecar path, pilot-agent verifies Istiod's server certificate and SAN over TLS, then sends the workload's service-account token as per-RPC credentials; it does not normally present a workload client certificate for xDS. Provisioned or file-mounted certificate deployments can differ. The probe can still reveal certificate expiry or an unexpected issuer, but `-servername` only sets SNI; it does not enable hostname verification. This command also does not load Istio's root CA explicitly and normally continues after verification errors, so handshake completion does not prove the agent's trust or SAN checks will pass. It cannot test the workload token or xDS authorization. Check node and control-plane clock synchronization. Never paste service-account tokens, private keys, or the contents of `/var/run/secrets` into tickets.

If TCP times out, inspect NetworkPolicies, CNI policy, host firewalls, security groups, service routing, and any multi-cluster gateway. Test every Istiod endpoint and every affected node because a single broken replica or route can make the failure intermittent. Port `15012` is the recommended secure xDS and CA service; port `15010` is plaintext and is not an appropriate fallback for production troubleshooting.

## Inspect Envoy Initialization Rather Than Raising the Timeout

Envoy's `initial_fetch_timeout` bounds how long an xDS subscription waits for its first response during initialization. Envoy documents a 15-second default when the field is unset, and zero means wait indefinitely. That generic default is **not** the effective stock Istio 1.31 setting: Istio's bootstrap template explicitly sets both LDS and CDS `initial_fetch_timeout` to `0s`. Confirm the generated bootstrap rather than reasoning from Envoy's schema default:

```bash
jq '{lds: .bootstrap.dynamicResources.ldsConfig.initialFetchTimeout,
     cds: .bootstrap.dynamicResources.cdsConfig.initialFetchTimeout}' \
  /tmp/checkout-bootstrap.json
```

With the stock values, Envoy waits indefinitely for its first LDS and CDS responses. If another distribution or a custom bootstrap uses a finite value, expiry lets Envoy proceed to the next initialization phase; it does not repair DNS, open a firewall, create an EndpointSlice, or make an invalid response valid. Nor does expiry guarantee Kubernetes readiness: stock Istio 1.31's agent keeps startup readiness at `503` until it observes successful first CDS and LDS updates.

Check the actual kubelet-facing readiness endpoint by port-forwarding `15021` in one terminal and querying it from another:

```bash
kubectl -n payments port-forward \
  pod/checkout-7d9f6f7c8b-k2j9m 15021:15021

curl -i http://127.0.0.1:15021/healthz/ready
```

Then query Envoy's raw admin readiness and initialization state through the local agent path:

```bash
kubectl -n payments exec checkout-7d9f6f7c8b-k2j9m \
  -c istio-proxy -- pilot-agent request GET ready

kubectl -n payments exec checkout-7d9f6f7c8b-k2j9m \
  -c istio-proxy -- pilot-agent request GET init_dump
```

These are different signals. Stock Istio 1.31's `15021/healthz/ready` startup gate waits for successful first CDS and LDS updates and for Envoy to report ready. `pilot-agent request GET ready` queries Envoy's raw `/ready`, which returns `200` only in the `LIVE` state and `503` otherwise; it does not reproduce the full kubelet readiness gate. `init_dump` identifies unready initialization targets. Use the outputs together to distinguish missing first CDS/LDS from an Envoy dependency still warming. The local admin interface is sensitive; use `pilot-agent`, do not expose port `15000` through a Service, and retain only the minimum diagnostic output.

Do not try to "increase" this timeout on an otherwise stock Istio 1.31 proxy: its LDS and CDS values are already infinite. If a verified custom bootstrap has a finite value that expires during healthy cold starts or across a known remote link, tune that custom value against measured startup distributions. Changing it cannot cure status 14, and making a finite timeout expire only allows Envoy initialization to advance without the missing configuration; it does not satisfy Istio's first-CDS/first-LDS readiness gate. Fix the delivery path first.

## Verify the Recovery End to End

After repairing the delivery path, first check whether the existing proxy reconnects and becomes ready. If injection or bootstrap changes require replacement, the following restarts the entire Deployment according to its configured strategy; it does not pause for manual verification of each Pod. Confirm the Deployment uses `RollingUpdate` and suitable availability settings, and verify recovery before restarting other workloads:

```bash
kubectl -n payments rollout restart deployment/checkout
kubectl -n payments rollout status deployment/checkout --timeout=5m
istioctl proxy-status
istioctl proxy-config listeners pod/checkout-7d9f6f7c8b-k2j9m.payments
istioctl proxy-config clusters pod/checkout-7d9f6f7c8b-k2j9m.payments
```

Replace the sample Pod name with the newly created one. Confirm the proxy is connected and synced, readiness is `200`, expected listeners and clusters exist, and a controlled application request succeeds. Also confirm that status 14 errors and unexpected reconnects stop recurring; one successful retry does not prove a flapping DNS or Istiod endpoint is fixed.

## Conclusion

An xDS status 14 is a symptom spanning several layers. Use the bootstrap for Envoy's local xDS leg, obtain pilot-agent's effective upstream discovery address from its runtime configuration and logs, then validate DNS, routing, TLS, authentication, and Envoy initialization. In stock Istio 1.31, LDS and CDS have a zero `initial_fetch_timeout` and wait indefinitely; changing a custom timeout is not a repair for a broken path. Recovery is complete only when both xDS legs remain healthy and the proxy has usable configuration.

## Official Documentation

- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: Application Requirements and Ports](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Istio: Global Mesh Options](https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/)
- [Envoy: Configuration Sources](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/config_source.proto.html)
- [Envoy: Initialization](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/init)
- [gRPC: Status Codes](https://grpc.io/docs/guides/status-codes/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Istio source: agent xDS proxy](https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/xds_proxy.go)
- [Istio source: Envoy bootstrap template](https://github.com/istio/istio/blob/release-1.31/tools/packaging/common/envoy_bootstrap.json)
- [Istio source: sidecar readiness probe](https://github.com/istio/istio/blob/release-1.31/pilot/cmd/pilot-agent/status/ready/probe.go)
