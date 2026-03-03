# How to Configure TLS Secrets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, TLS, Secret, Security, Certificate

Description: A complete guide to creating and configuring TLS Secrets on Talos Linux for securing your Kubernetes services with SSL/TLS certificates.

---

TLS (Transport Layer Security) is essential for encrypting traffic between clients and your services. In Kubernetes, TLS certificates are stored as a special type of Secret called `kubernetes.io/tls`. On Talos Linux, where security is deeply integrated into the platform, properly configuring TLS Secrets is a fundamental part of running production workloads.

This guide walks you through creating TLS Secrets, using them with Ingress controllers, and managing certificate lifecycles on Talos Linux.

## Understanding TLS Secrets

A TLS Secret in Kubernetes contains two pieces of data:

- `tls.crt` - The TLS certificate (and optionally the full certificate chain)
- `tls.key` - The private key associated with the certificate

Kubernetes validates that these two fields are present when you create a Secret of type `kubernetes.io/tls`. The certificate and key must be PEM-encoded.

## Prerequisites

You will need:

- A running Talos Linux cluster
- `kubectl` configured and working
- `openssl` installed on your local machine (for generating certificates)
- Optionally, an Ingress controller deployed to your cluster

```bash
# Verify cluster access
kubectl cluster-info

# Check if you have openssl available
openssl version
```

## Generating a Self-Signed Certificate

For development and testing, you can create a self-signed certificate. This is not suitable for production, but it is useful for getting started:

```bash
# Generate a private key
openssl genrsa -out tls.key 2048

# Generate a self-signed certificate valid for 365 days
openssl req -new -x509 -key tls.key -out tls.crt -days 365 \
  -subj "/CN=myapp.example.com/O=MyOrg"

# Verify the certificate
openssl x509 -in tls.crt -text -noout | head -20
```

For certificates with Subject Alternative Names (SANs), which most modern applications require:

```bash
# Create an OpenSSL config file for SANs
cat > san.cnf << 'EOF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = myapp.example.com

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = myapp.example.com
DNS.2 = *.myapp.example.com
DNS.3 = localhost
IP.1 = 10.0.0.1
EOF

# Generate the certificate with SANs
openssl req -new -x509 -key tls.key -out tls.crt -days 365 \
  -config san.cnf -extensions v3_req
```

## Creating a TLS Secret

Now create the TLS Secret in your Talos cluster:

```bash
# Create TLS secret from certificate and key files
kubectl create secret tls myapp-tls \
  --cert=tls.crt \
  --key=tls.key \
  --namespace=default

# Verify the secret
kubectl get secret myapp-tls
kubectl describe secret myapp-tls
```

The output from `describe` will show:

```text
Name:         myapp-tls
Namespace:    default
Type:         kubernetes.io/tls

Data
====
tls.crt:  1164 bytes
tls.key:  1704 bytes
```

## Creating TLS Secrets with YAML

You can also define TLS Secrets declaratively. The certificate and key must be base64-encoded:

```bash
# Base64 encode the certificate and key
TLS_CRT=$(cat tls.crt | base64 | tr -d '\n')
TLS_KEY=$(cat tls.key | base64 | tr -d '\n')

# Create the YAML manifest
cat > tls-secret.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: myapp-tls-yaml
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: ${TLS_CRT}
  tls.key: ${TLS_KEY}
EOF

# Apply it
kubectl apply -f tls-secret.yaml
```

## Using TLS Secrets with Ingress

The most common use case for TLS Secrets is with Kubernetes Ingress resources. Here is how to configure HTTPS for your services:

```yaml
# ingress-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp-service
            port:
              number: 80
```

```bash
# Apply the Ingress
kubectl apply -f ingress-tls.yaml

# Check the Ingress status
kubectl describe ingress myapp-ingress
```

## Multiple TLS Certificates on One Ingress

You can configure different TLS certificates for different hostnames on a single Ingress:

