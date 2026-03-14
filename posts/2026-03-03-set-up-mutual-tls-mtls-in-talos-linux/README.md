# How to Set Up Mutual TLS (mTLS) in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MTLS, TLS, Security, Encryption

Description: Learn how to configure and manage mutual TLS authentication in Talos Linux for securing all communication between cluster components and clients.

---

Mutual TLS (mTLS) is a security mechanism where both the client and server authenticate each other using certificates. Unlike standard TLS where only the server presents a certificate, mTLS requires the client to also present a certificate that the server validates. Talos Linux uses mTLS as the foundation for all its API communication, and understanding how it works is essential for operating a secure cluster.

This guide explains how mTLS works in Talos Linux, how to configure it for different use cases, and how to extend it to your application workloads.

## How mTLS Works in Talos Linux

Every interaction between a client (like `talosctl`) and a Talos node goes through mTLS:

1. The client connects to the Talos API (port 50000)
2. The server presents its certificate, signed by the Talos CA
3. The client verifies the server certificate against the known CA
4. The client presents its own certificate, also signed by the Talos CA
5. The server verifies the client certificate
6. Only after both sides authenticate does the connection proceed

```text
Client (talosctl)                    Server (Talos node)
     |                                     |
     |---- ClientHello ------------------>|
     |<--- ServerHello + Server Cert -----|
     |                                     |
     |  (Client verifies server cert      |
     |   against Talos CA)                |
     |                                     |
     |---- Client Cert ------------------>|
     |                                     |
     |  (Server verifies client cert      |
     |   against Talos CA)                |
     |                                     |
     |<--- Connection Established --------|
```

This is not optional in Talos. There is no way to communicate with the API without valid certificates.

## The Talos mTLS Certificate Chain

Talos maintains several mTLS-secured communication channels:

### Talos API (Port 50000)

```text
Talos CA
  |-- Server cert (on each node)
  |-- Client cert (in talosconfig)
```

### Kubernetes API (Port 6443)

```text
Kubernetes CA
  |-- API server cert
  |-- Kubelet client cert
  |-- Controller manager cert
  |-- Scheduler cert
  |-- Client cert (in kubeconfig)
```

### etcd (Ports 2379/2380)

```text
etcd CA
  |-- etcd peer certs (node-to-node)
  |-- etcd client certs (API server to etcd)
```

## Viewing Current mTLS Configuration

Check the mTLS certificates currently in use.

```bash
# View Talos API server certificate
talosctl -n 10.0.1.10 get certificate

# Inspect the API server certificate details
echo | openssl s_client -connect 10.0.1.10:50000 2>/dev/null | \
  openssl x509 -text -noout

# View the Kubernetes API server certificate
echo | openssl s_client -connect 10.0.1.10:6443 2>/dev/null | \
  openssl x509 -text -noout

# Check etcd peer certificate
talosctl -n 10.0.1.10 read /etc/kubernetes/pki/etcd/peer.crt | \
  openssl x509 -text -noout
```

## Configuring mTLS for Custom Applications

Beyond the built-in mTLS for Talos and Kubernetes, you can set up mTLS for your own application workloads.

### Using cert-manager for Automatic Certificate Management

cert-manager automates certificate issuance and renewal in Kubernetes.

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=available deployment/cert-manager -n cert-manager --timeout=120s
```

Create an internal CA for mTLS:

```yaml
# internal-ca.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca-issuer
spec:
  ca:
    secretName: internal-ca-key-pair

---
# Create the CA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: internal-ca
  secretName: internal-ca-key-pair
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
    group: cert-manager.io

---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
```

```bash
kubectl apply -f internal-ca.yaml
```

### Issuing mTLS Certificates for Services

```yaml
# mtls-server-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-server-mtls
  namespace: production
spec:
  secretName: api-server-mtls-tls
  duration: 720h  # 30 days
  renewBefore: 168h  # Renew 7 days before expiry
  subject:
    organizations:
      - my-company
  commonName: api-server
  isCA: false
  privateKey:
    algorithm: ECDSA
    size: 256
  usages:
    - server auth
    - client auth
  dnsNames:
    - api-server
    - api-server.production.svc
    - api-server.production.svc.cluster.local
  issuerRef:
    name: internal-ca-issuer
    kind: ClusterIssuer
    group: cert-manager.io

---
# Client certificate for services that need to connect
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-client-mtls
  namespace: production
spec:
  secretName: api-client-mtls-tls
  duration: 720h
  renewBefore: 168h
  subject:
    organizations:
      - my-company
  commonName: api-client
  isCA: false
  privateKey:
    algorithm: ECDSA
    size: 256
  usages:
    - client auth
  issuerRef:
    name: internal-ca-issuer
    kind: ClusterIssuer
    group: cert-manager.io
