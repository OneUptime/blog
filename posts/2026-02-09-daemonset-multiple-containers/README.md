# How to implement DaemonSet with multiple containers for complementary node services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Containers

Description: Learn how to deploy multiple containers within a single DaemonSet pod to run complementary node-level services that work together.

---

Running multiple containers in a DaemonSet pod allows you to deploy tightly coupled node services that need to share resources or coordinate operations. This pattern is common for monitoring stacks, service meshes, and security tools where multiple components work together to provide node-level functionality. Understanding multi-container DaemonSet patterns helps you build more efficient and maintainable infrastructure.

## Understanding multi-container pod patterns

Kubernetes supports several multi-container patterns: sidecar, ambassador, and adapter. In DaemonSets, the sidecar pattern is most common, where helper containers augment the main service. All containers in a pod share the same network namespace, localhost communication, and volumes, making data sharing and coordination straightforward.

Multi-container DaemonSets reduce resource overhead compared to deploying separate DaemonSets for each component. They also guarantee that related services run on the same node, which is critical when components depend on each other.

## Basic multi-container DaemonSet

Here's a simple logging DaemonSet with a log collector and exporter:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: logging-stack
  namespace: logging
spec:
  selector:
    matchLabels:
      app: logging-stack
  template:
    metadata:
      labels:
        app: logging-stack
    spec:
      containers:
      - name: log-collector
        image: fluent/fluent-bit:2.2
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: shared-logs
          mountPath: /fluent-bit/buffer
        resources:
          limits:
            memory: 200Mi
            cpu: 200m
          requests:
            memory: 100Mi
            cpu: 100m

      - name: log-exporter
        image: example/log-exporter:v1.0
        command:
        - /usr/local/bin/exporter
        - --buffer-dir=/buffer
        - --export-interval=60s
        volumeMounts:
        - name: shared-logs
          mountPath: /buffer
        ports:
        - containerPort: 9090
          name: metrics
        resources:
          limits:
            memory: 100Mi
            cpu: 100m

      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: shared-logs
        emptyDir: {}
```

The collector writes to a shared volume that the exporter reads from, providing buffer isolation.

## Monitoring stack with multiple exporters

Deploy a comprehensive monitoring solution with multiple specialized exporters:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-stack
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: monitoring-stack
  template:
    metadata:
      labels:
        app: monitoring-stack
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9100"
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        - --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)
        ports:
        - containerPort: 9100
          name: metrics
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host/root
          readOnly: true
        resources:
          limits:
            memory: 180Mi
            cpu: 200m

      - name: process-exporter
        image: ncabatoff/process-exporter:0.7.10
        args:
        - --procfs=/host/proc
        - --config.path=/etc/process-exporter/config.yml
        ports:
        - containerPort: 9256
          name: proc-metrics
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: process-config
          mountPath: /etc/process-exporter
        resources:
          limits:
            memory: 100Mi
            cpu: 100m

      - name: cadvisor
        image: gcr.io/cadvisor/cadvisor:v0.47.0
        args:
        - --housekeeping_interval=10s
        - --docker_only=true
        ports:
        - containerPort: 8080
          name: cadvisor
        volumeMounts:
        - name: rootfs
          mountPath: /rootfs
          readOnly: true
        - name: var-run
          mountPath: /var/run
          readOnly: true
        - name: sys
          mountPath: /sys
          readOnly: true
        - name: docker
          mountPath: /var/lib/docker
          readOnly: true
        securityContext:
          privileged: true
        resources:
          limits:
            memory: 200Mi
            cpu: 300m

      - name: metrics-aggregator
        image: example/metrics-aggregator:v1.0
        command:
        - /aggregator
        - --node-exporter=http://localhost:9100/metrics
        - --process-exporter=http://localhost:9256/metrics
        - --cadvisor=http://localhost:8080/metrics
        ports:
        - containerPort: 9999
          name: aggregated
        resources:
          limits:
            memory: 100Mi
            cpu: 100m

      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
      - name: rootfs
        hostPath:
          path: /
      - name: var-run
        hostPath:
          path: /var/run
      - name: docker
        hostPath:
          path: /var/lib/docker
      - name: process-config
        configMap:
          name: process-exporter-config
```

