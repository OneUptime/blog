# Validation Summary: How to Configure kubectl alpha debug with Custom Container Images

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubectl
- Ephemeral containers
- Container images

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated
- Kubernetes Debug Running Pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod
- Kubernetes Ephemeral Containers concept documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/

## Issues Found
- The post referred to `kubectl alpha debug` as the primary command. Current Kubernetes documentation lists `kubectl debug` as the supported command, and the current `kubectl alpha` reference no longer lists `debug`. Updated the title, description, and body to use `kubectl debug`.
- The post described `--target` as attaching to specific container namespaces. Kubernetes documents `--target` as targeting the process namespace of another container, and notes that this depends on container runtime support. Updated the wording accordingly.
- The post said debug containers can be added without modifying pod specifications. Ephemeral containers are added through the `ephemeralcontainers` API handler and appear under `spec.ephemeralContainers`, so the wording was narrowed to say this avoids restarting the pod or changing the original application containers.

## Review Notes
The listed flags `--image`, `--target`, `--image-pull-policy`, and `--env` are present in the current official `kubectl debug` reference. Ephemeral containers are stable as of Kubernetes v1.25, but they cannot be changed or removed after being added and are not supported for static Pods.
