# Validation Summary: How to Use Node Affinity with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes node affinity
- Kubernetes node labels
- Talos machine configuration
- talosctl
- kubectl
- PostgreSQL container image

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes, including node affinity operators, required/preferred rules, and preferred affinity weights: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Admission Controllers and NodeRestriction: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Talos documentation: Node Labels, including `machine.nodeLabels` and NodeRestriction limitations: https://www.talos.dev/v1.11/kubernetes-guides/configuration/node-labels/
- Talos documentation: Configuration Patches, including `talosctl patch machineconfig --patch @file` usage: https://www.talos.dev/latest/talos-guides/configuration/patching/
- Talos CLI reference: `talosctl apply-config`, `talosctl machineconfig patch`, and patch flags: https://www.talos.dev/latest/reference/cli/
- Docker Official Image documentation for PostgreSQL environment variables: https://hub.docker.com/_/postgres

## Issues Found
- The Talos machine configuration example used arbitrary labels and role-style labels under `machine.nodeLabels`. Current Talos documentation states these labels are written by the node's kubelet identity and are limited by Kubernetes NodeRestriction. I changed the machine config examples to use kubelet-allowed topology labels and clarified that arbitrary workload labels such as `disktype` should be applied with cluster-admin credentials or managed by a controller.
- The Talos patch command used `talosctl apply-config --patch`, but the current Talos CLI documents `--config-patch` for `apply-config` and `--patch` for `talosctl patch machineconfig`. I changed the command to `talosctl patch machineconfig --nodes 192.168.1.10 --patch @talos-machine-config-patch.yaml`.
- The GPU label example used `node-role.kubernetes.io/gpu`, which is a role-label pattern and is not appropriate for kubelet-applied custom hardware labels under NodeRestriction. I changed the example to `hardware.example.com/gpu`.
- The preferred affinity example used a custom `zone` label while the Talos machine config examples now use the standard topology label. I changed it to `topology.kubernetes.io/zone`.
- The PostgreSQL Deployment example used the official `postgres:16` image without setting `POSTGRES_PASSWORD`. The official image requires a password or equivalent configuration for initialization, so I added `POSTGRES_PASSWORD` to the example.
- The final Talos-specific guidance overgeneralized that all important labels should be declared in machine configuration. I narrowed that statement to kubelet-allowed labels and added guidance for managing custom scheduling labels through Kubernetes.

## Review Notes
The Kubernetes node affinity API usage, required and preferred affinity semantics, match expression operators, and weight range are consistent with current Kubernetes documentation. The examples are still simplified and do not cover production database requirements such as persistent storage, Secrets, or namespace creation.
