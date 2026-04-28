# Validation Summary: How to Troubleshoot NeuVector Scanner Issues

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- NeuVector (scanner component)
- Kubernetes (`kubectl`, Deployments, CronJobs, resource limits)
- SUSE Rancher (NeuVector is part of the Rancher ecosystem)
- NeuVector REST API (`/v1/scan/status`, `/v1/scan/workload/:id`)
- curl / jq

## Sources Consulted
- NeuVector upstream Helm chart and Kubernetes manifests (deployment/daemonset/cronjob resource types and label selectors)
- Other validated NeuVector posts in this repo confirming canonical names and API paths:
  - `posts/2026-03-20-neuvector-troubleshoot-scanner/README.md` (uses `kubectl patch deployment neuvector-scanner-pod` and `kubectl create job --from=cronjob/neuvector-updater-pod`)
  - `posts/2026-03-20-neuvector-upgrade/README.md` (uses `deployment/neuvector-scanner-pod` for `kubectl set image`)
  - `posts/2026-03-20-rancher-automate-compliance-reporting/README.md` (confirms `GET /v1/scan/status` is a real endpoint)
  - `posts/2026-03-20-neuvector-vulnerability-scanning-pipeline/validation-summary.md` (NeuVector controller `rest.go` route table)

## Issues Found
1. **Wrong workload type in Issue 1 patch.** The post patched `daemonset neuvector-scanner-pod`, but in NeuVector the scanner is deployed as a `Deployment` (the `enforcer` is the DaemonSet). This was also internally inconsistent — Issue 4 already used `kubectl scale deployment neuvector-scanner-pod`. Changed `kubectl patch daemonset` → `kubectl patch deployment` so the patch actually targets the real resource.
2. **Undocumented API endpoint for manual CVE database update.** The post used `POST /v1/scan/database` to trigger a CVE database refresh. This path is not part of the NeuVector controller route table, and the documented way to force an update is to spawn a one-shot Job from the `neuvector-updater-pod` CronJob. Replaced the `curl` call with `kubectl create job --from=cronjob/neuvector-updater-pod manual-update-$(date +%s) -n neuvector`, matching the canonical pattern used elsewhere in this repo.

## Review Notes
- Pod-status, label-selector, OOMKilled `jsonpath`, and resource-patch JSON in Issue 1 are all syntactically valid kubectl usage.
- The connectivity check `curl https://nvd.nist.gov` is a reasonable smoke test for outbound HTTPS, but note that NeuVector's CVE updater pulls from NeuVector-managed update servers (not directly from `nvd.nist.gov`). The "Best Practices" hostnames are illustrative — the upstream chart's exact egress requirements may differ per version. Left as-is because the spirit (verify outbound HTTPS works) is correct.
- `GET /v1/scan/status` and `POST /v1/scan/workload/<workload-id>` are valid NeuVector controller routes.
- The post mixes two scanner-scaling answers: Issue 1 patches resources via `kubectl patch deployment`, Issue 4 scales replicas via `kubectl scale deployment`. Both target the same Deployment, which is now consistent after the fix.
