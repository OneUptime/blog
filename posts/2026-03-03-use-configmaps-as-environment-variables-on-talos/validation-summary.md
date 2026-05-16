# Validation Summary: How to Use ConfigMaps as Environment Variables on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Pods
- Kubernetes Deployments
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kubernetes environment variables
- kubectl

## Sources Consulted
- Kubernetes documentation: ConfigMaps, including ConfigMap data keys, consumption by Pods, and update behavior: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes documentation: Configure a Pod to Use a ConfigMap, including `configMapKeyRef` and `envFrom` examples: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes documentation: Define Environment Variables for a Container, including `env`, `envFrom`, prefixes, and environment variable naming: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes documentation: Updating Configuration via a ConfigMap, including environment-variable update behavior and rollout restart: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes API source for current `EnvVar` and `EnvFromSource` field comments: https://raw.githubusercontent.com/kubernetes/kubernetes/master/staging/src/k8s.io/api/core/v1/types.go
- Kubernetes API reference source for Pod container `envFrom` precedence and validation text: https://raw.githubusercontent.com/kubernetes/website/main/content/en/docs/reference/kubernetes-api/workload-resources/pod-v1.md
- Kubernetes kubectl reference for rollout commands: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The post said ConfigMap keys with dots or dashes, such as `app.name` and `cache-ttl`, are invalid environment variable names and would be skipped by Kubernetes when loaded with `envFrom`. Current Kubernetes documentation and API comments allow environment variable names and `envFrom` source keys to use printable ASCII except `=`, while ConfigMap keys allow alphanumeric characters, `.`, `_`, and `-`. Updated the section to explain that these keys are valid in Kubernetes but can be awkward for shell scripts and some libraries, and kept the `valueFrom` workaround for shell-friendly names.

## Review Notes
The Kubernetes examples use current stable API versions (`v1` for Pods and ConfigMaps, `apps/v1` for Deployments), and the `configMapKeyRef`, `envFrom`, `prefix`, `optional`, `fieldRef`, `secretKeyRef`, `kubectl apply`, `kubectl patch --type merge -p`, and `kubectl rollout restart/status` usage is consistent with official documentation. The Talos-specific framing is accurate because these are Kubernetes API-level patterns and do not require host-level Talos changes.
