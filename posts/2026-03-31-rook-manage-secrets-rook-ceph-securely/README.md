# How to Manage Secrets for Rook-Ceph Securely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Secret, Kubernetes

Description: Manage Rook-Ceph secrets securely by using external KMS providers, Sealed Secrets, and RBAC restrictions to protect Ceph keyring credentials in Kubernetes.

---

## Secrets in Rook-Ceph

Rook stores several sensitive credentials as Kubernetes Secrets:
- `rook-ceph-mon` - cluster monitor addresses and admin keyring
- `rook-csi-rbd-provisioner` - CSI provisioner credentials
- `rook-csi-rbd-node` - CSI node stage credentials
- `rook-ceph-dashboard-password` - dashboard admin password

Default Kubernetes Secrets are base64-encoded (not encrypted) at rest. Without additional controls, anyone with `get secrets` RBAC permission can read them.

## Restricting Secret Access with RBAC

Audit who can read Rook secrets:

```bash
kubectl auth can-i get secrets -n rook-ceph --as=system:serviceaccount:default:default
```

Create a deny-first approach for secrets in the rook-ceph namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ceph-secret-reader
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames:
      - "rook-csi-rbd-provisioner"
      - "rook-csi-rbd-node"
      - "rook-csi-cephfs-provisioner"
      - "rook-csi-cephfs-node"
    verbs: ["get"]
```

## Encrypting Secrets at Rest

Enable Kubernetes Secret encryption at rest in the API server configuration:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

## External KMS with HashiCorp Vault

Store Ceph keyrings in Vault instead of Kubernetes Secrets:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com
        VAULT_BACKEND_PATH: rook/ceph
      tokenSecretName: rook-vault-token
```

Create the Vault token secret:

```bash
kubectl -n rook-ceph create secret generic rook-vault-token \
  --from-literal=token="<vault-token>"
```

## Sealed Secrets for GitOps

Use Bitnami Sealed Secrets to store encrypted secrets in Git:

```bash
# Install kubeseal
kubeseal --scope cluster-wide \
  --format=yaml \
  < secret.yaml \
  > sealed-secret.yaml

# The sealed-secret.yaml is safe to commit to Git
git add sealed-secret.yaml
```

Decryption only happens in-cluster by the Sealed Secrets controller.

## Secret Rotation

Rotate Ceph client keys periodically:

```bash
# Delete the existing key to force rotation
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth del client.csi-rbd-provisioner

# Create a new key for CSI user
NEW_KEY=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get-or-create-key client.csi-rbd-provisioner \
    mon 'profile rbd' \
    osd 'allow rwx pool=replicapool' \
    mgr 'allow rw')

# Update the Kubernetes secret
kubectl -n rook-ceph create secret generic rook-csi-rbd-provisioner \
  --from-literal=userID=csi-rbd-provisioner \
  --from-literal=userKey="$NEW_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Monitoring for Secret Access

Enable Kubernetes audit logging to track secret reads:

```yaml
- level: Metadata
  resources:
    - group: ""
      resources: ["secrets"]
  namespaces: ["rook-ceph"]
```

## Summary

Securing Rook-Ceph secrets requires restricting RBAC to minimum necessary access, enabling Kubernetes encryption at rest, and using external KMS like Vault for production environments. Sealed Secrets enable GitOps workflows without exposing plaintext credentials in version control. Regular key rotation limits the damage from credential exposure.
