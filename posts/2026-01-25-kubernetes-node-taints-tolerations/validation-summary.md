# Validation Summary: How to Configure Kubernetes Node Taints and Tolerations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes scheduling
- Kubernetes taints and tolerations
- Kubernetes node selectors and node affinity
- kubectl
- PodDisruptionBudget

## Sources Consulted
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl reference: kubectl taint - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes kubectl reference: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes API reference: Toleration v1 - https://kubernetes.io/docs/reference/kubernetes-api/definitions/toleration-v1/
- Kubernetes reference: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- The `NoExecute` effect was described only as evicting existing pods. Updated the description to also state that new pods without a matching toleration are not scheduled onto the node.
- The toleration operators section stated that two operators control toleration matching. Updated the wording to say most tolerations use `Equal` and `Exists`, because current Kubernetes API documentation also includes alpha numeric comparison operators behind a feature gate.
- The dedicated node pool example used `nodeSelector` but did not label the nodes. Added matching `kubectl label nodes` commands so the deployment can actually match the intended nodes.
- The database deployment comment said `nodeSelector` prefers nodes. Updated it to say `nodeSelector` requires matching nodes.
- The `NoExecute` maintenance workflow comment implied all affected pods use `tolerationSeconds`. Updated it to accurately describe eviction for pods that do not tolerate the taint.
- The example scheduling error combined an unrelated PersistentVolumeClaim failure with a taint failure. Simplified it to a taint-specific `FailedScheduling` message.
- The best-practice note for `tolerationSeconds` implied it controls graceful termination. Updated it to state that it controls time before eviction.

## Review Notes
- `kubectl` is not installed in the local environment, so CLI behavior was verified against the official Kubernetes kubectl reference instead of local `kubectl --help` output.
- The GPU examples assume the cluster has the appropriate NVIDIA device plugin or equivalent GPU device integration installed.
- The image tags shown in examples are valid as examples, but production workloads should usually pin images more specifically than `latest`.
