# Validation Summary: How to Use Dapr Dashboard for Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Dashboard (web UI)
- Dapr CLI (`dapr dashboard`, `dapr upgrade`)
- Kubernetes (port-forwarding, LoadBalancer services)
- kubectl

## Sources Consulted
- Dapr CLI Dashboard command reference — https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr CLI Upgrade command reference — https://docs.dapr.io/reference/cli/dapr-upgrade/
- Dapr Dashboard GitHub repository — https://github.com/dapr/dashboard
- Dapr Dashboard Kubernetes deployment manifest — https://github.com/dapr/dashboard/blob/master/deploy/dashboard.yaml
- Overview of Dapr control plane services — https://docs.dapr.io/concepts/dapr-services/
- Dapr Scheduler service docs — https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Kubernetes upgrade guide — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/

## Issues Found
1. **Missing `dapr-scheduler` in control plane services table.** The blog listed four control plane services (dapr-operator, dapr-sidecar-injector, dapr-placement, dapr-sentry) but omitted `dapr-scheduler`, which is a current Dapr control plane service. Added it to the table.

## Review Notes
- The dashboard tab names used in the post ("Applications Tab", "Actors Tab") are informal descriptions rather than exact UI labels. The main page showing running apps is labeled "Dashboard" in the UI, and actor information is accessed through application detail views rather than a standalone tab. There is also a "Configuration" tab not mentioned. These are minor presentation differences — the information described is broadly accurate.
- The `dapr upgrade -k --runtime-version 1.13.3` example uses an older Dapr version. While the command syntax is correct, readers should substitute their target version. Dapr docs recommend upgrading incrementally without skipping minor versions.
- The `--version` flag on `dapr dashboard` is confirmed valid per the official CLI reference.
- The default port of 8080, the `-k` flag for Kubernetes mode, and the `--port` flag syntax are all confirmed correct.
- The LoadBalancer service YAML for remote access uses correct namespace (`dapr-system`), selector (`app: dapr-dashboard`), and target port (`8080`), all matching the actual Dapr Dashboard Kubernetes deployment manifest.
