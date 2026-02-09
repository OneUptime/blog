# How to Migrate VM-Based Applications to Kubernetes Using KubeVirt for Hybrid Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, VMs

Description: Learn how to migrate traditional VM-based applications to Kubernetes using KubeVirt, enabling hybrid workloads that run containers and virtual machines side by side.

---

Not all applications can be immediately containerized. Legacy systems, applications requiring specific kernel modules, or workloads with strict compliance requirements may need to run as virtual machines. KubeVirt extends Kubernetes to manage VMs alongside containers, providing a migration path for VM-based applications. This guide shows you how to use KubeVirt to migrate VMs to Kubernetes while maintaining compatibility.

## Installing KubeVirt on Your Cluster

Deploy KubeVirt operators and custom resource definitions to enable VM management.

```bash
#!/bin/bash
# Install KubeVirt

KUBEVIRT_VERSION="v1.1.1"

# Check if nodes support hardware virtualization
kubectl get nodes -o json | jq '.items[].status.capacity' | grep -i "devices.kubevirt.io/kvm"

# Install KubeVirt operator
kubectl create -f https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/kubevirt-operator.yaml

# Create KubeVirt CR to deploy components
kubectl create -f https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/kubevirt-cr.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=600s deployment/virt-operator -n kubevirt

# Install virtctl CLI tool
ARCH=$(uname -m)
if [[ $ARCH == "x86_64" ]]; then
  ARCH="amd64"
fi
curl -L -o virtctl https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/virtctl-${KUBEVIRT_VERSION}-linux-${ARCH}
chmod +x virtctl
sudo mv virtctl /usr/local/bin/

echo "KubeVirt installation complete"
virtctl version
```

KubeVirt requires nodes with hardware virtualization support (Intel VT-x or AMD-V).

## Creating Your First Virtual Machine

Define VMs using Kubernetes custom resources.

```yaml
# simple-vm.yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: ubuntu-vm
  namespace: default
spec:
  running: true
  template:
    metadata:
      labels:
        kubevirt.io/vm: ubuntu-vm
    spec:
      domain:
        devices:
          disks:
          - name: containerdisk
            disk:
              bus: virtio
          - name: cloudinitdisk
            disk:
              bus: virtio
          interfaces:
          - name: default
            masquerade: {}
        resources:
          requests:
            memory: 2Gi
            cpu: "2"
          limits:
            memory: 4Gi
            cpu: "4"
      networks:
      - name: default
        pod: {}
      volumes:
      - name: containerdisk
        containerDisk:
          image: quay.io/kubevirt/ubuntu-container-disk:latest
      - name: cloudinitdisk
        cloudInitNoCloud:
          userData: |
            #cloud-config
            password: ubuntu
            chpasswd: { expire: False }
            ssh_pwauth: True
            packages:
              - qemu-guest-agent
            runcmd:
              - systemctl enable qemu-guest-agent
              - systemctl start qemu-guest-agent
```

This VM specification uses a pre-built container disk image with Ubuntu.

## Migrating Existing VMs to KubeVirt

Convert existing QCOW2 or VMDK disk images to KubeVirt volumes.

```bash
#!/bin/bash
# migrate-vm-to-kubevirt.sh

VM_NAME="legacy-app"
DISK_IMAGE="legacy-app.qcow2"
NAMESPACE="production"

# Install CDI (Containerized Data Importer) for disk management
CDI_VERSION="v1.58.0"
kubectl create -f https://github.com/kubevirt/containerized-data-importer/releases/download/${CDI_VERSION}/cdi-operator.yaml
kubectl create -f https://github.com/kubevirt/containerized-data-importer/releases/download/${CDI_VERSION}/cdi-cr.yaml

# Wait for CDI to be ready
kubectl wait --for=condition=available --timeout=600s deployment/cdi-operator -n cdi

# Create PVC for VM disk
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${VM_NAME}-disk
  namespace: ${NAMESPACE}
  annotations:
    cdi.kubevirt.io/storage.import.endpoint: "http://file-server/${DISK_IMAGE}"
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: standard
EOF

# Wait for import to complete
kubectl wait --for=condition=ready --timeout=3600s pvc/${VM_NAME}-disk -n ${NAMESPACE}

# Alternative: Upload disk directly
virtctl image-upload pvc ${VM_NAME}-disk \
  --image-path=${DISK_IMAGE} \
  --size=50Gi \
  --namespace=${NAMESPACE} \
  --insecure

echo "Disk import complete"
```

This process imports existing VM disks into Kubernetes persistent volumes.

## Defining Production VM Workloads

Create production-ready VM specifications with proper resource allocation and networking.

