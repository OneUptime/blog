# Validation Summary: How to Configure NodePort Range in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`, `NetworkRuleConfig`)
- Kubernetes (NodePort services, kube-apiserver, kube-proxy)
- kubectl (`create deployment`, `expose`, `create service nodeport`, `get`, `logs`)
- YAML configuration for Kubernetes Services and Talos machine config

## Sources Consulted
- Talos Linux NetworkRuleConfig reference: https://www.talos.dev/v1.7/reference/configuration/network/networkruleconfig/ (and docs.siderolabs.com)
- Talos Linux machine configuration `cluster.apiServer.extraArgs`: https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Kubernetes Service documentation (NodePort, `service-node-port-range`): https://kubernetes.io/docs/concepts/services-networking/service/
- kube-apiserver flags reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- kubectl command reference (`expose`, `create service nodeport`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found

1. **Incorrect `NetworkRuleConfig` YAML schema (Step 2 firewall example).**
   The original example wrapped the rule in `spec:` and nested `protocol`/`ports` inside each `ingress` entry. The actual Talos `NetworkRuleConfig` schema has no `spec:` wrapper; `ports` and `protocol` live under a top-level `portSelector`, and each `ingress` entry only carries `subnet` (and optional `except`). A single rule also only supports one protocol, so TCP and UDP must be expressed as two separate documents.
   Fixed by replacing the example with two correctly-shaped `NetworkRuleConfig` documents (one TCP, one UDP), each using `portSelector` and a flat `ingress[].subnet` list.

2. **Invalid `kubectl expose --node-port` flag.**
   The original example used `kubectl expose deployment my-app --type=NodePort --port=80 --node-port=8080` to demonstrate the out-of-range rejection. `kubectl expose` does not support a `--node-port` flag — that command would fail with an "unknown flag" error rather than the cited "provided port is not in the valid range" error. The `--node-port` flag is only available on `kubectl create service nodeport`.
   Fixed by changing the command to `kubectl create service nodeport my-app --tcp=80:80 --node-port=8080`, which correctly triggers the validation error shown.

## Review Notes
- Default NodePort range (30000–32767), port-count arithmetic (2768 and 20001), and the listed Kubernetes system component ports (etcd 2379–2380, API server 6443, kubelet 10250, controller manager 10257, scheduler 10259) are all accurate.
- The `cluster.apiServer.extraArgs.service-node-port-range` path and the kube-apiserver flag name are correct.
- The kube-proxy label selector `k8s-app=kube-proxy` and the verification kubectl commands are correct.
- The external load balancer YAML is explicitly labelled as pseudo-code, so the HAProxy-flavoured `*:80` syntax is fine in that context.
- A `service-node-port-range` of `1024-32767` is technically accepted by the API server but is unusual and risks colliding with ephemeral ports and other services — the post already calls this out as a caveat.
