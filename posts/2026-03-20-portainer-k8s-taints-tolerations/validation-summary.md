# Validation Summary: How to Configure Taints and Tolerations via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- YAML
- Bash
- Google Kubernetes Engine (GKE)

## Sources Consulted
- Kubernetes: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: `kubectl taint` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes: `kubectl drain` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes: `kubectl patch` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes API Reference v1.35 (`NodeSpec`, `PATCH /api/v1/nodes/{name}`) - https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- Portainer: Inspect a node - https://docs.portainer.io/sts/user/kubernetes/cluster/node
- Portainer: Kubeconfig - https://docs.portainer.io/sts/user/kubernetes/kubeconfig
- Portainer: Edit an application - https://docs.portainer.io/sts/user/kubernetes/applications/edit
- Portainer: Inspect an application - https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer: API documentation - https://docs.portainer.io/api/docs
- Google Kubernetes Engine: Spot VMs - https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms

## Issues Found
- The introduction implied that taints make pods "migrate away" in general. I changed this to describe maintenance workflows more accurately, because existing pods are only evicted with `NoExecute` or separate drain/eviction actions.
- The `NoExecute` description was incomplete. I updated it to reflect that `NoExecute` both evicts non-tolerating running pods and prevents new non-tolerating pods from scheduling.
- The post used node affinity for the GPU workload and claimed a dedicated database node, but it never added the required node labels. I added matching `kubectl label nodes ...` commands so the affinity and selector examples can work as written.
- The GPU example comment said node affinity would "prefer" GPU nodes while using `requiredDuringSchedulingIgnoredDuringExecution`, which is a hard requirement. I corrected the comment to match the actual behavior.
- The `postgres` Deployment manifest was invalid for `apps/v1` because it omitted the required `.spec.selector` and matching pod template labels. I added the selector and labels.
- The database example only added a toleration, which allows scheduling onto tainted nodes but does not require scheduling there. I added a `nodeSelector` so the example actually targets the labeled database node.
- The Portainer API `curl` example was technically incorrect. It used a Docker Swarm-style node update payload (`Taints`, `Version.Index`) and `POST`, which do not match Kubernetes node patch semantics. I replaced it with Portainer UI instructions that are documented officially for adding node labels and taints, plus the YAML patch workflow available in Portainer Business Edition.
- The section claiming that system pods like `kube-proxy` "tolerate all taints" was inaccurate. I changed it to a generic DaemonSet example that intentionally tolerates any taint using `operator: "Exists"`.

## Review Notes
- The broad DaemonSet example with `operator: "Exists"` is valid, but it is broader than the specific tolerations that Kubernetes automatically adds to DaemonSet pods for common node-condition taints.
- The GKE Spot taint example is valid for GKE-specific environments; it is not a generic Kubernetes built-in taint.
- `kubectl` was not installed in the local review environment, so command syntax was checked against the official Kubernetes command reference rather than local `--help` output.
