# How to Deploy MySQL Operator on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, Operator, Automation, StatefulSet

Description: Deploy the MySQL Operator for Kubernetes to automate InnoDB Cluster lifecycle management including provisioning, backups, and failover.

---

The MySQL Operator for Kubernetes is an official Oracle tool that automates the deployment and management of MySQL InnoDB Clusters. It handles provisioning, scaling, backup scheduling, and failover without manual intervention, reducing operational complexity significantly.

## Prerequisites

Before installing the operator, ensure you have:
- A running Kubernetes cluster (1.21 or later)
- kubectl configured
- Helm 3 installed
- A StorageClass that supports ReadWriteOnce

## Installing the MySQL Operator Using Helm

The MySQL Operator is available via the official Helm repository:

```bash
helm repo add mysql-operator https://mysql.github.io/mysql-operator/
helm repo update

# Install the operator in its own namespace
helm install mysql-operator mysql-operator/mysql-operator \
  --namespace mysql-operator \
  --create-namespace
```

Verify the operator pod is running:

```bash
kubectl get pods -n mysql-operator
kubectl get crd | grep mysql
```

You should see CRDs including `innodbclusters.mysql.oracle.com` and `mysqlbackups.mysql.oracle.com`.

## Creating a MySQL Root Secret

Before deploying a cluster, create a Kubernetes secret with the root credentials:

```bash
kubectl create secret generic mysql-root-credentials \
  --from-literal=rootUser=root \
  --from-literal=rootHost=% \
  --from-literal=rootPassword=SuperSecretPassword1!
```

## Deploying a MySQL InnoDB Cluster

Create an `InnoDBCluster` custom resource to provision a three-member cluster:

```yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: mycluster
  namespace: default
spec:
  secretName: mysql-root-credentials
  tlsUseSelfSigned: true
  instances: 3
  router:
    instances: 2
  datadirVolumeClaimTemplate:
    accessModes:
    - ReadWriteOnce
    resources:
      requests:
        storage: 20Gi
  version: "8.4.0"
```

Apply the manifest:

```bash
kubectl apply -f innodbcluster.yaml
kubectl get innodbcluster
kubectl describe innodbcluster mycluster
```

Watch the cluster come online:

```bash
kubectl get pods -w
```

## Connecting to the Cluster

The operator creates a Service for read/write access through the MySQL Router:

```bash
kubectl get svc mycluster

# Connect via the router service
kubectl run -it --rm mysql-client \
  --image=mysql:8.0 \
  --restart=Never \
  -- mysql -h mycluster -uroot -pSuperSecretPassword1!
```

## Checking Cluster Status

Use MySQL Shell to inspect cluster health:

```bash
kubectl exec -it mycluster-0 -- mysqlsh --uri root@mycluster --password=SuperSecretPassword1! \
  -- cluster status
```

The output shows each member's role (PRIMARY or SECONDARY), replication lag, and connectivity status.

## Scheduling Automated Backups

The operator supports scheduled backups by adding `backupProfiles` and `backupSchedules` to the `InnoDBCluster` resource:

```yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: mycluster
spec:
  secretName: mysql-root-credentials
  tlsUseSelfSigned: true
  instances: 3
  router:
    instances: 2
  datadirVolumeClaimTemplate:
    accessModes:
    - ReadWriteOnce
    resources:
      requests:
        storage: 20Gi
  version: "8.4.0"
  backupProfiles:
    - name: s3-backup
      dumpInstance:
        storage:
          s3:
            bucketName: my-mysql-backups
            config: s3-credentials
            endpoint: https://s3.amazonaws.com
            prefix: /backups
  backupSchedules:
    - name: daily-backup
      schedule: "0 2 * * *"
      backupProfileName: s3-backup
      enabled: true
```

## Summary

The MySQL Operator for Kubernetes reduces the complexity of running production MySQL by automating cluster provisioning, failover, and backup scheduling. After installing the operator via Helm and creating an `InnoDBCluster` custom resource, the operator manages the full lifecycle including StatefulSets, Services, and MySQL Router configuration. Use `kubectl get innodbcluster` and MySQL Shell to monitor cluster health and member status.
