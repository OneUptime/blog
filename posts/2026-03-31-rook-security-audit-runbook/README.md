# How to Create a Ceph Security Audit Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Runbook, Audit, Kubernetes

Description: A security audit runbook for Rook-Ceph covering CephX key management, RBAC review, encryption at rest, network policy validation, and access control auditing.

---

## Security Audit Scope

This runbook covers:
- CephX authentication configuration
- Kubernetes RBAC for Rook resources
- Encryption at rest for OSDs
- Network policies restricting Ceph traffic
- RGW access policy review

## Step 1: Audit CephX Authentication

Ensure CephX is enabled and review all auth entries:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth ls
```

Remove any unused or stale keys:

```bash
# List keys not used in 30+ days (manual review needed)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth get client.admin
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph auth get-or-create client.audit mon 'allow r' osd 'allow r'
```

Verify CephX is enforced:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon auth_cluster_required
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon auth_service_required
```

## Step 2: Review Kubernetes RBAC

Check who has access to Rook secrets and CephCluster resources:

```bash
kubectl get rolebindings,clusterrolebindings -n rook-ceph -o wide
kubectl auth can-i get secret --as system:serviceaccount:rook-ceph:rook-ceph-operator -n rook-ceph
```

Verify the Rook operator service account has minimal necessary permissions:

```bash
kubectl -n rook-ceph get clusterrole rook-ceph-operator -o yaml | grep -A3 "resources:"
```

## Step 3: Verify OSD Encryption at Rest

Check if OSDs are using dmcrypt encryption:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph -o jsonpath='{.spec.storage.config}' | python3 -m json.tool
```

For new deployments, enable encryption in the storage spec:

```yaml
spec:
  storage:
    config:
      encryptedDevice: "true"
```

Verify KMS integration if using external key management:

```bash
kubectl -n rook-ceph get secret rook-ceph-osd-encryption-key -o jsonpath='{.data}' | base64 -d
```

## Step 4: Validate Network Policies

Check that network policies restrict Ceph traffic to authorized sources:

```bash
kubectl -n rook-ceph get networkpolicies
```

A baseline policy should restrict external access to Ceph ports:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rook-ceph-restrict
  namespace: rook-ceph
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: rook-ceph
    - namespaceSelector:
        matchLabels:
          name: application-ns
```

## Step 5: Audit RGW Bucket Policies

```bash
# List all RGW users
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- radosgw-admin user list

# Check for any user with admin caps
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user info --uid=admin-user | python3 -m json.tool | grep caps
```

## Summary

A Ceph security audit runbook ensures CephX keys are rotated and restricted, RBAC is minimal, OSD encryption is enabled, network policies are enforced, and RGW users follow least-privilege principles. Scheduled audits catch configuration drift before it becomes a security incident.
