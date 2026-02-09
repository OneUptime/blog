# How to Implement DaemonSet with hostNetwork for Node-Level Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, hostNetwork, Node Networking, Performance

Description: Learn when and how to use hostNetwork mode in Kubernetes DaemonSets for direct access to node networking, enabling low-latency monitoring and network-critical services.

---

Kubernetes pods normally use isolated network namespaces, but some workloads need direct access to the host's network stack. The `hostNetwork: true` setting allows DaemonSet pods to share the node's network namespace, providing access to all network interfaces and eliminating network overhead. This guide explores when to use hostNetwork and how to implement it safely.

## Understanding hostNetwork Mode

When `hostNetwork: true` is set, pods bypass Kubernetes networking and use the host's network directly. They see all network interfaces, can bind to any port on the host, and share the host's IP address. This eliminates CNI overhead and provides the lowest possible network latency.

Common use cases include network monitoring tools that need to see all traffic, load balancers that must bind to ports 80/443, MetalLB speakers for bare-metal load balancing, and network performance measurement tools where CNI overhead skews results.

However, hostNetwork has drawbacks. Pods can conflict over ports, security boundaries weaken since pods share the host network, and multiple pods can't run on the same node if they bind to the same port.

## Deploying Network Monitor with hostNetwork

Deploy a packet capture agent using hostNetwork:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: packet-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: packet-monitor
  template:
    metadata:
      labels:
        app: packet-monitor
    spec:
      hostNetwork: true
      hostPID: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: monitor
        image: nicolaka/netshoot:latest
        command:
        - sh
        - -c
        - |
          tcpdump -i any -w /captures/$(hostname)-$(date +%Y%m%d-%H%M%S).pcap \
            -G 3600 -W 24 -z gzip
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
            - NET_RAW
        volumeMounts:
        - name: captures
          mountPath: /captures
        resources:
          limits:
            memory: 512Mi
            cpu: 500m
          requests:
            memory: 256Mi
            cpu: 200m
      volumes:
      - name: captures
        hostPath:
          path: /var/log/packet-captures
          type: DirectoryOrCreate
      tolerations:
      - operator: Exists
```

The `dnsPolicy: ClusterFirstWithHostNet` ensures DNS resolution works correctly despite hostNetwork mode.

## Implementing MetalLB Speaker

MetalLB requires hostNetwork to announce IP addresses:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: speaker
  namespace: metallb-system
  labels:
    app: metallb
    component: speaker
spec:
  selector:
    matchLabels:
      app: metallb
      component: speaker
  template:
    metadata:
      labels:
        app: metallb
        component: speaker
    spec:
      hostNetwork: true
      serviceAccountName: speaker
      terminationGracePeriodSeconds: 2
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
      - operator: Exists
      containers:
      - name: speaker
        image: quay.io/metallb/speaker:v0.13.0
        args:
        - --port=7472
        - --log-level=info
        env:
        - name: METALLB_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: METALLB_HOST
          valueFrom:
            fieldRef:
              fieldPath: status.hostIP
        - name: METALLB_ML_BIND_ADDR
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        - name: METALLB_ML_LABELS
          value: "app=metallb,component=speaker"
        - name: METALLB_ML_BIND_PORT
          value: "7472"
        ports:
        - name: memberlist
          containerPort: 7472
        - name: metrics
          containerPort: 7473
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            add:
            - NET_RAW
            drop:
            - ALL
          readOnlyRootFilesystem: true
        livenessProbe:
          httpGet:
            path: /metrics
            port: metrics
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 1
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /metrics
            port: metrics
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 1
          successThreshold: 1
          failureThreshold: 3
```

## Deploying Node Exporter with hostNetwork

Node Exporter needs hostNetwork for accurate network metrics:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
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
        - --collector.netclass.ignored-devices=^(veth.*|cali.*|flannel.*|docker0)$$
        - --web.listen-address=:9100
        ports:
        - name: metrics
          containerPort: 9100
          hostPort: 9100
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
            cpu: 250m
            memory: 180Mi
          requests:
            cpu: 100m
            memory: 128Mi
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
      tolerations:
      - operator: Exists
```

## Handling Port Conflicts

Prevent port conflicts by using unique ports per service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: port-assignments
  namespace: kube-system
data:
  assignments: |
    # Reserved host ports for DaemonSets
    9100: node-exporter
    9256: node-problem-detector
    9472: metallb-speaker
    10250: kubelet
    10255: kubelet-readonly
    10256: kube-proxy
```

Implement admission webhook to prevent conflicts:

```go
package main

import (
    "fmt"
    corev1 "k8s.io/api/core/v1"
)

func validateHostPorts(pod *corev1.Pod) error {
    usedPorts := make(map[int32]string)

    for _, container := range pod.Spec.Containers {
        for _, port := range container.Ports {
            if port.HostPort > 0 {
                if existing, ok := usedPorts[port.HostPort]; ok {
                    return fmt.Errorf("port %d already used by %s", port.HostPort, existing)
                }
                usedPorts[port.HostPort] = container.Name
            }
        }
    }

    return nil
}
```

## Implementing DNS Resolution

Configure DNS properly for hostNetwork pods:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: network-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: network-agent
  template:
    metadata:
      labels:
        app: network-agent
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: agent
        image: network-agent:latest
        env:
        # Override DNS if needed
        - name: NAMESERVER
          value: "10.96.0.10"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

The `dnsPolicy: ClusterFirstWithHostNet` configures the pod to use cluster DNS despite hostNetwork mode.

## Monitoring hostNetwork Performance

Track network performance metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hostnetwork-metrics
  namespace: monitoring
data:
  queries.yaml: |
    groups:
    - name: host-network-performance
      rules:
      - record: node_network_receive_bytes_per_second
        expr: rate(node_network_receive_bytes_total[5m])

      - record: node_network_transmit_bytes_per_second
        expr: rate(node_network_transmit_bytes_total[5m])

      - alert: HighNetworkUtilization
        expr: |
          rate(node_network_receive_bytes_total{device!~"lo|veth.*"}[5m]) > 1000000000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High network utilization on {{ $labels.instance }}"
```

## Securing hostNetwork Pods

Implement security restrictions for hostNetwork workloads:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: hostnetwork-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  hostNetwork: true
  hostPorts:
  - min: 9000
    max: 10000
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'secret'
  - 'hostPath'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

Apply NetworkPolicies to limit traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hostnetwork-agents
  namespace: monitoring
spec:
  podSelector:
    matchLabels:
      hostNetwork: "true"
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9100
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
```

## Best Practices

Only use hostNetwork when absolutely necessary. The security and isolation trade-offs make it unsuitable for most workloads.

Document port allocations clearly. Conflicts are difficult to debug and can cause DaemonSet scheduling failures.

Use `dnsPolicy: ClusterFirstWithHostNet` to maintain proper DNS resolution in hostNetwork pods.

Implement comprehensive monitoring for hostNetwork pods. Network issues affect these pods differently than normal pods.

Apply security policies to restrict hostNetwork usage. Require explicit approval for any DaemonSet using hostNetwork.

Test failover scenarios. hostNetwork pods behave differently during network partitions and node failures.

## Conclusion

HostNetwork mode provides direct access to node networking, enabling low-latency monitoring, load balancing, and network management workloads. While powerful, hostNetwork weakens security boundaries and requires careful port management. Reserve it for infrastructure components that genuinely need host-level network access, and implement proper security controls to mitigate risks.

Use hostNetwork judiciously for DaemonSets requiring direct node network access.
