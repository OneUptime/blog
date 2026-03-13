# How to Use DaemonSets for Network Plugin Agents like Calico or Cilium

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Networking, CNI, Calico, Cilium

Description: Learn how to deploy Container Network Interface (CNI) plugins using Kubernetes DaemonSets to provide pod networking, network policies, and service mesh capabilities across your cluster.

---

Container networking in Kubernetes relies on CNI plugins that must run on every node to configure pod networking interfaces. DaemonSets ensure network plugins deploy consistently across all nodes, enabling pod-to-pod communication and network policy enforcement. This guide demonstrates deploying popular CNI solutions using DaemonSets.

## Understanding CNI Plugin Architecture

CNI plugins run as privileged DaemonSets with access to host networking and filesystems. They configure network interfaces for pods, implement network policies, and provide service load balancing. Each node needs a CNI agent to handle networking for pods scheduled on that node.

The agents typically install CNI binaries to /opt/cni/bin and configuration to /etc/cni/net.d. They interact with the container runtime through the CNI specification to set up networking when pods start or stop.

## Deploying Calico CNI

Calico provides networking and network policy using BGP or overlay networks:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: calico-node
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-node
rules:
- apiGroups: [""]
  resources:
  - pods
  - nodes
  - namespaces
  verbs:
  - get
- apiGroups: [""]
  resources:
  - endpoints
  - services
  verbs:
  - watch
  - list
  - get
- apiGroups: [""]
  resources:
  - configmaps
  verbs:
  - get
- apiGroups: [""]
  resources:
  - nodes/status
  verbs:
  - patch
  - update
- apiGroups: ["networking.k8s.io"]
  resources:
  - networkpolicies
  verbs:
  - watch
  - list
- apiGroups: ["crd.projectcalico.org"]
  resources:
  - felixconfigurations
  - bgpconfigurations
  - bgppeers
  - globalbgpconfigs
  - globalnetworksets
  - hostendpoints
  - ippools
  - networkpolicies
  - networksets
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: calico-node
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: calico-node
subjects:
- kind: ServiceAccount
  name: calico-node
  namespace: kube-system
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-node
  namespace: kube-system
  labels:
    k8s-app: calico-node
spec:
  selector:
    matchLabels:
      k8s-app: calico-node
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        k8s-app: calico-node
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      hostNetwork: true
      tolerations:
      - operator: Exists
        effect: NoSchedule
      - operator: Exists
        effect: NoExecute
      serviceAccountName: calico-node
      terminationGracePeriodSeconds: 0
      priorityClassName: system-node-critical
      initContainers:
      - name: upgrade-ipam
        image: calico/cni:v3.27.0
        command: ["/opt/cni/bin/calico-ipam", "-upgrade"]
        env:
        - name: KUBERNETES_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: CALICO_NETWORKING_BACKEND
          valueFrom:
            configMapKeyRef:
              name: calico-config
              key: calico_backend
        volumeMounts:
        - name: cni-net-dir
          mountPath: /host/etc/cni/net.d
      - name: install-cni
        image: calico/cni:v3.27.0
        command: ["/opt/cni/bin/install"]
        env:
        - name: CNI_CONF_NAME
          value: "10-calico.conflist"
        - name: CNI_NETWORK_CONFIG
          valueFrom:
            configMapKeyRef:
              name: calico-config
              key: cni_network_config
        - name: KUBERNETES_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: cni-bin-dir
          mountPath: /host/opt/cni/bin
        - name: cni-net-dir
          mountPath: /host/etc/cni/net.d
      containers:
      - name: calico-node
        image: calico/node:v3.27.0
        env:
        - name: DATASTORE_TYPE
          value: "kubernetes"
        - name: WAIT_FOR_DATASTORE
          value: "true"
        - name: NODENAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: CALICO_NETWORKING_BACKEND
          valueFrom:
            configMapKeyRef:
              name: calico-config
              key: calico_backend
        - name: CLUSTER_TYPE
          value: "k8s,bgp"
        - name: IP
          value: "autodetect"
        - name: CALICO_IPV4POOL_IPIP
          value: "Always"
        - name: CALICO_IPV4POOL_VXLAN
          value: "Never"
        - name: FELIX_IPINIPMTU
          value: "1440"
        - name: FELIX_VXLANMTU
          value: "1410"
        - name: FELIX_WIREGUARDMTU
          value: "1420"
        - name: CALICO_DISABLE_FILE_LOGGING
          value: "true"
        - name: FELIX_DEFAULTENDPOINTTOHOSTACTION
          value: "ACCEPT"
        - name: FELIX_IPV6SUPPORT
          value: "false"
        - name: FELIX_LOGSEVERITYSCREEN
          value: "info"
        - name: FELIX_HEALTHENABLED
          value: "true"
        securityContext:
          privileged: true
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /liveness
            port: 9099
            host: localhost
          periodSeconds: 10
          initialDelaySeconds: 10
          failureThreshold: 6
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /readiness
            port: 9099
            host: localhost
          periodSeconds: 10
        volumeMounts:
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
        - name: xtables-lock
          mountPath: /run/xtables.lock
        - name: var-run-calico
          mountPath: /var/run/calico
        - name: var-lib-calico
          mountPath: /var/lib/calico
        - name: cni-bin-dir
          mountPath: /host/opt/cni/bin
        - name: cni-net-dir
          mountPath: /host/etc/cni/net.d
        - name: policysync
          mountPath: /var/run/nodeagent
      volumes:
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: var-run-calico
        hostPath:
          path: /var/run/calico
      - name: var-lib-calico
        hostPath:
          path: /var/lib/calico
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: cni-bin-dir
        hostPath:
          path: /opt/cni/bin
      - name: cni-net-dir
        hostPath:
          path: /etc/cni/net.d
      - name: policysync
        hostPath:
          type: DirectoryOrCreate
          path: /var/run/nodeagent
