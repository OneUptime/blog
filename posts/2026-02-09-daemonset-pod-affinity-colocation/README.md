# How to configure DaemonSet pod affinity for co-location with specific workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSet, Scheduling

Description: Discover how to use pod affinity rules in DaemonSets to ensure node services run only on nodes hosting specific application workloads.

---

Pod affinity in DaemonSets enables you to schedule node services successfully where specific workloads run, rather than running them on every eligible node in the cluster. This pattern optimizes resource usage by placing supporting infrastructure close to the applications that need it. Understanding pod affinity with DaemonSets helps you build more efficient and cost-effective Kubernetes clusters.

## Understanding pod affinity for DaemonSets

Traditional DaemonSets place one pod on every eligible node, but pod affinity allows you to require co-location with other pods before the DaemonSet pod can be scheduled. The DaemonSet controller can still create pods for eligible nodes that do not satisfy inter-pod affinity; those pods remain Pending until the scheduler can satisfy the rule. Use node labels, node selectors, or node affinity when you need the DaemonSet controller itself to create pods only for a subset of nodes.

Pod affinity uses label selectors to identify target pods. When combined with DaemonSets and node selectors, you create sophisticated placement rules that ensure infrastructure services run where needed. If target workloads run in different namespaces from the DaemonSet, include `namespaces` or `namespaceSelector` in the affinity term.

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
            namespaceSelector: {}
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

This DaemonSet pod schedules successfully only on nodes that have PostgreSQL or MySQL pods running. Nodes without matching pods can still get Pending DaemonSet pods unless you also narrow eligible nodes with node labels or node affinity.

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
            namespaceSelector: {}
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
      volumes:
      - name: nvidia
        hostPath:
          path: /usr/local/nvidia
```

This ensures GPU monitoring schedules only where ML workloads are actually scheduled, while `nodeSelector` limits DaemonSet pod creation to GPU-labeled nodes.

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
              namespaceSelector: {}
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

With a DaemonSet, `preferredDuringSchedulingIgnoredDuringExecution` is only a soft scheduler preference. It does not reduce the set of nodes where the DaemonSet controller creates pods; use node labels or required pod affinity if you need stricter placement.

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
            namespaceSelector: {}
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

This DaemonSet schedules only on nodes that have mesh-enabled applications.

## Storage monitoring for stateful workloads

Monitor storage metrics only on nodes with pods labeled as stateful workloads:

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
            namespaceSelector: {}
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

This avoids wasting resources monitoring storage on nodes without pods that carry your stateful workload labels.

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
            namespaceSelector: {}
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
              namespaceSelector: {}
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

This keeps batch processing from scheduling on nodes with critical workloads while preferring nodes with other batch jobs.

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
            namespaceSelector: {}
            topologyKey: topology.kubernetes.io/zone
          - labelSelector:
              matchExpressions:
              - key: cache-client
                operator: In
                values:
                - "true"
            namespaceSelector: {}
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

This ensures cache pods schedule in zones with matching frontend or API pods and on nodes with cache clients.

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
              namespaceSelector: {}
              topologyKey: kubernetes.io/hostname
          - weight: 50
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: monitoring-required
                  operator: In
                  values:
                  - standard
              namespaceSelector: {}
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

Weight-based preferences allow fine-grained scheduler scoring, but they do not change which nodes are eligible for DaemonSet pod creation.

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

Pod affinity in DaemonSets enables efficient resource utilization by co-locating node services where needed. Whether you're monitoring specific workloads, providing specialized infrastructure, or optimizing costs, affinity rules help your DaemonSets run where they should. Combine required and preferred affinity rules with node selectors, node affinity, and anti-affinity to create sophisticated placement strategies that match your operational requirements.
