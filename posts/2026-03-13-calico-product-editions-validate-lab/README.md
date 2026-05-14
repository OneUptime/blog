# How to Validate Calico Product Editions in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, CNI, Lab, Testing, Calico Cloud, Open Source, Calicoctl

Description: Step-by-step guidance for testing and validating different Calico editions in a lab Kubernetes environment before committing to a production deployment.

---

## Introduction

Before deploying any CNI in production, you should validate it in a controlled lab environment. For Calico, this means testing the specific edition and dataplane combination you intend to use. A lab validates your assumptions about feature availability, upgrade behavior, and operational tooling before you invest in production infrastructure.

Each Calico edition has distinct installation mechanisms and feature sets. Testing them side by side in a lab - even on a minimal three-node cluster - surfaces compatibility issues, missing capabilities, and operational rough edges early, when the cost of mistakes is low.

This guide walks through setting up a lab cluster for each edition and the key validation tests you should run.

## Prerequisites

- A lab Kubernetes cluster (kind, k3d, or three VMs) - at minimum one control plane node and two worker nodes
- `kubectl` configured and pointing at the lab cluster
- `calicoctl` installed (matching the Calico version you are testing)
- Helm v3 if using Helm-based Enterprise/Cloud installation
- A Calico Cloud account or Tigera Enterprise trial license if testing Cloud or Enterprise

## Installing Calico Open Source in the Lab

If you are using kind, create the cluster with the default CNI disabled and a pod CIDR that matches the Calico manifest:

```bash
cat > values.yaml <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
networking:
  disableDefaultCNI: true
  podSubnet: 192.168.0.0/16
EOF

kind create cluster --config values.yaml --name calico-lab
```

Install the Calico version you are validating. For the raw manifest install, make sure `CALICO_IPV4POOL_CIDR` matches your cluster pod CIDR if you are not using `192.168.0.0/16`:

```bash
curl https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml -O
kubectl apply -f calico.yaml
```

Verify all Calico pods are running:

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l k8s-app=calico-kube-controllers
```

Confirm nodes are Ready:

```bash
kubectl get nodes
```

## Validating Core Open Source Features

Test basic pod-to-pod connectivity:

```bash
kubectl run client --image=busybox --restart=Never -- sleep 3600
kubectl run server --image=nginx --restart=Never
kubectl exec client -- wget -qO- http://$(kubectl get pod server -o jsonpath='{.status.podIP}')
```

Apply a Calico GlobalNetworkPolicy and verify it is accepted:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: lab-deny-all
spec:
  selector: all()
  types:
  - Ingress
  - Egress
  ingress: []
  egress: []
EOF
```

Check with calicoctl:

```bash
calicoctl get globalnetworkpolicy lab-deny-all -o yaml
```

## Installing Calico Cloud (Trial)

Calico Cloud installs with a unique `kubectl` or Helm command generated in the Tigera portal after signing up for an account. The generated `kubectl` command uses the Calico Cloud operator manifest and an authenticated managed-cluster manifest:

```bash
kubectl apply -f https://installer.calicocloud.io/manifests/cc-operator/latest/deploy.yaml && \
curl -H "Authorization: Bearer <api-token>" "https://www.calicocloud.io/api/managed-cluster/deploy.yaml?version=<calico-cloud-version>" | kubectl apply -f -
```

After installation, confirm the Tigera operator and all managed components are healthy:

```bash
kubectl get tigerastatus
```

Validate flow log collection by generating traffic and checking the Calico Cloud UI for flow log entries within five minutes.

## Key Validation Checkpoints

| Test | Open Source | Cloud | Enterprise |
|---|---|---|---|
| Pod-to-pod connectivity | Yes | Yes | Yes |
| GlobalNetworkPolicy enforcement | Yes | Yes | Yes |
| FQDN-based egress policy | No | Yes | Yes |
| Flow logs in UI | No | Yes | Yes |
| Compliance reports | No | Yes, if enabled | Yes, but deprecated in current Enterprise docs |
| `kubectl get tigerastatus` | No | Yes | Yes |

## Best Practices

- Always run the lab on the same kernel version you use in production - eBPF availability is kernel-dependent
- Run the validation checklist before and after any Calico upgrade in the lab to catch regressions
- Test policy enforcement (not just connectivity) - a passing connectivity test does not mean policies are being enforced
- Record the exact manifests and versions used so the lab environment can be reproduced exactly in production

## Conclusion

Lab validation is the most reliable way to confirm that the Calico edition you have chosen supports the features your production environment requires. By systematically testing connectivity, policy enforcement, and edition-specific features in a controlled environment, you dramatically reduce the risk of surprises during production rollout.
