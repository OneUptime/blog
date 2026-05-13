# How to Migrate Existing Workloads to Calico on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, k3s, CNI

Description: Migrate existing K3s workloads from Flannel to Calico for network policy enforcement without permanent data loss.

---

## Introduction

Migrating from Flannel to Calico on K3s requires cluster recreation because K3s does not support in-place CNI replacement. The migration must be planned carefully for production edge environments where workload downtime may have significant operational impact. The key is to export all workload state before the migration and validate everything after redeployment.

Edge workloads on K3s may include IoT data collectors, local inference engines, and data aggregators. These workloads often maintain local state that needs to be preserved across the migration. Understanding the stateful components and planning their migration separately from stateless workloads is essential.

This guide provides a comprehensive migration plan for moving K3s workloads from Flannel to Calico, including a state export phase, cluster recreation, redeployment, and validation.

## Prerequisites

- K3s cluster with Flannel and running workloads
- Storage for workload backups
- Maintenance window planned
- `jq` installed for cleaning exported Kubernetes resources

## Step 1: Inventory All Workloads

```bash
clean_export() {
  kubectl get "$1" --all-namespaces -o json | jq 'del(
    .items[].metadata.uid,
    .items[].metadata.resourceVersion,
    .items[].metadata.generation,
    .items[].metadata.creationTimestamp,
    .items[].metadata.managedFields,
    .items[].status
  )'
}

clean_export deployment,statefulset,daemonset,job,cronjob,service > workloads.json
clean_export configmap > configmaps.json
clean_export secret > secrets.json
clean_export pvc > pvcs.json
clean_export ingress > ingresses.json
clean_export networkpolicy > networkpolicies.json
```

## Step 2: Backup Stateful Data

For each stateful workload, backup persistent data:

```bash
kubectl exec -n <namespace> <pod> -- tar czf - -C /data . > workload-data-backup.tar.gz
```

## Step 3: Scale Down Workloads

```bash
kubectl scale deployment --all --replicas=0 --all-namespaces
kubectl scale statefulset --all --replicas=0 --all-namespaces
```

## Step 4: Uninstall K3s

```bash
# On server nodes:
sudo /usr/local/bin/k3s-uninstall.sh

# On agent nodes:
sudo /usr/local/bin/k3s-agent-uninstall.sh
```

## Step 5: Reinstall K3s with Calico Support

```bash
curl -sfL https://get.k3s.io | sh -s - \
  --flannel-backend=none \
  --disable-network-policy \
  --cluster-cidr=192.168.0.0/16

mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config
```

## Step 6: Install Calico

```bash
curl -fsSL https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml -o calico.yaml
perl -0pi -e 's/"policy": \{\n              "type": "k8s"\n          \},/"policy": {\n              "type": "k8s"\n          },\n          "container_settings": {\n              "allow_ip_forwarding": true\n          },/' calico.yaml
kubectl apply -f calico.yaml
kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=calico-node \
  --timeout=120s
```

## Step 7: Redeploy Workloads

```bash
kubectl apply -f configmaps.json
kubectl apply -f secrets.json
kubectl apply -f pvcs.json
kubectl apply -f workloads.json
kubectl apply -f ingresses.json
kubectl apply -f networkpolicies.json
```

## Step 8: Restore Stateful Data

```bash
kubectl exec -i -n <namespace> <new-pod> -- tar xzf - -C /data < workload-data-backup.tar.gz
```

## Step 9: Validate

```bash
kubectl get pods --all-namespaces
kubectl get svc --all-namespaces
```

Test application endpoints and verify that network policies are now enforced by Calico.

## Conclusion

You have migrated K3s workloads from Flannel to Calico by exporting all resources and state, reinstalling K3s with Flannel disabled, deploying Calico, and redeploying workloads. Your K3s cluster now has full Calico network policy enforcement with all previous workloads successfully migrated.
