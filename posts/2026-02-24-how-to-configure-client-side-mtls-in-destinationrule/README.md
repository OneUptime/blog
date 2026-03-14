# How to Configure Client-Side mTLS in DestinationRule

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, DestinationRule, Security, Kubernetes

Description: Configure client-side mutual TLS in Istio DestinationRule for secure service-to-service communication with certificate-based authentication.

---

Mutual TLS (mTLS) means both the client and server verify each other's identity using certificates. In a regular TLS connection, only the client checks the server's certificate. With mTLS, the server also checks the client's certificate. This provides strong authentication in both directions.

Istio makes mTLS easy for services inside the mesh through its built-in certificate authority. But there are scenarios where you need manual mTLS configuration - connecting to external services that require client certificates, or overriding Istio's automatic mTLS behavior.

## Istio's Automatic mTLS

Before getting into manual configuration, it is worth understanding what Istio does automatically. When both the client and server have Envoy sidecars, Istio's auto-mTLS kicks in:

1. Istiod generates X.509 certificates for each workload
2. Certificates are distributed to sidecars via SDS (Secret Discovery Service)
3. Envoy sidecars automatically negotiate mTLS with each other
4. Certificates are rotated before expiry (default 24 hours)

You can see this in action:

```bash
istioctl proxy-config secret <pod-name>
```

This shows the certificates loaded into the sidecar, including the root CA cert and the workload certificate.

## When Auto-mTLS Is Not Enough

Auto-mTLS works great for services within the mesh, but you need manual configuration when:

- Connecting to an external service that requires a client certificate
- The target service is not in the mesh (no sidecar) but still requires mTLS
- You need to use specific certificates (not Istio-generated ones)
- You are connecting to a third-party API that validates client certificates

## Configuring ISTIO_MUTUAL Mode

For explicit Istio mTLS (using Istio's own certificates), use `ISTIO_MUTUAL`:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-istio-mtls
spec:
  host: my-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

This tells Envoy to use Istio's automatically provisioned certificates for mTLS. You would use this when:

- Auto-mTLS is disabled globally and you want to enable it for specific services
- You want to be explicit about mTLS requirements in your configuration
- You are troubleshooting and want to rule out auto-mTLS issues

## Configuring MUTUAL Mode with Custom Certificates

For services that require specific certificates (not Istio's), use `MUTUAL` mode:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api-mtls
spec:
  host: api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/partner-certs/tls.crt
      privateKey: /etc/partner-certs/tls.key
      caCertificates: /etc/partner-certs/ca.crt
```

The three certificate paths point to files that must be available inside the Envoy sidecar container.

## Mounting Certificates into the Sidecar

There are several ways to get certificate files into the sidecar.

### Method 1: Using a Kubernetes Secret with SDS

The recommended approach is to use Istio's SDS to deliver certificates from Kubernetes Secrets:

```bash
kubectl create secret generic partner-certs \
  --from-file=tls.crt=client.pem \
  --from-file=tls.key=client-key.pem \
  --from-file=ca.crt=partner-ca.pem
```

Then reference the secret using the `credentialName` field. However, `credentialName` is primarily supported in Gateway configurations. For sidecar DestinationRules, you typically need to mount the secret as a volume.

### Method 2: Volume Mounts via Pod Annotation

You can use Istio's proxy config annotation to mount secrets into the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/userVolume: |
          [{"name": "partner-certs", "secret": {"secretName": "partner-certs"}}]
        sidecar.istio.io/userVolumeMount: |
          [{"name": "partner-certs", "mountPath": "/etc/partner-certs", "readOnly": true}]
    spec:
      containers:
      - name: app
        image: my-app:latest
```

These annotations tell the sidecar injector to mount the `partner-certs` secret at `/etc/partner-certs` inside the Envoy container.

## Complete Example: Connecting to an External mTLS Service

Here is a full working example connecting to an external API that requires client certificate authentication:

Step 1: Create the ServiceEntry for the external service:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: partner-api
spec:
  hosts:
  - api.partner.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

Step 2: Create the secret with certificates:

```bash
kubectl create secret generic partner-mtls-certs \
  --from-file=tls.crt=client-cert.pem \
  --from-file=tls.key=client-key.pem \
  --from-file=ca.crt=partner-ca.pem
```

Step 3: Create the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: partner-api-dr
spec:
  host: api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/partner-certs/tls.crt
      privateKey: /etc/partner-certs/tls.key
      caCertificates: /etc/partner-certs/ca.crt
```

Step 4: Deploy your application with the certificate volume mount:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        sidecar.istio.io/userVolume: |
          [{"name": "partner-certs", "secret": {"secretName": "partner-mtls-certs"}}]
        sidecar.istio.io/userVolumeMount: |
          [{"name": "partner-certs", "mountPath": "/etc/partner-certs", "readOnly": true}]
    spec:
      containers:
      - name: app
        image: my-app:latest
        ports:
        - containerPort: 8080
```

## Verifying mTLS Configuration

Check that the certificates are loaded:

```bash
istioctl proxy-config secret <pod-name>
```

Verify the cluster TLS configuration:

```bash
istioctl proxy-config cluster <pod-name> --fqdn api.partner.com -o json
```

Look for the `transportSocket` section showing the certificate paths and TLS mode.

You can also test the connection:

```bash
kubectl exec <pod-name> -c app -- curl -v https://api.partner.com/health
```

If mTLS is configured correctly in the DestinationRule, Envoy handles the certificate exchange transparently. Your application just makes a regular HTTP call and Envoy upgrades it to mTLS.

## mTLS Between Namespaces

Sometimes you want to enforce mTLS for cross-namespace communication even when auto-mTLS is set to PERMISSIVE:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: cross-ns-mtls
  namespace: frontend
spec:
  host: backend-service.backend-ns.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

This ensures that the frontend namespace always uses mTLS when talking to the backend namespace, regardless of the global mTLS policy.

## Troubleshooting mTLS

**Connection refused**: The most common issue. Check that both sides agree on the TLS mode. If the client sends mTLS but the server expects plain text, the connection fails.

```bash
istioctl authn tls-check <pod-name> backend-service.backend-ns.svc.cluster.local
```

This command shows the actual and desired TLS status.

**Certificate verification failed**: The CA certificate does not match. Make sure `caCertificates` points to the CA that signed the server's certificate, not your own CA.

**Permission denied on key files**: The sidecar container runs as a non-root user. Make sure your secret files have the right permissions. Kubernetes secrets mounted as volumes are readable by default, but double-check if using custom volume mounts.

## Cleanup

```bash
kubectl delete destinationrule partner-api-dr
kubectl delete serviceentry partner-api
kubectl delete secret partner-mtls-certs
```

Client-side mTLS in DestinationRule gives you the ability to authenticate your services to upstream backends using certificates. For services inside the mesh, Istio's ISTIO_MUTUAL mode handles everything automatically. For external services, use MUTUAL mode with custom certificates mounted into the sidecar. Either way, mTLS provides strong authentication that goes far beyond what simple API keys or tokens can offer.
