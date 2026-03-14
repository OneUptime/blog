# How to Run etcd Standalone Cluster on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Etcd, Kubernetes, Distributed Systems, Key-Value Store, DevOps

Description: Deploy a standalone etcd cluster on Talos Linux for application-level key-value storage separate from the Kubernetes control plane etcd.

---

etcd is a distributed, reliable key-value store that serves as the backbone of Kubernetes itself. While Talos Linux already runs etcd as part of the control plane, there are many scenarios where you need a separate, standalone etcd cluster for your applications. Service discovery, distributed configuration, leader election, and distributed locking are common use cases where a dedicated etcd cluster makes sense.

This guide shows how to deploy a standalone etcd cluster on Talos Linux that is completely separate from the Kubernetes control plane etcd.

## Why a Separate etcd Cluster

The etcd instance running as part of the Kubernetes control plane should never be used directly by applications. It holds critical cluster state, and application workloads could interfere with Kubernetes operations. A standalone etcd cluster gives your applications their own key-value store with independent scaling, backup, and security policies.

## Prerequisites

- Talos Linux cluster with at least three worker nodes
- `kubectl` and `talosctl` configured
- Familiarity with etcd concepts (quorum, leader election)
- A StorageClass available

## Step 1: Create Namespace and Certificates

etcd requires TLS for secure communication. We will use cert-manager:

```yaml
# etcd-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: etcd-standalone
```

```yaml
# etcd-certs.yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: etcd-ca-issuer
  namespace: etcd-standalone
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: etcd-ca
  namespace: etcd-standalone
spec:
  isCA: true
  commonName: etcd-ca
  secretName: etcd-ca-secret
  issuerRef:
    name: etcd-ca-issuer
    kind: Issuer
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: etcd-issuer
  namespace: etcd-standalone
spec:
  ca:
    secretName: etcd-ca-secret
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: etcd-peer-cert
  namespace: etcd-standalone
spec:
  secretName: etcd-peer-tls
  issuerRef:
    name: etcd-issuer
    kind: Issuer
  commonName: etcd
  dnsNames:
    - "*.etcd-headless.etcd-standalone.svc.cluster.local"
    - "*.etcd-headless.etcd-standalone.svc"
    - localhost
  ipAddresses:
    - "127.0.0.1"
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: etcd-server-cert
  namespace: etcd-standalone
spec:
  secretName: etcd-server-tls
  issuerRef:
    name: etcd-issuer
    kind: Issuer
  commonName: etcd
  dnsNames:
    - "*.etcd-headless.etcd-standalone.svc.cluster.local"
    - "etcd-client.etcd-standalone.svc.cluster.local"
    - localhost
  ipAddresses:
    - "127.0.0.1"
```

```bash
kubectl apply -f etcd-namespace.yaml
kubectl apply -f etcd-certs.yaml
```

## Step 2: Deploy etcd StatefulSet

```yaml
# etcd-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: etcd
  namespace: etcd-standalone
spec:
  serviceName: etcd-headless
  replicas: 3
  selector:
    matchLabels:
      app: etcd
  template:
    metadata:
      labels:
        app: etcd
    spec:
      containers:
        - name: etcd
          image: quay.io/coreos/etcd:v3.5.12
          ports:
            - containerPort: 2379
              name: client
            - containerPort: 2380
              name: peer
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: CLUSTER_SIZE
              value: "3"
          command:
            - /bin/sh
            - -c
            - |
              # Build the initial cluster string
              PEERS=""
              for i in $(seq 0 $((${CLUSTER_SIZE} - 1))); do
                if [ -n "$PEERS" ]; then
                  PEERS="${PEERS},"
                fi
                PEERS="${PEERS}etcd-${i}=https://etcd-${i}.etcd-headless.etcd-standalone.svc.cluster.local:2380"
              done

              exec etcd \
                --name=${POD_NAME} \
                --data-dir=/var/lib/etcd/data \
                --listen-peer-urls=https://0.0.0.0:2380 \
                --listen-client-urls=https://0.0.0.0:2379 \
                --advertise-client-urls=https://${POD_NAME}.etcd-headless.etcd-standalone.svc.cluster.local:2379 \
                --initial-advertise-peer-urls=https://${POD_NAME}.etcd-headless.etcd-standalone.svc.cluster.local:2380 \
                --initial-cluster=${PEERS} \
                --initial-cluster-token=etcd-cluster-talos \
                --initial-cluster-state=new \
                --peer-cert-file=/etc/etcd/peer/tls.crt \
                --peer-key-file=/etc/etcd/peer/tls.key \
                --peer-trusted-ca-file=/etc/etcd/peer/ca.crt \
                --cert-file=/etc/etcd/server/tls.crt \
                --key-file=/etc/etcd/server/tls.key \
                --trusted-ca-file=/etc/etcd/server/ca.crt \
                --client-cert-auth=true \
                --peer-client-cert-auth=true \
                --auto-compaction-retention=1 \
                --quota-backend-bytes=8589934592
          volumeMounts:
            - name: etcd-data
              mountPath: /var/lib/etcd
            - name: etcd-peer-tls
              mountPath: /etc/etcd/peer
              readOnly: true
            - name: etcd-server-tls
              mountPath: /etc/etcd/server
              readOnly: true
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          livenessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - |
                  etcdctl endpoint health \
                    --endpoints=https://localhost:2379 \
                    --cacert=/etc/etcd/server/ca.crt \
                    --cert=/etc/etcd/server/tls.crt \
                    --key=/etc/etcd/server/tls.key
            initialDelaySeconds: 15
            periodSeconds: 10
      volumes:
        - name: etcd-peer-tls
          secret:
            secretName: etcd-peer-tls
        - name: etcd-server-tls
          secret:
            secretName: etcd-server-tls
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - etcd
              topologyKey: kubernetes.io/hostname
  volumeClaimTemplates:
    - metadata:
        name: etcd-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 20Gi
```