```yaml
# production-vm.yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: legacy-app-vm
  namespace: production
  labels:
    app: legacy-app
    tier: backend
spec:
  running: true
  dataVolumeTemplates:
  - metadata:
      name: legacy-app-disk
    spec:
      pvc:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd
      source:
        pvc:
          name: legacy-app-disk
          namespace: production
  template:
    metadata:
      labels:
        kubevirt.io/vm: legacy-app-vm
        app: legacy-app
    spec:
      domain:
        cpu:
          cores: 4
          sockets: 1
          threads: 2
        resources:
          requests:
            memory: 8Gi
            cpu: "4"
          limits:
            memory: 16Gi
            cpu: "8"
        devices:
          disks:
          - name: datavolumedisk
            disk:
              bus: virtio
          - name: cloudinitdisk
            disk:
              bus: virtio
          interfaces:
          - name: default
            bridge: {}
            ports:
            - name: http
              port: 8080
              protocol: TCP
          networkInterfaceMultiqueue: true
        features:
          acpi: {}
          apic: {}
          hyperv:
            relaxed: {}
            vapic: {}
            spinlocks:
              spinlocks: 8191
      networks:
      - name: default
        multus:
          networkName: vm-network
      volumes:
      - name: datavolumedisk
        dataVolume:
          name: legacy-app-disk
      - name: cloudinitdisk
        cloudInitNoCloud:
          userData: |
            #cloud-config
            hostname: legacy-app
            manage_etc_hosts: true
            users:
              - name: admin
                sudo: ALL=(ALL) NOPASSWD:ALL
                groups: users, admin
                shell: /bin/bash
                ssh_authorized_keys:
                  - ssh-rsa AAAAB3NzaC1yc2E...
            runcmd:
              - systemctl start legacy-app
              - systemctl enable legacy-app
---
# Expose VM via Kubernetes Service
apiVersion: v1
kind: Service
metadata:
  name: legacy-app
  namespace: production
spec:
  selector:
    kubevirt.io/vm: legacy-app-vm
  ports:
  - port: 8080
    targetPort: 8080
    protocol: TCP
    name: http
  type: ClusterIP
```

This configuration provides enterprise-grade VM management with proper resource limits and networking.

## Implementing Hybrid Container-VM Communication

Enable seamless communication between containerized and VM-based workloads.

```yaml
# Container application that calls VM service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: modern-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: modern-api
  template:
    metadata:
      labels:
        app: modern-api
    spec:
      containers:
      - name: api
        image: modern-api:v2.0
        env:
        - name: LEGACY_SERVICE_URL
          value: "http://legacy-app:8080"  # Same DNS as any Kubernetes service
        ports:
        - containerPort: 3000
---
# VM accessing containerized database
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: app-with-db-access
  namespace: production
spec:
  running: true
  template:
    spec:
      domain:
        devices:
          disks:
          - name: disk
            disk: {}
          interfaces:
          - name: default
            bridge: {}
        resources:
          requests:
            memory: 4Gi
      networks:
      - name: default
        pod: {}
      volumes:
      - name: disk
        persistentVolumeClaim:
          claimName: app-disk
      - name: cloudinitdisk
        cloudInitNoCloud:
          userData: |
            #cloud-config
            write_files:
            - path: /etc/app/config.yaml
              content: |
                database:
                  host: postgresql.production.svc.cluster.local
                  port: 5432
                  name: appdb
            runcmd:
            - systemctl restart app
```

VMs and containers communicate using standard Kubernetes service DNS.

## Managing VM Lifecycle Operations

Perform common VM operations using kubectl and virtctl.

```bash
#!/bin/bash
# VM lifecycle management

VM_NAME="legacy-app-vm"
NAMESPACE="production"

# Start VM
virtctl start ${VM_NAME} -n ${NAMESPACE}

# Stop VM gracefully
virtctl stop ${VM_NAME} -n ${NAMESPACE}

# Force stop VM
virtctl stop ${VM_NAME} -n ${NAMESPACE} --force

# Restart VM
virtctl restart ${VM_NAME} -n ${NAMESPACE}

# Pause VM
virtctl pause vm ${VM_NAME} -n ${NAMESPACE}

# Unpause VM
virtctl unpause vm ${VM_NAME} -n ${NAMESPACE}

# Console access
virtctl console ${VM_NAME} -n ${NAMESPACE}

# VNC access
virtctl vnc ${VM_NAME} -n ${NAMESPACE}

# SSH into VM (if guest agent installed)
virtctl ssh admin@${VM_NAME} -n ${NAMESPACE}

# Get VM status
kubectl get vm ${VM_NAME} -n ${NAMESPACE}
kubectl get vmi ${VM_NAME} -n ${NAMESPACE}  # VirtualMachineInstance

# View VM logs
kubectl logs -n ${NAMESPACE} -l kubevirt.io/vm=${VM_NAME}
```

These commands provide familiar VM management operations within Kubernetes.

## Implementing VM Live Migration

Move running VMs between nodes without downtime.

