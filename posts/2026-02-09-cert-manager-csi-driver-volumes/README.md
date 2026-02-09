# How to Implement cert-manager CSI Driver for Mounting Certificates as Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Storage

Description: Learn how to use cert-manager CSI driver to mount certificates directly as volumes in pods with automatic updates and improved security for certificate management.

---

The traditional approach to certificate distribution in Kubernetes uses secrets mounted as volumes. While functional, this has limitations. Secrets persist in etcd even after pods delete, and applications must implement reload logic for certificate updates. The cert-manager CSI driver offers an alternative that addresses these challenges.

The CSI (Container Storage Interface) driver mounts certificates directly into pods as filesystem volumes. Certificates exist only while pods run, and the driver handles updates automatically. This improves security by reducing certificate lifetime in the cluster and simplifies application integration.

## Understanding CSI Driver Benefits

The cert-manager CSI driver provides several advantages over traditional secret-based distribution:

Certificates exist only in running pod filesystems. They're not stored persistently in etcd, reducing attack surface and improving security.

Automatic certificate updates without pod restarts. The CSI driver updates mounted volumes when certificates renew, and applications can watch for file changes.

Per-pod certificate requests. Each pod can request unique certificates with pod-specific DNS names or attributes, enabling fine-grained certificate management.

Reduced secret proliferation. No need to create secrets in etcd for every certificate, simplifying cluster management.

Ephemeral certificates for temporary workloads. Certificates disappear when pods terminate, ideal for batch jobs and temporary services.

## Installing cert-manager CSI Driver

Install the CSI driver alongside cert-manager:

```bash
# Install cert-manager CSI driver
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager-csi-driver jetstack/cert-manager-csi-driver \
  --namespace cert-manager \
  --wait

# Verify installation
kubectl get pods -n cert-manager -l app=cert-manager-csi-driver

# Check CSI driver registration
kubectl get csidrivers
# Should show: csi.cert-manager.io
```

The CSI driver runs as a DaemonSet, with one pod per node to handle certificate mounting.

## Basic CSI Volume Configuration

Use CSI volumes in pod specifications to request certificates:

```yaml
# pod-with-csi-cert.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-csi-cert
  namespace: default
spec:
  containers:
  - name: app
    image: nginx:latest
    volumeMounts:
    - name: tls
      mountPath: /etc/tls
      readOnly: true
  volumes:
  - name: tls
    csi:
      driver: csi.cert-manager.io
      readOnly: true
      volumeAttributes:
        # Reference to Issuer or ClusterIssuer
        csi.cert-manager.io/issuer-name: ca-issuer
        csi.cert-manager.io/issuer-kind: ClusterIssuer

        # DNS names for certificate
        csi.cert-manager.io/dns-names: app.example.com

        # Common name
        csi.cert-manager.io/common-name: app.example.com

        # Certificate duration
        csi.cert-manager.io/duration: 720h # 30 days

        # Renew before expiration
        csi.cert-manager.io/renew-before: 240h # 10 days

        # Certificate key usages
        csi.cert-manager.io/key-usages: server auth,client auth

        # File paths in mounted volume
        csi.cert-manager.io/certificate-file: tls.crt
        csi.cert-manager.io/privatekey-file: tls.key
        csi.cert-manager.io/ca-file: ca.crt
```

Apply the pod:

```bash
kubectl apply -f pod-with-csi-cert.yaml

# Check pod status
kubectl get pod app-with-csi-cert

# Verify certificate mounted
kubectl exec app-with-csi-cert -- ls -la /etc/tls
kubectl exec app-with-csi-cert -- cat /etc/tls/tls.crt | openssl x509 -text -noout
```

The CSI driver requests the certificate when the pod starts and mounts it at /etc/tls.

## Using CSI Volumes in Deployments

Configure Deployments to use CSI-mounted certificates:

```yaml
# deployment-with-csi-cert.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: api
        image: api-service:latest
        ports:
        - containerPort: 8443
          name: https
        volumeMounts:
        - name: tls
          mountPath: /etc/tls
          readOnly: true
        env:
        - name: TLS_CERT_FILE
          value: /etc/tls/tls.crt
        - name: TLS_KEY_FILE
          value: /etc/tls/tls.key
      volumes:
      - name: tls
        csi:
          driver: csi.cert-manager.io
          readOnly: true
          volumeAttributes:
            csi.cert-manager.io/issuer-name: letsencrypt-prod
            csi.cert-manager.io/issuer-kind: ClusterIssuer
            csi.cert-manager.io/dns-names: api.example.com,api-internal.example.com
            csi.cert-manager.io/duration: 2160h
            csi.cert-manager.io/renew-before: 720h
```

Each pod replica gets its own certificate mounted via CSI, all with the same parameters.

## Per-Pod Certificate Attributes

