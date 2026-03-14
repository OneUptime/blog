# How to Fix Flux CD Badger Database Error on Raspberry Pi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Raspberry Pi, ARM, Badger, Database, Embedded, GitOps, Kubernetes, Troubleshooting

Description: A troubleshooting guide for resolving Badger database errors when running Flux CD on Raspberry Pi and other ARM-based or resource-constrained devices.

---

Running Flux CD on Raspberry Pi and other ARM-based single-board computers is a great way to do GitOps at the edge. However, the source-controller's internal Badger database can fail on these resource-constrained devices, causing persistent errors and preventing reconciliation. This guide covers how to diagnose and fix these issues.

## Understanding the Problem

Flux CD's source-controller uses Badger, an embedded key-value database, to cache downloaded artifacts. On Raspberry Pi and similar ARM devices, Badger can fail due to:

- **Insufficient memory** - Badger's default settings assume more RAM than a Pi has
- **SD card I/O limitations** - SD cards have slow random I/O and limited write endurance
- **ARM architecture quirks** - memory mapping behavior differs from x86
- **Storage filesystem issues** - some filesystems on SD cards do not support required operations

Common error messages:

```yaml
badger: Value log truncate required
badger: MANIFEST has unsupported version
panic: runtime error: invalid memory address or nil pointer dereference
source-controller: badger.Open: resource temporarily unavailable
```

## Step 1: Identify the Error

```bash
# Check source-controller pod status
kubectl get pods -n flux-system -l app=source-controller

# Look for CrashLoopBackOff or Error status
kubectl describe pod -n flux-system -l app=source-controller

# Check logs for Badger errors
kubectl logs -n flux-system deployment/source-controller | grep -i "badger\|panic\|database"

# If the pod is crash-looping, check previous logs
kubectl logs -n flux-system deployment/source-controller --previous
```

## Step 2: Clear the Badger Database

The quickest fix is to delete the corrupted Badger database and let it rebuild.

```bash
# Delete the source-controller pod to restart it
kubectl delete pod -n flux-system -l app=source-controller

# If the pod crash-loops again, the data volume needs to be cleared
# Scale down the deployment first
kubectl scale deployment source-controller -n flux-system --replicas=0

# Delete the PVC if one exists
kubectl get pvc -n flux-system

# If using emptyDir (default), just scaling down and up clears it
kubectl scale deployment source-controller -n flux-system --replicas=1
```

### If Using Persistent Storage

```bash
# Check if source-controller uses a PVC
kubectl get deployment source-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.volumes}' | python3 -m json.tool

# If a PVC exists, delete and recreate it
kubectl scale deployment source-controller -n flux-system --replicas=0
kubectl delete pvc source-controller-data -n flux-system
kubectl scale deployment source-controller -n flux-system --replicas=1
```

## Step 3: Reduce Memory Usage

Raspberry Pi models typically have 1-8 GB of RAM. Flux controllers need to be tuned for this environment.

```yaml
# Resource limits patch for Raspberry Pi
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              # Minimum memory for stable operation
              memory: 64Mi
              cpu: 50m
            limits:
              # Cap memory to prevent OOM on Pi
              memory: 256Mi
              cpu: 500m
```

Apply resource limits to all controllers:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Reduce resource usage for all controllers
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    memory: 64Mi
                    cpu: 50m
                  limits:
                    memory: 256Mi
                    cpu: 500m
    target:
      kind: Deployment
      namespace: flux-system
```

## Step 4: Use tmpfs for Badger Storage

SD cards are slow and wear out with frequent writes. Mount the Badger data directory as a tmpfs (RAM-backed filesystem) for better performance and to avoid SD card wear.

```yaml
# tmpfs-patch.yaml - Use RAM for temporary storage
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          volumeMounts:
            - name: tmp-data
              mountPath: /tmp
            - name: badger-data
              mountPath: /data
      volumes:
        - name: tmp-data
          emptyDir:
            # Use tmpfs (RAM) for temp files
            medium: Memory
            sizeLimit: 128Mi
        - name: badger-data
          emptyDir:
            # Use tmpfs for Badger database
            medium: Memory
            sizeLimit: 256Mi
```

Apply the patch:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: tmpfs-patch.yaml
    target:
      kind: Deployment
      namespace: flux-system
      name: source-controller
```

## Step 5: Optimize Flux for ARM Devices

### Increase Reconciliation Intervals

Reduce CPU and I/O load by increasing intervals:

```yaml
# GitRepository with longer interval
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 15m
  # Instead of default 1m, use 15m on Pi
  url: ssh://git@github.com/myorg/fleet-infra
  ref:
    branch: main
---
# Kustomization with longer interval
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  # Longer interval reduces CPU load
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/pi
  prune: true
```

### Disable Unnecessary Controllers

If you do not need all Flux features, disable unused controllers:

```bash
# Bootstrap with only the controllers you need
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/pi \
  --components=source-controller,kustomize-controller

# This skips helm-controller, notification-controller,
# image-reflector-controller, and image-automation-controller
```

