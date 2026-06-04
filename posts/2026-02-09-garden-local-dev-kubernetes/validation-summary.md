# Validation Summary: How to Build a Local Development Workflow with Garden and Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Garden CLI
- Garden project configuration
- Garden Build, Deploy, Run, Test, and Workflow actions
- Kubernetes
- local-kubernetes and kubernetes Garden providers
- Helm
- Bitnami PostgreSQL Helm chart
- Redis container deployment
- Node.js Docker containers
- kind
- kubectl
- Prometheus and Grafana via kube-prometheus-stack

## Sources Consulted
- Garden Quickstart: https://docs.garden.io/getting-started/quickstart
- Garden Basics: https://docs.garden.io/getting-started/basics
- Garden CLI guide: https://docs.garden.io/guides/using-the-cli
- Garden project configuration reference: https://docs.garden.io/reference/project-config
- Garden container Build action reference: https://docs.garden.io/reference/action-types/build/container
- Garden container Deploy action reference: https://docs.garden.io/reference/action-types/deploy/container
- Garden container Run action reference: https://docs.garden.io/reference/action-types/run/container
- Garden container Test action reference: https://docs.garden.io/reference/action-types/test/container
- Garden Helm Deploy action reference: https://docs.garden.io/reference/action-types/deploy/helm
- Garden Workflow guide and reference: https://docs.garden.io/features/workflows and https://docs.garden.io/reference/workflow-config
- Garden deprecations: https://docs.garden.io/misc/deprecations
- Garden local Kubernetes guide: https://docs.garden.io/using-garden-with/kubernetes/local-kubernetes
- kind Quick Start: https://kind.sigs.k8s.io/docs/user/quick-start/
- Kubernetes kubectl config use-context reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_use-context/
- Bitnami PostgreSQL chart reference: https://artifacthub.io/packages/helm/bitnami/postgresql

## Issues Found
- The post used deprecated Garden module configuration (`kind: Module`) throughout. Replaced examples with current action-based `Build`, `Deploy`, `Run`, and `Test` configuration using `apiVersion: garden.io/v2` at the project level.
- The post used removed or deprecated hot-reload configuration fields such as module-level `hotReload`, provider-level `sync`, and `postSyncCommand`. Replaced them with `spec.sync` on Deploy actions and `garden deploy --sync=api`.
- Several CLI commands were outdated or invalid, including `garden run task ...`, `garden run workflow ...`, `garden dev --hot-reload --logs all`, `garden delete env`, `garden port-forward ...`, `garden test --watch`, and `garden test --tag ...`. Updated them to current documented forms such as `garden run <run-action>`, `garden workflow <name>`, `garden deploy --sync=api --logs`, `garden cleanup env`, `garden deploy --forward`, and supported test command examples.
- The original snippets referenced module outputs such as `${modules.api-service.outputs.deployment-image-id}` and service outputs that do not match current action templating. Updated references to `${actions.build.api-service.outputs.deploymentImageId}` and explicit service URLs.
- The Kubernetes provider example used incorrect or outdated provider fields such as provider-level `deploymentStrategy`, `buildMode: local-docker`, `sync`, `namespace`, and `dockerRegistry`. Replaced the local example with the documented `local-kubernetes` provider and moved namespace configuration to `environments[].defaultNamespace`.
- The service examples referenced Redis and cleanup tasks without defining them. Added a Redis Deploy action and a cleanup Run action so workflow dependencies resolve.
- The Garden resource configuration used Kubernetes-style `resources.requests` and `resources.limits` under a Garden container Deploy action. Updated it to Garden's `cpu.min`, `cpu.max`, `memory.min`, and `memory.max` fields.
- Variable names used hyphenated keys such as `db-password` and `grafana-password`, which are brittle in Garden dot-notation template strings. Renamed them to `dbPassword` and `grafanaPassword`.
- The monitoring example used module-style Helm configuration and non-existent Garden port-forward commands. Replaced it with a Helm Deploy action using `spec.chart`, `spec.values`, and `spec.portForwards`.

## Review Notes
The post is now aligned with Garden's current action-based configuration model. Garden modules still appear in the docs for backward compatibility but are deprecated, so a future-dated tutorial should avoid them.
