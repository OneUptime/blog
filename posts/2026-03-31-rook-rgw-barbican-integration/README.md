# How to Set Up Barbican Integration Settings in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Barbican, Encryption, OpenStack

Description: Configure Ceph RGW to use OpenStack Barbican as the KMS backend for server-side encryption key management in OpenStack environments.

---

OpenStack Barbican is the key management service for OpenStack deployments. Ceph RGW integrates with Barbican to store and retrieve encryption keys for SSE-KMS operations.

## Why Use Barbican with RGW?

In OpenStack environments, Barbican provides:
- Centralized key management with RBAC
- Key versioning and rotation
- Audit trails for key access
- Native Keystone integration

## Barbican Configuration Parameters

```bash
# Set KMS backend to Barbican
ceph config set client.rgw rgw_crypt_s3_kms_backend barbican

# Barbican API endpoint
ceph config set client.rgw rgw_crypt_barbican_url https://barbican.example.com:9311

# Keystone credentials for Barbican authentication
ceph config set client.rgw rgw_keystone_url https://keystone.example.com:5000
ceph config set client.rgw rgw_keystone_api_version 3
ceph config set client.rgw rgw_keystone_admin_user rgw-service
ceph config set client.rgw rgw_keystone_admin_password <password>
ceph config set client.rgw rgw_keystone_admin_project service
ceph config set client.rgw rgw_keystone_admin_domain Default
```

## Creating a Barbican Secret for RGW

On the OpenStack side, create a secret key:

```bash
# Generate a 256-bit AES key in Barbican
openstack secret order create key \
  --name ceph-rgw-key \
  --algorithm AES \
  --bit-length 256

# List orders to find the secret href
openstack secret order list

# Get the key UUID from the secret href
openstack secret list --name ceph-rgw-key -f value -c "Secret href"
```

## Uploading with Barbican-Managed Keys

```bash
# Get the Barbican key ID (UUID portion of the href)
KEY_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Upload with SSE-KMS using Barbican key
aws s3 cp secret.txt s3://my-bucket/secret.txt \
  --sse aws:kms \
  --sse-kms-key-id $KEY_ID \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc
```

## Applying in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_crypt_s3_kms_backend = barbican
    rgw_crypt_barbican_url = https://barbican.example.com:9311
    rgw_keystone_url = https://keystone.example.com:5000
    rgw_keystone_api_version = 3
    rgw_keystone_admin_user = rgw-service
    rgw_keystone_admin_project = service
    rgw_keystone_admin_domain = Default
```

Apply and restart:

```bash
kubectl apply -f rook-config-override.yaml
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
```

## Troubleshooting Barbican Integration

```bash
# Check RGW logs for KMS errors
kubectl -n rook-ceph logs deploy/rook-ceph-rgw-my-store-a | grep -i "barbican\|kms\|crypt"

# Verify Barbican is reachable from RGW pod
kubectl -n rook-ceph exec -it deploy/rook-ceph-rgw-my-store-a -- \
  curl -k https://barbican.example.com:9311/v1
```

## Summary

Ceph RGW integrates with OpenStack Barbican by setting `rgw_crypt_s3_kms_backend = barbican` and providing the Barbican URL with Keystone service credentials. Create symmetric keys in Barbican and reference them by UUID in S3 SSE-KMS upload requests. This provides centralized key management with audit trails in OpenStack environments.
