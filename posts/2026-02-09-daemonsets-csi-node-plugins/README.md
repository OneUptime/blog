# How to use DaemonSets for storage plugin drivers like CSI node plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Storage

Description: Discover how to deploy CSI node plugins using DaemonSets to provide storage capabilities on every node in your Kubernetes cluster.

---

Container Storage Interface (CSI) node plugins are essential components that enable Kubernetes pods to mount persistent volumes. These plugins must run on every node where workloads need storage access, making DaemonSets the perfect deployment method. Understanding how to properly configure CSI node plugin DaemonSets ensures reliable storage operations across your cluster.

## Why DaemonSets for CSI node plugins

CSI drivers follow a two-component architecture: a controller component that handles volume provisioning and a node component that handles volume mounting. The node component must exist on every node where pods might need to mount volumes, which is exactly what DaemonSets provide.

When a pod requests a persistent volume, the kubelet on that node communicates with the local CSI node plugin through a Unix domain socket. This local communication pattern requires the node plugin to be present on the same node as the workload, reinforcing the need for DaemonSet deployment.

## Basic CSI node plugin DaemonSet structure

Here's a fundamental CSI node plugin DaemonSet configuration:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: csi-nodeplugin
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: csi-nodeplugin
  template:
    metadata:
      labels:
        app: csi-nodeplugin
    spec:
      hostNetwork: true  # Required for some CSI drivers
      containers:
      - name: node-driver-registrar
        image: registry.k8s.io/sig-storage/csi-node-driver-registrar:v2.10.0
        args:
        - "--v=5"
        - "--csi-address=/csi/csi.sock"
        - "--kubelet-registration-path=/var/lib/kubelet/plugins/csi.example.com/csi.sock"
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
        - name: registration-dir
          mountPath: /registration
      - name: csi-plugin
        image: example/csi-driver:v1.0.0
        args:
        - "--endpoint=unix:///csi/csi.sock"
        - "--nodeid=$(NODE_ID)"
        env:
        - name: NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          privileged: true  # Required for mounting operations
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
        - name: pods-mount-dir
          mountPath: /var/lib/kubelet/pods
          mountPropagation: Bidirectional
        - name: device-dir
          mountPath: /dev
      volumes:
      - name: plugin-dir
        hostPath:
          path: /var/lib/kubelet/plugins/csi.example.com
          type: DirectoryOrCreate
      - name: registration-dir
        hostPath:
          path: /var/lib/kubelet/plugins_registry
          type: Directory
      - name: pods-mount-dir
        hostPath:
          path: /var/lib/kubelet/pods
          type: Directory
      - name: device-dir
        hostPath:
          path: /dev
          type: Directory
```

This configuration includes both the CSI node driver registrar sidecar and the actual CSI driver container.

## Real-world example with AWS EBS CSI driver

The AWS EBS CSI driver demonstrates a production-ready CSI node plugin deployment:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ebs-csi-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: ebs-csi-node
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 10%
  template:
    metadata:
      labels:
        app: ebs-csi-node
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      hostNetwork: true
      priorityClassName: system-node-critical
      tolerations:
      - operator: Exists
      containers:
      - name: ebs-plugin
        image: public.ecr.aws/ebs-csi-driver/aws-ebs-csi-driver:v1.26.0
        args:
        - node
        - --endpoint=$(CSI_ENDPOINT)
        - --logtostderr
        - --v=5
        env:
        - name: CSI_ENDPOINT
          value: unix:/csi/csi.sock
        - name: CSI_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: kubelet-dir
          mountPath: /var/lib/kubelet
          mountPropagation: Bidirectional
        - name: plugin-dir
          mountPath: /csi
        - name: device-dir
          mountPath: /dev
        securityContext:
          privileged: true
        ports:
        - name: healthz
          containerPort: 9808
          protocol: TCP
        livenessProbe:
          httpGet:
            path: /healthz
            port: healthz
          initialDelaySeconds: 10
          timeoutSeconds: 3
          periodSeconds: 10
          failureThreshold: 5
      - name: node-driver-registrar
        image: public.ecr.aws/eks-distro/kubernetes-csi/node-driver-registrar:v2.10.0
        args:
        - --csi-address=$(ADDRESS)
        - --kubelet-registration-path=$(DRIVER_REG_SOCK_PATH)
        - --v=5
        env:
        - name: ADDRESS
          value: /csi/csi.sock
        - name: DRIVER_REG_SOCK_PATH
          value: /var/lib/kubelet/plugins/ebs.csi.aws.com/csi.sock
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
        - name: registration-dir
          mountPath: /registration
      - name: liveness-probe
        image: public.ecr.aws/eks-distro/kubernetes-csi/livenessprobe:v2.12.0
        args:
        - --csi-address=/csi/csi.sock
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
      volumes:
      - name: kubelet-dir
        hostPath:
          path: /var/lib/kubelet
          type: Directory
      - name: plugin-dir
        hostPath:
          path: /var/lib/kubelet/plugins/ebs.csi.aws.com/
          type: DirectoryOrCreate
      - name: registration-dir
        hostPath:
          path: /var/lib/kubelet/plugins_registry/
          type: Directory
      - name: device-dir
        hostPath:
          path: /dev
          type: Directory
```

