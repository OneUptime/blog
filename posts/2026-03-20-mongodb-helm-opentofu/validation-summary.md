# Validation Summary: How to Deploy MongoDB on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide — practical walk-through of deploying MongoDB on Kubernetes via the Bitnami Helm chart, managed declaratively with OpenTofu (Terraform-compatible).

## Technologies Covered
- OpenTofu / Terraform (HCL syntax, `helm_release`, `kubernetes_secret`, `kubernetes_pod_disruption_budget_v1`, `random_password`)
- Bitnami `mongodb` Helm chart (replica set architecture)
- Bitnami `mongodb-sharded` Helm chart
- Kubernetes (PodDisruptionBudget v1, headless services, secrets)
- MongoDB replica sets, arbiters, sharded clusters
- Prometheus ServiceMonitor (metrics scraping)

## Sources Consulted
- Bitnami MongoDB Helm chart `values.yaml`: https://github.com/bitnami/charts/blob/main/bitnami/mongodb/values.yaml
- Bitnami MongoDB Helm chart `Chart.yaml`: https://github.com/bitnami/charts/blob/main/bitnami/mongodb/Chart.yaml
- Bitnami `mongodb-sharded` Helm chart `values.yaml`: https://github.com/bitnami/charts/blob/main/bitnami/mongodb-sharded/values.yaml
- ArtifactHub Bitnami MongoDB chart: https://artifacthub.io/packages/helm/bitnami/mongodb
- Terraform `kubernetes_secret` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- HashiCorp issue threads on `data` vs `binary_data` semantics in `kubernetes_secret` (e.g., GH #901, #518, PR #604/#704)

## Issues Found

1. **Invalid Helm values block: `replicaSet = { name = "rs0", key = "" }`**
   - The Bitnami MongoDB chart does not have a `replicaSet` block. The replica set name is set via the top-level `replicaSetName` key, and the replica-set authentication key lives at `auth.replicaSetKey` (or is supplied through `auth.existingSecret`).
   - **Fix:** Replaced the `replicaSet` block with `replicaSetName = "rs0"` at the top level. The `replicaSetKey` is already read from the existing secret via `auth.existingSecret`, so no additional field is required.

2. **Double base64-encoding of `mongodb-replica-set-key`**
   - The Terraform `kubernetes_secret` resource's `data` argument accepts plain-text values; the provider/API stores them base64-encoded automatically (the `data` field is wired through the API's `stringData` semantics). Wrapping the value in `base64encode(...)` results in a double-encoded value being persisted in the secret. Only `binary_data` expects pre-encoded input.
   - **Fix:** Removed the `base64encode()` wrapper so `mongodb-replica-set-key` is set to the plain random password, consistent with `mongodb-root-password` and `mongodb-passwords` on the same resource.

## Review Notes
- **Chart version (14.12.0):** The current Bitnami MongoDB chart is 17.x (app version 8.0.x). 14.12.0 is an older but historically valid release; users following this guide may want to bump to a more recent chart, especially given MongoDB 7.x/8.x app version improvements. Left as-is per the "no version churn" policy.
- **Arbiter + `replicaCount = 3`:** With `replicaCount = 3` and `arbiter.enabled = true`, the replica set ends up with 4 voting members (3 data + 1 arbiter), which can result in 2-2 election ties. The post's summary describes a "3-vote replica set using only 2 data nodes" — that pattern actually requires `replicaCount = 2` (with the arbiter providing the tie-breaker). The post is internally inconsistent on this point but each individual configuration value is technically valid for the chart, so no code change was made; consider clarifying the summary or dropping the arbiter when using a 3-data-node set.
- **Connection string / hostnames:** `mongodb-<i>.mongodb-headless.<namespace>.svc.cluster.local:27017` and the primary service `mongodb.mongodb.svc.cluster.local` match the Bitnami chart's StatefulSet + headless service template. Correct.
- **PodDisruptionBudget selector labels:** `app.kubernetes.io/name=mongodb` and `app.kubernetes.io/component=mongodb` match the labels emitted by the chart for the data-node StatefulSet (the arbiter has `component=arbiter`), so the PDB will only constrain the primary/secondary pods, which is the intended behavior.
- **`mongodb-sharded` chart:** `shards`, `configsvr.replicaCount`, `mongos.replicaCount`, `shardsvr.dataNode.replicaCount`, and `shardsvr.persistence.size` all line up with the chart's value schema.
- **`backup.enabled` / `backup.cronjob.schedule`:** Present in current Bitnami chart values. Note that the bundled mongodump CronJob has historically had interactions with `podSecurityContext` (see bitnami/charts#21278) — operators should test before relying on it in production.
