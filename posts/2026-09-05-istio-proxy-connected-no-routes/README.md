# Istio Proxy Connects to istiod but Receives No Routes: Compare Configuration Scope, Revisions, and Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Istiod, Envoy, XDS, Traffic Routing, Sidecar Configuration, Control Plane, Troubleshooting

Description: Diagnose an Istio proxy with a healthy xDS connection but no expected routes by comparing proxy role, scope, revision, host, and namespace.

---

A healthy connection to Istiod proves transport, authentication, and at least part of xDS are working. It does not prove that Istiod will send every route in the cluster to that proxy. Route Discovery Service output is computed per proxy from its role, listeners, imported services, exported VirtualServices, gateway attachments, namespace visibility, and control-plane revision.

`RDS NOT SENT` can be normal. A TCP-only sidecar listener does not need an HTTP route table, and a gateway with no attached HTTP routes may have none to receive. The incident begins only when a specific request should traverse an HTTP-aware listener and its expected route is absent.

Work from proxy identity to listener reference, then to the configuration objects that are in scope.

## Define the Missing Route Precisely

Record:

- proxy Pod and namespace;
- sidecar or gateway role;
- destination host and Service port;
- HTTP authority, path, and method;
- expected VirtualService and namespace;
- intended Istio revision; and
- whether the route should apply to `mesh` or a named Gateway.

Capture the request's access-log result:

```bash
kubectl -n apps logs frontend-74b77f79cc-p8x2l \
  -c istio-proxy --since=10m --timestamps
```

`404 NR` commonly means no route matched the request. `503 NC` means a route selected a cluster that does not exist. `503 UH` means the cluster exists but has no healthy upstream. These are different stages.

Use an idempotent test request with explicit authority and deadline. Do not put tokens in verbose command output.

## Confirm Connection and Identify the Actual Revision

Check the proxy's synchronization row:

```bash
istioctl proxy-status frontend-74b77f79cc-p8x2l.apps
```

`SYNCED` means the proxy acknowledged the last configuration Istiod sent for that type. `NOT SENT` means Istiod has not sent it, often because it calculated no applicable resource. `STALE` indicates a sent update lacks acknowledgement.

Read desired and actual revision information:

```bash
kubectl -n apps get namespace apps --show-labels
kubectl -n apps get pod frontend-74b77f79cc-p8x2l -o json |
  jq '{requestedRevision: .metadata.labels["istio.io/rev"],
       actualRevision: .metadata.annotations["istio.io/rev"],
       containers: [.spec.containers[].name],
       created: .metadata.creationTimestamp}'
```

In a revisioned install, the namespace label or revision tag controls which injector creates a new proxy bootstrap. The Pod annotation records the actual revision. A proxy can be fully connected and synced to an older revision whose discovery selectors, root namespace, feature flags, or watched cluster differ.

Compare with a working proxy:

```bash
istioctl proxy-config bootstrap pod/frontend-74b77f79cc-p8x2l.apps -o json \
  > /tmp/failing-bootstrap.json
istioctl proxy-config bootstrap pod/working-client-6d99c76468-q7v4n.apps -o json \
  > /tmp/working-bootstrap.json
```

Compare node metadata, cluster ID, network, revision, and Envoy's local xDS cluster—not volatile Pod IPs or generated timestamps. In a stock Istio 1.31 sidecar, that `xds-grpc` cluster points to pilot-agent's Unix-domain socket, so the bootstrap does not normally expose the remote Istiod discovery address.

Compare the agent's effective upstream connection separately:

```bash
for pod in frontend-74b77f79cc-p8x2l working-client-6d99c76468-q7v4n; do
  kubectl -n apps logs "$pod" -c istio-proxy --timestamps |
    grep -E 'Initializing with upstream address|connected to upstream XDS server'
done
```

The startup line records the runtime address from effective `ProxyConfig`; Pod annotations and the injected `PROXY_CONFIG` value explain its origin. Treat bootstrap, proxy configuration, and logs as sensitive operational artifacts.

## Start with Listeners Before Routes

RDS resources are referenced by HTTP connection managers in listeners. If the relevant listener is absent or traffic is classified as opaque TCP, no expected HTTP route will appear.

```bash
istioctl proxy-config listeners \
  pod/frontend-74b77f79cc-p8x2l.apps
istioctl proxy-config listeners \
  pod/frontend-74b77f79cc-p8x2l.apps --port 8080 -o json \
  > /tmp/listener-8080.json
```

Inspect the matching listener's filter chains and HTTP connection manager. Find its inline route or `rds.route_config_name`, then request routes:

```bash
istioctl proxy-config routes \
  pod/frontend-74b77f79cc-p8x2l.apps
```

For a sidecar, confirm the Kubernetes Service port is classified as `http`, `http2`, or `grpc` through its name or `appProtocol`. An explicitly `tcp` service port produces network proxying rather than HTTP routes. If `appProtocol` and name are both present, Istio gives `appProtocol` precedence.

For a gateway, verify the Gateway listener protocol and TLS mode. A terminated HTTPS listener can use HTTP routes after decryption; a passthrough TLS listener uses SNI/TLS routes, not RDS HTTP routes.

## Check Sidecar Import Scope

A `Sidecar` resource can reduce the services and configuration imported by selected workloads. Inventory every Sidecar object that could apply:

```bash
kubectl get sidecar.networking.istio.io -A -o yaml
```

Pay attention to workload selectors and `egress.hosts`. For example:

```yaml
egress:
- hosts:
  - "./*"
  - "payments/*"
```

`./*` imports the workload's own namespace, and `payments/*` imports configuration from `payments`. If the expected host belongs to `catalog`, this sidecar intentionally does not know it.

