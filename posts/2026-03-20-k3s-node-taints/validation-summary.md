# Validation Summary: How to Configure K3s Node Taints

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- `kubectl`
- YAML pod and node configuration
- Node taints and tolerations

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s High Availability External DB: https://docs.k3s.io/datastore/ha
- K3s Agent CLI: https://docs.k3s.io/cli/agent
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes `kubectl taint` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- TensorFlow Docker images: https://www.tensorflow.org/install/docker

## Issues Found
- The post incorrectly stated that K3s server nodes are tainted by default. K3s documentation says server nodes are schedulable by default, so the control-plane section was rewritten to show how to add and remove a taint manually or via `node-taint` in server config.
- The taint behavior explanation was too broad in two places. It implied all taints strictly reject pods and that `NoExecute` evicts all existing pods. The wording was corrected to reflect that `PreferNoSchedule` is a soft preference and `NoExecute` evicts only non-tolerant pods.
- The taint-removal example used `dedicated=gpu:NoSchedule-`. The Kubernetes `kubectl taint` reference documents removal as `key:effect-`, so the example was changed to `dedicated:NoSchedule-`.
- The maintenance example said a `NoExecute` taint would evict all pods. It was corrected to say it evicts non-tolerant pods.
- The `StatefulSet` example omitted `serviceName`, which is part of the standard StatefulSet spec and tied to the required governing Service. `serviceName: postgres` was added.

## Review Notes
- K3s applies `--node-taint` and `node-taint` only at node registration time; after a node has joined, taints should be changed with `kubectl`.
- The `tolerationSeconds: 300` example for `node.kubernetes.io/not-ready` is valid, but Kubernetes automatically adds 300-second tolerations for `node.kubernetes.io/not-ready` and `node.kubernetes.io/unreachable` to most Pods unless explicitly overridden.
