# Validation Summary: How to Use rgwConfig and rgwConfigFromSecret in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- Kubernetes CRDs (CephObjectStore)
- Kubernetes Secrets

## Sources Consulted
- Rook GitHub repository — CephObjectStore CRD type definitions (`pkg/apis/ceph.rook.io/v1/types.go`)
- Rook GitHub repository — RGW config implementation (`pkg/operator/ceph/object/config.go`)
- Rook official documentation — CephObjectStore CRD reference (`Documentation/CRDs/Object-Storage/ceph-object-store-crd.md`)

## Issues Found

1. **`rgwConfigFromSecret` schema was completely wrong.** The post described it as a list of objects with `secretName`, `dataField`, and `configField` properties. The actual type is `map[string]v1.SecretKeySelector` — a map where keys are Ceph config option names and values are standard Kubernetes `SecretKeySelector` objects with `name` and `key` fields. Fixed the YAML example and explanatory text to match the real schema.

2. **Incorrect claim that Rook restarts RGW pods on config changes.** Both `rgwConfig` and `rgwConfigFromSecret` are applied at runtime via the Ceph mon config store (`ceph config set`) without restarting RGW pods. Only the separate `rgwCommandFlags` field causes pod restarts. Fixed the "Applying Config Changes" section and summary.

3. **Incorrect claim about config file injection.** The post stated "Rook writes these into the RGW config file at deployment." In reality, Rook uses `monStore.SetAll()` to write values into the Ceph mon config store, not a config file. Fixed the description.

4. **Missing caveat about config removal.** Added a note that removing a key from `rgwConfig` or `rgwConfigFromSecret` does not automatically remove it from the Ceph config store — users must explicitly set values back to their defaults.

## Review Notes
- The post correctly identifies valid Ceph RGW configuration option names in its examples and table.
- The `ceph daemon` verification command is correct for checking runtime config values.
- The `ceph config dump` verification command is correct for checking the mon config store.
