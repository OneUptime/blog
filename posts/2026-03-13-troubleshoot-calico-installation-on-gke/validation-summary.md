# Validation Summary: Troubleshoot Calico Installation on GKE

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Dataplane V2
- Calico
- Kubernetes NetworkPolicy
- gcloud CLI
- kubectl
- calicoctl

## Sources Consulted
- Google Cloud GKE Dataplane V2 documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud GKE network policy documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Google Cloud GKE Cluster REST resource reference: https://cloud.google.com/kubernetes-engine/docs/reference/rest/v1/projects.locations.clusters
- Project Calico Open Source GKE installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/gke
- Project Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Project Calico Helm installation documentation for policy-only compatibility notes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm

## Issues Found
- The post described GKE as requiring an upstream Calico policy-only manifest. I replaced that with the supported GKE path: enabling GKE's built-in Calico network policy on legacy dataplane Standard clusters by using `gcloud container clusters create --enable-network-policy` or the documented two-step `gcloud container clusters update` flow for existing clusters.
- The command for checking the network policy provider used `networkConfig.networkPolicy.provider`, but the GKE API exposes `networkPolicy.provider` at the cluster level. I corrected the `--format` expression.
- The post implied Dataplane V2 was the default for GKE generally. I narrowed that to Autopilot clusters and clarified that Dataplane V2 uses Cilium/eBPF and has built-in NetworkPolicy enforcement.
- The troubleshooting examples listed unsupported or misleading GKE failure causes, such as generic read-only root filesystem and node service account permission issues. I replaced them with GKE-documented Calico network policy issues: node recreation delay, manually deployed Pods being unscheduled, host-local IPAM mismatch, and Calico readiness probe failures in large autoscaling clusters.
- The Felix example set `interfacePrefix: eth`, which is incorrect because Felix `interfacePrefix` identifies Calico workload endpoint interfaces, not the node's primary NIC. I changed the guidance to avoid setting it to `eth0` and restored the normal `cali` prefix if it had been changed incorrectly.
- The best practices and conclusion referred to GKE-specific Calico manifests and Calico installation in a way that overstated the supported path. I changed those references to GKE network policy settings and legacy dataplane GKE clusters.

## Review Notes
The validation commands use `grep calico`, which is acceptable as a quick operational check but less structured than using labels. `kubectl` and `gcloud` were not installed in the local environment, so CLI syntax was verified against official documentation rather than local `--help` output.
