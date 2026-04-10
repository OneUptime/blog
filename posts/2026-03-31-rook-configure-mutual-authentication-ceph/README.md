# How to Configure Mutual Authentication in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Authentication, Security, CephX, Kubernetes

Description: Learn how to configure mutual authentication in Ceph so that both clients and daemons verify each other's identity, preventing unauthorized access to cluster resources.

---

Mutual authentication in Ceph ensures that both parties in a connection - the client and the Ceph daemon - verify each other's identity. This is handled automatically by CephX when properly configured, but there are specific settings and practices that strengthen this guarantee.

## How Ceph Mutual Authentication Works

CephX implements mutual authentication by default. When a client connects to an OSD:

1. The client authenticates to the Monitor and receives a session ticket
2. The session ticket is signed with a secret shared between the Monitor and the OSD
3. The OSD validates the ticket without contacting the Monitor again
4. The client also receives a service ticket that the OSD uses to authenticate itself back

This prevents both impersonation attacks and man-in-the-middle scenarios.

## Verifying Authentication is Enabled

Check that CephX authentication is active on your cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon auth_cluster_required

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon auth_service_required

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon auth_client_required
```

All three should return `cephx`. If any return `none`, authentication is disabled.

## Enabling Strict CephX Mode

To enforce mutual authentication globally, set these configuration options via the Rook ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [global]
    auth_cluster_required = cephx
    auth_service_required = cephx
    auth_client_required = cephx
```

Apply the ConfigMap and restart relevant daemons:

```bash
kubectl apply -f rook-config-override.yaml
kubectl -n rook-ceph rollout restart deployment/rook-ceph-mon-a
```

## Creating Keys with Minimum Privileges

For applications, create keys with only the permissions they need:

```bash
# Create a key for a read-only monitoring application
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.readonly-app \
    mon 'allow r' \
    osd 'allow r'

# Export the key for use in the application
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.readonly-app
```

## Using Kubernetes Secrets for Key Distribution

Store Ceph keyrings as Kubernetes Secrets and mount them into application pods:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ceph-readonly-keyring
  namespace: myapp
type: Opaque
data:
  keyring: <base64-encoded-keyring-content>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      volumes:
        - name: ceph-keyring
          secret:
            secretName: ceph-readonly-keyring
      containers:
        - name: app
          volumeMounts:
            - name: ceph-keyring
              mountPath: /etc/ceph
              readOnly: true
```

## Rotating Authentication Keys

Rotate keys periodically to limit exposure:

```bash
# Rotate a key by deleting and recreating with the same permissions
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth del client.myapp

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp \
    mon 'allow r' \
    osd 'allow rw pool=mypool'

# Delete an old key that is no longer needed
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth del client.oldapp
```

## Summary

Ceph mutual authentication is built into CephX and is enabled by default. Ensuring that `auth_cluster_required`, `auth_service_required`, and `auth_client_required` are all set to `cephx` enforces mutual verification on all connections. In Rook-managed clusters, these settings are applied via ConfigMap overrides and keyrings are distributed as Kubernetes Secrets, providing a secure and auditable authentication infrastructure.
