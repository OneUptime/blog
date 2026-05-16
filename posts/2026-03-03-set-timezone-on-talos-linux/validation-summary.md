# Validation Summary: How to Set Timezone on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (system clock, talosctl CLI)
- Kubernetes (Pods, Deployments, ConfigMaps, CronJobs, MutatingWebhookConfiguration)
- TZ environment variable / IANA timezone database (`/usr/share/zoneinfo`)
- PostgreSQL (`TIMESTAMPTZ`, `AT TIME ZONE`)
- Grafana (`GF_DATE_FORMATS_DEFAULT_TIMEZONE`)

## Sources Consulted
- Talos Linux FAQ on timezone behavior (https://www.talos.dev/v1.9/learn-more/faqs/) — confirms Talos always runs in UTC and timezone is not configurable at the OS level
- Sidero Labs talosctl CLI reference (https://docs.siderolabs.com/talos/v1.7/reference/cli/) — for talosctl commands
- Kubernetes CronJob documentation (https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) — for `timeZone` field
- Kubernetes Enhancement Proposal 3140 (https://github.com/kubernetes/enhancements/blob/master/keps/sig-apps/3140-TimeZone-support-in-CronJob/README.md) — confirms `timeZone` reached GA in v1.27 (alpha 1.24, beta 1.25, stable 1.27)
- PostgreSQL documentation on date/time types and `AT TIME ZONE`
- Grafana configuration documentation for date format / timezone env vars

## Issues Found
No technical issues found.

All technical claims, code examples, and commands were verified against official documentation:
- The claim that Talos always runs in UTC and cannot be changed at the OS level is correct.
- `talosctl -n <ip> time`, `talosctl dmesg`, and `talosctl logs <service>` are valid commands.
- Kubernetes manifest `apiVersion` values are correct (`v1` for Pod/ConfigMap, `apps/v1` for Deployment, `batch/v1` for CronJob, `admissionregistration.k8s.io/v1` for MutatingWebhookConfiguration).
- CronJob `timeZone` field GA in 1.27 is accurate.
- PostgreSQL `TIMESTAMPTZ` and `AT TIME ZONE` syntax is correct.
- Grafana env var `GF_DATE_FORMATS_DEFAULT_TIMEZONE` with value `browser` is a valid configuration.
- HostPath mount of `/usr/share/zoneinfo/...` works because Talos does ship the IANA zoneinfo database.

## Review Notes
- The CronJob `timeZone` field was actually available earlier behind feature gates (alpha 1.24, beta 1.25). The post's "1.27+" framing is correct for the stable/GA availability, which is the most useful guidance for users.
- The mutating webhook example is explicitly labeled "conceptual" — it intentionally omits the webhook server implementation (mutation patch logic), which is appropriate for an illustrative snippet.
- The recommendation to use `hostPath` volumes for timezone data works but couples pods to a specific node filesystem layout; a ConfigMap or image-baked timezone data is often more portable. This is a stylistic improvement only, not an error.
