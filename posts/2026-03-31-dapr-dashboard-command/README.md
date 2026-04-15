# How to Use the dapr dashboard Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Dashboard, Monitoring, UI

Description: Learn how to use the dapr dashboard command to launch the Dapr web UI for inspecting running applications, components, and configurations.

---

## Overview

The `dapr dashboard` command starts the Dapr web dashboard, a browser-based UI that displays running applications, loaded components, active configurations, and control plane health. It is a visual alternative to the CLI commands for day-to-day debugging and exploration.

## Launching the Dashboard in Self-Hosted Mode

```bash
dapr dashboard
```

By default, this opens the dashboard on port 8080. Navigate to `http://localhost:8080` in your browser.

## Specifying a Custom Port

```bash
dapr dashboard --port 9090
```

## Launching the Dashboard for Kubernetes

```bash
dapr dashboard --kubernetes
```

Or:

```bash
dapr dashboard -k
```

This sets up a Kubernetes port-forward connection to tunnel the dashboard pod port to your local machine. The dashboard opens automatically on the default port.

## Targeting a Specific Namespace

```bash
dapr dashboard --kubernetes --namespace production
```

## Running in Background

To keep the dashboard running in the background while using the same terminal:

```bash
dapr dashboard &
```

Access at `http://localhost:8080`.

## Dashboard Features

The dashboard provides several panels:

**Overview tab** - shows all running Dapr apps, their IDs, ports, and loaded component counts.

**Components tab** - lists all loaded components with their type, version, and scopes.

**Configurations tab** - displays active Configuration resources with tracing and middleware settings.

**Control Plane tab** - shows the health of Dapr system services (operator, sentry, placement, sidecar-injector, scheduler-server, and dashboard).

## Accessing Detailed App Info

Click on any application in the dashboard to see:
- Loaded components accessible to that app
- Active subscriptions
- Active actors
- Metadata

## Scripted Dashboard Check

You can check whether the dashboard starts successfully as part of a readiness check:

```bash
dapr dashboard --port 8888 &
DASHBOARD_PID=$!

sleep 2
if curl -s http://localhost:8888 > /dev/null; then
  echo "Dashboard is up"
else
  echo "Dashboard failed to start"
  kill $DASHBOARD_PID
  exit 1
fi
```

## Summary

`dapr dashboard` gives teams a visual overview of their Dapr environment without requiring memorization of CLI commands. It is especially useful onboarding new developers who want to explore component configurations and see which apps are running. Use it alongside `dapr list` and `dapr components` for a complete picture of your local or Kubernetes deployment.
