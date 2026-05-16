# Validation Summary: How to Migrate from GKE to Self-Hosted Talos Linux

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Google Kubernetes Engine (GKE) — Autopilot and Standard
- Talos Linux (v1.9)
- talosctl
- kubectl / jq
- Backup for GKE (`gcloud beta container backup-restore`)
- Velero (with `velero-plugin-for-gcp`)
- Cilium (CNI, with `kubeProxyReplacement`)
- Rook-Ceph (storage, Ceph v18 Reef)
- MetalLB (load balancing)
- ingress-nginx (ingress)
- HashiCorp Vault (secrets / Workload Identity replacement)
- Kyverno / OPA Gatekeeper (policy)
- ExternalDNS, ModSecurity (mentioned in replacement matrix)
- PostgreSQL (`pg_dump` / `psql`) for data migration

## Sources Consulted
- Talos Linux docs (talosctl install, machine config bond network, installer image): https://docs.siderolabs.com/talos/v1.9/getting-started/talosctl
- Velero plugin for GCP: https://github.com/vmware-tanzu/velero-plugin-for-gcp
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Cilium kube-proxy-free docs: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- gcloud Backup for GKE reference: https://cloud.google.com/sdk/gcloud/reference/beta/container/backup-restore/backups/create
- GKE pricing: https://cloud.google.com/kubernetes-engine/pricing
- Rook-Ceph Helm chart: https://charts.rook.io/release
- MetalLB Helm chart: https://metallb.github.io/metallb
- HashiCorp Vault Helm chart: https://helm.releases.hashicorp.com

## Issues Found

1. **Velero install command missing `--plugins` flag (Step 2).** The original `velero install --provider gcp ...` would fail because no provider plugin would be installed. Velero requires `--plugins velero/velero-plugin-for-gcp:vX.Y.Z` whenever you set `--provider gcp`. Added `--plugins velero/velero-plugin-for-gcp:v1.13.0`.

2. **Nonexistent ingress-nginx annotation `nginx.ingress.kubernetes.io/health-check-path` (Step 6).** This annotation does not exist in the kubernetes/ingress-nginx project — backend health-check paths are a GCE Ingress / ALB concept, not part of ingress-nginx. Replaced the misleading line with a note that pod `readinessProbe` / `livenessProbe` is the correct equivalent.

## Review Notes
- `talosctl gen secrets -o secrets.yaml` and the `talosctl gen config ... --with-secrets` pattern are correct for Talos v1.9.
- Talos installer image `ghcr.io/siderolabs/installer:v1.9.0` is a real, current pin.
- Cilium `kubeProxyReplacement=true` is the correct boolean form in 1.14+; the legacy string values (`strict`/`partial`/`disabled`) have been deprecated. Anyone on Cilium <1.14 will need the old strings.
- `gcloud beta container backup-restore backups create` is still correctly under the `beta` command group as of 2026, even though the Backup for GKE add-on itself is GA.
- GKE cluster management fee of $0.10/hour is accurate. The $74.40/month figure matches a 31-day month and also the free-tier credit amount per billing account; minor month-length variation is acceptable.
- `kubectl get pods --all-namespaces | grep -v Running | grep -v Completed` will also drop the header line — this is harmless and matches the author's clear intent (show only problematic pods).
- The Rook-Ceph `useAllNodes: true` / `useAllDevices: true` config will consume every unallocated block device on every node — fine as a starter example, but worth tightening for real production.
- Service account JSON key files (Step 5) are explicitly called out as transitional only, which matches Google's current guidance.
