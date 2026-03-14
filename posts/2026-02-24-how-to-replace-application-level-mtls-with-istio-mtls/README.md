# How to Replace Application-Level mTLS with Istio mTLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Security, Certificate Management, Service Mesh

Description: Migrate from application-managed mutual TLS to Istio's automatic mTLS, eliminating manual certificate management and simplifying your security infrastructure.

---

Managing mTLS at the application level is tedious. You have to generate certificates, distribute them to every service, handle rotation, update trust stores, and deal with expiration. When a certificate expires at 3 AM, someone gets paged. When a new service needs to join the mesh, someone has to provision a certificate for it.

Istio's automatic mTLS handles all of this transparently. Certificates are issued, distributed, and rotated automatically by Istio's control plane. No code changes, no manual cert management, no midnight pages.

Here is how to migrate from application-level mTLS to Istio mTLS.

## What Application-Level mTLS Looks Like

A typical application-level mTLS setup involves:

1. A Certificate Authority (CA) that issues certificates
2. Client and server certificates stored as files or in a keystore
3. Application code configured to use those certificates
4. A rotation process (manual or automated)

For example, a Java application with mTLS:

```java
SSLContext sslContext = SSLContextBuilder.create()
    .loadKeyMaterial(keyStore, "password".toCharArray())
    .loadTrustMaterial(trustStore, new TrustSelfSignedStrategy())
    .build();

HttpClient httpClient = HttpClients.custom()
    .setSSLContext(sslContext)
    .build();
```

Or a Go application:

```go
cert, _ := tls.LoadX509KeyPair("client.crt", "client.key")
caCert, _ := os.ReadFile("ca.crt")
caCertPool := x509.NewCertPool()
caCertPool.AppendCertsFromPEM(caCert)

tlsConfig := &tls.Config{
    Certificates: []tls.Certificate{cert},
    RootCAs:      caCertPool,
}
```

With a Node.js service:

```javascript
const options = {
  key: fs.readFileSync('client-key.pem'),
  cert: fs.readFileSync('client-cert.pem'),
  ca: fs.readFileSync('ca-cert.pem'),
  requestCert: true,
  rejectUnauthorized: true
};

https.createServer(options, app);
```

All of this goes away with Istio mTLS.

## How Istio mTLS Works

When Istio's sidecar proxy (Envoy) is injected alongside your application:

1. Istiod acts as the CA and issues SPIFFE-based X.509 certificates to each proxy
2. The certificates are automatically rotated before expiration (default lifetime is 24 hours)
3. When service A calls service B, both Envoy sidecars negotiate mTLS automatically
4. Your application code communicates with the local sidecar over plaintext on localhost

Your application never touches a certificate. It sends HTTP to localhost, and the sidecar handles TLS.

## Step 1: Assess Current mTLS Setup

Before migrating, document your current mTLS setup:

```bash
# Find all TLS-related configuration files
find /app/config -name "*.pem" -o -name "*.jks" -o -name "*.p12" -o -name "*.crt" -o -name "*.key"

# Check for TLS configuration in application properties
grep -r "ssl\|tls\|keystore\|truststore" /app/config/
```

Identify:
- Which services use mTLS
- What CA issues the certificates
- How certificates are distributed (mounted secrets, vault, etc.)
- What the rotation schedule is

## Step 2: Install Istio and Inject Sidecars

Install Istio with default settings:

```bash
istioctl install --set profile=default
```

Start with PERMISSIVE mode so existing mTLS and plaintext traffic both work:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

Inject sidecars:

```bash
kubectl label namespace default istio-injection=enabled
kubectl rollout restart deployment --all -n default
```

## Step 3: Verify Istio mTLS Works

After sidecar injection, check that Istio mTLS is active between services:

```bash
istioctl x describe pod my-service-xxxxx -n default
```

You should see:

```text
Pod is PERMISSIVE (allows mTLS and plaintext)
```

Check the certificate issued to the proxy:

```bash
istioctl proxy-config secret my-service-xxxxx.default
```

```text
RESOURCE NAME     TYPE           STATUS     VALID CERT     SERIAL NUMBER     NOT AFTER
default           Cert Chain     ACTIVE     true           abc123            2026-02-25T10:00:00Z
ROOTCA            CA             ACTIVE     true           def456            2036-02-22T10:00:00Z
```

