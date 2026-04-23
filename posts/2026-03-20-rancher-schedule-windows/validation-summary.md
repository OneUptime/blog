# Validation Summary: How to Schedule Workloads on Windows Nodes in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes scheduling
- Windows worker nodes in Kubernetes
- Node selectors and node affinity
- Taints and tolerations
- Pod anti-affinity
- Topology spread constraints
- Kyverno mutation policies
- PriorityClass

## Sources Consulted
- Kubernetes: Guide for Running Windows Containers in Kubernetes — https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes: Windows containers in Kubernetes — https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes: Assigning Pods to Nodes — https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Deployments — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: Taints and Tolerations — https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes: Pod Topology Spread Constraints — https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes: Pod Priority and Preemption — https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes: Admission Controllers — https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes: Node Labels Populated By The Kubelet — https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes: Well-Known Labels, Annotations and Taints — https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes: kubectl command reference — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Kyverno: Selecting Resources — https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno: Mutate Rules — https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Rancher: Launching Kubernetes on Windows Clusters — https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters

## Issues Found
1. Several `apps/v1` Deployment examples were invalid because they omitted the required `.spec.selector` field and matching pod template labels. Added selectors and matching `template.metadata.labels` to each Deployment example.

2. The Step 1 and Step 8 YAML examples were incomplete as written. Step 1 mixed a full Deployment with a stray `spec:` fragment, and Step 8 appended a partial deployment spec after a `PriorityClass`. Converted both into complete, syntactically valid manifests.

3. The post treated `nodeSelector` as universally mandatory for Windows pods, which was too strong. Current Kubernetes guidance says Windows pods should set `.spec.os.name: windows`, and scheduling should use normal mechanisms such as `nodeSelector` or required node affinity. Updated the introduction, conclusion, and examples accordingly.

4. The namespace-default scheduling section incorrectly said `LimitRanger` could add `nodeSelector` defaults. `LimitRanger` manages resource requests and limits, not node selectors. Replaced that claim with admission webhook / `PodNodeSelector` wording and kept the Kyverno mutation example.

5. The `kubectl run` validation command used the `ltsc2022` Nano Server image without constraining the pod to the matching Windows build. Added `.spec.os.name`, an explicit toleration operator, and `node.kubernetes.io/windows-build: "10.0.20348"` so the example aligns with current Windows build compatibility guidance.

6. The anti-affinity, topology spread, and priority examples were missing labels or explicit toleration details needed for the examples to work as described. Added the required labels, selectors, and explicit `operator: Equal` where appropriate.

## Review Notes
- `kubectl` was not installed in the local workspace, so CLI examples were verified against the official kubectl command reference instead of local `--help` output.
- `PodNodeSelector` and `PodTolerationRestriction` are official admission controllers, but they are alpha and disabled by default. In practice, a mutating admission webhook or Kyverno policy is often the more realistic namespace-default approach on current clusters.
- If a Rancher cluster mixes Windows Server 2022 and Windows Server 2025 worker nodes, workloads should use the `node.kubernetes.io/windows-build` label or a `RuntimeClass` to avoid host/image version mismatches.
