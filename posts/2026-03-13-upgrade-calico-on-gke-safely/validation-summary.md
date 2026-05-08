# Validation Summary: How to Upgrade Calico on GKE Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Calico Open Source
- Tigera Operator
- Kubernetes
- kubectl
- gcloud CLI
- calicoctl
- Google Cloud Storage

## Sources Consulted
- Google Cloud GKE network policy documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Google Cloud GKE networking overview: https://cloud.google.com/kubernetes-engine/docs/concepts/network-overview
- Google Cloud SDK reference for `gcloud container node-pools update`: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Calico documentation for installing on GKE: https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/gke
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply

## Issues Found
- The post implied that all Calico on GKE is user-upgraded. GKE has built-in Calico network policy support for Dataplane V1, while GKE Dataplane V2 uses built-in network policy enforcement without requiring Calico. I narrowed the prerequisite and introduction language to self-managed Calico installed with the Tigera Operator.
- The Tigera Operator upgrade command used Calico v3.28.0 and did not apply the Calico CRDs first. I updated the procedure to v3.32.0 and added the documented server-side apply commands for the Calico CRDs and Tigera Operator with `--force-conflicts`.
- The sample `kubectl patch installation default` command only changed MTU and did not actually perform a version upgrade. I removed it from the upgrade procedure.
- The post-upgrade connectivity test used HTTP against `kubernetes.default.svc.cluster.local`, which normally serves HTTPS on the Kubernetes API service. I changed the validation command to use a curl container and HTTPS with a timeout.
- The prerequisite for `calicoctl` only mentioned matching the current version. I clarified that the current version is appropriate for backups and the target version should be used for post-upgrade checks.

## Review Notes
- The GKE auto-upgrade commands use documented `gcloud container node-pools update` flags, but the examples still assume a node pool named `default-pool`. Readers with multiple or differently named node pools must repeat the command for each applicable node pool.
- The guide is intentionally scoped to self-managed Calico with the Tigera Operator. It should not be used as written for GKE-managed Calico network policy add-on clusters or GKE Dataplane V2 clusters.