```

```bash
kubectl apply -f mtls-server-cert.yaml
```

### Configuring an Application with mTLS

Here is an example nginx configuration that requires client certificates:

```yaml
# mtls-nginx.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-mtls-config
  namespace: production
data:
  nginx.conf: |
    server {
        listen 8443 ssl;

        # Server certificate
        ssl_certificate /etc/nginx/certs/tls.crt;
        ssl_certificate_key /etc/nginx/certs/tls.key;

        # Require client certificate
        ssl_client_certificate /etc/nginx/certs/ca.crt;
        ssl_verify_client on;

        # TLS settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            # Pass client certificate info to backend
            proxy_set_header X-SSL-Client-CN $ssl_client_s_dn_cn;
            proxy_set_header X-SSL-Client-Verify $ssl_client_verify;
            return 200 "mTLS authenticated: $ssl_client_s_dn_cn\n";
        }
    }

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mtls-server
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mtls-server
  template:
    metadata:
      labels:
        app: mtls-server
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: nginx
          image: nginx:1.27
          ports:
            - containerPort: 8443
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: server-certs
              mountPath: /etc/nginx/certs
              readOnly: true
            - name: nginx-config
              mountPath: /etc/nginx/conf.d
      volumes:
        - name: server-certs
          secret:
            secretName: api-server-mtls-tls
        - name: nginx-config
          configMap:
            name: nginx-mtls-config
```

### Testing mTLS

```bash
# Port-forward to the mTLS server
kubectl port-forward -n production svc/mtls-server 8443:8443 &

# Test without client certificate (should fail)
curl -k https://localhost:8443/
# Expected: SSL error - client certificate required

# Test with client certificate (should succeed)
kubectl get secret api-client-mtls-tls -n production -o jsonpath='{.data.tls\.crt}' | \
  base64 -d > client.crt
kubectl get secret api-client-mtls-tls -n production -o jsonpath='{.data.tls\.key}' | \
  base64 -d > client.key
kubectl get secret api-client-mtls-tls -n production -o jsonpath='{.data.ca\.crt}' | \
  base64 -d > ca.crt

curl --cert client.crt --key client.key --cacert ca.crt \
  https://localhost:8443/
# Expected: "mTLS authenticated: api-client"
```

## Service Mesh mTLS

For comprehensive mTLS between all services, consider a service mesh.

### Cilium mTLS (No Sidecar)

Cilium can provide transparent mTLS without sidecar containers:

```yaml
# cilium-mtls.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: require-mtls
  namespace: production
spec:
  endpointSelector: {}
  ingress:
    - fromEndpoints:
        - {}
      authentication:
        mode: required
```

### Istio Service Mesh

For a full-featured service mesh with mTLS:

```bash
# Install Istio
istioctl install --set profile=demo

# Enable sidecar injection for a namespace
kubectl label namespace production istio-injection=enabled

# Configure strict mTLS for the namespace
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
EOF
```

## Monitoring mTLS Health

Keep track of certificate expiration and mTLS connection failures.

```bash
# Check Talos API certificate connectivity
for node in 10.0.1.10 10.0.1.11 10.0.1.12; do
  echo -n "Node $node: "
  if talosctl -n $node version > /dev/null 2>&1; then
    echo "mTLS OK"
  else
    echo "mTLS FAILED"
  fi
done

# Check Kubernetes API mTLS
echo -n "Kubernetes API: "
if kubectl get nodes > /dev/null 2>&1; then
  echo "mTLS OK"
else
  echo "mTLS FAILED"
fi
```

## Troubleshooting mTLS Issues

### Certificate Mismatch

```bash
# Verify the client cert is signed by the expected CA
openssl verify -CAfile talos-ca.crt client.crt
# Should output: client.crt: OK

# Check if the certificate has the right usage
openssl x509 -in client.crt -text -noout | grep -A2 "Key Usage"
```

### Expired Certificates

```bash
# Check certificate expiration
openssl x509 -in client.crt -noout -dates

# If expired, generate new certificates
# Talos auto-renews leaf certificates, but check if the CA is still valid
```

### Connection Refused

```bash
# Verify the server is listening on the expected port
talosctl -n 10.0.1.10 netstat | grep 50000

# Check if the correct CA is trusted
openssl s_client -connect 10.0.1.10:50000 \
  -cert client.crt -key client.key -CAfile ca.crt
```

## Conclusion

Mutual TLS is fundamental to Talos Linux security. Every API interaction requires both the client and server to prove their identity through certificates. Understanding how this mTLS infrastructure works helps you troubleshoot connection issues, rotate certificates properly, and extend mTLS to your own application workloads. Whether you use cert-manager for automated certificate management or a service mesh for transparent mTLS, building on the strong mTLS foundation that Talos provides gives your cluster defense-in-depth against unauthorized access and network-level attacks.
