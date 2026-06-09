# Validation Summary: How to Configure Kubernetes Affinity Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (Pod scheduling, affinity/anti-affinity)
- Node Affinity (`requiredDuringSchedulingIgnoredDuringExecution`, `preferredDuringSchedulingIgnoredDuringExecution`)
- Pod Affinity and Pod Anti-Affinity
- `topologyKey` semantics (`kubernetes.io/hostname`, `topology.kubernetes.io/zone`)
- Well-known Kubernetes labels (`node.kubernetes.io/instance-type`, `topology.kubernetes.io/zone`, `nvidia.com/gpu`)
- `kubectl` CLI (get, describe, label, apply, events)
- YAML manifest structure (Pod, Deployment)

## Sources Consulted
- Kubernetes docs: Assigning Pods to Nodes — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes API reference: NodeSelectorRequirement and LabelSelectorRequirement — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#labelselectorrequirement-v1-meta
- Kubernetes docs: Well-Known Labels, Annotations and Taints — https://kubernetes.io/docs/reference/labels-annotations-taints/
- kubectl reference — https://kubernetes.io/docs/reference/kubectl/

## Issues Found

1. **Best Practices section 2 ("Use Meaningful Weights") — invalid YAML structure.**
   The original example placed both `podAffinityTerm` and `preference` entries inside the same `preferredDuringSchedulingIgnoredDuringExecution` list. These two fields belong to different parents in the spec: `podAffinityTerm` lives under `podAffinity`/`podAntiAffinity`, while `preference` lives under `nodeAffinity`. They cannot be intermixed in one list.
   **Fix:** Wrapped the example in a proper `affinity:` block and split the entries — the `podAffinityTerm` entry now sits under `podAffinity.preferredDuringSchedulingIgnoredDuringExecution`, and the two `preference` entries sit under `nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution`. The original intent (illustrating meaningful weight differences across three priorities) is preserved.

## Review Notes
- Node affinity operator table correctly notes `In`, `NotIn`, `Exists`, `DoesNotExist`, `Gt`, `Lt`. The table is titled "Node affinity supports several matching operators," which is important because `Gt` and `Lt` are only valid for node affinity matchExpressions — pod-affinity `labelSelector` matchExpressions only support `In`, `NotIn`, `Exists`, `DoesNotExist`. The post correctly scopes the table to node affinity.
- All YAML manifests (apiVersion, kind, spec layout, indentation of `topologyKey` under `labelSelector` siblings, etc.) are structurally valid against the v1 Pod / apps/v1 Deployment schemas.
- Weight range (1-100) for preferred affinity is correctly stated.
- `nodeSelectorTerms` is correctly a list (OR semantics between terms, AND within `matchExpressions`).
- All `kubectl` commands and flags (`--dry-run=client`, `--dry-run=server`, `--field-selector`, `-o jsonpath`, `--show-labels`, `--watch`) are valid for current kubectl versions.
- FailedScheduling event message wording is approximate but representative of real scheduler output.
- Container image tags referenced (`postgres:15`, `nginx:1.25`, `redis:7`) are valid published tags.
