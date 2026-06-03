# Validation Summary: How to Perform Rolling Node Upgrades with Drain and Uncordon

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Kubernetes
- kubectl drain, cordon, and uncordon
- kubeadm worker node upgrades
- kubelet and kubectl package upgrades
- PodDisruptionBudgets
- StatefulSets

## Sources Consulted
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubeadm Linux node upgrade guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/upgrading-linux-nodes/
- Kubernetes kubeadm cluster upgrade guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes PodDisruptionBudget guide: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes installing kubeadm guide: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes release history: https://kubernetes.io/releases/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/

## Issues Found
- The post claimed rolling worker upgrades can ensure zero downtime. Changed this to "minimizes downtime" / "low-disruption" because PDBs and drain reduce disruption but cannot guarantee zero downtime for all workloads.
- The drain explanation said DaemonSet-managed pods are recreated on other nodes. Corrected it to state that drain does not delete DaemonSet-managed pods when `--ignore-daemonsets` is used.
- The upgrade examples used Kubernetes `1.28.4` and rollback examples used `1.27.8`, both end-of-life by the review date. Updated examples to supported versions `1.36.1` and `1.35.5`.
- The apt package examples used the old exact `-00` package suffix. Updated them to use `'<version>-*'`, matching current Kubernetes package repository guidance.
- The worker-node upgrade order installed kubelet before running `kubeadm upgrade node`. Reordered examples to upgrade kubeadm, run `kubeadm upgrade node`, then upgrade kubelet and kubectl.
- The automation selected nodes with `node-role.kubernetes.io/worker`, which is not guaranteed on kubeadm worker nodes. Changed it to select nodes without control-plane/master role labels.
- The StatefulSet section implied local-storage workloads can always recover on a new node. Clarified that storage must be able to attach on another node before draining.
- The PostgreSQL failover example used a local shell expansion of `$PGDATA`. Wrapped it in `sh -c` so the variable is expanded inside the container.
- The custom-columns verification command used `.status.conditions[-1].type`, which depends on condition ordering and does not report readiness status. Changed it to select the `Ready` condition status explicitly.
- The rollback section implied a general kubeadm downgrade rollback. Narrowed it to restoring a worker node to a previous supported kubelet version and removed the misleading `kubeadm upgrade node` call from that downgrade flow.

## Review Notes
The guide assumes Debian/Ubuntu package management and kubeadm-managed Linux worker nodes. Future improvements could add explicit notes about changing the `pkgs.k8s.io` repository to the target minor version and about checking cloud provider node replacement workflows, but those omissions do not make the corrected examples technically invalid.