```

## Deploying Cilium CNI

Cilium provides eBPF-based networking with advanced observability:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cilium
  namespace: kube-system
  labels:
    k8s-app: cilium
spec:
  selector:
    matchLabels:
      k8s-app: cilium
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 2
  template:
    metadata:
      labels:
        k8s-app: cilium
    spec:
      priorityClassName: system-node-critical
      serviceAccountName: cilium
      hostNetwork: true
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                k8s-app: cilium
            topologyKey: kubernetes.io/hostname
      initContainers:
      - name: mount-cgroup
        image: quay.io/cilium/cilium:v1.14.0
        imagePullPolicy: IfNotPresent
        command: ["sh", "-c"]
        args:
        - |
          cp /usr/bin/cilium-mount /hostbin/cilium-mount && nsenter --cgroup=/hostproc/1/ns/cgroup --mount=/hostproc/1/ns/mnt "${BIN_PATH}/cilium-mount" $CGROUP_ROOT
        env:
        - name: CGROUP_ROOT
          value: /run/cilium/cgroupv2
        - name: BIN_PATH
          value: /opt/cni/bin
        volumeMounts:
        - name: hostproc
          mountPath: /hostproc
        - name: cni-path
          mountPath: /hostbin
        securityContext:
          privileged: true
      - name: install-cni-binaries
        image: quay.io/cilium/cilium:v1.14.0
        command:
        - "/install-plugin.sh"
        volumeMounts:
        - name: cni-path
          mountPath: /host/opt/cni/bin
      containers:
      - name: cilium-agent
        image: quay.io/cilium/cilium:v1.14.0
        command:
        - cilium-agent
        args:
        - --config-dir=/tmp/cilium/config-map
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: CILIUM_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: CILIUM_CLUSTERMESH_CONFIG
          value: /var/lib/cilium/clustermesh/
        - name: GOMEMLIMIT
          valueFrom:
            resourceFieldRef:
              resource: limits.memory
              divisor: "1"
        lifecycle:
          postStart:
            exec:
              command:
              - bash
              - -c
              - |
                /cni-install.sh --enable-debug=false --cni-exclusive=true --log-file=/var/run/cilium/cilium-cni.log
          preStop:
            exec:
              command:
              - /cni-uninstall.sh
        livenessProbe:
          httpGet:
            path: /healthz
            port: 9879
            scheme: HTTP
            httpHeaders:
            - name: brief
              value: "true"
          failureThreshold: 10
          periodSeconds: 30
          successThreshold: 1
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /healthz
            port: 9879
            scheme: HTTP
            httpHeaders:
            - name: brief
              value: "true"
          failureThreshold: 3
          periodSeconds: 30
          successThreshold: 1
          timeoutSeconds: 5
        ports:
        - containerPort: 9962
          hostPort: 9962
          name: prometheus
          protocol: TCP
        - containerPort: 9963
          hostPort: 9963
          name: envoy-metrics
          protocol: TCP
        - containerPort: 4244
          hostPort: 4244
          name: hubble-metrics
          protocol: TCP
        securityContext:
          privileged: true
          capabilities:
            add:
            - NET_ADMIN
            - SYS_MODULE
            - SYS_ADMIN
            - SYS_RESOURCE
        volumeMounts:
        - name: bpf-maps
          mountPath: /sys/fs/bpf
          mountPropagation: HostToContainer
        - name: cilium-run
          mountPath: /var/run/cilium
        - name: cni-path
          mountPath: /host/opt/cni/bin
        - name: etc-cni-netd
          mountPath: /host/etc/cni/net.d
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
        - name: xtables-lock
          mountPath: /run/xtables.lock
        - name: clustermesh-secrets
          mountPath: /var/lib/cilium/clustermesh
          readOnly: true
        - name: cilium-config-path
          mountPath: /tmp/cilium/config-map
          readOnly: true
        - name: host-proc-sys-net
          mountPath: /host/proc/sys/net
        - name: host-proc-sys-kernel
          mountPath: /host/proc/sys/kernel
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
      restartPolicy: Always
      tolerations:
      - operator: Exists
      volumes:
      - name: cilium-run
        hostPath:
          path: /var/run/cilium
          type: DirectoryOrCreate
      - name: bpf-maps
        hostPath:
          path: /sys/fs/bpf
          type: DirectoryOrCreate
      - name: hostproc
        hostPath:
          path: /proc
          type: Directory
      - name: cni-path
        hostPath:
          path: /opt/cni/bin
          type: DirectoryOrCreate
      - name: etc-cni-netd
        hostPath:
          path: /etc/cni/net.d
          type: DirectoryOrCreate
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: clustermesh-secrets
        secret:
          secretName: cilium-clustermesh
          optional: true
      - name: cilium-config-path
        configMap:
          name: cilium-config
      - name: host-proc-sys-net
        hostPath:
          path: /proc/sys/net
          type: Directory
      - name: host-proc-sys-kernel
        hostPath:
          path: /proc/sys/kernel
          type: Directory
```