This stack provides comprehensive node monitoring through multiple specialized exporters.

## Service mesh data plane with sidecars

Deploy a service mesh proxy with telemetry and security sidecars:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: service-mesh-node
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: mesh-node
  template:
    metadata:
      labels:
        app: mesh-node
    spec:
      hostNetwork: true
      initContainers:
      - name: init-iptables
        image: istio/proxyv2:1.20.0
        command:
        - /usr/local/bin/pilot-agent
        - istio-iptables
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
            - NET_RAW

      containers:
      - name: envoy-proxy
        image: envoyproxy/envoy:v1.28.0
        args:
        - -c
        - /etc/envoy/envoy.yaml
        - --service-cluster
        - mesh-node
        ports:
        - containerPort: 15001
          name: proxy
        - containerPort: 15090
          name: envoy-admin
        volumeMounts:
        - name: envoy-config
          mountPath: /etc/envoy
        resources:
          limits:
            memory: 512Mi
            cpu: 500m

      - name: telemetry-agent
        image: example/telemetry-agent:v2.0
        args:
        - --envoy-admin=http://localhost:15090
        - --export-to=http://telemetry-collector:4317
        ports:
        - containerPort: 9091
          name: metrics
        resources:
          limits:
            memory: 200Mi
            cpu: 200m

      - name: security-agent
        image: example/security-agent:v1.5
        command:
        - /security-agent
        - --monitor-port=15001
        - --alert-endpoint=http://security-api:8080
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
        resources:
          limits:
            memory: 100Mi
            cpu: 100m

      - name: config-sync
        image: istio/pilot:1.20.0
        command:
        - /usr/local/bin/pilot-agent
        - proxy
        - --serviceCluster
        - mesh-node
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        resources:
          limits:
            memory: 200Mi
            cpu: 200m

      volumes:
      - name: envoy-config
        configMap:
          name: envoy-config
```

This multi-container DaemonSet provides complete service mesh functionality at the node level.

## Storage plugin with CSI sidecars

Deploy a CSI driver with all required sidecar containers:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: csi-driver-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: csi-driver
  template:
    metadata:
      labels:
        app: csi-driver
    spec:
      hostNetwork: true
      containers:
      - name: csi-driver
        image: example/csi-driver:v3.0
        args:
        - --endpoint=unix:///csi/csi.sock
        - --nodeid=$(NODE_ID)
        env:
        - name: NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          privileged: true
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
        - name: pods-mount-dir
          mountPath: /var/lib/kubelet/pods
          mountPropagation: Bidirectional
        - name: device-dir
          mountPath: /dev
        resources:
          limits:
            memory: 300Mi
            cpu: 300m

      - name: node-driver-registrar
        image: registry.k8s.io/sig-storage/csi-node-driver-registrar:v2.10.0
        args:
        - --csi-address=/csi/csi.sock
        - --kubelet-registration-path=/var/lib/kubelet/plugins/csi.example.com/csi.sock
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
        - name: registration-dir
          mountPath: /registration
        resources:
          limits:
            memory: 50Mi
            cpu: 50m

      - name: liveness-probe
        image: registry.k8s.io/sig-storage/livenessprobe:v2.12.0
        args:
        - --csi-address=/csi/csi.sock
        - --health-port=9808
        ports:
        - containerPort: 9808
          name: healthz
        volumeMounts:
        - name: plugin-dir
          mountPath: /csi
        resources:
          limits:
            memory: 50Mi
            cpu: 50m

      - name: health-monitor
        image: example/health-monitor:v1.0
        command:
        - /monitor
        - --check-interval=30s
        - --health-endpoint=http://localhost:9808/healthz
        resources:
          limits:
            memory: 50Mi
            cpu: 50m

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
```