Only one selector-less Sidecar should provide the namespace default, and overlapping workload selectors are a configuration problem. Use:

```bash
istioctl analyze --all-namespaces
```

Do not delete Sidecar scoping merely to restore a route; it may protect control-plane scale and dependency boundaries. Add the narrow namespace or host import that the workload genuinely needs.

## Check Producer Export Scope

Visibility is controlled from the producer side too. Inspect the expected Service and Istio resources:

```bash
kubectl -n catalog get service catalog-api -o yaml
kubectl -n catalog get virtualservice,destinationrule,serviceentry -o yaml
```

`VirtualService`, `DestinationRule`, and `ServiceEntry` use `spec.exportTo`. A Kubernetes Service uses the `networking.istio.io/exportTo` annotation. `.` means the resource's own namespace, not the requesting proxy's namespace. The default is broadly exported unless installation behavior narrows it.

Effective visibility is the intersection of what the producer exports and what the consumer Sidecar imports. A route visible in `catalog` may correctly be absent from `apps`.

At mesh scale, `meshConfig.discoverySelectors` tells Istiod which namespaces to watch for configuration. A namespace that does not match is ignored entirely. Compare the effective mesh configuration between the proxy's actual revision and the working revision. Adding a namespace to discovery expands Istiod load; coordinate it with the mesh administrator.

## Resolve Namespace-Relative Host Names

Istio resolves a short destination such as `catalog-api` relative to the namespace of the rule, not the namespace where an operator intended the Service to be. A VirtualService in `apps` with:

```yaml
destination:
  host: catalog-api
```

means `catalog-api.apps.svc.cluster.local`, not `catalog-api.catalog.svc.cluster.local`. Use the FQDN for cross-namespace routes:

```yaml
destination:
  host: catalog-api.catalog.svc.cluster.local
```

Also compare the VirtualService's top-level `hosts` with the actual request authority. A rule for `api.example.com` does not automatically match a request addressed to `catalog-api.catalog.svc.cluster.local`.

Run `istioctl analyze` on the candidate and inspect the effective route rather than relying on YAML intent.

## For Gateways, Prove Attachment and Host Intersection

An Istio VirtualService applies to sidecars by default when `gateways` is omitted. If it lists only a named Gateway, it does not apply to mesh sidecars. To apply to both, include `mesh` and the Gateway name.

For an Istio gateway proxy, verify:

```bash
kubectl -n gateways get gateway.networking.istio.io public-gateway -o yaml
kubectl get virtualservice -A -o yaml
kubectl -n gateways get pod GATEWAY_POD --show-labels
```

The Gateway selector must select the proxy workload. The VirtualService must name that Gateway, be exported to the gateway's namespace, and contain a host matching a server host. A server for `*.example.com` matches `api.example.com`, but not the bare `example.com`.

If using Kubernetes Gateway API rather than Istio's Gateway API, inspect `Gateway` and `HTTPRoute` status conditions, `parentRefs`, `allowedRoutes`, host intersection, and any required `ReferenceGrant`. Do not troubleshoot one API model with the other model's attachment fields.

## Compare Accepted Configuration, Not Just Kubernetes Objects

Two proxies reveal whether this is a calculation or delivery difference:

```bash
istioctl proxy-config routes pod/frontend-74b77f79cc-p8x2l.apps -o json \
  > /tmp/failing-routes.json
istioctl proxy-config routes pod/working-client-6d99c76468-q7v4n.apps -o json \
  > /tmp/working-routes.json
```

Normalize and compare route names, virtual hosts, domains, and cluster destinations. Differences in unrelated services are expected when Sidecar scopes differ. Focus on the target authority and port.

Then check whether the destination cluster and endpoint exist:

```bash
istioctl proxy-config clusters \
  pod/frontend-74b77f79cc-p8x2l.apps \
  --fqdn catalog-api.catalog.svc.cluster.local
istioctl proxy-config endpoints \
  pod/frontend-74b77f79cc-p8x2l.apps
```

If the listener references an RDS name but no corresponding route was accepted, inspect proxy logs for NACK details. If Istiod never sent it, focus on scoping and attachment. Restarting Envoy does not create an out-of-scope route.

## Apply the Narrow Fix and Watch Dynamic Convergence

Validate candidate resources:

```bash
istioctl analyze -f candidate-routing.yaml
kubectl apply --dry-run=server -f candidate-routing.yaml
```

Correct the owning Sidecar import, `exportTo`, FQDN, Gateway binding, Service protocol, namespace discovery label, or revision selection. Most route changes are delivered dynamically and should not require a workload restart. Injection/bootstrap revision changes do require new Pods.

Watch `proxy-status`, then confirm the exact virtual host and cluster appear. Send positive, fallback, and nonmatching requests from the real source. A route existing in config is not proof that its authority/path match wins before a catch-all.

## Conclusion

A connected proxy with no expected routes is usually receiving the correct result for its current identity and scope. Identify the HTTP-aware listener and RDS name, compare actual control-plane revision, evaluate consumer imports and producer exports, resolve namespace-relative names, and prove gateway attachment. Fix the smallest visibility or ownership error and verify the compiled route rather than forcing an indiscriminate xDS push.

## Official Documentation

- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: Configuration Scoping](https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/)
- [Istio: Virtual Service](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- [Istio: Sidecar](https://istio.io/latest/docs/reference/config/networking/sidecar/)
- [Istio: Gateway](https://istio.io/latest/docs/reference/config/networking/gateway/)
- [Istio: Protocol Selection](https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/)
- [Istio: Installing the Sidecar](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio source: agent xDS proxy](https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/xds_proxy.go)
- [Istio source: Envoy bootstrap template](https://github.com/istio/istio/blob/release-1.31/tools/packaging/common/envoy_bootstrap.json)
