# How to Use rgwConfig and rgwConfigFromSecret in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Configuration, Kubernetes

Description: Learn how to use rgwConfig and rgwConfigFromSecret in Rook to inject custom RGW configuration options and sensitive values directly into the CephObjectStore spec.

---

## What rgwConfig and rgwConfigFromSecret Do

Rook exposes two mechanisms for customizing RGW daemon configuration in the `CephObjectStore` CRD:

- **`rgwConfig`**: A map of Ceph config key-value pairs injected as non-sensitive configuration overrides for the RGW daemon.
- **`rgwConfigFromSecret`**: References Kubernetes secrets to inject sensitive values (tokens, passwords, certificates) as config options without hardcoding them in the CRD.

These fields let you configure any RGW option supported by `ceph.conf` without running `ceph config set` commands manually. Under the hood, Rook applies these values to the Ceph mon config store at runtime.

## Using rgwConfig for Non-Sensitive Settings

Add any `ceph.conf`-compatible option under `rgwConfig`. Rook applies these to the Ceph mon config store at runtime without restarting the RGW pods:

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
    instances: 2
    rgwConfig:
      rgw_max_listing_results: "10000"
      rgw_multipart_min_part_size: "10485760"
      rgw_gc_max_objs: "128"
      rgw_thread_pool_size: "512"
      rgw_cors_rules_max: "100"
      debug_rgw: "0"
```

These values override the Ceph defaults. The keys must match Ceph configuration option names exactly.

## Using rgwConfigFromSecret for Sensitive Values

Sensitive values should not appear in the CRD spec. Use `rgwConfigFromSecret` to pull them from Kubernetes secrets at runtime. The field is a map where each key is a Ceph config option name and each value is a standard Kubernetes `SecretKeySelector`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rgw-sensitive-config
  namespace: rook-ceph
type: Opaque
stringData:
  vault_token: "s.yourVaultTokenHere"
  ldap_bindpw: "ldap-admin-password"
```

Reference the secret in the object store:

```yaml
gateway:
  port: 80
  instances: 2
  rgwConfig:
    rgw_crypt_vault_addr: "https://vault.example.com:8200"
    rgw_ldap_uri: "ldap://ldap.example.com"
    rgw_ldap_binddn: "cn=admin,dc=example,dc=com"
  rgwConfigFromSecret:
    rgw_crypt_vault_token:
      name: rgw-sensitive-config
      key: vault_token
    rgw_ldap_bindpw:
      name: rgw-sensitive-config
      key: ldap_bindpw
```

Each key in `rgwConfigFromSecret` is the Ceph config option name. The `name` field refers to the Kubernetes Secret, and the `key` field refers to the key within that Secret's data. If both `rgwConfig` and `rgwConfigFromSecret` define the same option, the value from `rgwConfigFromSecret` takes precedence.

## Applying Config Changes

When you update `rgwConfig` or `rgwConfigFromSecret`, Rook applies the changes to the Ceph mon config store at runtime without restarting RGW pods:

```bash
kubectl apply -f objectstore.yaml
# Verify the Rook operator reconciled the change
kubectl -n rook-ceph logs deploy/rook-ceph-operator | tail -20
```

Note that removing a key from `rgwConfig` or `rgwConfigFromSecret` does not automatically remove it from the Ceph config store. To revert a setting, you must explicitly set it back to its default value.

## Verifying Applied Configuration

After the operator reconciles, verify the config was applied:

```bash
RGW_POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-rgw -o name | head -1)
kubectl -n rook-ceph exec $RGW_POD -- ceph daemon client.rgw.my-store config get rgw_max_listing_results
```

Or check the Ceph config database:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config dump | grep rgw_max_listing_results
```

## Common rgwConfig Use Cases

| Use Case | Config Key | Example Value |
|---|---|---|
| Increase list page size | `rgw_max_listing_results` | `10000` |
| Enable debug logging | `debug_rgw` | `20` |
| Set thread pool size | `rgw_thread_pool_size` | `512` |
| KMS backend | `rgw_crypt_s3_kms_backend` | `vault` |
| Keystone URL | `rgw_keystone_url` | URL |

## Summary

`rgwConfig` and `rgwConfigFromSecret` in the Rook `CephObjectStore` CRD allow injecting arbitrary Ceph RGW configuration options without manual intervention. Use `rgwConfig` for non-sensitive tuning parameters and `rgwConfigFromSecret` to safely inject tokens, passwords, and certificates from Kubernetes secrets. Rook applies these settings at runtime via the Ceph mon config store without restarting RGW pods. This approach keeps sensitive values out of YAML manifests while providing full control over RGW behavior.
