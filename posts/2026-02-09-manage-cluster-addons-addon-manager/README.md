# How to Manage Kubernetes Cluster Addons with Addon Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Management, Addons, Automation

Description: Learn how to use Kubernetes addon manager to automatically deploy and manage essential cluster components like DNS, monitoring, and networking with declarative configuration.

---

Kubernetes clusters require several addon components to function properly: DNS for service discovery, monitoring for observability, and networking plugins for pod communication. Managing these addons manually across multiple clusters becomes error-prone and time-consuming. The Kubernetes addon manager automates addon deployment and lifecycle management using labels and reconciliation loops.

## Understanding Addon Manager

The addon manager is a Kubernetes component that watches for resources labeled with `addonmanager.kubernetes.io/mode`. It ensures these resources exist in the cluster and reconciles them if they drift from the desired state. The addon manager runs as a pod on control plane nodes and continuously monitors addon resources.

Three management modes control how addon manager handles resources:

- `Reconcile`: Addon manager creates and updates resources but does not delete them
- `EnsureExists`: Addon manager creates resources if missing but never updates them
- `Ignore`: Addon manager ignores the resource entirely

## Enabling Addon Manager

For kubeadm clusters, addon manager is not enabled by default. Deploy it manually:

```bash
# Create addon manager namespace
kubectl create namespace kube-system

# Deploy addon manager
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: addon-manager
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: addon-manager
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: addon-manager
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: addon-manager
subjects:
- kind: ServiceAccount
  name: addon-manager
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: addon-manager
  namespace: kube-system
  labels:
    component: addon-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      component: addon-manager
  template:
    metadata:
      labels:
        component: addon-manager
    spec:
      serviceAccountName: addon-manager
      containers:
      - name: addon-manager
        image: registry.k8s.io/kube-addon-manager:v9.1.8
        env:
        - name: ADDON_PATH
          value: /etc/kubernetes/addons
        volumeMounts:
        - name: addons
          mountPath: /etc/kubernetes/addons
          readOnly: true
        resources:
          requests:
            cpu: 5m
            memory: 50Mi
      volumes:
      - name: addons
        hostPath:
          path: /etc/kubernetes/addons
          type: DirectoryOrCreate
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
      - effect: NoSchedule
        operator: Exists
EOF
```

Verify addon manager is running:

```bash
kubectl get pods -n kube-system -l component=addon-manager
kubectl logs -n kube-system -l component=addon-manager
```

## Creating Addon Manifests

Create addon manifests in `/etc/kubernetes/addons/` on control plane nodes. Each addon needs the appropriate label:

```bash
# Create addons directory
sudo mkdir -p /etc/kubernetes/addons

# Create CoreDNS addon
sudo nano /etc/kubernetes/addons/coredns.yaml
```

Add the CoreDNS configuration with addon labels:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: coredns
  namespace: kube-system
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
    kubernetes.io/cluster-service: "true"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: system:coredns
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
    kubernetes.io/cluster-service: "true"
rules:
- apiGroups: [""]
  resources: ["endpoints", "services", "pods", "namespaces"]
  verbs: ["list", "watch"]
