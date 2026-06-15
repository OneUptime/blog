# Validation Summary: How to Set Up kubectl port-forward for Pod Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- kubectl port-forward
- Kubernetes Pods, Services, Deployments, and Namespaces
- Shell scripting
- VS Code Node.js debugging configuration

## Sources Consulted
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes task guide, Use Port Forwarding to Access Applications in a Cluster: https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Visual Studio Code Node.js debugging documentation: https://code.visualstudio.com/docs/nodejs/nodejs-debugging

## Issues Found
- The post said `kubectl port-forward` binds to `127.0.0.1` by default. Kubernetes documents the default `--address` value as `localhost`, which tries both `127.0.0.1` and `::1` where available. Updated the wording to reflect the documented behavior.

## Review Notes
- The local review environment did not have `kubectl` installed, so command validation was performed against current official Kubernetes documentation rather than local `kubectl --help` output.
- The port-forward examples for pods, Services, Deployments, multiple ports, namespace selection, `--address`, and `kubectl run --rm -it` match the current Kubernetes CLI documentation.
- The VS Code Node.js attach configuration is consistent with VS Code's documented attach workflow for a debug port such as `9229`.