Use pod metadata in certificate requests for pod-specific certificates:

```yaml
# pod-specific-cert.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: worker:latest
        volumeMounts:
        - name: tls
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls
        csi:
          driver: csi.cert-manager.io
          readOnly: true
          volumeAttributes:
            csi.cert-manager.io/issuer-name: ca-issuer
            csi.cert-manager.io/issuer-kind: ClusterIssuer

            # Use pod name in certificate common name
            csi.cert-manager.io/common-name: ${POD_NAME}.worker.production.svc.cluster.local

            # Pod-specific DNS names
            csi.cert-manager.io/dns-names: ${POD_NAME}.worker.production.svc.cluster.local,worker.production.svc.cluster.local

            # Include pod UID in certificate metadata
            csi.cert-manager.io/pod-uid: ${POD_UID}

            csi.cert-manager.io/duration: 720h
            csi.cert-manager.io/renew-before: 240h
```

The CSI driver substitutes pod-specific values like ${POD_NAME} and ${POD_UID} at mount time, creating unique certificates for each pod.

## Certificate Rotation with CSI

The CSI driver handles certificate renewal automatically:

```yaml
# auto-rotating-csi-cert.yaml
apiVersion: v1
kind: Pod
metadata:
  name: auto-rotating-app
spec:
  containers:
  - name: app
    image: app:latest
    volumeMounts:
    - name: tls
      mountPath: /etc/tls
      readOnly: true
  volumes:
  - name: tls
    csi:
      driver: csi.cert-manager.io
      readOnly: true
      volumeAttributes:
        csi.cert-manager.io/issuer-name: ca-issuer
        csi.cert-manager.io/issuer-kind: ClusterIssuer
        csi.cert-manager.io/dns-names: app.example.com

        # Short duration for frequent rotation
        csi.cert-manager.io/duration: 168h # 7 days

        # Renew 2 days before expiration
        csi.cert-manager.io/renew-before: 48h

        # Rotation behavior
        csi.cert-manager.io/reuse-private-key: "false" # Always generate new key
```

When certificates renew, the CSI driver updates the mounted files. Applications watching the filesystem detect changes and reload certificates without restarting.

## Watching for Certificate Updates

Applications can watch mounted certificate files for changes:

```python
# Example Python application with certificate watching
import ssl
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class CertificateWatcher(FileSystemEventHandler):
    def __init__(self, ssl_context):
        self.ssl_context = ssl_context

    def on_modified(self, event):
        if event.src_path.endswith('tls.crt'):
            print(f"Certificate updated: {event.src_path}")
            self.reload_certificate()

    def reload_certificate(self):
        # Reload SSL context with new certificate
        self.ssl_context.load_cert_chain(
            '/etc/tls/tls.crt',
            '/etc/tls/tls.key'
        )
        print("Certificate reloaded successfully")

# Initialize SSL context
ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
ssl_context.load_cert_chain('/etc/tls/tls.crt', '/etc/tls/tls.key')

# Start watching certificate directory
observer = Observer()
observer.schedule(CertificateWatcher(ssl_context), '/etc/tls', recursive=False)
observer.start()

# Application code continues...
```

This approach enables zero-downtime certificate rotation without pod restarts.

## CSI with mTLS

Use CSI driver for mutual TLS certificate distribution:

```yaml
# mtls-with-csi.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mtls-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mtls-service
  template:
    metadata:
      labels:
        app: mtls-service
    spec:
      containers:
      - name: service
        image: mtls-service:latest
        volumeMounts:
        # Server certificate via CSI
        - name: server-tls
          mountPath: /etc/tls/server
          readOnly: true
        # Client certificate via CSI
        - name: client-tls
          mountPath: /etc/tls/client
          readOnly: true
        # CA certificate for verification
        - name: ca-bundle
          mountPath: /etc/tls/ca
          readOnly: true
      volumes:
      # Server certificate
      - name: server-tls
        csi:
          driver: csi.cert-manager.io
          readOnly: true
          volumeAttributes:
            csi.cert-manager.io/issuer-name: mtls-ca-issuer
            csi.cert-manager.io/issuer-kind: ClusterIssuer
            csi.cert-manager.io/dns-names: service.production.svc.cluster.local
            csi.cert-manager.io/key-usages: server auth
            csi.cert-manager.io/duration: 2160h
            csi.cert-manager.io/renew-before: 720h

      # Client certificate
      - name: client-tls
        csi:
          driver: csi.cert-manager.io
          readOnly: true
          volumeAttributes:
            csi.cert-manager.io/issuer-name: mtls-ca-issuer
            csi.cert-manager.io/issuer-kind: ClusterIssuer
            csi.cert-manager.io/common-name: service-client
            csi.cert-manager.io/key-usages: client auth
            csi.cert-manager.io/duration: 720h
            csi.cert-manager.io/renew-before: 240h

      # CA bundle from ConfigMap
      - name: ca-bundle
        configMap:
          name: mtls-ca-bundle
```