## Step 3: Create Services

```yaml
# etcd-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: etcd-headless
  namespace: etcd-standalone
spec:
  selector:
    app: etcd
  ports:
    - port: 2379
      name: client
    - port: 2380
      name: peer
  clusterIP: None
---
apiVersion: v1
kind: Service
metadata:
  name: etcd-client
  namespace: etcd-standalone
spec:
  selector:
    app: etcd
  ports:
    - port: 2379
      targetPort: 2379
      name: client
  type: ClusterIP
```

```bash
kubectl apply -f etcd-statefulset.yaml
kubectl apply -f etcd-services.yaml
```

## Step 4: Verify the Cluster

```bash
# Check if all members are healthy
kubectl exec -it etcd-0 -n etcd-standalone -- etcdctl \
  --endpoints=https://localhost:2379 \
  --cacert=/etc/etcd/server/ca.crt \
  --cert=/etc/etcd/server/tls.crt \
  --key=/etc/etcd/server/tls.key \
  member list -w table

# Check endpoint health
kubectl exec -it etcd-0 -n etcd-standalone -- etcdctl \
  --endpoints=https://etcd-0.etcd-headless:2379,https://etcd-1.etcd-headless:2379,https://etcd-2.etcd-headless:2379 \
  --cacert=/etc/etcd/server/ca.crt \
  --cert=/etc/etcd/server/tls.crt \
  --key=/etc/etcd/server/tls.key \
  endpoint health -w table
```

## Step 5: Basic Operations

```bash
# Put a key
kubectl exec -it etcd-0 -n etcd-standalone -- etcdctl \
  --endpoints=https://localhost:2379 \
  --cacert=/etc/etcd/server/ca.crt \
  --cert=/etc/etcd/server/tls.crt \
  --key=/etc/etcd/server/tls.key \
  put /config/database/host "postgres.default.svc"

# Get a key
kubectl exec -it etcd-0 -n etcd-standalone -- etcdctl \
  --endpoints=https://localhost:2379 \
  --cacert=/etc/etcd/server/ca.crt \
  --cert=/etc/etcd/server/tls.crt \
  --key=/etc/etcd/server/tls.key \
  get /config/database/host

# List all keys with a prefix
kubectl exec -it etcd-0 -n etcd-standalone -- etcdctl \
  --endpoints=https://localhost:2379 \
  --cacert=/etc/etcd/server/ca.crt \
  --cert=/etc/etcd/server/tls.crt \
  --key=/etc/etcd/server/tls.key \
  get /config --prefix
```

## Backup and Restore

Regular snapshots are critical for etcd:

```yaml
# etcd-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: etcd-standalone
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: quay.io/coreos/etcd:v3.5.12
              command:
                - /bin/sh
                - -c
                - |
                  etcdctl snapshot save /backups/snapshot-$(date +%Y%m%d-%H%M).db \
                    --endpoints=https://etcd-0.etcd-headless.etcd-standalone.svc:2379 \
                    --cacert=/etc/etcd/server/ca.crt \
                    --cert=/etc/etcd/server/tls.crt \
                    --key=/etc/etcd/server/tls.key
                  # Keep only last 7 days of snapshots
                  find /backups -name "*.db" -mtime +7 -delete
              volumeMounts:
                - name: etcd-server-tls
                  mountPath: /etc/etcd/server
                  readOnly: true
                - name: backup-volume
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: etcd-server-tls
              secret:
                secretName: etcd-server-tls
            - name: backup-volume
              persistentVolumeClaim:
                claimName: etcd-backup-pvc
```

## Monitoring etcd

etcd exposes metrics on port 2379 at the `/metrics` endpoint. Create a ServiceMonitor if you are running Prometheus Operator:

```yaml
# etcd-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: etcd-monitor
  namespace: etcd-standalone
spec:
  selector:
    matchLabels:
      app: etcd
  endpoints:
    - port: client
      interval: 15s
      scheme: https
      tlsConfig:
        caFile: /etc/prometheus/secrets/etcd-ca/ca.crt
        certFile: /etc/prometheus/secrets/etcd-cert/tls.crt
        keyFile: /etc/prometheus/secrets/etcd-cert/tls.key
```

Key metrics to watch include `etcd_server_leader_changes_seen_total`, `etcd_disk_wal_fsync_duration_seconds`, and `etcd_network_peer_round_trip_time_seconds`.

## Conclusion

Running a standalone etcd cluster on Talos Linux is straightforward once you handle TLS certificate management properly. The main considerations are maintaining an odd number of replicas for quorum (3 or 5), using anti-affinity to spread nodes across hosts, backing up snapshots regularly, and monitoring leader election stability. This dedicated etcd cluster can serve as a reliable foundation for service discovery, configuration management, and distributed coordination in your applications running on Talos Linux.