All CSI components run together, ensuring synchronized operation.

## Security scanning stack

Combine multiple security tools in one DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: security-stack
  namespace: security
spec:
  selector:
    matchLabels:
      app: security-stack
  template:
    metadata:
      labels:
        app: security-stack
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: falco
        image: falcosecurity/falco-no-driver:0.36.2
        args:
        - /usr/bin/falco
        - -o
        - json_output=true
        - -o
        - json_include_output_property=true
        securityContext:
          privileged: true
        volumeMounts:
        - name: dev
          mountPath: /host/dev
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: alerts
          mountPath: /var/run/falco
        resources:
          limits:
            memory: 512Mi
            cpu: 500m

      - name: alert-processor
        image: example/alert-processor:v1.0
        command:
        - /processor
        - --alerts-socket=/var/run/falco/falco.sock
        - --backend=http://security-api:8080
        volumeMounts:
        - name: alerts
          mountPath: /var/run/falco
        resources:
          limits:
            memory: 100Mi
            cpu: 100m

      - name: vulnerability-scanner
        image: aquasec/trivy:0.48.0
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            trivy image --format json --output /shared/scan-results.json \
              $(crictl images -q)
            sleep 3600
          done
        volumeMounts:
        - name: shared
          mountPath: /shared
        - name: containerd-socket
          mountPath: /var/run/containerd
        resources:
          limits:
            memory: 1Gi
            cpu: 500m

      - name: compliance-checker
        image: example/compliance-checker:v2.0
        command:
        - /checker
        - --scan-results=/shared/scan-results.json
        - --report-interval=1h
        volumeMounts:
        - name: shared
          mountPath: /shared
        resources:
          limits:
            memory: 100Mi
            cpu: 100m

      volumes:
      - name: dev
        hostPath:
          path: /dev
      - name: proc
        hostPath:
          path: /proc
      - name: alerts
        emptyDir: {}
      - name: shared
        emptyDir: {}
      - name: containerd-socket
        hostPath:
          path: /var/run/containerd
```

This stack provides runtime security, vulnerability scanning, and compliance checking together.

## Resource sharing patterns

Use shared volumes and localhost networking effectively:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: data-processing-stack
  namespace: data
spec:
  selector:
    matchLabels:
      app: data-stack
  template:
    metadata:
      labels:
        app: data-stack
    spec:
      containers:
      - name: data-collector
        image: example/collector:v1.0
        command:
        - /collector
        - --output-dir=/shared/raw
        volumeMounts:
        - name: shared-data
          mountPath: /shared
        resources:
          limits:
            memory: 200Mi
            cpu: 200m

      - name: data-processor
        image: example/processor:v1.0
        command:
        - /processor
        - --input-dir=/shared/raw
        - --output-dir=/shared/processed
        volumeMounts:
        - name: shared-data
          mountPath: /shared
        resources:
          limits:
            memory: 500Mi
            cpu: 500m

      - name: data-exporter
        image: example/exporter:v1.0
        command:
        - /exporter
        - --input-dir=/shared/processed
        - --api-endpoint=http://localhost:8080
        volumeMounts:
        - name: shared-data
          mountPath: /shared
        resources:
          limits:
            memory: 200Mi
            cpu: 200m

      - name: api-server
        image: example/api-server:v1.0
        ports:
        - containerPort: 8080
        resources:
          limits:
            memory: 100Mi
            cpu: 100m

      volumes:
      - name: shared-data
        emptyDir:
          sizeLimit: 10Gi
```

Containers communicate via localhost and share data through volumes.

## Conclusion

Multi-container DaemonSets enable you to deploy complementary node services that work together efficiently. By sharing network namespaces and volumes, containers can coordinate operations without network overhead. This pattern is ideal for monitoring stacks, service mesh components, security tools, and any scenario where multiple specialized services need to run together on every node. Proper resource allocation and container coordination ensure reliable operation across your cluster.
