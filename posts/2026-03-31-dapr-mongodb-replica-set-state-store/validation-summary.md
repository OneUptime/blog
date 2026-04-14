# Validation Summary: How to Configure MongoDB Replica Set for Dapr State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state store component)
- MongoDB (Replica Set)
- Kubernetes (StatefulSet, Secrets, Helm)
- Bitnami MongoDB Helm Chart

## Sources Consulted
- Dapr MongoDB State Store Component Reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mongodb/
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Bitnami MongoDB Helm Chart (GitHub): https://github.com/bitnami/charts/tree/main/bitnami/mongodb
- MongoDB TTL Indexes Documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Text Indexes Documentation: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/

## Issues Found

### 1. TTL Index Was a Compound Index (Fixed)
**What was wrong:** The TTL index was defined as `{ "_id": 1, "expireAt": 1 }` — a compound index. MongoDB TTL indexes must be single-field indexes; compound indexes with `expireAfterSeconds` will not trigger automatic document deletion.

**What was changed:** Removed `"_id": 1` from the index definition, changing it to `{ "expireAt": 1 }`. Added a clarifying comment that TTL indexes must be single-field.

**Why:** MongoDB documentation explicitly states: "You cannot create a TTL index on a compound index." The TTL background thread ignores compound indexes even if `expireAfterSeconds` is set.

### 2. Deprecated Bitnami Helm Chart Auth Parameters (Fixed)
**What was wrong:** The Helm install command used `auth.username`, `auth.password`, and `auth.database` — these are deprecated parameters in current versions of the Bitnami MongoDB chart.

**What was changed:** Updated to the current plural forms: `auth.usernames[0]`, `auth.passwords[0]`, and `auth.databases[0]`.

**Why:** The Bitnami MongoDB Helm chart's `values.yaml` explicitly marks the singular forms as deprecated in favor of the plural array-based parameters.

## Review Notes
- The Bitnami Helm chart repo URL (`https://charts.bitnami.com/bitnami`) is being phased out in favor of OCI registry (`oci://registry-1.docker.io/bitnamicharts/mongodb`). The old URL still functions but may stop working in the future. Not changed since it remains functional.
- All Dapr component metadata fields (`host`, `username`, `password`, `databaseName`, `collectionName`, `writeConcern`, `readConcern`, `operationTimeout`, `params`) are verified as valid per official Dapr docs.
- The `writeConcern: majority` and `readConcern: majority` values are correct and the explanation about durability on "at least 2 nodes" is accurate for a 3-member replica set (majority = 2).
- The Dapr state API endpoint format (`POST /v1.0/state/{storename}`) is correct.
- The pod DNS format (`mongodb-0.mongodb-headless.mongodb:27017`) is a valid Kubernetes shorthand; the fully qualified form would include `.svc.cluster.local` but the short form resolves correctly within the cluster.
