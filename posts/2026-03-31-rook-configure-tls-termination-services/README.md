# How to Configure TLS Termination for Rook-Ceph Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, TLS, SSL, Security, Kubernetes, Certificate

Description: Configure TLS encryption for Rook-Ceph services including RGW, dashboard, and monitors using cert-manager or custom certificates for secure communication.

---

## Overview

TLS termination for Rook-Ceph services can be handled at multiple layers: within Ceph services themselves, at an Ingress controller, or via a service mesh. This guide covers configuring TLS for RGW and the dashboard using both native Ceph TLS and Ingress-based termination.

## TLS for the Ceph Dashboard

Enable native TLS on the dashboard:

```yaml
spec:
  dashboard:
    enabled: true
    port: 8443
    ssl: true
```

Rook creates a self-signed certificate automatically. To use a custom certificate, set it via the Ceph CLI through the toolbox pod:

```bash
kubectl -n rook-ceph cp dashboard.crt deploy/rook-ceph-tools:/tmp/dashboard.crt
kubectl -n rook-ceph cp dashboard.key deploy/rook-ceph-tools:/tmp/dashboard.key

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-ssl-certificate -i /tmp/dashboard.crt

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-ssl-certificate-key -i /tmp/dashboard.key
```

Alternatively, use Ingress-based TLS termination with cert-manager for automated certificate management (see the Ingress section below).

## TLS for RGW (S3 API)

Configure HTTPS on the RGW:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    securePort: 443
    sslCertificateRef: rgw-tls-cert
    instances: 2
```

Create the certificate secret referenced by `sslCertificateRef`:

```bash
kubectl -n rook-ceph create secret tls rgw-tls-cert \
  --cert=rgw.crt \
  --key=rgw.key
```

Or use cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: rgw-tls-cert
  namespace: rook-ceph
spec:
  secretName: rgw-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - s3.example.com
```

## TLS at the Ingress Layer

For Ingress-based TLS termination (Ceph services run HTTP internally):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rgw-tls
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - s3.example.com
    secretName: rgw-ingress-tls
  rules:
  - host: s3.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-rgw-my-store
            port:
              number: 80
```

## TLS for Ceph Monitors

For encrypted inter-daemon communication (msgr2 protocol), enable encryption in the CephCluster CRD:

```yaml
spec:
  network:
    connections:
      encryption:
        enabled: true
      requireMsgr2: true
```

This configures Rook to set `ms_cluster_mode`, `ms_service_mode`, and `ms_client_mode` to `secure` across all daemons.

Verify msgr2 encryption status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config dump | grep ms_cluster_mode
```

## Verifying TLS Configuration

Test RGW HTTPS:

```bash
curl -v https://s3.example.com/
openssl s_client -connect s3.example.com:443 -showcerts
```

Test dashboard TLS:

```bash
curl -vk https://ceph.example.com:8443/
```

## Summary

TLS for Rook-Ceph services is configured either natively in Ceph using the `sslCertificateRef` for RGW and `ssl: true` for the dashboard, or at the Ingress layer for centralized certificate management. Use cert-manager to automate certificate provisioning and renewal, and enable `network.connections.encryption` in the CephCluster CRD for encrypted cluster-internal communication via msgr2.
