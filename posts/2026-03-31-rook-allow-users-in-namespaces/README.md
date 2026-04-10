# How to Configure allowUsersInNamespaces for Rook Object Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Store, Namespace, Kubernetes

Description: Learn how to use allowUsersInNamespaces in Rook CephObjectStore to control which namespaces can create CephObjectStoreUser resources.

---

## What Is allowUsersInNamespaces

By default, `CephObjectStoreUser` resources must be created in the same namespace as the `CephObjectStore` they reference (typically `rook-ceph`). The `allowUsersInNamespaces` field on `CephObjectStore` relaxes this restriction, letting application teams create object store users in their own namespaces while the underlying Ceph object store remains centrally managed.

## Configuring allowUsersInNamespaces

Add the `allowUsersInNamespaces` list to your `CephObjectStore` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  allowUsersInNamespaces:
    - team-alpha
    - team-beta
    - platform
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
```

With this config, teams in namespaces `team-alpha`, `team-beta`, and `platform` can create `CephObjectStoreUser` objects that reference `my-store`.

## Creating a User from Another Namespace

A team in the `team-alpha` namespace can now create their own user:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStoreUser
metadata:
  name: alpha-app-user
  namespace: team-alpha
spec:
  store: my-store
  displayName: "Alpha App S3 User"
  capabilities:
    bucket: "*"
    user: "*"
```

Rook will provision the user in Ceph and create a Kubernetes Secret named `rook-ceph-object-user-my-store-alpha-app-user` in the `team-alpha` namespace containing the access key and secret key.

## Accessing the Generated Secret

The application in `team-alpha` reads the secret directly:

```yaml
env:
  - name: AWS_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: rook-ceph-object-user-my-store-alpha-app-user
        key: AccessKey
  - name: AWS_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: rook-ceph-object-user-my-store-alpha-app-user
        key: SecretKey
```

This gives the app team full self-service control of their credentials without needing access to the `rook-ceph` namespace.

## Wildcard Support

You can use `"*"` as a wildcard to allow users in all namespaces:

```yaml
allowUsersInNamespaces:
  - "*"
```

Use this only in trusted cluster environments. In multi-tenant clusters, explicitly list allowed namespaces.

## RBAC Considerations

Even with `allowUsersInNamespaces` set, the Rook operator still enforces Kubernetes RBAC. Ensure that the service account running the Rook operator has permission to create and manage secrets in the listed namespaces. Check the operator ClusterRole and update it if necessary:

```bash
kubectl get clusterrolebinding rook-ceph-global -o yaml
```

## Summary

`allowUsersInNamespaces` in Rook's `CephObjectStore` spec enables true multi-namespace self-service for S3 users. By listing the namespaces allowed to create `CephObjectStoreUser` resources, you let application teams manage their own credentials while keeping the object store infrastructure centrally governed in the `rook-ceph` namespace.
