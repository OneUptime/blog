# How to Deploy SQL Server on Windows Containers with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, SQL Server, GitOps, Databases, StatefulSet

Description: Deploy SQL Server in Windows containers to Kubernetes using Flux CD, with persistent storage, secrets management, and backup configuration.

---

## Introduction

While SQL Server now has a Linux container image, many organizations continue to run SQL Server on Windows containers for compatibility with Windows-only features (SQL Server Agent, certain CLR integrations, linked servers to other Windows systems) or for consistency with their existing Windows SQL Server infrastructure. Running SQL Server in a Windows container on Kubernetes provides the same container lifecycle management as other workloads, with Flux CD ensuring the configuration is always as defined in Git.

Deploying SQL Server on Windows containers presents unique challenges: it is a stateful workload requiring persistent storage, it has high memory requirements, it needs careful secret management for SA passwords, and its startup time is even longer than typical Windows applications. This guide addresses all of these challenges within a Flux-managed GitOps workflow.

## Prerequisites

- Kubernetes cluster with Windows Server 2022 nodes (SQL Server 2022 requires Windows Server 2022)
- At least 4GB RAM and 2 CPUs available on Windows nodes for SQL Server
- Persistent storage provisioner supporting ReadWriteOnce access mode
- Flux CD with Sealed Secrets or ESO for secrets management
- `kubectl` and `flux` CLI tools

## Step 1: Create the Namespace and RBAC

```yaml
# infrastructure/windows/sql-server/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sql-server-windows
  labels:
    os: windows
    tier: data
```

## Step 2: SQL Server StatefulSet

SQL Server requires a StatefulSet (not a Deployment) for stable network identity and persistent storage.

```yaml
# apps/base/windows-workloads/sql-server/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: sql-server-windows
  namespace: sql-server-windows
spec:
  serviceName: sql-server-windows
  replicas: 1  # SQL Server standalone; for HA use Always On Availability Groups
  selector:
    matchLabels:
      app: sql-server-windows
  template:
    metadata:
      labels:
        app: sql-server-windows
        os: windows
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"  # Windows Server 2022

      tolerations:
        - key: os
          value: windows
          operator: Equal
          effect: NoSchedule

      # SQL Server requires significant startup time
      terminationGracePeriodSeconds: 300

      containers:
        - name: sql-server
          image: mcr.microsoft.com/mssql/server:2022-latest
          # Note: Use the Windows-specific image tag if using Windows containers
          # mcr.microsoft.com/mssql/server:2022-CU12-windows-ltsc2022
          imagePullPolicy: IfNotPresent

          ports:
            - containerPort: 1433
              name: sql

          env:
            - name: ACCEPT_EULA
              value: "Y"
            - name: MSSQL_PID
              value: "Developer"  # Use "Standard" or "Enterprise" for production
            - name: SA_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: sql-server-sa-password
                  key: password
            - name: MSSQL_DATA_DIR
              value: "C:\\SQLData"
            - name: MSSQL_LOG_DIR
              value: "C:\\SQLLog"
            - name: MSSQL_BACKUP_DIR
              value: "C:\\SQLBackup"

          resources:
            requests:
              cpu: 1000m
              memory: 2Gi
            limits:
              cpu: 4000m
              memory: 8Gi

          volumeMounts:
            - name: sql-data
              mountPath: C:\SQLData
            - name: sql-log
              mountPath: C:\SQLLog
            - name: sql-backup
              mountPath: C:\SQLBackup

          readinessProbe:
            exec:
              command:
                - sqlcmd
                - -S
                - localhost
                - -Q
                - "SELECT 1"
                - -U
                - sa
                - -P
                - "$(SA_PASSWORD)"
            # SQL Server takes 2-5 minutes to initialize databases
            initialDelaySeconds: 180
            periodSeconds: 30
            timeoutSeconds: 15
            failureThreshold: 10

          livenessProbe:
            exec:
              command:
                - sqlcmd
                - -S
                - localhost
                - -Q
                - "SELECT 1"
                - -U
                - sa
                - -P
                - "$(SA_PASSWORD)"
            initialDelaySeconds: 300
            periodSeconds: 60
            timeoutSeconds: 15
            failureThreshold: 3

  volumeClaimTemplates:
    - metadata:
        name: sql-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: managed-premium  # Use fast SSD storage for SQL data
        resources:
          requests:
            storage: 100Gi
    - metadata:
        name: sql-log
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: managed-premium
        resources:
          requests:
            storage: 50Gi
    - metadata:
        name: sql-backup
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: managed-standard  # Slower storage is fine for backups
        resources:
          requests:
            storage: 200Gi
```