This configuration provides both server and client certificates via CSI, enabling complete mTLS setup.

## CSI with ACME Certificates

Use CSI driver with Let's Encrypt for external certificates:

```yaml
# letsencrypt-csi.yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-with-letsencrypt
  namespace: production
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 443
    volumeMounts:
    - name: tls
      mountPath: /etc/nginx/certs
      readOnly: true
  volumes:
  - name: tls
    csi:
      driver: csi.cert-manager.io
      readOnly: true
      volumeAttributes:
        csi.cert-manager.io/issuer-name: letsencrypt-prod
        csi.cert-manager.io/issuer-kind: ClusterIssuer
        csi.cert-manager.io/dns-names: web.example.com,www.example.com
        csi.cert-manager.io/duration: 2160h
        csi.cert-manager.io/renew-before: 720h
```

Note that ACME challenges still require HTTP-01 or DNS-01 validation, which happens during pod startup.

## Monitoring CSI Certificate Status

Monitor CSI-mounted certificates:

```bash
# Check CSI driver pods
kubectl get pods -n cert-manager -l app=cert-manager-csi-driver

# View CSI driver logs
kubectl logs -n cert-manager -l app=cert-manager-csi-driver -f

# Check certificate files in pod
kubectl exec <pod-name> -- ls -la /etc/tls

# Verify certificate details
kubectl exec <pod-name> -- openssl x509 -in /etc/tls/tls.crt -text -noout

# Check certificate expiration
kubectl exec <pod-name> -- openssl x509 -in /etc/tls/tls.crt -noout -enddate
```

## Troubleshooting CSI Volumes

Common CSI driver issues and solutions:

### Pod Fails to Start

```bash
# Check pod events
kubectl describe pod <pod-name>

# Look for CSI-related errors
# Common issues:
# - Invalid issuer reference
# - DNS name validation failures
# - Issuer not ready

# Check CSI driver logs
kubectl logs -n cert-manager -l app=cert-manager-csi-driver
```

### Certificate Not Mounting

```bash
# Verify CSI driver running
kubectl get pods -n cert-manager -l app=cert-manager-csi-driver

# Check volume attributes in pod spec
kubectl get pod <pod-name> -o yaml | grep -A 20 csi:

# Verify issuer exists and is ready
kubectl get issuer <issuer-name> -n <namespace>
kubectl get clusterissuer <clusterissuer-name>
```

### Certificate Not Updating

```bash
# Check if renewal time reached
kubectl exec <pod-name> -- openssl x509 -in /etc/tls/tls.crt -noout -enddate

# Verify CSI driver can communicate with cert-manager
kubectl logs -n cert-manager -l app=cert-manager-csi-driver | grep -i renew

# Check for errors in certificate request
kubectl get certificaterequest --all-namespaces
```

## Performance Considerations

CSI driver performance depends on certificate request frequency and pod churn:

For stable, long-running deployments, CSI driver overhead is minimal. Certificates are requested once per pod at startup.

For high pod churn (frequent scaling, rolling updates), CSI driver issues many certificate requests. Consider caching strategies or traditional secret-based distribution.

For large clusters with thousands of pods, monitor CSI driver resource usage and scale DaemonSet if needed.

## Security Benefits

CSI-mounted certificates provide security advantages:

No persistent storage in etcd reduces attack surface. Certificates exist only in running pod memory and filesystems.

Per-pod certificates enable fine-grained audit logging. Track which pods requested which certificates and when.

Automatic cleanup when pods terminate. No orphaned certificate secrets to manage.

Reduced privilege requirements. Applications don't need secret read permissions, only volume mount capability.

## Best Practices

Use CSI driver for ephemeral workloads and batch jobs where certificates shouldn't persist after completion.

Implement certificate watching in applications for zero-downtime rotation. Don't rely on pod restarts.

Set appropriate duration and renewBefore values. Short durations increase certificate request frequency.

Monitor CSI driver resource usage in production. Scale DaemonSet if latency increases.

Use traditional secret-based distribution for very stable, long-running services where CSI overhead isn't warranted.

Test certificate rotation in development with short durations. Verify applications handle file updates correctly.

## Conclusion

The cert-manager CSI driver provides a modern approach to certificate distribution in Kubernetes. By mounting certificates directly into pod filesystems with automatic updates, it improves security and simplifies application integration compared to traditional secret-based approaches.

While not suitable for every scenario, CSI-mounted certificates excel for ephemeral workloads, per-pod certificates, and applications that support dynamic certificate reloading. Combined with proper monitoring and testing, the CSI driver delivers production-ready certificate management with enhanced security characteristics.
