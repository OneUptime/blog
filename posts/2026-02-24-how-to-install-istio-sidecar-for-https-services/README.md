# How to Install Istio Sidecar for HTTPS Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTPS, Sidecar, TLS, Kubernetes, Service Mesh

Description: How to configure Istio sidecar injection for services that already use HTTPS and TLS, including TLS origination and passthrough scenarios.

---

Adding Istio sidecars to services that already handle their own TLS can be confusing. The sidecar intercepts traffic, and if your DestinationRule, PeerAuthentication, and application protocol do not agree on which layer is handling TLS, you can end up with double encryption or broken connections. Understanding how these layers interact is the key to getting it right.

## The Problem: TLS Layer Mismatch

When your application sends HTTPS and Istio adds mTLS on top, here is what happens:

1. Client sends an HTTPS request
2. Client's sidecar may encrypt the connection with mTLS (Istio layer)
3. Server's sidecar decrypts the Istio mTLS layer
4. Server's sidecar forwards the original application connection to your app
5. Your app still receives HTTPS because local inbound traffic is forwarded as-is

This works when both layers are configured intentionally. Problems happen when the client sends plaintext HTTP to an app that expects HTTPS, when a DestinationRule originates TLS for traffic that is already HTTPS, or when a workload requires Istio mTLS but the caller sends plaintext.

## Option 1: Let Istio Handle TLS, Remove Application TLS

The simplest approach is to let Istio handle all encryption and remove TLS from your application. Your application listens on HTTP, and the sidecar handles mTLS between services.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-https-service
spec:
  template:
    metadata:
      labels:
        app: my-https-service
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 8080  # HTTP, not HTTPS
        env:
        - name: TLS_ENABLED
          value: "false"       # Disable application-level TLS
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-https-service
spec:
  ports:
  - name: http-web          # Name it as HTTP
    port: 80
    targetPort: 8080
  selector:
    app: my-https-service
```

This is the recommended approach for most services. Istio's mTLS encrypts traffic between sidecar proxies, and removing application TLS simplifies the configuration.

## Option 2: Keep Application TLS with DISABLE mTLS

If you cannot modify your application to remove TLS (third-party services, compliance requirements for end-to-end encryption, etc.), you can disable Istio's mTLS for that specific service and let the application handle its own TLS.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: disable-mtls-for-https-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-https-service
  mtls:
    mode: DISABLE
```

And configure the DestinationRule so sidecars do not originate another TLS layer. Callers must still use `https://` because the application is handling TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-https-service
  namespace: production
spec:
  host: my-https-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE                   # Do not add Istio TLS to app-originated HTTPS
```

Name the service port to indicate HTTPS:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-https-service
spec:
  ports:
  - name: https-web
    port: 443
    targetPort: 8443
  selector:
    app: my-https-service
```

## Option 3: TLS Origination at the Sidecar

If your upstream service requires HTTPS but you want to keep things simple for the calling service, configure TLS origination. The calling service sends plaintext HTTP to an HTTP service port, and its sidecar upgrades the connection to HTTPS before sending it to the upstream.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-https-service
  namespace: production
spec:
  ports:
  - name: http-web
    port: 80
    targetPort: 8443
  selector:
    app: my-https-service
```

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: originate-tls
  namespace: production
spec:
  host: my-https-service.production.svc.cluster.local
  trafficPolicy:
    portLevelSettings:
    - port:
        number: 80
      tls:
        mode: SIMPLE
```

The calling service sends HTTP to the sidecar, the sidecar establishes a TLS connection to the upstream application's HTTPS port, and the upstream receives HTTPS. The upstream service does not need to be in the mesh for this to work.

## Option 4: Exclude HTTPS Ports from Sidecar

For services where you want the sidecar for other ports but want HTTPS traffic to bypass the sidecar entirely:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "8443"
        traffic.sidecar.istio.io/excludeOutboundPorts: "443"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 8080
          name: http-api
        - containerPort: 8443
          name: https-legacy
```

Port 8443 traffic goes directly to the application, bypassing the sidecar. Port 8080 traffic still goes through the sidecar and gets mTLS.

## Handling External HTTPS Services

When your application calls external HTTPS APIs with `https://`, the sidecar can pass that TLS connection through. In `REGISTRY_ONLY` mode, add a ServiceEntry so the external host is in Istio's service registry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: production
spec:
  hosts:
  - api.external-service.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

Do not add a `DestinationRule` with `tls.mode: SIMPLE` for application-originated HTTPS traffic, because that tells the sidecar to originate another TLS connection. Use `SIMPLE` only when the application sends plaintext HTTP and you want the sidecar to originate TLS.

## Verifying the Configuration

After configuring, verify that traffic flows correctly:

```bash
# Check the proxy configuration for inbound listeners

istioctl proxy-config listeners my-pod --port 8443

# Check outbound clusters
istioctl proxy-config clusters my-pod | grep my-https-service

# Test an application-TLS service
kubectl exec deploy/test-client -- curl -v https://my-https-service:443/health

# Test a sidecar TLS origination service
kubectl exec deploy/test-client -- curl -v http://my-https-service:80/health

# Check Envoy stats for TLS connections
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep "ssl"
```

## Certificate Management for Application TLS

If you keep application-level TLS, you still need to manage those certificates. You can mount certificates from Kubernetes Secrets:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-https-service
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        volumeMounts:
        - name: tls-certs
          mountPath: /etc/tls
          readOnly: true
        env:
        - name: TLS_CERT_PATH
          value: /etc/tls/tls.crt
        - name: TLS_KEY_PATH
          value: /etc/tls/tls.key
      volumes:
      - name: tls-certs
        secret:
          secretName: my-app-tls-cert
```

Or use Istio's SDS to share certificates with your application through a shared volume:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-https-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            OUTPUT_CERTS: /etc/istio-output-certs
        sidecar.istio.io/userVolumeMount: '[{"name":"istio-certs","mountPath":"/etc/istio-output-certs"}]'
        sidecar.istio.io/userVolume: '[{"name":"istio-certs","emptyDir":{"medium":"Memory"}}]'
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        volumeMounts:
        - name: istio-certs
          mountPath: /etc/istio-certs
          readOnly: true
```

This way your application can read Istio-managed workload certificates for TLS use cases where clients trust the Istio workload identity. These certificates are SPIFFE workload certificates, so they are not a drop-in replacement for public DNS certificates used by ordinary HTTPS clients.

## Recommendation

For the majority of cases, the best approach is Option 1: remove application-level TLS and let Istio handle encryption through mTLS. This simplifies certificate management, eliminates double encryption overhead, and gives you consistent security across all services.

Only keep application-level TLS if you have a specific compliance requirement for end-to-end encryption or if modifying the application is not possible. In those cases, clearly document the TLS configuration for each service so that your team knows which layer is handling encryption.
