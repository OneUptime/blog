# How to Migrate Workloads Between Rancher Clusters - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Migration, Kubernetes, Workload, GitOps, Velero

Description: Migrate Kubernetes workloads between Rancher-managed clusters using Velero for stateful applications, GitOps for stateless workloads, and Rancher's built-in multi-cluster management features.

## Introduction

Migrating workloads between clusters is necessary when upgrading Kubernetes versions, rebalancing cluster load, moving to new infrastructure, or recovering from cluster failures. Rancher simplifies cross-cluster migration through centralized management, but the right approach depends on whether workloads are stateless (use GitOps) or stateful (use Velero backup/restore).

## Migration Approaches

| Workload Type | Recommended Approach |
|---|---|
| Stateless (no PVCs) | GitOps re-deploy, Helm re-install |
| Stateful (with PVCs) | Velero backup/restore |
| Databases | Database-specific backup tools |
| Complete namespace | Velero namespace migration |

## Step 1: Prepare Target Cluster

```bash
# Ensure target cluster has necessary storage classes

kubectl get storageclasses --context target-cluster

# Create namespaces that will receive migrated workloads
kubectl create namespace production --context target-cluster
kubectl create namespace staging --context target-cluster

# Verify node capacity in target cluster
kubectl describe nodes --context target-cluster | grep -A5 "Allocated resources"
```

## Step 2: Migrate Stateless Workloads via GitOps

For workloads already managed by Fleet or ArgoCD, simply target the new cluster:

```yaml
# Update Fleet GitRepo to target new cluster
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: myapp
  namespace: fleet-default
spec:
  repo: https://github.com/myorg/myapp-config.git
  branch: main
  targets:
    # Add new cluster target
    - name: new-cluster
      clusterSelector:
        matchLabels:
          env: production
          cluster: new-prod
    # Remove old cluster target after validation
    # - name: old-cluster
    #   clusterSelector:
    #     matchLabels:
    #       cluster: old-prod
```

## Step 3: Migrate Stateful Workloads with Velero

```bash
# Install Velero on both clusters
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.backupStorageLocation[0].name=default \
  --set configuration.backupStorageLocation[0].provider=aws \
  --set configuration.backupStorageLocation[0].bucket=my-velero-bucket \
  --set configuration.backupStorageLocation[0].config.region=us-east-1 \
  --set initContainers[0].name=velero-plugin-for-aws \
  --set initContainers[0].image=velero/velero-plugin-for-aws:v1.14.1 \
  --set initContainers[0].volumeMounts[0].mountPath=/target \
  --set initContainers[0].volumeMounts[0].name=plugins

# Create backup of source namespace
velero backup create production-migration \
  --include-namespaces production \
  --wait

# Verify backup completed
velero backup describe production-migration --details

# On target cluster, restore from backup
velero restore create --from-backup production-migration \
  --include-namespaces production \
  --wait
```

## Step 4: Migrate Persistent Volumes

For PVCs that can't be migrated via Velero (e.g., local storage):

```bash
# Export PVC data using a job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: pvc-export
  namespace: production
spec:
  template:
    spec:
      containers:
        - name: export
          image: alpine
          command: ["tar", "czf", "/backup/data.tar.gz", "/data"]
          volumeMounts:
            - name: source-data
              mountPath: /data
            - name: backup-volume
              mountPath: /backup
      volumes:
        - name: source-data
          persistentVolumeClaim:
            claimName: app-data
        - name: backup-volume
          persistentVolumeClaim:
            claimName: backup-pvc
      restartPolicy: Never
EOF
```

## Step 5: Validate Migration

```bash
# Check all pods are running on target cluster
kubectl get pods -n production --context target-cluster

# Verify persistent data is accessible
kubectl exec -it app-pod -n production --context target-cluster \
  -- ls /data

# Run application health checks
kubectl run health-check \
  --image=curlimages/curl \
  --rm -it \
  -- curl http://myapp.production.svc.cluster.local/health

# Compare resource counts between clusters
echo "Source cluster resources:"
kubectl get all -n production --context source-cluster | wc -l

echo "Target cluster resources:"
kubectl get all -n production --context target-cluster | wc -l
```

## Step 6: Update DNS and Ingress

```bash
# Update external DNS records to point to new cluster's load balancer
NEW_LB_IP=$(kubectl get svc ingress-nginx-controller \
  -n ingress-nginx \
  --context target-cluster \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Update DNS A record for app.company.com to: $NEW_LB_IP"

# Or update in Rancher UI: Global DNS section
```

## Conclusion

Workload migration between Rancher clusters is most reliable when workloads are already managed as code (GitOps, Helm charts). For stateful workloads, Velero provides a reliable backup-and-restore mechanism. Always validate the migration on the target cluster before decommissioning the source, and use a phased approach with DNS-based traffic shifting for zero-downtime migrations.
