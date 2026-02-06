# How to Fix Certificate Rotation Breaking the Collector mTLS Connection Until Pod Restart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, mTLS, Certificate Rotation, Kubernetes

Description: Fix the issue where certificate rotation breaks mTLS connections in the Collector until the pod is manually restarted.

You have set up mTLS between your applications and the OpenTelemetry Collector. Everything works until cert-manager rotates the certificates. Suddenly, all connections fail with TLS errors, and the only way to recover is to restart the Collector pod. This is a classic problem with how the Collector loads TLS certificates.

## Why This Happens

The OpenTelemetry Collector loads TLS certificates at startup. When cert-manager rotates a certificate and updates the Kubernetes Secret, the files on disk inside the pod get updated (because the Secret is mounted as a volume), but the Collector does not reload them. It continues using the old certificate that is now expired or no longer matches the new CA.

The timeline looks like this:

```
T=0:  Collector starts, loads cert A (valid until T+90d)
T=89d: cert-manager rotates, creates cert B in the Secret
T=89d: Kubernetes updates the mounted volume with cert B
T=89d: Collector still uses cert A in memory (does not reload)
T=90d: cert A expires, all mTLS connections fail
```

## Solution 1: Use the Collector's reload_interval

Starting with Collector v0.90+, TLS configuration supports a `reload_interval` parameter that tells the Collector to periodically re-read certificate files from disk:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        tls:
          cert_file: /certs/tls.crt
          key_file: /certs/tls.key
          client_ca_file: /certs/ca.crt
          reload_interval: 1h  # Re-read certs every hour
```

This is the cleanest solution. The Collector will pick up new certificates without a restart.

## Solution 2: Use Kubernetes Secret Volumes with Projected Volumes

Kubernetes updates Secret-backed volumes automatically, but there is a propagation delay. Combine this with a file watcher or a sidecar that triggers a reload.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
        - name: collector
          volumeMounts:
            - name: certs
              mountPath: /certs
              readOnly: true
      volumes:
        - name: certs
          projected:
            sources:
              - secret:
                  name: otel-collector-tls
                  items:
                    - key: tls.crt
                      path: tls.crt
                    - key: tls.key
                      path: tls.key
                    - key: ca.crt
                      path: ca.crt
```

## Solution 3: Trigger a Rolling Restart on Certificate Renewal

If your Collector version does not support `reload_interval`, you can use a hash annotation to trigger a rolling restart when the certificate changes:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: otel-collector-cert
  namespace: observability
spec:
  secretName: otel-collector-tls
  issuerRef:
    name: cluster-issuer
    kind: ClusterIssuer
  dnsNames:
    - otel-collector.observability.svc.cluster.local
  # Renew 30 days before expiry
  renewBefore: 720h
```

Then use a tool like Reloader or stakater/Reloader to watch for Secret changes:

```yaml
# Install stakater/Reloader
# It watches for Secret changes and triggers rolling restarts

apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  annotations:
    # Reloader will restart this Deployment when the Secret changes
    secret.reloader.stakater.com/reload: "otel-collector-tls"
```

## Solution 4: Use a Sidecar to Signal Reload

Another approach is a sidecar container that watches the certificate files and sends a signal to the Collector process:

```yaml
containers:
  - name: collector
    image: otel/opentelemetry-collector-contrib:latest
    # ... main container config

  - name: cert-watcher
    image: busybox
    command:
      - sh
      - -c
      - |
        # Watch for certificate file changes
        CERT_FILE="/certs/tls.crt"
        LAST_HASH=$(md5sum $CERT_FILE 2>/dev/null || echo "none")
        while true; do
          sleep 60
          CURRENT_HASH=$(md5sum $CERT_FILE 2>/dev/null || echo "none")
          if [ "$CURRENT_HASH" != "$LAST_HASH" ]; then
            echo "Certificate changed, signaling collector to reload"
            # The collector does not natively support SIGHUP for reload
            # so we write a marker file that a custom extension could watch
            touch /tmp/cert-rotated
            LAST_HASH=$CURRENT_HASH
          fi
        done
    volumeMounts:
      - name: certs
        mountPath: /certs
        readOnly: true
```

## Verifying Certificate Rotation

After implementing your solution, test it by forcing a certificate renewal:

```bash
# Force cert-manager to renew the certificate
kubectl cert-manager renew otel-collector-cert -n observability

# Watch the Secret for updates
kubectl get secret otel-collector-tls -n observability -w

# Check the Collector logs for certificate reload messages
kubectl logs -f deployment/otel-collector -n observability | grep -i "tls\|cert\|reload"

# Verify the connection still works after rotation
kubectl exec -it test-pod -- openssl s_client \
  -connect otel-collector.observability:4317 \
  -cert /certs/client.crt \
  -key /certs/client.key < /dev/null
```

## Best Practice: Short-Lived Certificates

Using short-lived certificates (hours or days instead of months) with frequent rotation is more secure but makes the reload problem more urgent. If you go this route, `reload_interval` in the Collector configuration is essentially required. Set the reload interval to be shorter than the certificate lifetime.

The bottom line: always plan for certificate rotation from day one. It is much easier to configure `reload_interval` upfront than to debug broken mTLS connections at 3 AM when a certificate expires.
