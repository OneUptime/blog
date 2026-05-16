# Validation Summary: How to Deploy Harbor Container Registry on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Harbor container registry
- Helm v3
- Kubernetes
- Trivy (vulnerability scanner)
- cert-manager
- NGINX ingress
- PostgreSQL (Harbor internal database)
- Redis (Harbor internal cache)
- Prometheus ServiceMonitor
- Docker / Kaniko (image push workflow)

## Sources Consulted
- Harbor Helm chart (goharbor/harbor-helm): https://github.com/goharbor/harbor-helm
- Harbor 2.9 release notes / Notary removal: https://goharbor.io/blog/harbor-2.9/
- Harbor Notary v1 deprecation notice: https://github.com/goharbor/harbor/wiki/Harbor-Deprecates-Notary-v1-Support-in-v2.9.0
- Harbor API v2.0 reference (robots, projects, replication, gc): https://goharbor.io/docs/
- Harbor garbage collection / cron scheduler proposal: https://github.com/goharbor/community/blob/main/proposals/cron_scheduler_proposal.md
- Harbor robot account permissions reference: https://goharbor.io/docs/2.2.0/working-with-projects/project-configuration/create-robot-accounts/
- Harbor sign artifacts with Cosign or Notation: https://goharbor.io/docs/2.8.0/working-with-projects/working-with-images/sign-images/

## Issues Found
1. **Notary section in Helm values is obsolete.** The original `notary: { enabled: true }` block in `harbor-values.yaml` and the "Notary for image signing (optional)" comment reference Harbor's legacy Notary v1 integration, which was deprecated in Harbor 2.6 and **removed in Harbor 2.9**. Setting it in current Helm chart releases either has no effect or fails. Removed the block from the values file.
2. **Feature list referenced "Image signing and content trust"** — the "content trust" wording specifically describes the removed Notary v1 / Docker Content Trust flow. Updated to "Image signing with Cosign and Notation", which are Harbor's currently-supported signing options.
3. **GC schedule `type: "Weekly"` combined with a custom cron expression is inconsistent.** Harbor's `/api/v2.0/system/gc/schedule` endpoint expects `type: "Custom"` whenever a custom cron string is supplied; the named types (`Hourly`, `Daily`, `Weekly`) use built-in schedules and ignore/override the `cron` field. Changed `type` to `"Custom"` so the supplied `0 0 0 * * 0` cron is actually honoured.

## Review Notes
- The `secretKey` example value `"a-sixteen-char-k"` is exactly 16 characters as Harbor requires — verified by character count.
- The 6-field cron format (`sec min hour dom month dow`) used in the GC and replication examples is correct for Harbor (it uses robfig/cron with seconds enabled).
- `local-path` is used as a placeholder StorageClass; in a real 3-node Talos cluster the Rancher local-path-provisioner is node-local and not suitable for HA Harbor. The post does call out that the reader needs "a StorageClass for persistent volumes" in the prerequisites, so this is acceptable as an example, but readers should substitute a replicated/networked storage class (e.g., Longhorn, Rook-Ceph) for production.
- The `helm.goharbor.io` chart repository, `harbor/harbor` chart name, and the resulting pod naming (e.g. `harbor-database-0` StatefulSet pod, `pg_dump -U postgres registry`) match the official chart defaults.
- Harbor API endpoints used (`/api/v2.0/projects`, `/api/v2.0/robots`, `/api/v2.0/replication/policies`, `/api/v2.0/system/gc/schedule`, `/api/v2.0/health`, `/api/v2.0/statistics`) and the robot permission `resource`/`action` values (`repository`, `tag`, `artifact` with `push`/`pull`/`create`/`read`) are valid per the Harbor v2.0 API spec.
- Future readers on Harbor 2.11+ should be aware that the chart's `notary` key is fully gone; the deletion above keeps the values file forward-compatible.
