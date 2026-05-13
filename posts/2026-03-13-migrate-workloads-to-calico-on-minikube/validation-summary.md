# Validation Summary: How to Migrate Existing Workloads to Calico on Minikube

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Minikube
- Kubernetes
- kubectl
- Calico
- Container Network Interface (CNI)
- Kubernetes NetworkPolicy
- PersistentVolumes

## Sources Consulted
- Minikube Network Policy handbook: https://minikube.sigs.k8s.io/docs/handbook/network_policy/
- Minikube start command reference: https://minikube.sigs.k8s.io/docs/commands/start/
- Calico quickstart for Minikube: https://docs.tigera.io/calico/latest/getting-started/kubernetes/minikube
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/

## Issues Found
- The introduction said Minikube does not support in-place CNI replacement. Minikube documentation says replacing the CNI on a running cluster is possible, but starting the cluster with Calico is significantly easier. Updated the wording to avoid the incorrect absolute claim while preserving the recreated-cluster migration approach.
- The Calico cluster creation command used a manual CNI setup with an older pinned Kubernetes and Calico manifest version. Updated it to the documented built-in Minikube Calico path, `minikube start --cni=calico`, and kept the Calico node readiness check.
- The Calico readiness wait was scoped to `kube-system`. Calico documentation notes the namespace can vary depending on installation method, so the wait command now checks all namespaces.
- The persistent volume restore command piped data into `kubectl exec` without `-i`, so stdin would not reliably be passed to the container. Added `-i`.
- The persistent volume restore command used `tar xzf - /data`, which treats `/data` as a member name to extract rather than an extraction destination. Updated it to `tar xzf - -C /` so the archived `/data` path is restored under the container root.

## Review Notes
- The export and redeploy flow is suitable for simple Minikube development workloads. For complex workloads, exported Kubernetes YAML can include cluster-generated fields or generated resources that may need cleanup before applying to a new cluster.
