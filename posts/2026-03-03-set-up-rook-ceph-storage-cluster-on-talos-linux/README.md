# How to Set Up Rook-Ceph Storage Cluster on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Rook-Ceph, Kubernetes, Storage, Distributed Storage, Ceph

Description: Complete walkthrough for deploying a Rook-Ceph distributed storage cluster on Talos Linux with block, filesystem, and object storage.

---

Running stateful workloads on Kubernetes requires reliable persistent storage, and Rook-Ceph is one of the most mature solutions available. Rook deploys and manages Ceph clusters inside Kubernetes, giving you block storage, shared filesystems, and S3-compatible object storage all from the same system. On Talos Linux, setting up Rook-Ceph requires some specific configuration because of the operating system's immutable design, but once running, it provides enterprise-grade storage for your cluster.

This guide walks through the complete process of deploying Rook-Ceph on Talos Linux.

## Prerequisites

Before starting, you need:

- A Talos Linux cluster with at least 3 worker nodes (for proper Ceph replication)
- Each worker node should have at least one raw, unformatted disk dedicated to Ceph
- At least 4GB of RAM per node for Ceph OSD processes
- kubectl and Helm configured for your cluster

Verify your cluster is ready:

```bash
# Check node status

kubectl get nodes

# Verify the raw disks are available on worker nodes
talosctl get disks --nodes <worker-ip>
```

## Preparing Talos Linux for Rook-Ceph

Talos Linux works with Rook-Ceph without a special Rook-Ceph system extension for a basic host-storage cluster. The main Talos-specific preparation is allowing Rook's privileged Ceph pods in the namespace where the cluster runs.

Label the Rook namespace for privileged pod security enforcement:

```bash
kubectl create namespace rook-ceph
kubectl label namespace rook-ceph \
  pod-security.kubernetes.io/enforce=privileged \
  --overwrite
```

## Installing the Rook Operator

Deploy the Rook operator using Helm:

```bash
# Add the Rook and Ceph-CSI Helm repositories
helm repo add rook-release https://charts.rook.io/release
helm repo add ceph-csi-operator https://ceph.github.io/ceph-csi-operator
helm repo update

# Install the Rook operator
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace

# Install the Ceph-CSI drivers
helm install ceph-csi-drivers ceph-csi-operator/ceph-csi-drivers \
  --namespace rook-ceph

# Wait for the operator to be ready
kubectl -n rook-ceph rollout status deployment rook-ceph-operator
```

Verify the operator is running:

```bash
# Check operator pods
kubectl get pods -n rook-ceph

# You should see:
# rook-ceph-operator-xxxx    Running
```

## Creating the Ceph Cluster

Now create the CephCluster resource. This tells Rook how to configure Ceph on your Talos nodes:

```yaml
# ceph-cluster.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v20.2.1
    allowUnsupported: false
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 2
    allowMultiplePerNode: false
    modules:
      - name: pg_autoscaler
        enabled: true
      - name: rook
        enabled: true
  dashboard:
    enabled: true
    ssl: true
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
      - name: "sdb"  # Adjust to match your raw disk device names
    config:
      osdsPerDevice: "1"
  resources:
    mgr:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        memory: 1Gi
    mon:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        memory: 2Gi
    osd:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        memory: 4Gi
  placement:
    all:
      tolerations:
        - effect: NoSchedule
          key: storage-node
          operator: Exists
  network:
    provider: host
  healthCheck:
    daemonHealth:
      mon:
        interval: 45s
      osd:
        interval: 60s
    livenessProbe:
      mon:
        probe:
          initialDelaySeconds: 30
      mgr:
        probe:
          initialDelaySeconds: 30
      osd:
        probe:
          initialDelaySeconds: 30
```

Apply the cluster configuration:

```bash
# Create the Ceph cluster
kubectl apply -f ceph-cluster.yaml

# Watch the cluster come up (this takes several minutes)
kubectl -n rook-ceph get pods -w
```

## Monitoring Cluster Health

Check the health of your Ceph cluster:

```bash
# Use the Rook toolbox to run Ceph commands
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status

# Check OSD status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd status

# Check available storage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
```

If you do not have the toolbox deployed, create it:

```yaml
# toolbox.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rook-ceph-tools
  namespace: rook-ceph
  labels:
    app: rook-ceph-tools
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rook-ceph-tools
  template:
    metadata:
      labels:
        app: rook-ceph-tools
    spec:
      dnsPolicy: ClusterFirstWithHostNet
      serviceAccountName: rook-ceph-default
      containers:
        - name: rook-ceph-tools
          image: quay.io/ceph/ceph:v20.2.1
          command:
            - /bin/bash
            - -c
            - |
              CEPH_CONFIG="/etc/ceph/ceph.conf"
              MON_CONFIG="/etc/rook/mon-endpoints"
              KEYRING_FILE="/etc/ceph/keyring"
              CONFIG_OVERRIDE="/etc/rook-config-override/config"

              write_endpoints() {
                endpoints=$(cat ${MON_CONFIG})
                mon_endpoints=$(echo "${endpoints}" | sed 's/[a-z0-9_-]\+=//g')

                cat <<EOF > ${CEPH_CONFIG}
              [global]
              mon_host = ${mon_endpoints}

              [client.admin]
              keyring = ${KEYRING_FILE}
              EOF

                if [ -f "${CONFIG_OVERRIDE}" ] && [ -s "${CONFIG_OVERRIDE}" ]; then
                  echo "" >> ${CEPH_CONFIG}
                  cat ${CONFIG_OVERRIDE} >> ${CEPH_CONFIG}
                fi
              }

              ceph_secret=$(cat /var/lib/rook-ceph-mon/secret.keyring)

              cat <<EOF > ${KEYRING_FILE}
              [${ROOK_CEPH_USERNAME}]
              key = ${ceph_secret}
              EOF

              write_endpoints
              while true; do sleep 600; done
          imagePullPolicy: IfNotPresent
          tty: true
          securityContext:
            runAsNonRoot: true
            runAsUser: 2016
            runAsGroup: 2016
            capabilities:
              drop: ["ALL"]
          env:
            - name: ROOK_CEPH_USERNAME
              valueFrom:
                secretKeyRef:
                  name: rook-ceph-mon
                  key: ceph-username
          volumeMounts:
            - mountPath: /etc/ceph
              name: ceph-config
            - name: mon-endpoint-volume
              mountPath: /etc/rook
            - name: ceph-admin-secret
              mountPath: /var/lib/rook-ceph-mon
              readOnly: true
            - name: rook-config-override
              mountPath: /etc/rook-config-override
              readOnly: true
      volumes:
        - name: ceph-admin-secret
          secret:
            secretName: rook-ceph-mon
            optional: false
            items:
              - key: ceph-secret
                path: secret.keyring
        - name: mon-endpoint-volume
          configMap:
            name: rook-ceph-mon-endpoints
            items:
              - key: data
                path: mon-endpoints
        - name: rook-config-override
          configMap:
            name: rook-config-override
            optional: true
        - name: ceph-config
          emptyDir: {}
      tolerations:
        - key: "node.kubernetes.io/unreachable"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 5
```

## Creating a Storage Class

With the cluster running, create a block storage class:

```yaml
# block-storage-class.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-publish-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-publish-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
# Apply the storage class
kubectl apply -f block-storage-class.yaml
```

## Accessing the Ceph Dashboard

Rook deploys a Ceph dashboard that you can access through a port forward:

```bash
# Get the dashboard password
kubectl -n rook-ceph get secret rook-ceph-dashboard-password \
  -o jsonpath="{['data']['password']}" | base64 -d

# Port forward to the dashboard
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443

# Open https://localhost:8443 in your browser
# Username: admin, Password: from the command above
```

## Testing Storage

Create a test PVC to verify everything works:

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-ceph-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: ceph-block
```

```bash
# Create the test PVC
kubectl apply -f test-pvc.yaml

# Verify it is bound
kubectl get pvc test-ceph-pvc

# Clean up
kubectl delete pvc test-ceph-pvc
```

## Summary

Setting up Rook-Ceph on Talos Linux requires preparing the namespace for privileged Ceph pods, deploying the Rook operator and Ceph-CSI drivers, and then creating the CephCluster resource. Once running, you get a fully distributed storage system that can provide block, filesystem, and object storage, with the block storage class in this guide ready for Kubernetes PersistentVolumeClaims. The initial setup takes some effort, but the result is a production-grade storage layer that scales with your cluster and handles node failures gracefully.
