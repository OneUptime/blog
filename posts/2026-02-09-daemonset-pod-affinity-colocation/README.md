# How to configure DaemonSet pod affinity for co-location with specific workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Scheduling

Description: Discover how to use pod affinity rules in DaemonSets to ensure node services run only on nodes hosting specific application workloads.

---

Pod affinity in DaemonSets enables you to deploy node services only where specific workloads run, rather than on every node in the cluster. This pattern optimizes resource usage by placing supporting infrastructure close to the applications that need it. Understanding pod affinity with DaemonSets helps you build more efficient and cost-effective Kubernetes clusters.

## Understanding pod affinity for DaemonSets

Traditional DaemonSets place one pod on every node, but pod affinity allows you to restrict placement based on other pods' presence. This is valuable when you have specialized node services needed only by certain applications, such as GPU monitoring for ML workloads or specialized logging for high-throughput services.

Pod affinity uses label selectors to identify target pods. When combined with DaemonSets and node selectors, you create sophisticated placement rules that ensure infrastructure services run exactly where needed.

## Basic DaemonSet with pod affinity

Here's a monitoring DaemonSet that runs only on nodes with database pods:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: database-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: db-monitor
  template:
    metadata:
      labels:
        app: db-monitor
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - postgres
                - mysql
            topologyKey: kubernetes.io/hostname
      containers:
      - name: monitor
        image: example/database-monitor:v1.0
        env:
        - name: TARGET_DBS
          value: "postgres,mysql"
        resources:
          limits:
            memory: 200Mi
            cpu: 200m
          requests:
            memory: 100Mi
            cpu: 100m
```

This DaemonSet only deploys on nodes that have PostgreSQL or MySQL pods running.

## GPU monitoring for ML workloads

Deploy GPU monitoring only on nodes running machine learning workloads:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gpu-monitor
  namespace: ml-platform
spec:
  selector:
    matchLabels:
      app: gpu-monitor
  template:
    metadata:
      labels:
        app: gpu-monitor
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: workload-type
                operator: In
                values:
                - training
                - inference
              - key: accelerator
                operator: Exists
            topologyKey: kubernetes.io/hostname
      nodeSelector:
        accelerator: nvidia-gpu
      containers:
      - name: gpu-monitor
        image: nvcr.io/nvidia/k8s/dcgm-exporter:3.1.7-3.1.4-ubuntu22.04
        ports:
        - containerPort: 9400
          name: metrics
        securityContext:
          privileged: true
        volumeMounts:
        - name: nvidia
          mountPath: /usr/local/nvidia
        resources:
          limits:
            memory: 256Mi
            cpu: 200m
            nvidia.com/gpu: 0  # No GPU allocation needed for monitoring
      volumes:
      - name: nvidia
        hostPath:
          path: /usr/local/nvidia
```

This ensures GPU monitoring runs only where ML workloads are actually scheduled.

## Application-specific logging

Deploy specialized log collectors near high-throughput applications:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: high-volume-log-collector
  namespace: logging
spec:
  selector:
    matchLabels:
      app: hv-log-collector
  template:
    metadata:
      labels:
        app: hv-log-collector
    spec:
      affinity:
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: log-volume
                  operator: In
                  values:
                  - high
                  - very-high
              topologyKey: kubernetes.io/hostname
      containers:
      - name: collector
        image: fluent/fluent-bit:2.2
        args:
        - --config=/fluent-bit/config/fluent-bit.conf
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: config
          mountPath: /fluent-bit/config
        - name: buffer
          mountPath: /var/fluent-bit/buffer
        resources:
          limits:
            memory: 512Mi
            cpu: 500m
          requests:
            memory: 256Mi
            cpu: 200m
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: config
        configMap:
          name: high-volume-log-config
      - name: buffer
        emptyDir:
          sizeLimit: 5Gi
```

Using preferredDuringScheduling allows the DaemonSet to run on other nodes if needed, but prioritizes nodes with high-volume logs.

## Service mesh sidecars for specific services

Deploy service mesh components only near services that need them:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: mesh-proxy
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: mesh-proxy
  template:
    metadata:
      labels:
        app: mesh-proxy
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: mesh-enabled
                operator: In
                values:
                - "true"
            topologyKey: kubernetes.io/hostname
      hostNetwork: true
      containers:
      - name: envoy
        image: envoyproxy/envoy:v1.28.0
        args:
        - -c
        - /etc/envoy/envoy.yaml
        ports:
        - containerPort: 15001
          name: proxy
        - containerPort: 15090
          name: admin
        volumeMounts:
        - name: config
          mountPath: /etc/envoy
        resources:
          limits:
            memory: 512Mi
            cpu: 500m

      - name: pilot-agent
        image: istio/pilot:1.20.0
        command:
        - /usr/local/bin/pilot-agent
        - proxy
        - --serviceCluster
        - mesh-proxy-node
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        resources:
          limits:
            memory: 256Mi
            cpu: 200m

      volumes:
      - name: config
        configMap:
          name: envoy-node-config
```

