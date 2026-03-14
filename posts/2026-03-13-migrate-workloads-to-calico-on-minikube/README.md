# How to Migrate Existing Workloads to Calico on Minikube

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, Minikube, CNI

Description: A guide to migrating existing Minikube workloads from the default CNI to Calico for network policy support.

---

## Introduction

If you have existing workloads running on a Minikube cluster using the default kindnet CNI, migrating to Calico requires recreating the cluster since Minikube does not support in-place CNI replacement. The migration process involves exporting workload definitions, creating a new Calico-enabled cluster, and redeploying workloads.

The key challenge in this migration is ensuring that your workloads do not have hardcoded IP addresses (which will change) and that any ConfigMaps or environment variables referencing pod IPs are updated to use service DNS names instead. Minikube's single-node nature simplifies some aspects of migration while the local PersistentVolume handling may need attention for stateful workloads.

This guide provides a systematic migration approach for Minikube workloads, covering export, cluster recreation, redeployment, and validation steps.

## Prerequisites

- Existing Minikube cluster with workloads using kindnet
- kubectl installed
- Minikube CLI v1.25+

## Step 1: Export All Workload Resources

```bash
kubectl get all --all-namespaces -o yaml > all-resources.yaml
kubectl get configmap --all-namespaces -o yaml > configmaps.yaml
kubectl get secret --all-namespaces -o yaml > secrets.yaml
kubectl get pvc --all-namespaces -o yaml > pvcs.yaml
kubectl get networkpolicy --all-namespaces -o yaml > network-policies.yaml
```

## Step 2: Export Persistent Volume Data (if applicable)

For stateful workloads, back up data from PersistentVolumes:

```bash
kubectl exec -n <namespace> <pod-name> -- tar czf - /data | \
  cat > data-backup.tar.gz
```

## Step 3: Delete the Existing Minikube Cluster

```bash
minikube stop
minikube delete
```

## Step 4: Create a New Minikube Cluster with Calico

```bash
minikube start --network-plugin=cni --cni=false --kubernetes-version=v1.28.0
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=calico-node \
  --timeout=120s
```

## Step 5: Redeploy Workloads

```bash
kubectl apply -f configmaps.yaml
kubectl apply -f secrets.yaml
kubectl apply -f all-resources.yaml
kubectl apply -f network-policies.yaml
```

## Step 6: Restore Persistent Volume Data

```bash
kubectl exec -n <namespace> <new-pod-name> -- tar xzf - /data < data-backup.tar.gz
```

## Step 7: Validate All Workloads

```bash
kubectl get pods --all-namespaces
kubectl get svc --all-namespaces
```

Test application-level functionality:

```bash
minikube service <service-name> --url
curl http://<service-url>/health
```

## Step 8: Test Network Policies on Calico

Verify that your network policies are now enforced:

```bash
kubectl exec -n policy-test unauthorized-pod -- wget --timeout=5 http://restricted-service
```

## Conclusion

You have migrated your Minikube workloads from the default CNI to Calico by exporting resources, recreating the cluster, and redeploying with Calico as the CNI. Your workloads now benefit from Calico's network policy enforcement capabilities in the local development environment.
