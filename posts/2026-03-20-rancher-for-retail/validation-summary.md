# Validation Summary: How to Set Up Rancher for Retail

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- K3s
- Kubernetes
- Prometheus
- Redis

## Sources Consulted
- Rancher setup overview: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup
- Rancher custom nodes / K3s and RKE2 provisioning: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s private registry configuration: https://docs.k3s.io/installation/private-registry
- K3s automated upgrades: https://docs.k3s.io/upgrades/automated
- Fleet GitRepo targets and customization: https://fleet.rancher.io/0.13/gitrepo-targets
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet rollout strategy: https://fleet.rancher.io/0.14/how-tos-for-users/rollout
- Fleet CRD reference: https://fleet.rancher.io/reference/ref-crds
- Kubernetes Downward API: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API remote write receiver: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- Step 1 conflated K3s configuration with Rancher registration and wrote `/etc/rancher/k3s/config.yaml` after installation. I moved the K3s config creation before the install command and clarified that Rancher registration is a separate step after the cluster is running.
- Step 2 put per-cluster Helm values directly under the `GitRepo` resource and used unsupported `${cluster.labels.*}` syntax. I split the example into a valid `GitRepo` target definition plus a repository-side `fleet.yaml` snippet using Fleet's documented `${ get .ClusterLabels "..." }` templating.
- Step 3 used the Kubernetes Downward API to read `metadata.labels['store-id']` without defining that pod label. I added the `store-id` pod label so the environment variable example is valid.
- Step 4 configured Redis persistence with `--save` but did not mount persistent storage, so queued data would be lost on pod replacement. I added a PVC-backed volume mounted at `/data`.
- Step 5 mixed a partial Prometheus configuration with an invalid standalone alert rule snippet. I replaced it with a valid Prometheus config example using `external_labels` and `remote_write`, and a separate valid alert rules example grouped under `groups`.
- Step 5 used `https://prometheus.retail-hq.com/api/v1/push` for a generic Prometheus remote-write example. I changed it to the documented Prometheus receiver endpoint `/api/v1/write`.
- Step 6 placed `rolloutStrategy` on a `GitRepo` resource and used unsupported fields `timeout` and `interval`. I moved the rollout example to `fleet.yaml` and replaced it with documented rollout fields: `autoPartitionSize`, `maxUnavailable`, and `maxUnavailablePartitions`.
- The retail considerations section incorrectly implied that `--system-default-registry` provides K3s auto-updates. I corrected this to use `/etc/rancher/k3s/registries.yaml` for local image mirroring and to treat upgrades as a separate Rancher/K3s workflow.

## Review Notes
- The POS deployment still shows `replicas: 2` with a single PVC. That can be valid only if the storage backend and application support the required access semantics. In some retail edge environments, a StatefulSet or application-level replication model may be safer.