This DaemonSet only runs on nodes that have mesh-enabled applications.

## Storage monitoring for stateful workloads

Monitor storage metrics only on nodes with StatefulSets:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: storage-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: storage-monitor
  template:
    metadata:
      labels:
        app: storage-monitor
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app.kubernetes.io/component
                operator: In
                values:
                - database
                - cache
              - key: stateful
                operator: In
                values:
                - "true"
            topologyKey: kubernetes.io/hostname
      containers:
      - name: monitor
        image: example/storage-monitor:v2.0
        args:
        - --check-interval=30s
        - --metrics-port=9200
        ports:
        - containerPort: 9200
          name: metrics
        securityContext:
          privileged: true
        volumeMounts:
        - name: dev
          mountPath: /dev
          readOnly: true
        - name: kubelet-pods
          mountPath: /var/lib/kubelet/pods
          readOnly: true
        resources:
          limits:
            memory: 256Mi
            cpu: 200m
      volumes:
      - name: dev
        hostPath:
          path: /dev
      - name: kubelet-pods
        hostPath:
          path: /var/lib/kubelet/pods
```

This avoids wasting resources monitoring storage on nodes without stateful workloads.

## Anti-affinity for isolation

Use pod anti-affinity to keep DaemonSet pods away from certain workloads:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: batch-processor
  namespace: batch
spec:
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: priority
                operator: In
                values:
                - critical
                - high
            topologyKey: kubernetes.io/hostname
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: workload-type
                  operator: In
                  values:
                  - batch
                  - async
              topologyKey: kubernetes.io/hostname
      containers:
      - name: processor
        image: example/batch-processor:v3.0
        resources:
          limits:
            memory: 2Gi
            cpu: 1000m
          requests:
            memory: 1Gi
            cpu: 500m
```

This keeps batch processing away from critical workloads while preferring nodes with other batch jobs.

## Multi-topology affinity

Use multiple topology keys for zone and node affinity:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: regional-cache
  namespace: caching
spec:
  selector:
    matchLabels:
      app: regional-cache
  template:
    metadata:
      labels:
        app: regional-cache
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: region
                operator: In
                values:
                - us-west
              - key: tier
                operator: In
                values:
                - frontend
                - api
            topologyKey: topology.kubernetes.io/zone
          - labelSelector:
              matchExpressions:
              - key: cache-client
                operator: In
                values:
                - "true"
            topologyKey: kubernetes.io/hostname
      containers:
      - name: cache
        image: redis:7.2
        ports:
        - containerPort: 6379
        resources:
          limits:
            memory: 4Gi
            cpu: 2000m
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        hostPath:
          path: /var/lib/redis
          type: DirectoryOrCreate
```

This ensures cache nodes run in specific zones and on nodes with cache clients.

## Dynamic affinity based on workload labels

Create affinity rules that adapt to workload requirements:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: adaptive-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: adaptive-monitor
  template:
    metadata:
      labels:
        app: adaptive-monitor
    spec:
      affinity:
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: monitoring-required
                  operator: In
                  values:
                  - intensive
              topologyKey: kubernetes.io/hostname
          - weight: 50
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: monitoring-required
                  operator: In
                  values:
                  - standard
              topologyKey: kubernetes.io/hostname
      containers:
      - name: monitor
        image: example/adaptive-monitor:v1.0
        env:
        - name: MONITORING_LEVEL
          value: dynamic
        resources:
          limits:
            memory: 300Mi
            cpu: 300m
          requests:
            memory: 150Mi
            cpu: 150m
```

Weight-based preferences allow fine-grained control over placement priorities.

## Verification and monitoring

Check pod affinity effectiveness:

```bash
# List nodes with the DaemonSet
kubectl get pods -n monitoring -l app=db-monitor -o wide

# Verify co-location with target workloads
kubectl get pods -A -o wide | grep -E "(db-monitor|postgres|mysql)"

# Check affinity rules
kubectl get daemonset -n monitoring db-monitor -o yaml | grep -A 20 affinity

# Count DaemonSet pods vs total nodes
echo "DaemonSet pods: $(kubectl get pods -n monitoring -l app=db-monitor --no-headers | wc -l)"
echo "Total nodes: $(kubectl get nodes --no-headers | wc -l)"
echo "Database nodes: $(kubectl get pods -A -l app=postgres -o jsonpath='{.items[*].spec.nodeName}' | tr ' ' '\n' | sort -u | wc -l)"
```

## Conclusion

Pod affinity in DaemonSets enables efficient resource utilization by deploying node services only where needed. Whether you're monitoring specific workloads, providing specialized infrastructure, or optimizing costs, affinity rules ensure your DaemonSets run exactly where they should. Combine required and preferred affinity rules with anti-affinity to create sophisticated placement strategies that match your operational requirements.
