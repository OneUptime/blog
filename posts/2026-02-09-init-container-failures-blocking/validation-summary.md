# Validation Summary: Troubleshoot Kubernetes Init Container Failures Blocking Main Container Startup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes init containers
- Kubernetes Pods, Deployments, and StatefulSets
- kubectl
- Kubernetes NetworkPolicy
- Kubernetes resource requests and limits
- Kubernetes image pull secrets
- Prometheus / kube-state-metrics alerting
- Shell scripting in container commands

## Sources Consulted
- Kubernetes documentation: Init Containers — https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes documentation: Debug Init Containers — https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/
- Kubernetes documentation: kubectl logs reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes documentation: kubectl run reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: Logging Architecture — https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes documentation: Resource Management for Pods and Containers — https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes API reference: NetworkPolicy — https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes documentation: Pull an Image from a Private Registry — https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- kube-state-metrics documentation: metrics for init containers and pod start time — https://github.com/kubernetes/kube-state-metrics/tree/main/docs

## Issues Found

1. **Misleading NetworkPolicy wording**: The post stated that network policies may forget to allow traffic "from init containers." Kubernetes NetworkPolicy selects and applies to Pods, not to individual init or application containers. Updated the wording to explain that the pod's policy must allow traffic needed during initialization.

2. **Incorrect image-pull verification example**: The post recommended verifying image accessibility with `curlimages/curl:7.85.0`, which would only test pulling that public curl image, not the failing init container image. Updated the command to use a placeholder for the failing image.

## Review Notes
- The init container lifecycle description is correct: init containers run sequentially to completion before application containers start, and failed init containers are retried according to the Pod restart policy, except when `restartPolicy: Never` causes the Pod to fail.
- The `kubectl logs -c <container> --previous` usage is correct for retrieving logs from a previous container instance.
- The Pod, Deployment, StatefulSet, `emptyDir`, `volumeClaimTemplates`, `securityContext`, `secretKeyRef`, and `imagePullSecrets` examples use valid Kubernetes API fields.
- The resource discussion is correct; init containers support requests and limits, and Kubernetes computes effective Pod requests and limits using the highest init-container request or limit for each resource.
- The Prometheus alert expression uses kube-state-metrics metric names that are available in current kube-state-metrics documentation.
