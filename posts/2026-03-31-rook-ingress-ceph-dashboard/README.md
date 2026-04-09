# How to Set Up Ingress for Ceph Dashboard in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Ingress, Kubernetes, Nginx, TLS

Description: Expose the Ceph Manager Dashboard through a Kubernetes Ingress controller with TLS termination for secure external access in Rook-Ceph clusters.

---

## Overview

The Ceph Dashboard provides a web UI for managing and monitoring your Ceph cluster. By default, it is only accessible within the cluster. Exposing it via an Ingress controller allows secure external access with TLS termination.

## Step 1: Enable the Ceph Dashboard

Ensure the dashboard is enabled in the CephCluster spec:

```yaml
spec:
  dashboard:
    enabled: true
    port: 8443
    ssl: true
```

Verify the dashboard service is running:

```bash
kubectl -n rook-ceph get svc rook-ceph-mgr-dashboard
```

## Step 2: Create a TLS Certificate Secret

Generate or obtain a TLS certificate for your dashboard domain:

```bash
# Using cert-manager ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ceph-dashboard-tls
  namespace: rook-ceph
spec:
  secretName: ceph-dashboard-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - ceph.example.com
EOF
```

Or create a self-signed secret:

```bash
kubectl -n rook-ceph create secret tls ceph-dashboard-tls \
  --cert=dashboard.crt --key=dashboard.key
```

## Step 3: Create the Ingress Resource

For NGINX Ingress with HTTPS backend (dashboard has SSL enabled):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rook-ceph-dashboard
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/server-snippet: |
      proxy_ssl_verify off;
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - ceph.example.com
    secretName: ceph-dashboard-tls
  rules:
  - host: ceph.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-mgr-dashboard
            port:
              number: 8443
```

For TLS termination at the Ingress (dashboard runs HTTP):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rook-ceph-dashboard
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - ceph.example.com
    secretName: ceph-dashboard-tls
  rules:
  - host: ceph.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-mgr-dashboard
            port:
              number: 7000
```

## Step 4: Retrieve Dashboard Credentials

Get the admin password:

```bash
kubectl -n rook-ceph get secret rook-ceph-dashboard-password \
  -o jsonpath="{['data']['password']}" | base64 --decode
```

## Step 5: Test Access

Verify the Ingress is configured correctly:

```bash
kubectl -n rook-ceph get ingress rook-ceph-dashboard
curl -k https://ceph.example.com
```

## Additional Security: IP Allowlisting

Restrict dashboard access to specific IP ranges:

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,192.168.0.0/16"
```

## Summary

Exposing the Ceph Dashboard through Kubernetes Ingress requires enabling the dashboard in the CephCluster spec, creating TLS certificates, and configuring an Ingress resource with the appropriate backend protocol annotation. Use `nginx.ingress.kubernetes.io/backend-protocol: HTTPS` when the dashboard serves TLS natively.
