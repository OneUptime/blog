# How to Create Custom VS Code Tasks and Launch Configurations for OpenTelemetry-Instrumented Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, VS Code, Launch Configurations, Tasks, Developer Productivity

Description: Create VS Code tasks and launch configurations that automatically set up OpenTelemetry tracing when you run or debug your application.

VS Code tasks and launch configurations let you define how your application starts, including environment variables, pre-launch steps, and debug settings. By encoding your OpenTelemetry setup into these configurations, every developer on your team gets tracing automatically when they hit F5 or run a task. No manual steps, no forgotten environment variables.

## The Problem with Manual Setup

Without proper configuration, developers have to remember to:
1. Start the OpenTelemetry Collector
2. Set the right environment variables
3. Include the tracing initialization file
4. Use the correct service name

If any of these steps are missed, tracing silently does not work. VS Code tasks automate all of this.

## Setting Up Tasks

Create `.vscode/tasks.json` in your project:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start OTel Collector",
      "type": "shell",
      "command": "docker compose -f docker-compose.otel.yml up -d",
      "problemMatcher": [],
      "presentation": {
        "reveal": "silent",
        "panel": "shared"
      },
      "runOptions": {
        "runOn": "folderOpen"
      }
    },
    {
      "label": "Stop OTel Collector",
      "type": "shell",
      "command": "docker compose -f docker-compose.otel.yml down",
      "problemMatcher": []
    },
    {
      "label": "View Jaeger UI",
      "type": "shell",
      "command": "open http://localhost:16686 || xdg-open http://localhost:16686",
      "problemMatcher": []
    },
    {
      "label": "Check Collector Health",
      "type": "shell",
      "command": "curl -s http://localhost:13133/health | jq .",
      "problemMatcher": []
    }
  ]
}
```

The `runOn: folderOpen` option for the "Start OTel Collector" task means the collector starts automatically when someone opens the project in VS Code. The collector runs in the background and is ready when the developer starts the application.

## Launch Configurations for Node.js

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run with Tracing",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/app.js",
      "runtimeArgs": ["--require", "${workspaceFolder}/src/tracing.js"],
      "env": {
        "OTEL_SERVICE_NAME": "${workspaceFolderBasename}",
        "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
        "OTEL_TRACES_EXPORTER": "otlp",
        "NODE_ENV": "development"
      },
      "preLaunchTask": "Start OTel Collector",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug with Tracing",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/app.js",
      "runtimeArgs": ["--require", "${workspaceFolder}/src/tracing.js"],
      "env": {
        "OTEL_SERVICE_NAME": "${workspaceFolderBasename}",
        "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
        "OTEL_TRACES_EXPORTER": "otlp",
        "NODE_ENV": "development"
      },
      "preLaunchTask": "Start OTel Collector",
      "console": "integratedTerminal",
      "stopOnEntry": false
    },
    {
      "name": "Run WITHOUT Tracing",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/app.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

A few things to notice:

- The `runtimeArgs` includes `--require ./src/tracing.js`, which loads the OpenTelemetry SDK before your application code runs.
- The `preLaunchTask` starts the collector before the application launches.
- The `OTEL_SERVICE_NAME` uses `${workspaceFolderBasename}`, which automatically uses the project directory name. This is handy in monorepos.
- There is a "Run WITHOUT Tracing" option for when you want to start the app quickly without the overhead.

## Launch Configurations for Python

```json
{
  "name": "Python: Run with Tracing",
  "type": "debugpy",
  "request": "launch",
  "module": "opentelemetry.instrumentation.auto_instrumentation",
  "args": ["python", "${workspaceFolder}/app.py"],
  "env": {
    "OTEL_SERVICE_NAME": "${workspaceFolderBasename}",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
    "OTEL_TRACES_EXPORTER": "otlp",
    "OTEL_PYTHON_LOG_CORRELATION": "true"
  },
  "preLaunchTask": "Start OTel Collector",
  "console": "integratedTerminal"
}
```

This uses the `opentelemetry-instrument` auto-instrumentation approach, which wraps your Python application without modifying its code.

## Launch Configurations for Go

```json
{
  "name": "Go: Run with Tracing",
  "type": "go",
  "request": "launch",
  "mode": "auto",
  "program": "${workspaceFolder}/cmd/server",
  "env": {
    "OTEL_SERVICE_NAME": "${workspaceFolderBasename}",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
    "OTEL_TRACES_EXPORTER": "otlp"
  },
  "preLaunchTask": "Start OTel Collector"
}
```

Go does not have auto-instrumentation, so the tracing initialization must be in your application code. The environment variables tell the SDK where to send data.

## Compound Launch Configurations

If you work on multiple services, use compound configurations to start them all at once:

```json
{
  "compounds": [
    {
      "name": "Full Stack with Tracing",
      "configurations": [
        "API: Run with Tracing",
        "Worker: Run with Tracing",
        "Frontend: Run Dev Server"
      ],
      "preLaunchTask": "Start OTel Collector",
      "stopAll": true
    }
  ]
}
```

Hit F5 with "Full Stack with Tracing" selected, and VS Code starts the collector, then launches all three services. Every service sends traces to the same collector, and you see the full distributed trace across services in Jaeger.

## Sharing with the Team

Commit the `.vscode` directory to your repository. When another developer clones the repo and opens it in VS Code, they get the same tasks and launch configurations. The first time they open the project, the collector starts automatically. When they press F5, the application launches with tracing enabled.

This is one of those small investments that removes friction from the development workflow and makes observability a default rather than an opt-in.
