# How to Handle CSI Driver Traffic with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CSI, Storage, Kubernetes, Drivers

Description: Manage Container Storage Interface driver traffic in Istio-enabled clusters, covering controller pods, node plugins, and external storage API communication.

---

Container Storage Interface (CSI) drivers are the standard way to provide storage in Kubernetes. They run as pods in your cluster, and some of their components make network calls to external storage APIs (like cloud provider APIs), internal gRPC calls between controller and node components, and health check endpoints. When Istio is running in your cluster, you need to think about how these CSI driver components interact with the sidecar proxy.

## CSI Architecture Overview

A CSI driver typically has two components:

1. **Controller** - a Deployment (or StatefulSet) that handles volume provisioning, deletion, snapshotting, and expansion. It communicates with the external storage backend API.

2. **Node Plugin** - a DaemonSet that runs on every node. It handles mounting/unmounting volumes into pods. It communicates with the kubelet via a Unix domain socket.

Both components also communicate internally via gRPC over Unix domain sockets. The sidecar containers (csi-provisioner, csi-attacher, csi-snapshotter, csi-resizer) within each pod communicate with the CSI driver container via a shared socket.

## Should CSI Drivers Have Istio Sidecars?

The short answer: no. CSI driver pods should almost always be excluded from the Istio mesh.

Here is why:

1. CSI drivers run in `kube-system` or their own namespace, which typically does not have sidecar injection enabled
2. CSI controllers talk to cloud APIs (AWS, GCP, Azure) that are outside the mesh
3. CSI node plugins interact with the kubelet, which is not in the mesh
4. Internal CSI communication uses Unix domain sockets, not TCP
5. Adding a sidecar to CSI drivers introduces an unnecessary failure point for storage operations

## Excluding CSI Driver Pods

If your CSI driver namespace has sidecar injection enabled (which is uncommon but possible), disable it for CSI pods:

```yaml
# Controller deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ebs-csi-controller
  namespace: kube-system
spec:
  template:
    metadata:
      labels:
        app: ebs-csi-controller
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
        - name: ebs-plugin
          image: public.ecr.aws/ebs-csi-driver/aws-ebs-csi-driver:latest
        - name: csi-provisioner
          image: registry.k8s.io/sig-storage/csi-provisioner:latest
        - name: csi-attacher
          image: registry.k8s.io/sig-storage/csi-attacher:latest
```

```yaml
# Node DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ebs-csi-node
  namespace: kube-system
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
        - name: ebs-plugin
          image: public.ecr.aws/ebs-csi-driver/aws-ebs-csi-driver:latest
        - name: node-driver-registrar
          image: registry.k8s.io/sig-storage/csi-node-driver-registrar:latest
```

Or disable injection at the namespace level:

```bash
kubectl label namespace kube-system istio-injection=disabled
```

## CSI Controller Traffic Patterns

The CSI controller makes outbound API calls to the storage backend. For example, the AWS EBS CSI driver calls the AWS EC2 API:

```
CSI Controller Pod -> EC2 API (ec2.us-east-1.amazonaws.com:443)
```

If the sidecar is present and `outboundTrafficPolicy` is `REGISTRY_ONLY`, the controller cannot reach the cloud API without a ServiceEntry. This is one more reason to exclude CSI drivers from the mesh.

If you absolutely must include the CSI controller in the mesh, create ServiceEntry resources for the cloud APIs:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: aws-ec2-api
  namespace: kube-system
spec:
  hosts:
    - "ec2.us-east-1.amazonaws.com"
    - "sts.us-east-1.amazonaws.com"
  ports:
    - number: 443
      name: https
      protocol: TLS
  location: MESH_EXTERNAL
  resolution: DNS
```

But seriously, just exclude the CSI driver from the mesh.

## CSI Node Plugin Considerations

The CSI node plugin runs as a DaemonSet with `hostNetwork: true` in some configurations:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: csi-node-plugin
spec:
  template:
    spec:
      hostNetwork: true
      containers:
        - name: csi-driver
          securityContext:
            privileged: true
```

When `hostNetwork: true` is set, the pod uses the node's network namespace. Istio's iptables rules do not apply because the init container sets up rules in the pod's network namespace, which in this case is the node's namespace. This could interfere with other traffic on the node.

Even without `hostNetwork`, CSI node plugins need privileged access and interact with the kubelet via Unix domain sockets. The sidecar adds no value here.

## Snapshot Controller Traffic

If you use CSI volume snapshots, the snapshot controller also runs as a pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: snapshot-controller
  namespace: kube-system
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
        - name: snapshot-controller
          image: registry.k8s.io/sig-storage/snapshot-controller:latest
```

Exclude this from the mesh as well. The snapshot controller communicates with the Kubernetes API server and CSI drivers, neither of which needs to go through Envoy.

## When Your Application Uses a CSI-Backed Volume

Your application pods do have Istio sidecars, and they use CSI-provisioned volumes. This is perfectly fine:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myregistry/my-app:latest
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: my-pvc
```

The CSI driver provisions and attaches the volume at the node level. Your application accesses it as a local filesystem mount. The Istio sidecar is not involved in any storage traffic for this use case.

## Monitoring CSI Driver Health

Even though CSI drivers are outside the mesh, you should still monitor them. Use Kubernetes-native monitoring:

```bash
# Check CSI driver pods
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver

# Check CSI driver logs
kubectl logs -n kube-system deploy/ebs-csi-controller -c ebs-plugin

# Check volume attachments
kubectl get volumeattachments

# Check CSI nodes
kubectl get csinodes
```

For Prometheus-based monitoring, many CSI drivers expose metrics:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ebs-csi-controller-metrics
  namespace: kube-system
  labels:
    app: ebs-csi-controller
spec:
  selector:
    app: ebs-csi-controller
  ports:
    - name: metrics
      port: 9808
      targetPort: 9808
```

## Storage Classes and Istio

StorageClass resources are cluster-level and have no interaction with Istio:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

Nothing in the StorageClass or PVC lifecycle touches the Istio proxy. Volume provisioning, attachment, and mounting all happen through the kubelet and CSI driver, completely independently of the service mesh.

## Troubleshooting CSI Issues in Istio Clusters

If storage is not working and you have Istio:

```bash
# First, rule out Istio
# Check if CSI pods have sidecars injected
kubectl get pod -n kube-system -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.containers[*]}{.name} {end}{"\n"}{end}' | grep csi

# If you see "istio-proxy" in the container list, that is the problem
# Remove the sidecar:
kubectl annotate deployment -n kube-system ebs-csi-controller sidecar.istio.io/inject=false
kubectl rollout restart deployment -n kube-system ebs-csi-controller

# Check PVC status
kubectl get pvc -n default

# Check events for storage errors
kubectl get events -n default --sort-by='.lastTimestamp' | grep -i "volume\|storage\|provision\|attach"

# Describe the stuck PVC
kubectl describe pvc my-pvc -n default
```

If the PVC is stuck in Pending, the CSI controller cannot provision the volume. If the pod is stuck in ContainerCreating, the CSI node plugin cannot mount the volume. Neither of these is an Istio issue unless the CSI driver pods have sidecars that are blocking their communication.

The rule of thumb for CSI drivers and Istio is simple: keep them separate. CSI drivers are infrastructure components that should run outside the service mesh. Exclude them from injection, and your storage will work exactly as it would without Istio. The only Istio consideration for application pods using CSI volumes is that filesystem access does not go through the proxy, so there is nothing to configure.