This configuration includes health checks, proper tolerations to run on all nodes, and the three-container sidecar pattern common in CSI deployments.

## NFS CSI driver node plugin

For network-based storage like NFS, the node plugin is simpler since it doesn't interact with block devices:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: csi-nfs-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: csi-nfs-node
  template:
    metadata:
      labels:
        app: csi-nfs-node
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: nfs
        image: registry.k8s.io/sig-storage/nfsplugin:v4.6.0
        args:
        - "-v=5"
        - "--nodeid=$(NODE_ID)"
        - "--endpoint=$(CSI_ENDPOINT)"
        env:
        - name: NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: CSI_ENDPOINT
          value: unix:///csi/csi.sock
        securityContext:
          privileged: true
          capabilities:
            add: ["SYS_ADMIN"]
          allowPrivilegeEscalation: true
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
        - name: pods-mount-dir
          mountPath: /var/lib/kubelet/pods
          mountPropagation: Bidirectional
      - name: node-driver-registrar
        image: registry.k8s.io/sig-storage/csi-node-driver-registrar:v2.10.0
        args:
        - --v=5
        - --csi-address=/csi/csi.sock
        - --kubelet-registration-path=/var/lib/kubelet/plugins/csi-nfsplugin/csi.sock
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
        - name: registration-dir
          mountPath: /registration
      - name: liveness-probe
        image: registry.k8s.io/sig-storage/livenessprobe:v2.12.0
        args:
        - --csi-address=/csi/csi.sock
        - --probe-timeout=3s
        - --health-port=29653
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
      volumes:
      - name: plugin-dir
        hostPath:
          path: /var/lib/kubelet/plugins/csi-nfsplugin
          type: DirectoryOrCreate
      - name: pods-mount-dir
        hostPath:
          path: /var/lib/kubelet/pods
          type: Directory
      - name: registration-dir
        hostPath:
          path: /var/lib/kubelet/plugins_registry
          type: Directory
```

The NFS driver requires fewer permissions than block storage drivers but still needs bidirectional mount propagation.

## Critical volume mounts for CSI node plugins

Understanding the required volume mounts is crucial for CSI node plugin operation:

```yaml
# Plugin directory for CSI socket communication
- name: plugin-dir
  hostPath:
    path: /var/lib/kubelet/plugins/your-csi-driver/
    type: DirectoryOrCreate

# Registration directory for kubelet discovery
- name: registration-dir
  hostPath:
    path: /var/lib/kubelet/plugins_registry/
    type: Directory

# Pods mount directory with bidirectional propagation
- name: pods-mount-dir
  hostPath:
    path: /var/lib/kubelet/pods
    type: Directory
  # Container must use: mountPropagation: Bidirectional

# Device directory for block device access
- name: device-dir
  hostPath:
    path: /dev
    type: Directory
```

The bidirectional mount propagation is particularly important as it allows mounts created by the CSI driver to be visible both inside the container and on the host.

## Security considerations

CSI node plugins typically require elevated privileges, but you can limit the security impact:

```yaml
securityContext:
  privileged: true  # Often necessary but minimize where possible
  capabilities:
    add:
    - SYS_ADMIN  # Required for mount operations
  seLinuxOptions:
    level: "s0"
    type: "spc_t"
```

Always run CSI node plugins in the kube-system namespace with appropriate RBAC permissions to limit potential security risks.

## Monitoring and troubleshooting

Monitor your CSI node plugin DaemonSet health:

```bash
# Check DaemonSet status
kubectl get daemonset -n kube-system csi-nodeplugin

# View logs from a specific node
kubectl logs -n kube-system csi-nodeplugin-xxxxx -c csi-plugin

# Verify CSI socket registration
ls -la /var/lib/kubelet/plugins_registry/

# Check mounted volumes
kubectl get volumeattachment
```

Common issues include missing mount propagation settings, incorrect socket paths, or insufficient permissions.

## Conclusion

DaemonSets provide the ideal deployment model for CSI node plugins, ensuring storage capabilities are available on every node. By properly configuring volume mounts, security contexts, and sidecars, you create a robust storage foundation for your Kubernetes workloads. Pay special attention to mount propagation, privilege requirements, and health monitoring to maintain reliable storage operations across your cluster.
