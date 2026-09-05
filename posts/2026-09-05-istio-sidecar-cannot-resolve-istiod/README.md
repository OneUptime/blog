# Istio Sidecar Cannot Resolve istiod: Trace Pod DNS, Bootstrap Configuration, and xDS Cluster Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Istiod, DNS Troubleshooting, Pod DNS, XDS, Envoy, Kubernetes, Troubleshooting

Description: Diagnose an Istio sidecar DNS failure by reading its actual discovery address and tracing resolver, Service, endpoint, and xDS cluster state.

---

An Istio sidecar whose pilot-agent logs `lookup istiod ... no such host` cannot establish the remote control-plane stream. Without that stream Envoy cannot receive new listeners, routes, clusters, or endpoints, and the Pod may remain unready during initial startup. The word `istiod` in the error is not enough to identify the query. A short name, fully qualified Service name, external control-plane hostname, or stale revision address each follows a different path.

Trace this sequence:

```text
pilot-agent effective discovery address
  -> Pod resolver configuration
  -> DNS server reachability and answer
  -> Kubernetes Service or external address
  -> ready Istiod endpoint
  -> pilot-agent TCP/TLS/gRPC upstream
  -> Envoy's local xDS Unix socket
```

Do not restart CoreDNS or reinstall Istio until the exact failing query and resolver are known.

## Capture the Exact Name and Failure Window

Collect current and previous proxy logs before a restart:

```bash
kubectl -n apps logs checkout-6fdcb7dc96-w2m85 \
  -c istio-proxy --since=20m --timestamps
kubectl -n apps logs checkout-6fdcb7dc96-w2m85 \
  -c istio-proxy --previous --timestamps
kubectl -n apps describe pod checkout-6fdcb7dc96-w2m85
```

Record the queried hostname, DNS server IP if logged, result (`NXDOMAIN`, timeout, refused, temporary failure), retry cadence, node, Pod IP, and first recovery. These shapes matter:

- `NXDOMAIN` says a reachable resolver answered that the name does not exist in its view;
- timeout says no timely reply and can be a NetworkPolicy, node-local DNS, or resolver-capacity problem;
- `connection refused` suggests the configured DNS address is reachable but not serving; and
- a resolved address followed by status 14 or a connect timeout means DNS succeeded and the next layer failed.

Check whether the proxy is absent or stale in Istio's view:

```bash
istioctl proxy-status
```

A proxy missing from the list is not currently connected to the queried Istiod instance. That is consistent with DNS failure but not proof of it.

## Separate Envoy's Bootstrap from the Agent Upstream

The common remote address is `istiod.istio-system.svc:15012`, but external control planes and revisions can override it. Current Istio sidecars normally put pilot-agent between Envoy and Istiod. Inspect Envoy's local xDS target first:

```bash
istioctl proxy-config bootstrap \
  pod/checkout-6fdcb7dc96-w2m85.apps -o json \
  > /tmp/checkout-bootstrap.json

jq '{dynamicResources: .bootstrap.dynamicResources,
     candidateClusters:
       [.bootstrap.staticResources.clusters[] |
        select(.name | test("xds|istio"; "i")) |
        {name, type, loadAssignment, dnsLookupFamily, transportSocket}]}' \
  /tmp/checkout-bootstrap.json
```

In stock Istio 1.31, the bootstrap's static `xds-grpc` cluster points to pilot-agent's local `./etc/istio/proxy/XDS` Unix-domain socket. It normally does not contain the remote Istiod hostname, its DNS mode, port `15012`, or the upstream TLS settings. The dump proves the Envoy-to-agent leg and records node metadata; it is not the source of truth for the agent-to-Istiod address.

Pilot-agent logs the effective remote address when its xDS proxy starts. Inspect that line, the injected base `PROXY_CONFIG`, and Pod-level overrides:

```bash
kubectl -n apps logs checkout-6fdcb7dc96-w2m85 \
  -c istio-proxy --timestamps |
  grep -E 'Initializing with upstream address|connected to upstream XDS server|failed to connect to upstream'

kubectl -n apps get pod checkout-6fdcb7dc96-w2m85 -o json |
  jq -r '.spec.containers[] | select(.name == "istio-proxy") |
         .env[]? | select(.name == "PROXY_CONFIG") | .value' |
  jq '{discoveryAddress, controlPlaneAuthPolicy}'

kubectl -n apps get pod checkout-6fdcb7dc96-w2m85 -o json |
  jq '{revision: .metadata.annotations["istio.io/rev"],
       proxyConfigOverride: .metadata.annotations["proxy.istio.io/config"],
       discoveryAddressOverride: .metadata.annotations["sidecar.istio.io/discoveryAddress"]}'
```

The startup log is the clearest runtime value because annotations can override the injected base configuration. If it has rotated out, inspect previous logs and the configuration for the injector revision recorded on the Pod. Compare with a healthy Pod created by that same intended revision. Injected environment and annotations are fixed on an existing Pod, so changing the owner normally requires Pod recreation.