- apiGroups: ["discovery.k8s.io"]
  resources: ["endpointslices"]
  verbs: ["list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:coredns
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
    kubernetes.io/cluster-service: "true"
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:coredns
subjects:
- kind: ServiceAccount
  name: coredns
  namespace: kube-system
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
  labels:
    addonmanager.kubernetes.io/mode: EnsureExists
data:
  Corefile: |
    .:53 {
        errors
        health {
          lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
          pods insecure
          fallthrough in-addr.arpa ip6.arpa
          ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
          max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
  namespace: kube-system
  labels:
    k8s-app: kube-dns
    addonmanager.kubernetes.io/mode: Reconcile
    kubernetes.io/cluster-service: "true"
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  selector:
    matchLabels:
      k8s-app: kube-dns
  template:
    metadata:
      labels:
        k8s-app: kube-dns
    spec:
      serviceAccountName: coredns
      containers:
      - name: coredns
        image: registry.k8s.io/coredns/coredns:v1.10.1
        args: [ "-conf", "/etc/coredns/Corefile" ]
        volumeMounts:
        - name: config-volume
          mountPath: /etc/coredns
          readOnly: true
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        - containerPort: 9153
          name: metrics
          protocol: TCP
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
            scheme: HTTP
          initialDelaySeconds: 60
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 5
        readinessProbe:
          httpGet:
            path: /ready
            port: 8181
            scheme: HTTP
        resources:
          limits:
            memory: 170Mi
          requests:
            cpu: 100m
            memory: 70Mi
      dnsPolicy: Default
      volumes:
      - name: config-volume
        configMap:
          name: coredns
          items:
          - key: Corefile
            path: Corefile
---
apiVersion: v1
kind: Service
metadata:
  name: kube-dns
  namespace: kube-system
  labels:
    k8s-app: kube-dns
    addonmanager.kubernetes.io/mode: Reconcile
    kubernetes.io/cluster-service: "true"
    kubernetes.io/name: "CoreDNS"
spec:
  selector:
    k8s-app: kube-dns
  clusterIP: 10.96.0.10
  ports:
  - name: dns
    port: 53
    protocol: UDP
  - name: dns-tcp
    port: 53
    protocol: TCP
  - name: metrics
    port: 9153
    protocol: TCP
```

The addon manager will automatically create these resources. Watch the deployment:

```bash
# Monitor addon manager processing
kubectl logs -n kube-system -l component=addon-manager -f

# Verify CoreDNS was deployed
kubectl get all -n kube-system -l k8s-app=kube-dns
```

## Managing Metrics Server Addon

Create metrics-server addon for resource metrics:

```bash
sudo nano /etc/kubernetes/addons/metrics-server.yaml
```

Add this configuration:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: metrics-server
  namespace: kube-system
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: system:aggregated-metrics-reader
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
    rbac.authorization.k8s.io/aggregate-to-view: "true"
    rbac.authorization.k8s.io/aggregate-to-edit: "true"
    rbac.authorization.k8s.io/aggregate-to-admin: "true"
rules:
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: system:metrics-server
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
rules:
- apiGroups: [""]
  resources: ["nodes/metrics"]
  verbs: ["get"]
- apiGroups: [""]
  resources: ["pods", "nodes"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: metrics-server:system:auth-delegator
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:auth-delegator
subjects:
- kind: ServiceAccount
  name: metrics-server
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:metrics-server
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:metrics-server
subjects:
- kind: ServiceAccount
  name: metrics-server
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
  namespace: kube-system
  labels:
    k8s-app: metrics-server
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: metrics-server
  template:
    metadata:
      labels:
        k8s-app: metrics-server
    spec:
      serviceAccountName: metrics-server
      containers:
      - name: metrics-server
        image: registry.k8s.io/metrics-server/metrics-server:v0.6.4
        args:
        - --cert-dir=/tmp
        - --secure-port=4443
        - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
        - --kubelet-use-node-status-port
        - --metric-resolution=15s
        ports:
        - containerPort: 4443
          name: https
          protocol: TCP
        resources:
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: tmp-dir
          mountPath: /tmp
      volumes:
      - name: tmp-dir
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: metrics-server
  namespace: kube-system
  labels:
    kubernetes.io/name: "Metrics-server"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  selector:
    k8s-app: metrics-server
  ports:
  - port: 443
    protocol: TCP
    targetPort: https
---
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  name: v1beta1.metrics.k8s.io
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  service:
    name: metrics-server
    namespace: kube-system
  group: metrics.k8s.io
  version: v1beta1
  insecureSkipTLSVerify: true
  groupPriorityMinimum: 100
  versionPriority: 100
```

Test metrics server:

```bash
# Wait for metrics to be available
sleep 60

# Check node metrics
kubectl top nodes

# Check pod metrics
kubectl top pods -A
```

## Using EnsureExists Mode

Use EnsureExists for resources that users might customize:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-info
  namespace: kube-public
  labels:
    # Will be created but never updated
    addonmanager.kubernetes.io/mode: EnsureExists
data:
  cluster-name: "production-cluster"
  region: "us-west-2"
```

Users can modify this ConfigMap and addon manager will not overwrite their changes.

## Updating Addons

To update an addon managed in Reconcile mode:

```bash
# Edit the addon manifest file
sudo nano /etc/kubernetes/addons/coredns.yaml

# Change the image version
# image: registry.k8s.io/coredns/coredns:v1.11.0

# Addon manager will detect and apply the change
# Watch for the update
kubectl get deployments -n kube-system coredns -w
```

## Removing Addons

To remove an addon:

```bash
# Delete the manifest file
sudo rm /etc/kubernetes/addons/metrics-server.yaml

# Addon manager will not delete the resources
# Delete manually if needed
kubectl delete deployment metrics-server -n kube-system
kubectl delete service metrics-server -n kube-system
```

For automatic cleanup, use a custom controller or manual deletion.

## Monitoring Addon Manager

Track addon manager activity:

```bash
# View addon manager logs
kubectl logs -n kube-system -l component=addon-manager --tail=100

# Check for errors
kubectl logs -n kube-system -l component=addon-manager | grep -i error

# Monitor reconciliation loops
kubectl logs -n kube-system -l component=addon-manager -f | \
  grep -E "Creating|Updating|Deleting"
```

## Troubleshooting Addon Issues

Common problems and solutions:

```bash
# Addon not being created
# Check: Verify label syntax
kubectl get -n kube-system deployment coredns -o yaml | grep addonmanager

# Addon keeps reverting changes
# Check: Verify mode is EnsureExists, not Reconcile
# Change label to: addonmanager.kubernetes.io/mode: EnsureExists

# Addon manager not running
kubectl get pods -n kube-system -l component=addon-manager
kubectl describe pod -n kube-system -l component=addon-manager

# Permissions issues
kubectl logs -n kube-system -l component=addon-manager | grep -i "forbidden\|denied"
```

Addon manager simplifies cluster component management by automating deployment and reconciliation. Use Reconcile mode for system components that should match your desired state and EnsureExists for resources that users need to customize.
