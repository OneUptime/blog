# Validation Summary: How to Run Gitea on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Gitea (and the official `gitea-charts/gitea` Helm chart)
- Kubernetes (kubectl, Helm)
- rancher/local-path-provisioner
- PostgreSQL (via Bitnami subchart embedded in Gitea Helm chart)
- Nginx Ingress
- Velero (backups)
- Prometheus Operator (ServiceMonitor)
- CoreDNS

## Sources Consulted
- rancher/local-path-provisioner deploy manifest: https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
- Gitea Helm chart: https://gitea.com/gitea/helm-chart
- Gitea Helm chart on Artifact Hub: https://artifacthub.io/packages/helm/gitea/gitea
- Talos machine config reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos architecture (writable filesystem paths): https://docs.siderolabs.com/talos/v1.7/learn-more/architecture/
- Gitea release notes: https://github.com/go-gitea/gitea/releases

## Issues Found
1. **Wrong default storage path for local-path-provisioner.** The post claimed data is stored under `/var/local-path-provisioner` by default. The actual default is `/opt/local-path-provisioner` (per the upstream ConfigMap). Updated the prose and the `extraMounts` example to bind-mount a writable `/var/local-path-provisioner` source into the `/opt/local-path-provisioner` destination so the patch actually fixes the Talos read-only-`/opt` problem.

2. **Invalid `talosctl` invocation.** The post used `talosctl apply-config --patch @file.yaml --nodes <ip>`. `apply-config` requires a full config file (`-f`) and replaces the node config; it is not the right command for applying a standalone runtime patch. Replaced with `talosctl patch machineconfig --patch @talos-storage-patch.yaml --nodes <worker-node-ip>`.

3. **Selector labels did not match Gitea Helm chart pods.** The NodePort SSH Service and the ServiceMonitor used `selector: app: gitea`. The official Gitea Helm chart labels pods with `app.kubernetes.io/name: gitea` and `app.kubernetes.io/instance: <release>`, not `app: gitea`, so the custom selectors would not match anything. Updated both selectors to use `app.kubernetes.io/name: gitea` plus `app.kubernetes.io/instance: gitea`.

4. **Missing disable of default `postgresql-ha` subchart.** Current Gitea chart versions default to `postgresql-ha.enabled: true` (with `postgresql.enabled: false`). The values file in the post sets credentials under `postgresql:` but does not disable `postgresql-ha`, which would have caused two database deployments to be created and the Gitea container to point at a non-existent service. Added `postgresql-ha: { enabled: false }` to the values file.

5. **Outdated Gitea image tag.** Updated `tag: "1.21"` (released late 2023) to `tag: "1.23"` to point readers at a more current, supported release. Did not jump all the way to 1.26 in order to stay conservative against possible chart-version pinning.

## Review Notes
- The Helm chart's PostgreSQL value layout is correct for the non-HA Bitnami subchart (`postgresql.global.postgresql.auth.password`). Readers who prefer the HA variant should instead populate `postgresql-ha:` values.
- The `velero install --provider aws` example is plausible but assumes the user has already prepared a `credentials-velero` file and an S3 bucket; the post does not detail this, which is fine for an overview but a reader should consult Velero docs before running it.
- The `kubectl logs -n gitea statefulset/gitea-postgresql -f` invocation assumes the non-HA postgres subchart (now disabled by default in the chart) — which is consistent with the corrected values file above.
- `DISABLE_REGISTRATION: false` is the chart default; leaving it explicit is harmless but redundant.
- The `cache.ADAPTER: memory` and `session.PROVIDER: memory` recommendations are fine for `replicaCount: 1` but would not scale horizontally — worth a future note if the post is ever expanded to cover multi-replica deployments.