Treat the dump as sensitive: it can reveal cluster, network, service-account, and workload metadata. Do not capture tokens or private keys.

## Check Short-Name Expansion

Every container receives resolver search domains based on the Pod namespace and DNS policy. In namespace `apps`, a bare query for `istiod` normally tries names such as `istiod.apps.svc.cluster.local`, not `istiod.istio-system.svc.cluster.local`. The agent's injected discovery address should resolve unambiguously.

Inspect the Pod's DNS settings:

```bash
kubectl -n apps get pod checkout-6fdcb7dc96-w2m85 -o json |
  jq '{dnsPolicy: .spec.dnsPolicy,
       dnsConfig: .spec.dnsConfig,
       hostNetwork: .spec.hostNetwork,
       hostname: .spec.hostname,
       subdomain: .spec.subdomain}'
```

Then read `/etc/resolv.conf` from an application or approved debug container in the same Pod:

```bash
kubectl -n apps exec checkout-6fdcb7dc96-w2m85 \
  -c checkout -- cat /etc/resolv.conf
```

`hostNetwork` Pods require special DNS policy to use cluster DNS, but Istio automatic sidecar injection normally skips host-network Pods because transparent redirection assumptions do not hold. Treat a host-network sidecar as a custom architecture, not a DNS-only fix.

## Test Pod DNS on the Same Pod and Node

Distroless proxy images intentionally lack a shell and tools. Add a vetted, digest-pinned ephemeral container if policy allows:

```bash
kubectl -n apps debug -it checkout-6fdcb7dc96-w2m85 \
  --image=registry.k8s.io/e2e-test-images/dnsutils:1.3 \
  --target=istio-proxy -- sh
```

Inside it, query the **exact** pilot-agent upstream name:

```bash
nslookup istiod.istio-system.svc.cluster.local
nslookup istiod.istio-system.svc.cluster.local DNS_SERVER_IP
```

Replace the DNS address with the `nameserver` value from `/etc/resolv.conf`. Query both A and AAAA records in a dual-stack cluster. Compare:

- a healthy Pod on the same node;
- a failing Pod on the same node;
- a healthy Pod on another node; and
- the same query sent directly to the configured resolver.

This matrix separates a Pod-specific resolver config from node-local DNS failure and cluster-wide CoreDNS failure, but it is not automatically the proxy process's exact lookup path. An ephemeral container runs with its own UID, and its DNS packets can be redirected to Istio's DNS proxy when DNS capture is enabled; the sidecar process is normally excluded from application capture. Correlate the query with agent logs or a narrowly filtered packet capture, and record whether port 53 was redirected. Ephemeral containers are persistent entries in Pod status and require sensitive RBAC; replace the Pod through its controller after the incident rather than trying to edit the ephemeral container away.

## Verify DNS Network Reachability

A default-deny egress NetworkPolicy also blocks DNS unless it explicitly allows the actual DNS path. Inspect policies and resolver topology:

```bash
kubectl -n apps get networkpolicy -o yaml
kubectl -n kube-system get service,endpointslice \
  -l k8s-app=kube-dns -o wide
kubectl -n kube-system get pods -l k8s-app=kube-dns -o wide
```

Cluster labels vary, so also find the Service that owns the nameserver IP. With NodeLocal DNSCache, `/etc/resolv.conf` may point to a link-local address rather than the CoreDNS Service. NetworkPolicy and host-firewall handling of that path is CNI-specific.

Allow both UDP and TCP port 53 where the resolver uses them. Large responses and truncation can fall back to TCP, so UDP-only rules can create intermittent failures. Account for IPv6 DNS addresses in dual-stack clusters.

Inspect CoreDNS logs and metrics only for the captured query window:

```bash
kubectl -n kube-system logs -l k8s-app=kube-dns \
  --since=10m --prefix --max-log-requests=10
```

Do not enable global query logging casually; it can expose internal names and add load.

## Verify the Service Exists in the Correct Cluster

If pilot-agent's upstream address uses the Kubernetes Istiod Service, confirm it exists and has the expected DNS identity:

```bash
kubectl -n istio-system get service istiod -o yaml
kubectl -n istio-system get endpointslice \
  -l kubernetes.io/service-name=istiod -o wide
kubectl -n istio-system get pods -l app=istiod -o wide
```

Kubernetes DNS can return a ClusterIP even if there are no ready endpoints. Therefore:

- `NXDOMAIN` suggests the Service name or DNS view is wrong;
- a valid ClusterIP with connection failure suggests Service routing or endpoints; and
- a headless Service answer exposes endpoint readiness and address-family behavior directly.

Check that the workload's kubeconfig context and Istio cluster metadata refer to the same cluster. In multi-cluster deployments, a remote workload may need a different external discovery address rather than the local `istiod` Service.

## Do Not Confuse Application DNS Capture with Control-Plane DNS

Istio can capture application DNS queries and answer from a local table. In sidecar mode this is optional; in current ambient mode it is enabled by default. That feature improves application resolution of Services and ServiceEntries.

