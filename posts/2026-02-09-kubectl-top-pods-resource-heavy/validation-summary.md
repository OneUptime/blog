# Validation Summary: How to Use kubectl top pods to Identify Resource-Heavy Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Metrics Server
- Bash shell scripting
- Resource requests and limits
- Kubernetes labels and selectors

## Sources Consulted
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes labels and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Metrics Server installation documentation: https://github.com/kubernetes-sigs/metrics-server

## Issues Found
- The post described `kubectl top` output as real-time metrics. Kubernetes documents `kubectl top` as recent Metrics Server data with metrics pipeline delay, so the wording was changed from "real-time" to "recent".
- The sorting examples claimed sorting was not built in and used numeric Unix `sort`, which can mis-rank Kubernetes CPU and memory quantities across units. Updated these examples to use `kubectl top pods --sort-by=cpu` and `--sort-by=memory`.
- The all-namespaces anomaly examples used the wrong output columns for CPU and memory. Updated the `awk` filters to read CPU from column 3 and memory from column 4 when `--all-namespaces` is used.
- Several scripts compared CPU and memory values by stripping only one suffix, which fails for values such as CPU cores or memory in `Ki`/`Gi`. Updated the examples to convert CPU to millicores and memory to Mi before threshold or utilization calculations.
- The utilization script attempted to pipe kubectl JSONPath output for `.resources.requests` through `jq`, but kubectl JSONPath object output is not JSON in that form. Updated the script to query CPU and memory request fields directly with JSONPath.
- The high-resource debugging examples used unit-sensitive external sorting to pick the top pod. Updated them to use `kubectl top pods --sort-by`.
- The CPU troubleshooting snippet suggested finding CPU throttling via `kubectl describe pod | grep -i throttl`, which is not a reliable `kubectl describe` field. Changed it to inspect recent pod events instead.

## Review Notes
The examples are technically valid for current kubectl documentation, but several shell snippets are intentionally lightweight and still assume GNU/POSIX-style command-line tools and containers that include utilities such as `top`, `free`, or `ps`. `kubectl` was not installed in the review workspace, so CLI validation was performed against official Kubernetes documentation rather than local `kubectl --help` output.
