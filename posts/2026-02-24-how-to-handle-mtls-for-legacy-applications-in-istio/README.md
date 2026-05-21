# How to Handle mTLS for Legacy Applications in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Legacy Applications, Security, Kubernetes

Description: Strategies for integrating legacy applications that cannot support mTLS into an Istio service mesh without breaking existing functionality.

---

Not every application in your cluster can handle mTLS. You might have legacy services that use older TLS libraries, applications that do their own certificate management, or third-party software that you cannot modify. When you roll out Istio with strict mTLS enforcement, these legacy applications can break.

The good news is that Istio provides several mechanisms to handle this gracefully. You do not have to choose between full mTLS enforcement and no security at all. This guide covers practical strategies for dealing with legacy applications in a sidecar-based, mTLS-enabled mesh.

## Understanding the Problem

When Istio is configured with `STRICT` mTLS in sidecar mode, every connection accepted by a destination sidecar must use mutual TLS. Both the client and the server proxies present certificates, and both verify each other's identity. This works transparently when both sides have Istio sidecars because the sidecars handle all the Istio mTLS negotiation.

Problems arise when:
- A service does not have a sidecar (no Istio injection)
- A service has a sidecar but the application also does TLS (double encryption)
- A legacy service is reached without a compatible sidecar or client TLS configuration
- A service uses a protocol that the sidecar cannot parse correctly

## Strategy 1: Use PERMISSIVE Mode

The simplest approach is to use `PERMISSIVE` mTLS mode for the legacy service. In permissive mode, the service accepts both mTLS and plaintext connections:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-service-permissive
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-api
  mtls:
    mode: PERMISSIVE
```

This allows the legacy service to receive traffic from both mTLS-enabled services (through their sidecars) and non-mesh services (plaintext). It is a good transitional strategy, but it does not enforce mTLS for connections to this service.

You can also set permissive mode on a per-port basis:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: legacy-mixed-ports
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-api
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE
    8443:
      mode: STRICT
```

This enforces strict mTLS on workload port 8443 but allows plaintext on workload port 8080. Useful when a legacy service has some ports that should stay reachable from non-mesh clients during migration.

## Strategy 2: Exclude the Legacy Service from the Mesh

If a legacy application truly cannot work with the sidecar proxy, you can exclude it from sidecar injection entirely:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
  namespace: default
spec:
  template:
    metadata:
      labels:
        app: legacy-app
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: legacy-app
        image: legacy-app:v1
```

When the service has no sidecar, it sends and receives plaintext traffic. Other mesh services that call this legacy service need to be configured to send plaintext when talking to it:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: legacy-app-no-tls
  namespace: default
spec:
  host: legacy-app.default.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

This tells the calling service's sidecar to not use Istio mTLS when connecting to the legacy app. If you already rely on Istio auto mTLS and the destination has no sidecar, Istio normally sends plaintext automatically; an explicit `DestinationRule` is useful when an existing destination rule would otherwise force TLS.

## Strategy 3: Handle Double TLS

Some legacy applications implement their own TLS. When Istio also uses mTLS between sidecars, you get TLS inside Istio mTLS, which can add CPU overhead and reduce protocol-level observability.

To avoid wrapping application TLS in Istio mTLS, configure the client sidecar to send the application's TLS stream as-is. The destination must either have no sidecar or have `PERMISSIVE`/plaintext-compatible peer authentication on that workload port:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: legacy-tls-passthrough
  namespace: default
spec:
  host: legacy-tls-app.default.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
  portLevelSettings:
  - port:
      number: 8443
    tls:
      mode: DISABLE
```

On the server side, you might also need to configure the port protocol explicitly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-tls-app
  namespace: default
spec:
  ports:
  - name: tls-legacy
    port: 8443
    targetPort: 8443
    appProtocol: tls
```

Using the `tls` appProtocol tells Istio to treat this port as TLS-encrypted traffic and not try to parse it as HTTP.

## Strategy 4: Use a Sidecar with Custom Configuration

Sometimes a legacy application works with the sidecar, but specific behaviors need to be adjusted. You can customize the sidecar for a particular workload:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: legacy-app-sidecar
  namespace: default
spec:
  workloadSelector:
    labels:
      app: legacy-app
  ingress:
  - port:
      number: 8080
      protocol: TCP
      name: tcp-legacy
    defaultEndpoint: 127.0.0.1:8080
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

Setting the protocol to `TCP` on the ingress port tells the sidecar to treat the traffic as opaque TCP rather than trying to parse it as HTTP. This avoids issues with non-standard HTTP implementations.

## Strategy 5: Gradual Migration with Namespace-Level Policies

If you have many legacy services, roll out mTLS gradually by namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: namespace-permissive
  namespace: legacy-apps
spec:
  mtls:
    mode: PERMISSIVE
```

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: namespace-strict
  namespace: modern-apps
spec:
  mtls:
    mode: STRICT
```

This lets you enforce strict mTLS in namespaces where all services support it while keeping permissive mode in namespaces with legacy applications.

## Monitoring mTLS Status for Legacy Services

Check which services are using mTLS and which are falling back to plaintext:

```bash
istioctl x describe pod <legacy-pod-name>
```

This shows the mTLS status and any authentication policies applying to the pod.

You can also check from the metrics:

```promql
sum(rate(istio_requests_total{
  connection_security_policy="mutual_tls",
  destination_app="legacy-api"
}[5m]))
```

```promql
sum(rate(istio_requests_total{
  connection_security_policy="none",
  destination_app="legacy-api"
}[5m]))
```

The first query shows mTLS-encrypted requests. The second query shows plaintext requests when the destination proxy reports them with `connection_security_policy="none"`; source-side reports use `unknown` for this label. If you are trying to migrate to strict mTLS, the destination-reported plaintext count should trend toward zero over time.

## Planning the Migration

Here is a practical migration path for moving legacy services to full mTLS:

1. **Start with PERMISSIVE everywhere**: This adds sidecars without breaking anything.
2. **Monitor traffic patterns**: Use the metrics above to understand which connections are using mTLS and which are not.
3. **Fix non-mesh callers**: Identify services calling legacy apps without sidecars and either add sidecars or configure them appropriately.
4. **Switch to STRICT per service**: Once all callers of a legacy service are using sidecars, switch that service to strict mTLS.
5. **Switch to STRICT per namespace**: Once all services in a namespace support strict mTLS, enforce it at the namespace level.
6. **Switch to STRICT mesh-wide**: Once every namespace is ready, enforce strict mTLS globally.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mesh-wide-strict
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

This gradual approach prevents outages while progressively improving your security posture. Legacy applications are a reality in most organizations, and Istio is flexible enough to accommodate them while still providing strong security defaults.
