# How to Configure TLS Certificates with SANs for Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, TLS, Object Storage, Security

Description: Learn how to configure TLS certificates with Subject Alternative Names (SANs) for Rook object store to enable secure S3 access with proper hostname validation.

---

## Why SANs Matter for Object Store TLS

A TLS certificate's Subject Alternative Names (SANs) list all the hostnames and IPs that the certificate is valid for. For an S3-compatible object store with virtual host-style bucket access, the certificate must cover:

- The primary gateway hostname (e.g., `s3.example.com`)
- A wildcard for bucket subdomains (e.g., `*.s3.example.com`)
- The internal Kubernetes service name (e.g., `rook-ceph-rgw-my-store.rook-ceph.svc`)
- Optionally, the gateway IP address

Without the correct SANs, S3 clients will reject the connection with a certificate validation error.

## Generating a Certificate with SANs

Create a self-signed certificate with the required SANs. First, prepare an OpenSSL config file:

```text
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = s3.example.com

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = s3.example.com
DNS.2 = *.s3.example.com
DNS.3 = rook-ceph-rgw-my-store.rook-ceph.svc
DNS.4 = rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local
IP.1 = 10.96.1.100
```

Generate the certificate:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout rgw.key \
  -out rgw.crt \
  -config san.conf \
  -extensions v3_req
```

Verify the SANs in the generated certificate:

```bash
openssl x509 -in rgw.crt -text -noout | grep -A10 "Subject Alternative Name"
```

## Creating the TLS Secret

Store the certificate in a Kubernetes secret in the `rook-ceph` namespace:

```bash
kubectl -n rook-ceph create secret tls rgw-tls-secret \
  --cert=rgw.crt \
  --key=rgw.key
```

## Referencing the Certificate in CephObjectStore

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    securePort: 443
    sslCertificateRef: rgw-tls-secret
    instances: 2
    hosting:
      advertiseEndpoint:
        dnsName: s3.example.com
        port: 443
        useTls: true
      dnsNames:
        - s3.example.com
```

## Using cert-manager for Automatic Certificate Management

For production, use cert-manager to automate certificate issuance and renewal:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: rgw-tls
  namespace: rook-ceph
spec:
  secretName: rgw-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - s3.example.com
    - "*.s3.example.com"
    - rook-ceph-rgw-my-store.rook-ceph.svc
```

## Verifying the TLS Configuration

Test the certificate from inside the cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  openssl s_client -connect rook-ceph-rgw-my-store.rook-ceph.svc:443 \
  -servername s3.example.com </dev/null 2>&1 | grep -E "subject|SAN|Verify"
```

Test virtual host-style access with TLS:

```bash
curl --resolve "mybucket.s3.example.com:443:<IP>" \
  https://mybucket.s3.example.com/ -v 2>&1 | grep -E "SSL|Server cert"
```

## Summary

TLS certificates with SANs for Rook object store must cover the primary hostname, a wildcard for bucket subdomains, and the internal Kubernetes service FQDN. Generate a certificate with explicit SANs using OpenSSL or cert-manager, store it as a TLS secret, and reference it via `sslCertificateRef` in the CephObjectStore gateway spec. Wildcard SANs (`*.s3.example.com`) are essential for virtual host-style bucket access over HTTPS.
