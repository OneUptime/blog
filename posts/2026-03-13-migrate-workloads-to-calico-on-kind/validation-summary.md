# Validation Summary: How to Migrate Existing Workloads to Calico on Kind

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- Kind
- Calico
- Kubernetes CNI plugins
- Kubernetes NetworkPolicy
- kubectl

## Sources Consulted
- Kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Calico quickstart guide for Kind: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes API concepts, resource versions: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The prerequisites listed `calicoctl`, but the guide does not use it and the current Calico Kind quickstart requires Docker along with Kind and kubectl. Updated the prerequisites accordingly.
- The Calico installation command used an older pinned `calico.yaml` manifest. Updated the install commands to match the current official Calico Kind quickstart using Calico v3.32.0 CRDs, the Tigera Operator, and `custom-resources.yaml`.
- The readiness check waited for `calico-node` pods in `kube-system`, which matches older manifest-based installs rather than the current operator-based install. Updated it to monitor `tigerastatus`, as recommended by the official Calico quickstart.
- The workload export command claimed to export all workloads but only included Deployments. Expanded it to include namespaces, StatefulSets, DaemonSets, Jobs, CronJobs, and PVCs in addition to the original resource types.
- The workload export command produced live Kubernetes objects that can include cluster-generated metadata and Service allocation fields. Added a note to remove generated fields such as `uid`, `resourceVersion`, `managedFields`, `creationTimestamp`, `status`, and generated Service IP/NodePort values before applying the manifests to the new cluster.

## Review Notes
The overall blue-green migration approach is technically sound for changing CNI on Kind. Stateful workloads are correctly called out as needing separate data migration planning, but the post intentionally keeps that topic high level.