```yaml
# multi-tls-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-domain-ingress
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  - hosts:
    - api.example.com
    secretName: api-tls
  - hosts:
    - admin.example.com
    secretName: admin-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
  - host: admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 3000
```

## Mounting TLS Secrets in Pods

Some applications handle TLS termination themselves rather than relying on an Ingress controller. In that case, mount the TLS Secret directly into the pod:

```yaml
# pod-with-tls.yaml
apiVersion: v1
kind: Pod
metadata:
  name: tls-app
spec:
  containers:
  - name: app
    image: myapp:latest
    ports:
    - containerPort: 8443
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
      secretName: myapp-tls
      defaultMode: 0400
```

## Setting Up a Certificate Authority

For internal services on your Talos cluster, you might want to set up your own Certificate Authority (CA):

```bash
# Generate CA private key
openssl genrsa -out ca.key 4096

# Generate CA certificate
openssl req -new -x509 -key ca.key -out ca.crt -days 3650 \
  -subj "/CN=Talos Internal CA/O=MyOrg"

# Generate a server key
openssl genrsa -out server.key 2048

# Create a certificate signing request
openssl req -new -key server.key -out server.csr \
  -subj "/CN=myservice.default.svc.cluster.local"

# Sign the CSR with your CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365

# Create the TLS secret with the signed certificate
kubectl create secret tls myservice-tls \
  --cert=server.crt \
  --key=server.key

# Also store the CA cert for clients that need to verify
kubectl create configmap ca-cert --from-file=ca.crt=ca.crt
```

## Checking Certificate Expiration

Monitoring certificate expiration is critical. Here is how to check:

```bash
# Check when a certificate in a Secret expires
kubectl get secret myapp-tls -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -enddate

# Check the full certificate details
kubectl get secret myapp-tls -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -text

# Quick script to check all TLS secrets in a namespace
for secret in $(kubectl get secrets -o jsonpath='{range .items[?(@.type=="kubernetes.io/tls")]}{.metadata.name}{"\n"}{end}'); do
  echo "Secret: $secret"
  kubectl get secret "$secret" -o jsonpath='{.data.tls\.crt}' | \
    base64 -d | openssl x509 -noout -enddate
  echo "---"
done
```

## Renewing TLS Secrets

When a certificate is about to expire, you need to renew it:

```bash
# Generate a new certificate (using the same key or a new one)
openssl req -new -x509 -key tls.key -out tls-new.crt -days 365 \
  -subj "/CN=myapp.example.com"

# Update the secret in place
kubectl create secret tls myapp-tls \
  --cert=tls-new.crt \
  --key=tls.key \
  --dry-run=client -o yaml | kubectl apply -f -

# Verify the update
kubectl get secret myapp-tls -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -enddate
```

Ingress controllers typically pick up the new certificate automatically. For pods that mount TLS Secrets as volumes, the files will update within the kubelet sync period (usually about 60 seconds).

## Best Practices

1. **Use cert-manager for automation.** Instead of manually managing certificates, deploy cert-manager on your Talos cluster to handle automatic issuance and renewal.

2. **Set up monitoring for expiration.** Prometheus and Grafana can alert you before certificates expire.

3. **Use strong key sizes.** RSA 2048-bit minimum, or better yet, use ECDSA P-256 keys for better performance.

4. **Restrict Secret access with RBAC.** TLS private keys are highly sensitive. Limit who can read TLS Secrets.

5. **Separate certificates per service.** Do not share TLS certificates across unrelated services. If one is compromised, you only need to rotate that single certificate.

6. **Store CA certificates in ConfigMaps.** CA certificates are public data and do not need Secret-level protection.

## Wrapping Up

TLS Secrets on Talos Linux provide a secure way to manage certificates for your Kubernetes services. Whether you are terminating TLS at the Ingress level or inside your application pods, the process is straightforward. For production environments, invest in setting up cert-manager to automate the entire certificate lifecycle, and always monitor for upcoming expirations to avoid outages.