It is not safe to infer that because `curl service-a` resolves through Istio DNS capture, pilot-agent's upstream hostname will resolve. Istio documentation also distinguishes application DNS proxying from Envoy's periodic resolution of DNS-type ServiceEntry endpoints. Use the exact address from the agent's effective configuration, then correlate resolver tests with the agent's own error and connection evidence instead of treating a debug-container lookup as the agent's lookup.

Likewise, turning on DNS capture can change application behavior without fixing a broken CoreDNS route required by the agent. Make that change only for its documented use case.

## Inspect Both xDS Hops After Resolution

Once the hostname resolves, verify generic TCP and TLS reachability separately:

```bash
nc -vz -w 3 istiod.istio-system.svc.cluster.local 15012

openssl s_client \
  -connect istiod.istio-system.svc.cluster.local:15012 \
  -servername istiod.istio-system.svc.cluster.local \
  -showcerts </dev/null
```

A TCP success is not a gRPC/xDS success. An unauthenticated OpenSSL probe does not reproduce the stock Istio 1.31 agent session: pilot-agent normally verifies Istiod's server certificate and SAN over TLS, then supplies the workload's service-account token as per-RPC credentials. It does not normally present a workload client certificate for xDS, although provisioned or file-mounted certificate deployments can differ. The probe can reveal the server chain, but it cannot test token authentication or xDS authorization. Do not extract workload credentials to make a diagnostic command authenticate.

If these commands run in an ordinary application or ephemeral container, their sockets may be captured by the sidecar and therefore do not exactly reproduce pilot-agent's excluded control-plane connection. Check the Pod's capture mode and use them as adjacent reachability evidence only. Agent logs, xDS-cluster state, and a packet trace of the real reconnect are stronger evidence for the proxy path.

Inspect the remote agent connection in logs and Envoy's separate local `xds-grpc` cluster through the supported admin proxy:

```bash
kubectl -n apps logs checkout-6fdcb7dc96-w2m85 \
  -c istio-proxy --since=20m --timestamps |
  grep -E 'xdsproxy|upstream XDS|upstream terminated'

kubectl -n apps exec checkout-6fdcb7dc96-w2m85 \
  -c istio-proxy -- pilot-agent request GET clusters |
  grep -A8 -E 'xds|istio'
```

The Envoy cluster output describes its Unix-socket connection to pilot-agent; it cannot prove which remote hostname the agent resolved. Use the agent log for upstream DNS, TLS, authentication, connection, and termination failures. Then confirm `istioctl proxy-status` lists the proxy and that CDS, LDS, EDS, and RDS converge. A DNS answer followed by TLS or authentication failure is progress, not full recovery.

## Repair the Declarative Owner

Choose the narrow fix supported by evidence:

- correct the injector or mesh `discoveryAddress` and recreate affected Pods;
- remove a stale revision tag or restore the intended revision Service;
- allow DNS to the actual resolver over UDP and TCP;
- repair NodeLocal DNS or CoreDNS capacity on affected nodes;
- restore the `istiod` Service and ready endpoints through the Istio installer; or
- correct external control-plane DNS, routing, CA, and SNI together.

Do not add a permanent `/etc/hosts` entry for a ClusterIP. Service addresses and endpoints can change, and the workaround bypasses normal discovery. Do not switch production xDS to plaintext port `15010`; current Istio recommends TLS/mTLS port `15012`.

Create one canary Pod after an injection change and verify both its agent upstream address and its local Envoy bootstrap before replacing the fleet.

## Verify Stability, Not One Lookup

After the fix, monitor repeated lookups and the long-lived stream across the DNS TTL, an Istiod rollout, and a node-local DNS restart in a controlled environment. Confirm:

- the exact FQDN resolves to the expected address family;
- all ready Istiod endpoints accept port `15012`;
- the certificate identity matches the configured SNI;
- the proxy appears and remains synced in `proxy-status`; and
- DNS errors and xDS reconnect counters stop increasing.

An existing gRPC stream can remain healthy while DNS is broken because no new connection is needed. Force only a controlled canary reconnect to verify recovery; do not restart the whole mesh.

## Conclusion

When a sidecar cannot resolve Istiod, begin with pilot-agent's effective discovery address, not Envoy's local-UDS bootstrap cluster. Reproduce that exact query in the same Pod and node, trace the configured DNS server and policies, then separate a valid Service answer from endpoint, TCP, TLS, gRPC, and local Envoy-to-agent health. Repair the injector, DNS path, or control-plane Service that owns the error and verify both xDS legs remain stable.

## Official Documentation

- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: Global Mesh Options](https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/)
- [Istio: Understanding DNS](https://istio.io/latest/docs/ops/configuration/traffic-management/dns/)
- [Istio: DNS Proxying](https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/)
- [Istio: Application Requirements and Ports](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes: Debugging DNS Resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Istio source: agent xDS proxy](https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/xds_proxy.go)
- [Istio source: Envoy bootstrap template](https://github.com/istio/istio/blob/release-1.31/tools/packaging/common/envoy_bootstrap.json)
