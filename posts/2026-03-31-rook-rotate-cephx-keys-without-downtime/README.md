# How to Rotate CephX Keys Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephX, Key Rotation, Security, Zero Downtime

Description: Safely rotate CephX authentication keys for Ceph clients and daemons in Rook without causing cluster downtime or application disruptions.

---

Regular key rotation is a security best practice. In Ceph, rotating CephX keys requires care to avoid authentication failures while the new key propagates. The approach differs slightly between application client keys and daemon keys.

## Rotating Application Client Keys

The safest approach for client key rotation is a blue-green swap:

**Step 1: Generate a new key without replacing the old one**

```bash
# Export the current key
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get client.myapp -o /tmp/myapp-old.keyring

# Create a new key entity with the same capabilities
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp-new \
  mon 'allow r' \
  osd 'allow rw pool=myapp-data'
```

A simpler approach - add the new key in a separate entity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp-v2 \
  mon 'allow r' \
  osd 'allow rw pool=myapp-data'
```

**Step 2: Update the application to use the new key**

```bash
NEW_KEY=$(kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-key client.myapp-v2)

kubectl -n myapp-namespace create secret generic ceph-keyring-v2 \
  --from-literal=key="$NEW_KEY"

# Update application deployment to use new secret
kubectl -n myapp-namespace set env deploy/myapp CEPH_KEY_VERSION=v2
```

**Step 3: Delete the old key after confirming the application works**

```bash
# Get the capabilities from the new key
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth del client.myapp

# Recreate the original entity name with the new key
NEW_KEY=$(kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-key client.myapp-v2)

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rw pool=myapp-data'

# Delete the temporary entity
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth del client.myapp-v2
```

## Rotating Keys In-Place

For less critical keys, rotate in-place by regenerating the key value:

```bash
# Generate a new random key inside the tools pod
NEW_KEY=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph-authtool --gen-print-key | tr -d '[:space:]')

# Update the existing entity with the new key and same capabilities
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  bash -c "echo '[client.myapp]
    key = $NEW_KEY
    caps mon = \"allow r\"
    caps osd = \"allow rw pool=myapp-data\"' | ceph auth import -i -"
```

Update the Kubernetes Secret immediately:

```bash
kubectl -n rook-ceph create secret generic ceph-client-myapp \
  --from-literal=key="$NEW_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Rotating Daemon Keys

Ceph daemon key rotation is more complex because daemons authenticate with the monitors using their keys. Deleting a daemon key and restarting the daemon will cause it to fail authentication. Rook manages daemon keys during OSD provisioning and upgrades.

For manual daemon key rotation, you must generate a new key, update the auth entry, and update the keyring stored in the daemon's Kubernetes Secret before restarting:

```bash
# Generate a new key for OSD 5
NEW_OSD_KEY=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph-authtool --gen-print-key | tr -d '[:space:]')

# Get the current caps for the OSD
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get osd.5

# Update the OSD auth entry with the new key (preserving caps)
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  bash -c "echo '[osd.5]
    key = $NEW_OSD_KEY' | ceph auth import -i -"

# Update the keyring secret used by the OSD pod
kubectl -n rook-ceph get secret rook-ceph-osd-5-keyring -o json | \
  jq --arg key "$NEW_OSD_KEY" '.data["keyring"] = ($key | @base64)' | \
  kubectl apply -f -

# Restart the OSD to pick up the new key
kubectl -n rook-ceph rollout restart deploy/rook-ceph-osd-5
```

> **Note:** Manual daemon key rotation is rarely needed. Rook handles daemon credentials during provisioning and upgrades.

## Summary

Client key rotation in Ceph is safest with a blue-green approach: create a new key entity, update applications to use it, verify functionality, then delete the old key. Avoid rotating multiple keys simultaneously. Rook manages daemon key rotation automatically during upgrades, so manual daemon key rotation is rarely required.