Test that traffic flows correctly:

```bash
kubectl exec my-client-xxxxx -c my-client -- curl -s http://my-service:8080/health
```

## Step 4: Switch Applications to Plaintext

Now comes the key step. Update your application to stop using TLS and send plaintext HTTP instead. The sidecar will handle TLS.

### Java (Spring Boot)

Remove SSL configuration from `application.yml`:

```yaml
# Remove this
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.jks
    key-store-password: changeit
    trust-store: classpath:truststore.jks
    trust-store-password: changeit
```

Replace with plain HTTP:

```yaml
server:
  port: 8080
```

Update client calls to use HTTP:

```java
// Before: HTTPS with client certificates
restTemplate.getForObject("https://payment-service:8443/api/pay", Response.class);

// After: Plain HTTP (sidecar handles TLS)
restTemplate.getForObject("http://payment-service:8080/api/pay", Response.class);
```

### Go

Remove TLS configuration:

```go
// Before
server := &http.Server{
    Addr:      ":8443",
    TLSConfig: tlsConfig,
}
server.ListenAndServeTLS("server.crt", "server.key")

// After
server := &http.Server{
    Addr: ":8080",
}
server.ListenAndServe()
```

### Node.js

```javascript
// Before
https.createServer(tlsOptions, app).listen(8443);

// After
http.createServer(app).listen(8080);
```

## Step 5: Remove Certificate Secrets

After the application is running with plaintext and the sidecar is handling mTLS:

```bash
# Remove the old TLS secrets
kubectl delete secret my-service-tls -n default
kubectl delete secret my-service-truststore -n default
```

Remove certificate volume mounts from the deployment:

```yaml
# Remove these volume mounts
        volumeMounts:
          - name: tls-certs
            mountPath: /etc/certs
            readOnly: true
      volumes:
        - name: tls-certs
          secret:
            secretName: my-service-tls
```

## Step 6: Migrate Service by Service

Do not switch all services at once. Migrate one at a time:

1. Inject the sidecar into service A
2. Verify service A still works (PERMISSIVE mode allows both mTLS and plaintext)
3. Update service A to use plaintext HTTP
4. Verify again
5. Move to service B

During migration, PERMISSIVE mode is essential because:
- Services with sidecars can communicate using Istio mTLS
- Services with sidecars can still talk to services without sidecars over plaintext
- The old application-level mTLS still works alongside Istio mTLS

## Step 7: Switch to STRICT mTLS

After all services have sidecars and are using plaintext internally:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict
  namespace: default
spec:
  mtls:
    mode: STRICT
```

Test thoroughly:

```bash
# Check for any services still using the old mTLS
kubectl logs -l istio-injection=enabled -c istio-proxy --all-namespaces | grep "ssl.connection_error"
```

## Step 8: Decommission Old CA Infrastructure

Once everything is running on Istio mTLS:

1. Stop the old certificate authority
2. Remove certificate rotation cron jobs or automation
3. Delete old CA certificates from trust stores
4. Update documentation

## Certificate Rotation Comparison

| Aspect | Application-Level mTLS | Istio mTLS |
|---|---|---|
| Certificate lifetime | Months to years | 24 hours (default) |
| Rotation | Manual or scripted | Automatic |
| Certificate scope | Per-service | Per-workload (pod) |
| CA management | You manage it | Istio manages it |
| Trust store updates | Manual | Automatic |
| Code changes for new services | Yes | No |

## Troubleshooting the Migration

If a service fails after switching to plaintext:

1. Check that the sidecar is injected: `kubectl get pod -o jsonpath='{.spec.containers[*].name}'`
2. Check mTLS mode: `istioctl x describe pod my-service-xxxxx`
3. Check Envoy TLS stats: `kubectl exec my-service-xxxxx -c istio-proxy -- curl -s localhost:15000/stats | grep ssl`
4. Make sure the Service port is named correctly (e.g., `http`, `grpc`)

The migration from application-level mTLS to Istio mTLS is mostly about removing code and configuration. Your applications get simpler, certificate management becomes automatic, and the security posture improves because of the short-lived, automatically-rotated certificates that Istio provides.
