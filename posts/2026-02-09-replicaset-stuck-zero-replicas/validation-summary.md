# Validation Summary: Troubleshoot Kubernetes Deployment ReplicaSet Stuck at Zero Available Replicas

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes ReplicaSets
- Kubernetes Pods
- kubectl
- Kubernetes readiness probes
- Kubernetes imagePullSecrets
- Kubernetes PersistentVolumeClaims and StorageClasses
- Prometheus alerts with kube-state-metrics
- Bash and jq

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes private registry image pull documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Dynamic Volume Provisioning documentation: https://kubernetes.io/docs/concepts/storage/dynamic-provisioning
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/

## Issues Found
- The explanation of available replicas said pods only need to be Running and pass readiness checks. Updated it to say available replicas are pods that are Ready for at least the Deployment's `minReadySeconds` value, matching Kubernetes Deployment status semantics.
- Several `apps/v1` Deployment YAML snippets omitted `spec.selector` and matching pod template labels. Added explicit selectors and labels so the examples are valid Deployment manifests.
- The PVC remediation comment said to update a Deployment to use an existing StorageClass, but the command actually changes the referenced PVC. Updated the comment to say it uses an existing bound PVC.
- The Bash health-check script used `echo "\n..."`, which does not reliably print newlines. Replaced those calls with `printf`.
- The Bash health-check script assumed the Deployment name matched the `app` label. Updated it to read the Deployment's `matchLabels` selector and use that selector for pod queries and logs.
- Quoted Deployment, namespace, and selector variables in the health-check script to avoid shell word-splitting issues.

## Review Notes
The health-check script now handles standard `matchLabels` selectors. A future enhancement could support Deployments that use only `matchExpressions`, but the post's examples use `matchLabels`, and the corrected script is accurate for that pattern.
