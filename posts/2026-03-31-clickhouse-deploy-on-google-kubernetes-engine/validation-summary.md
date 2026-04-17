# Validation Summary: How to Deploy ClickHouse on Google Kubernetes Engine

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ClickHouse (clickhouse-server 24.3)
- Google Kubernetes Engine (GKE)
- Altinity ClickHouse Operator (ClickHouseInstallation CRD, `clickhouse.altinity.com/v1`)
- gcloud CLI (`gcloud container node-pools create`, `gcloud container clusters update`, `gcloud iam service-accounts`)
- kubectl
- GKE Workload Identity
- Compute Engine Persistent Disk CSI Driver (`pd.csi.storage.gke.io`)
- GKE built-in StorageClass `premium-rwo`
- GKE Cluster Autoscaler

## Sources Consulted
- gcloud container node-pools create reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- GKE node taints: https://cloud.google.com/kubernetes-engine/docs/how-to/node-taints
- GKE SSD persistent disks: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/ssd-pd
- GKE PD CSI driver: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- GKE cluster autoscaler: https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- GKE Workload Identity: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Altinity ClickHouse Operator quick start: https://github.com/Altinity/clickhouse-operator/blob/master/docs/quick_start.md
- clickhouse/clickhouse-server Docker Hub: https://hub.docker.com/r/clickhouse/clickhouse-server/tags

## Issues Found
1. **Incorrect gcloud flag `--taints`**: The `gcloud container node-pools create` command uses `--node-taints`, not `--taints`. Changed `--taints=workload=clickhouse:NoSchedule` to `--node-taints=workload=clickhouse:NoSchedule`.
2. **Misleading description of `pd-ssd` as "local SSD"**: `pd-ssd` is an SSD-backed Persistent Disk, not a Local SSD (which uses `--local-ssd-count` / `--ephemeral-storage-local-ssd`). Updated the prose from "local SSD" to "SSD persistent disks" to match the command.

## Review Notes
- ClickHouse 24.3 is an LTS release but roughly a year old as of April 2026. Future updates could move to a newer LTS (e.g., 25.x) for currency, but the existing tag is still a valid, pullable image on Docker Hub.
- The post defines a custom `premium-rwo` StorageClass while also referencing GKE's built-in `premium-rwo`. GKE ships `premium-rwo` by default; re-defining it is redundant but not harmful. A future revision could either rename the custom class or simply use the built-in one.
- The post uses `--zone` (zonal cluster). Readers operating regional clusters should substitute `--region`.
- The Altinity operator install URL tracks `master`, which pulls whatever is current at apply time. For reproducible deploys, pinning to a release tag would be preferable, though using `master` is consistent with the operator's documented quick start.