Or scale down unused controllers:

```bash
# Disable image automation if not needed
kubectl scale deployment image-reflector-controller -n flux-system --replicas=0
kubectl scale deployment image-automation-controller -n flux-system --replicas=0

# Disable notifications if not needed
kubectl scale deployment notification-controller -n flux-system --replicas=0
```

## Step 6: Fix Filesystem Compatibility Issues

Some SD card filesystems (FAT32, exFAT) do not support file locking or memory mapping that Badger requires.

```bash
# Check the filesystem type on the node
ssh pi@raspberrypi df -T /var/lib/rancher/k3s

# Badger requires ext4 or similar Linux-native filesystem
# If using an SD card, ensure it is formatted as ext4
```

### Use an External USB Drive

For better I/O performance and durability:

```bash
# Format a USB drive as ext4
sudo mkfs.ext4 /dev/sda1

# Mount it for Kubernetes storage
sudo mkdir -p /mnt/usb-storage
sudo mount /dev/sda1 /mnt/usb-storage

# Add to fstab for persistence
echo "/dev/sda1 /mnt/usb-storage ext4 defaults 0 2" | sudo tee -a /etc/fstab
```

Configure K3s or your Kubernetes distribution to use the USB drive:

```bash
# For K3s, set the data directory to USB storage
# In /etc/systemd/system/k3s.service, add:
# --data-dir=/mnt/usb-storage/k3s
```

## Step 7: Handle ARM Architecture Image Issues

Ensure you are pulling ARM-compatible images. Flux official images support multi-arch, but custom images may not.

```bash
# Verify the architecture of Flux images
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[0].image}{"\n"}{end}'

# Check if images are multi-arch
docker manifest inspect ghcr.io/fluxcd/source-controller:v1.4.1 | grep architecture
```

## Step 8: Configure Swap for Low-Memory Devices

For Raspberry Pi models with 1-2 GB RAM, enabling swap can prevent OOM kills.

```bash
# Create a swap file (on the USB drive preferably)
sudo fallocate -l 2G /mnt/usb-storage/swapfile
sudo chmod 600 /mnt/usb-storage/swapfile
sudo mkswap /mnt/usb-storage/swapfile
sudo swapon /mnt/usb-storage/swapfile

# Make it permanent
echo "/mnt/usb-storage/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab

# Verify swap is active
free -h
```

## Step 9: Use K3s-Specific Optimizations

K3s is the most common Kubernetes distribution on Raspberry Pi. It has Flux-relevant optimizations.

```bash
# Install K3s with reduced resource usage
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server \
  --disable traefik \
  --disable servicelb \
  --disable metrics-server \
  --kubelet-arg=eviction-hard=memory.available<100Mi \
  --kubelet-arg=eviction-soft=memory.available<200Mi \
  --kubelet-arg=eviction-soft-grace-period=memory.available=30s" \
  sh -
```

## Step 10: Monitor Resource Usage

Keep an eye on resource consumption to prevent future issues.

```bash
# Check memory usage of Flux pods
kubectl top pods -n flux-system

# Check node resource availability
kubectl top nodes

# Watch for OOM kills
kubectl get events -n flux-system --field-selector reason=OOMKilling

# Check disk usage on the node
ssh pi@raspberrypi df -h
```

## Step 11: Full Debugging Checklist

```bash
# 1. Check pod status and restarts
kubectl get pods -n flux-system -o wide

# 2. Look for Badger errors in logs
kubectl logs -n flux-system deployment/source-controller | grep -i "badger" | tail -20

# 3. Check previous crash logs
kubectl logs -n flux-system deployment/source-controller --previous 2>/dev/null

# 4. Verify resource limits
kubectl get deployment source-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].resources}'

# 5. Check node memory
kubectl top nodes

# 6. Check disk space on node
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}: {.status.conditions[?(@.type=="DiskPressure")].status}{"\n"}{end}'

# 7. Verify filesystem type
kubectl exec -n flux-system deployment/source-controller -- df -T /data 2>/dev/null

# 8. Clear Badger and restart
kubectl delete pod -n flux-system -l app=source-controller

# 9. Force reconciliation after recovery
flux reconcile source git flux-system
```

## Summary

Fixing Badger database errors on Raspberry Pi requires addressing the resource constraints:

- **Clear the corrupted database** by deleting the source-controller pod or its PVC
- **Use tmpfs (RAM)** for Badger storage to avoid SD card I/O issues
- **Reduce memory usage** with appropriate resource limits
- **Increase reconciliation intervals** to lower CPU and I/O load
- **Disable unused controllers** to free resources for essential components
- **Use an external USB drive** instead of the SD card for Kubernetes storage

The combination of tmpfs for temporary data and longer reconciliation intervals is usually enough to run Flux CD reliably on Raspberry Pi 4 with 4 GB or more of RAM.
