# Validation Summary: How to Use the dapr dashboard Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr dashboard` command)
- Dapr Dashboard web UI
- Kubernetes (port-forward integration)

## Sources Consulted
- Official Dapr CLI reference: https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr CLI source code (`dapr/cli` on GitHub) — `cmd/dashboard.go` for flag definitions and defaults
- Dapr Dashboard source code (`dapr/dashboard` on GitHub) — `pages-menu.ts` for tab names, `pkg/instances/instances.go` for control plane labels, `detail.component.html` for app detail tabs
- Kubernetes client-go `tools/portforward` package (used by Dapr CLI for K8s port-forwarding)

## Issues Found

1. **"Applications tab" renamed to "Overview tab"** — The Dapr Dashboard sidebar navigation labels this tab "Overview" (link: `/overview`), not "Applications." Changed to match the actual UI.

2. **"Configuration tab" corrected to "Configurations tab"** — The dashboard uses the plural form "Configurations" (link: `/configurations`). Changed to match the actual UI.

3. **Control Plane services list was incomplete** — The blog originally listed "operator, sentry, placement, scheduler." The dashboard's `controlPlaneLabels` array includes seven services: `dapr-operator`, `dapr-sentry`, `dapr-placement`, `dapr-placement-server`, `dapr-scheduler-server`, `dapr-sidecar-injector`, and `dapr-dashboard`. Updated the list to include the missing key services (sidecar-injector, scheduler-server, dashboard).

4. **"uses `kubectl port-forward`" was technically inaccurate** — The Dapr CLI does not shell out to the `kubectl` binary. It uses the Go `k8s.io/client-go/tools/portforward` library directly to establish the port-forward connection programmatically. Changed to "sets up a Kubernetes port-forward connection" which is accurate without implying `kubectl` is invoked as a subprocess.

## Review Notes
- All CLI flags (`--port`/`-p`, `--kubernetes`/`-k`, `--namespace`/`-n`) and the default port 8080 are confirmed correct against the CLI source code.
- The app detail view claim (components, subscriptions, actors, metadata) is correct. The detail view also includes Summary, Configuration (K8s only), and Logs (K8s only) tabs that the blog does not mention, but omitting these is acceptable for brevity.
- The scripted dashboard check example is functional and reasonable, though in production use a retry loop would be more robust than a single `sleep 2`.
