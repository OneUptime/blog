# Validation Summary: How to Verify Pod Networking with Calico on Minikube

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- Minikube
- CNI networking
- kubectl
- calicoctl

## Sources Consulted
- Calico `calicoctl node status` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl node` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico `calicoctl ipam show` command reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico `calico/node` configuration and readiness checks: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Minikube network policy and Calico CNI guidance: https://minikube.sigs.k8s.io/docs/handbook/network_policy/
- Minikube `start --cni` command reference: https://minikube.sigs.k8s.io/docs/commands/start/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes namespace DNS naming documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- `calicoctl node status` was presented as a normal local command, but Calico documents that `calicoctl node` subcommands must run directly on the node that hosts `calico/node` because they need host filesystem access. Replaced the command with supported `calico-node` readiness checks executed through the `calico-node` DaemonSet container, and added a note about running `calicoctl node status` directly on the Minikube node if preferred.
- The connectivity tests executed into newly created pods immediately after `kubectl run`, which can race before the pods are Ready. Added `kubectl wait --for=condition=Ready` before executing commands in the BusyBox and nginx pods.

## Review Notes
The post assumes a default namespace test setup and an already installed, configured Calico deployment. The `kubectl logs ... | grep -i error` check is valid as a quick filter, but future revisions could mention that `grep` returning no matches exits non-zero even when that is the desired result.
