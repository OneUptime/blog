# How to Secure Ceph Dashboard Access in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Dashboard, Kubernetes

Description: Secure the Ceph dashboard in Rook by enabling TLS, configuring SSO with Kubernetes OIDC, restricting access with Ingress rules, and managing dashboard user accounts.

---

## Ceph Dashboard Security Risks

The Ceph dashboard exposes cluster health, OSD management, pool operations, and user credentials. Without proper access controls, it is a high-value attack target. Default Rook deployments expose the dashboard as a ClusterIP service - secure it before making it externally accessible.

## Enabling HTTPS on the Dashboard

Enable TLS in the CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  dashboard:
    enabled: true
    ssl: true
    port: 8443
```

Create a TLS secret for the dashboard:

```bash
kubectl -n rook-ceph create secret tls rook-ceph-dashboard-cert \
  --cert=/path/to/cert.pem \
  --key=/path/to/key.pem
```

Reference it in the Rook configuration:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-ssl-certificate -i /tmp/cert.pem

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard set-ssl-certificate-key -i /tmp/key.pem
```

## Restricting Ingress Access

Expose the dashboard only to internal networks via Ingress with IP allowlisting:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ceph-dashboard
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,172.16.0.0/12"
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: dashboard-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Ceph Dashboard"
spec:
  tls:
    - hosts:
        - ceph.internal.example.com
      secretName: dashboard-tls
  rules:
    - host: ceph.internal.example.com
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

## Dashboard User Management

Create a read-only user for operations teams:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-create ops-user \
    "$(openssl rand -base64 16)" \
    read-only
```

List all dashboard users:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-show
```

## Enabling SSO with SAML2

Configure the dashboard to use a SAML2 identity provider (such as Keycloak or Dex):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard sso setup saml2 \
    https://ceph.internal.example.com \
    https://keycloak.example.com/auth/realms/infra \
    "ceph-dashboard"
```

## Rotating the Admin Password

Change the default admin password immediately after deployment:

```bash
NEW_PASSWORD="$(openssl rand -base64 32)"

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph dashboard ac-user-set-password admin \
    "$NEW_PASSWORD" --force-password

kubectl -n rook-ceph create secret generic ceph-dashboard-admin \
  --from-literal=password="$NEW_PASSWORD"
```

## Summary

Securing the Ceph dashboard requires enabling TLS, restricting Ingress to trusted IP ranges, creating read-only accounts for operations staff, and rotating the default admin password. For larger organizations, SAML2/SSO integration centralizes authentication and provides audit logging of dashboard access.