## Step 3: Manage SA Password with Sealed Secrets

```bash
# Create and seal the SA password
kubectl create secret generic sql-server-sa-password \
  --from-literal=password="$SQL_SA_PASSWORD" \
  --dry-run=client -o yaml | \
  kubeseal \
    --namespace sql-server-windows \
    --controller-namespace kube-system \
    --format yaml > \
  apps/base/windows-workloads/sql-server/sa-password-sealed.yaml

git add apps/base/windows-workloads/sql-server/sa-password-sealed.yaml
git commit -m "security: add sealed SA password for Windows SQL Server"
git push
```

## Step 4: Configure SQL Server Service

```yaml
# apps/base/windows-workloads/sql-server/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: sql-server-windows
  namespace: sql-server-windows
spec:
  selector:
    app: sql-server-windows
  ports:
    - port: 1433
      targetPort: 1433
      protocol: TCP
  type: ClusterIP  # Internal only; use LoadBalancer with IP whitelist if external access needed
---
# Headless service for StatefulSet stable DNS
apiVersion: v1
kind: Service
metadata:
  name: sql-server-windows-headless
  namespace: sql-server-windows
spec:
  clusterIP: None
  selector:
    app: sql-server-windows
  ports:
    - port: 1433
```

## Step 5: Flux Kustomization for SQL Server

```yaml
# clusters/production/sql-server-windows.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: sql-server-windows
  namespace: flux-system
spec:
  interval: 10m
  timeout: 30m     # SQL Server initialization takes considerable time
  path: ./apps/base/windows-workloads/sql-server
  prune: false     # Never auto-delete SQL Server - require manual action
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: sql-server-windows
      namespace: sql-server-windows
```

Note `prune: false` — never let Flux automatically delete a SQL Server StatefulSet.

## Step 6: Configure Automated Backups

```yaml
# SQL Server backup CronJob running on Windows
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sql-server-backup
  namespace: sql-server-windows
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            kubernetes.io/os: windows
          tolerations:
            - key: os
              value: windows
              operator: Equal
              effect: NoSchedule
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: mcr.microsoft.com/mssql/server:2022-latest
              env:
                - name: SA_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: sql-server-sa-password
                      key: password
              command:
                - powershell
                - -Command
                - |
                  $date = Get-Date -Format "yyyyMMdd-HHmmss"
                  sqlcmd -S sql-server-windows.sql-server-windows.svc.cluster.local `
                    -U sa -P $env:SA_PASSWORD `
                    -Q "BACKUP DATABASE [ProductionDB] TO DISK = 'C:\SQLBackup\ProductionDB-$date.bak' WITH COMPRESSION, STATS = 10"
              volumeMounts:
                - name: sql-backup
                  mountPath: C:\SQLBackup
```

## Best Practices

- Use `prune: false` on SQL Server Kustomizations to prevent accidental data loss from Flux pruning.
- Always use `volumeClaimTemplates` in the StatefulSet for persistent data, log, and backup volumes.
- Use fast SSD storage (Premium or NVMe) for SQL data and log volumes — SQL Server is I/O intensive.
- Never store SA passwords in ConfigMaps — use Sealed Secrets or External Secrets Operator.
- Set `initialDelaySeconds` to at least 180 seconds for SQL Server readiness probes.
- Implement automated daily backups using a CronJob and copy backups to object storage for durability.

## Conclusion

SQL Server on Windows containers in Kubernetes, managed by Flux CD, gives you the operational benefits of Kubernetes — declarative configuration, rolling updates, health monitoring — for your Windows SQL Server workloads. The StatefulSet provides stable storage and network identity, while Flux ensures the configuration is always as defined in Git. The most critical consideration is setting `prune: false` to protect your data from accidental deletion, and using Sealed Secrets for the SA password.
