# Validation Summary: How to Handle Redis Pod Disruption Budgets in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (Cluster and Sentinel modes)
- Kubernetes (PodDisruptionBudget, kubectl drain, Eviction API)
- Helm (Bitnami Redis chart)

## Sources Consulted
- Kubernetes official documentation on PodDisruptionBudgets (https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- Kubernetes API reference for policy/v1 PodDisruptionBudget (https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/)
- Kubernetes Eviction API documentation (https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/)
- kubectl drain documentation (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/)
- Redis Sentinel documentation on quorum (https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- Bitnami Redis Helm chart values reference (https://github.com/bitnami/charts/tree/main/bitnami/redis)

## Issues Found

### 1. `kubectl evict` is not a valid command
- **What was wrong:** The post used `kubectl evict redis-cluster-0 --namespace redis` to demonstrate testing PDB enforcement. There is no built-in `kubectl evict` subcommand.
- **What was changed:** Replaced with the correct approach using the Kubernetes Eviction API via `kubectl proxy` and `curl` to POST an Eviction object to the pod's eviction subresource endpoint.
- **Why:** Only the Eviction API respects PDBs. `kubectl delete pod` bypasses PDBs entirely. The Eviction API is the correct mechanism for testing PDB enforcement.

### 2. Incorrect field name in PDB describe output
- **What was wrong:** The sample `kubectl describe pdb` output used `Total Replicas` as a field name.
- **What was changed:** Corrected to `Expected Pods`, which is the actual field name in PDB status output.
- **Why:** The PDB status API field is `expectedPods`, rendered as `Expected Pods` in kubectl describe output. `Total Replicas` is not a PDB status field.

### 3. Contradictory text describing PDB status output
- **What was wrong:** The text said "Sample output showing a disruption is blocked" but the output showed `Disruptions Allowed: 1`, meaning one disruption IS still allowed — not blocked.
- **What was changed:** Changed the text to "Sample output showing PDB status during a drain" and added an explanatory sentence clarifying what `Disruptions Allowed` means and when evictions are actually blocked (when it reaches 0).
- **Why:** The original text contradicted the sample output, which could confuse readers about how PDB enforcement works.

## Review Notes
- The post loosely uses "quorum" to describe Redis Cluster's majority requirement for failure detection. Redis Cluster uses a gossip protocol rather than formal quorum-based consensus, but the practical recommendation (keep a majority of masters available) is correct.
- All YAML manifests use the stable `policy/v1` API version, which is correct for Kubernetes 1.21+. The older `policy/v1beta1` was removed in Kubernetes 1.25.
- The `--delete-emptydir-data` flag on `kubectl drain` is the current correct flag (the older `--delete-local-data` was deprecated in Kubernetes 1.20).
- Bitnami Redis Helm chart PDB values structure (`master.pdb.create`, `master.pdb.minAvailable`, `replica.pdb.create`, `replica.pdb.minAvailable`) is accurate.