## Deploying Flannel CNI

Flannel provides simple overlay networking:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-flannel-ds
  namespace: kube-flannel
  labels:
    app: flannel
spec:
  selector:
    matchLabels:
      app: flannel
  template:
    metadata:
      labels:
        app: flannel
    spec:
      hostNetwork: true
      priorityClassName: system-node-critical
      tolerations:
      - operator: Exists
        effect: NoSchedule
      serviceAccountName: flannel
      initContainers:
      - name: install-cni-plugin
        image: docker.io/rancher/mirrored-flannelcni-flannel-cni-plugin:v1.2.0
        command:
        - cp
        args:
        - -f
        - /flannel
        - /opt/cni/bin/flannel
        volumeMounts:
        - name: cni-plugin
          mountPath: /opt/cni/bin
      - name: install-cni
        image: docker.io/rancher/mirrored-flannelcni-flannel:v0.22.0
        command:
        - cp
        args:
        - -f
        - /etc/kube-flannel/cni-conf.json
        - /etc/cni/net.d/10-flannel.conflist
        volumeMounts:
        - name: cni
          mountPath: /etc/cni/net.d
        - name: flannel-cfg
          mountPath: /etc/kube-flannel/
      containers:
      - name: kube-flannel
        image: docker.io/rancher/mirrored-flannelcni-flannel:v0.22.0
        command:
        - /opt/bin/flanneld
        args:
        - --ip-masq
        - --kube-subnet-mgr
        resources:
          requests:
            cpu: "100m"
            memory: "50Mi"
          limits:
            cpu: "200m"
            memory: "100Mi"
        securityContext:
          privileged: false
          capabilities:
            add: ["NET_ADMIN", "NET_RAW"]
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: EVENT_QUEUE_DEPTH
          value: "5000"
        volumeMounts:
        - name: run
          mountPath: /run/flannel
        - name: flannel-cfg
          mountPath: /etc/kube-flannel/
        - name: xtables-lock
          mountPath: /run/xtables.lock
      volumes:
      - name: run
        hostPath:
          path: /run/flannel
      - name: cni-plugin
        hostPath:
          path: /opt/cni/bin
      - name: cni
        hostPath:
          path: /etc/cni/net.d
      - name: flannel-cfg
        configMap:
          name: kube-flannel-cfg
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
```

## Monitoring CNI Plugin Health

Track CNI plugin status with Prometheus:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cni-plugin-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: cni-plugins
      rules:
      - alert: CNIPluginDown
        expr: up{job="calico-node"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CNI plugin down on {{ $labels.instance }}"

      - alert: NetworkPolicyErrors
        expr: rate(calico_policy_error_count[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "Network policy errors detected"

      - alert: HighIPAMAllocationFailures
        expr: rate(calico_ipam_allocations_failed[5m]) > 1
        labels:
          severity: critical
        annotations:
          summary: "IPAM failing to allocate IPs"
```

## Best Practices

Deploy CNI plugins with `priorityClassName: system-node-critical` to ensure they survive resource pressure.

Use RollingUpdate strategy with maxUnavailable: 1 for safer updates. Network disruptions during updates can cascade across workloads.

Implement comprehensive health checks. CNI failures prevent pod scheduling and break cluster networking.

Monitor CNI metrics for allocation failures, policy errors, and performance issues.

Test network policy enforcement after deployments. Verify policies actually block unauthorized traffic.

## Conclusion

CNI plugins deployed as DaemonSets form the foundation of Kubernetes networking. Whether using Calico for policy enforcement, Cilium for eBPF-powered networking, or Flannel for simplicity, the DaemonSet pattern ensures every node has the networking components needed for pod communication. Proper CNI deployment is critical for cluster functionality, making careful configuration and monitoring essential.

Implement robust CNI solutions with DaemonSets to enable reliable pod networking across your cluster.