```yaml
# Enable live migration in KubeVirt config
apiVersion: kubevirt.io/v1
kind: KubeVirt
metadata:
  name: kubevirt
  namespace: kubevirt
spec:
  configuration:
    migrations:
      nodeDrainTaintKey: node.kubernetes.io/drain
      parallelMigrationsPerCluster: 5
      parallelOutboundMigrationsPerNode: 2
      bandwidthPerMigration: 64Mi
      completionTimeoutPerGiB: 800
      progressTimeout: 150
---
# Trigger manual migration
apiVersion: kubevirt.io/v1
kind: VirtualMachineInstanceMigration
metadata:
  name: migration-job
  namespace: production
spec:
  vmiName: legacy-app-vm
```

Live migration enables zero-downtime node maintenance and load balancing.

```bash
#!/bin/bash
# Migrate VM to specific node

VM_NAME="legacy-app-vm"
NAMESPACE="production"
TARGET_NODE="worker-node-02"

# Create migration
cat <<EOF | kubectl apply -f -
apiVersion: kubevirt.io/v1
kind: VirtualMachineInstanceMigration
metadata:
  name: ${VM_NAME}-migration
  namespace: ${NAMESPACE}
spec:
  vmiName: ${VM_NAME}
EOF

# Monitor migration
kubectl get vmim ${VM_NAME}-migration -n ${NAMESPACE} -w

# Verify VM on new node
kubectl get vmi ${VM_NAME} -n ${NAMESPACE} -o jsonpath='{.status.nodeName}'
```

Live migration moves VMs seamlessly between nodes.

## Setting Up VM Monitoring and Observability

Integrate VM metrics into your Kubernetes monitoring stack.

```yaml
# ServiceMonitor for VM metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubevirt-metrics
  namespace: kubevirt
spec:
  selector:
    matchLabels:
      prometheus.kubevirt.io: "true"
  endpoints:
  - port: metrics
    interval: 30s
---
# Grafana dashboard for VMs
apiVersion: v1
kind: ConfigMap
metadata:
  name: vm-dashboard
  namespace: monitoring
data:
  vm-dashboard.json: |
    {
      "dashboard": {
        "title": "KubeVirt Virtual Machines",
        "panels": [
          {
            "title": "VM CPU Usage",
            "targets": [
              {
                "expr": "kubevirt_vmi_vcpu_seconds_total"
              }
            ]
          },
          {
            "title": "VM Memory Usage",
            "targets": [
              {
                "expr": "kubevirt_vmi_memory_resident_bytes"
              }
            ]
          },
          {
            "title": "VM Network Traffic",
            "targets": [
              {
                "expr": "rate(kubevirt_vmi_network_receive_bytes_total[5m])"
              }
            ]
          }
        ]
      }
    }
---
# Alert rules for VMs
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: vm-alerts
  namespace: monitoring
spec:
  groups:
  - name: kubevirt
    interval: 30s
    rules:
    - alert: VMDown
      expr: kubevirt_vmi_status_phase{phase="Running"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "VM {{ $labels.name }} is down"

    - alert: VMHighCPU
      expr: kubevirt_vmi_vcpu_seconds_total > 0.9
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "VM {{ $labels.name }} CPU usage above 90%"
```

Monitor VMs using the same Prometheus-based observability as containers.

## Planning Progressive VM Migration Strategy

Migrate VM workloads to Kubernetes incrementally.

```yaml
# Phase 1: Lift and shift VMs to KubeVirt
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: legacy-app-phase1
  namespace: migration
spec:
  running: true
  template:
    spec:
      domain:
        devices:
          disks:
          - name: disk
            disk: {}
      volumes:
      - name: disk
        persistentVolumeClaim:
          claimName: legacy-disk
---
# Phase 2: Containerize some components, keep VM for others
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: migration
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    spec:
      containers:
      - name: frontend
        image: frontend:containerized
        env:
        - name: BACKEND_URL
          value: "http://legacy-app-phase1:8080"  # Still pointing to VM
---
# Phase 3: Fully containerized (final state)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app-containerized
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: legacy-app
  template:
    spec:
      containers:
      - name: app
        image: legacy-app:containerized
```

This phased approach minimizes risk during migration.

## Conclusion

KubeVirt enables running traditional VM-based applications on Kubernetes without immediate containerization. Install KubeVirt and CDI to add VM management capabilities to your cluster. Import existing VM disk images into persistent volumes and define VMs using Kubernetes custom resources. VMs and containers communicate seamlessly using standard Kubernetes service discovery. Live migration provides zero-downtime node maintenance for VMs. Monitor VMs alongside containers using the same Prometheus and Grafana stack. Use KubeVirt as a migration path for legacy applications, progressively containerizing components while keeping critical parts as VMs during the transition. This hybrid approach lets you modernize infrastructure incrementally while maintaining compatibility with applications that cannot be immediately containerized.
