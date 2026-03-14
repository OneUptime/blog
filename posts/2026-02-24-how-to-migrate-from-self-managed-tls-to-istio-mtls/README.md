# How to Migrate from Self-Managed TLS to Istio mTLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, MTLS, Certificate Management, Security Migration

Description: Migrate from self-managed TLS certificate infrastructure to Istio automatic mTLS, eliminating manual cert rotation, custom CA management, and per-service TLS configuration.

---

Managing your own TLS infrastructure is a full-time job. You are running a CA (maybe Vault, CFSSL, or even OpenSSL scripts), distributing certificates to services, configuring trust stores, handling rotations, and dealing with expired certificates at the worst possible times. Every new service needs certificates provisioned, every certificate rotation is a potential outage.

Istio replaces all of this with automatic mTLS. Certificates are generated, distributed, and rotated without any manual intervention. Here is how to make the switch.

## Typical Self-Managed TLS Setup

A self-managed TLS setup usually involves:

1. **A Certificate Authority**: Vault PKI, CFSSL, step-ca, or manual OpenSSL
2. **Certificate distribution**: Kubernetes Secrets, mounted volumes, or init containers that fetch certs
3. **Certificate rotation**: Cron jobs, cert-manager, or manual processes
4. **Trust store management**: CA bundles distributed to every service
5. **Application TLS configuration**: Each service configured to use its certs

Here is what a typical Kubernetes deployment with self-managed TLS looks like:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    spec:
      containers:
        - name: payment-service
          image: mycompany/payment-service:1.0
          ports:
            - containerPort: 8443
          volumeMounts:
            - name: tls-certs
              mountPath: /etc/tls
              readOnly: true
            - name: ca-bundle
              mountPath: /etc/ca
              readOnly: true
          env:
            - name: TLS_CERT
              value: /etc/tls/tls.crt
            - name: TLS_KEY
              value: /etc/tls/tls.key
            - name: CA_CERT
              value: /etc/ca/ca.crt
      volumes:
        - name: tls-certs
          secret:
            secretName: payment-service-tls
        - name: ca-bundle
          configMap:
            name: ca-bundle
```

With cert-manager handling rotation:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: payment-service-tls
spec:
  secretName: payment-service-tls
  duration: 2160h  # 90 days
  renewBefore: 720h  # 30 days
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
  dnsNames:
    - payment-service
    - payment-service.default.svc.cluster.local
```

This works, but it is a lot of moving parts. Every new service needs a Certificate resource, every namespace needs access to the CA, and you have to monitor certificate expiration.

## How Istio mTLS Replaces This

With Istio:

1. Istiod acts as the CA
2. Each sidecar gets a short-lived certificate (24h default) via SDS (Secret Discovery Service)
3. Certificates are automatically rotated before expiration
4. The CA trust chain is distributed to all proxies automatically
5. Your application sends plaintext HTTP to localhost; the sidecar handles TLS

No cert-manager, no Vault integration, no certificate secrets, no trust store management.

## Migration Plan

### Phase 1: Install Istio with PERMISSIVE mTLS

```bash
istioctl install --set profile=default
```

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

PERMISSIVE mode is critical. It allows both mTLS and plaintext traffic, so services with and without sidecars can still communicate.

### Phase 2: Inject Sidecars Into One Service

Start with a low-risk service:

```bash
kubectl label namespace default istio-injection=enabled
kubectl rollout restart deployment payment-service
```

Verify the sidecar is running:

```bash
kubectl get pod -l app=payment-service -o jsonpath='{.items[0].spec.containers[*].name}'
```

At this point, the payment service still uses its own TLS certs, AND the sidecar is doing Istio mTLS in parallel. Both work because of PERMISSIVE mode.

### Phase 3: Switch the Service to Plaintext

Update the application to stop using TLS and listen on a plain HTTP port:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    spec:
      containers:
        - name: payment-service
          image: mycompany/payment-service:2.0  # Updated to use HTTP
          ports:
            - containerPort: 8080  # Changed from 8443
          # Removed TLS volume mounts
          # Removed TLS environment variables
```

Update the Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
spec:
  ports:
    - name: http  # Important: named port for Istio protocol detection
      port: 8080
      targetPort: 8080
```

Update callers to use HTTP instead of HTTPS:

```python
# Before
response = requests.get("https://payment-service:8443/api/charge",
                        cert=("client.crt", "client.key"),
                        verify="ca.crt")

# After
response = requests.get("http://payment-service:8080/api/charge")
```

The sidecar handles mTLS transparently. Your app talks plaintext to the local sidecar, and the sidecar encrypts it.

### Phase 4: Clean Up TLS Artifacts

Remove the now-unused TLS resources:

```bash
# Remove certificate secrets
kubectl delete secret payment-service-tls

# Remove cert-manager Certificate resource
kubectl delete certificate payment-service-tls

# Remove CA bundle ConfigMap if no longer needed
kubectl delete configmap ca-bundle
```

### Phase 5: Repeat for All Services

Migrate each service one at a time:

1. Inject sidecar
2. Switch to plaintext HTTP
3. Update callers
4. Remove TLS artifacts

Track progress with a simple checklist:

```bash
# Check which services have sidecars
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}'
```

### Phase 6: Switch to STRICT mTLS

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

Verify with:

```bash
istioctl x describe pod payment-service-xxxxx
```

### Phase 7: Decommission Old CA Infrastructure

Once everything runs on Istio mTLS:

1. Remove cert-manager ClusterIssuer if it was only for internal TLS
2. Disable or decommission the internal CA (Vault PKI endpoint, CFSSL, etc.)
3. Remove certificate rotation automation (cron jobs, scripts)
4. Update runbooks and documentation

## Handling Edge Cases

### External Services

External services that are not in the mesh still need traditional TLS. Use ServiceEntries and DestinationRules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE  # Standard TLS (not mTLS)
```

### Services That Cannot Have Sidecars

Some services (like certain databases or legacy systems) cannot run sidecars. Keep them in PERMISSIVE mode or set up specific PeerAuthentication exceptions:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: legacy-exception
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-service
  mtls:
    mode: DISABLE
```

### Custom CA Integration

If you want Istio to use your existing CA instead of its built-in one, you can configure it:

```bash
istioctl install --set values.pilot.env.EXTERNAL_CA=ISTIOD_RA_KUBERNETES_API
```

Or provide a custom CA certificate to istiod:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

This way, Istio issues certificates signed by your existing CA, maintaining trust chain compatibility during migration.

## Benefits After Migration

| Before (Self-Managed) | After (Istio mTLS) |
|---|---|
| 90-day certificate lifetime | 24-hour certificate lifetime |
| Manual or scripted rotation | Automatic rotation |
| One cert per service | One cert per pod |
| Full CA infrastructure to maintain | Built into Istio |
| TLS config in every service | Zero TLS config in services |
| Trust store management | Automatic trust distribution |

The migration from self-managed TLS to Istio mTLS is one of the highest-value Istio adoption tasks. It eliminates an entire category of operational toil and improves security by reducing certificate lifetime from months to hours.
