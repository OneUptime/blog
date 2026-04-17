# How to Deploy ClickHouse on Google Kubernetes Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Google Cloud, GKE, Kubernetes, Deployment

Description: Deploy ClickHouse on Google Kubernetes Engine using the ClickHouse Operator, Workload Identity for GCS access, and node pools optimized for analytics workloads.

---

Google Kubernetes Engine (GKE) offers a managed Kubernetes environment with tight integration with other Google Cloud services. Deploying ClickHouse on GKE enables you to leverage Workload Identity, Cloud Storage, and autoscaling.

## Creating a Dedicated Node Pool

Create a node pool optimized for ClickHouse with SSD persistent disks and high memory:

```bash
gcloud container node-pools create clickhouse-pool \
  --cluster=my-cluster \
  --machine-type=n2-highmem-16 \
  --num-nodes=3 \
  --zone=us-central1-a \
  --node-labels=workload=clickhouse \
  --node-taints=workload=clickhouse:NoSchedule \
  --disk-type=pd-ssd \
  --disk-size=200GB
```

## Installing the ClickHouse Operator

The Altinity ClickHouse Operator simplifies management on Kubernetes:

```bash
kubectl apply -f https://raw.githubusercontent.com/Altinity/clickhouse-operator/master/deploy/operator/clickhouse-operator-install-bundle.yaml
```

## Deploying with ClickHouseInstallation CRD

```yaml
apiVersion: clickhouse.altinity.com/v1
kind: ClickHouseInstallation
metadata:
  name: clickhouse-gke
  namespace: clickhouse
spec:
  configuration:
    clusters:
      - name: cluster1
        layout:
          shardsCount: 2
          replicasCount: 2
  templates:
    podTemplates:
      - name: clickhouse-pod
        spec:
          nodeSelector:
            workload: clickhouse
          tolerations:
            - key: workload
              operator: Equal
              value: clickhouse
              effect: NoSchedule
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:24.3
              resources:
                requests:
                  memory: "16Gi"
                  cpu: "4"
                limits:
                  memory: "32Gi"
                  cpu: "16"
    volumeClaimTemplates:
      - name: clickhouse-storage
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 500Gi
          storageClassName: premium-rwo
```

## Workload Identity for GCS Access

Configure Workload Identity to allow ClickHouse pods to access GCS without service account keys:

```bash
# Create a Kubernetes service account
kubectl create serviceaccount clickhouse-sa -n clickhouse

# Bind to a Google Cloud service account
gcloud iam service-accounts add-iam-policy-binding \
  clickhouse-backup@my-project.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:my-project.svc.id.goog[clickhouse/clickhouse-sa]"

kubectl annotate serviceaccount clickhouse-sa \
  iam.gke.io/gcp-service-account=clickhouse-backup@my-project.iam.gserviceaccount.com \
  -n clickhouse
```

## Storage Class for ClickHouse

Use `premium-rwo` for ClickHouse data volumes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: premium-rwo
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

Using `Retain` ensures PVs are not deleted when pods are removed.

## Cluster Autoscaler

Enable cluster autoscaler on the ClickHouse node pool to scale out during load spikes:

```bash
gcloud container clusters update my-cluster \
  --enable-autoscaling \
  --node-pool=clickhouse-pool \
  --min-nodes=2 \
  --max-nodes=6 \
  --zone=us-central1-a
```

## Summary

Deploying ClickHouse on GKE combines the ClickHouse Operator for lifecycle management, dedicated node pools with taints for workload isolation, Workload Identity for secure GCS access, and the `premium-rwo` storage class backed by pd-ssd volumes. This setup provides a production-grade, auto-scalable ClickHouse cluster on Google Cloud.
