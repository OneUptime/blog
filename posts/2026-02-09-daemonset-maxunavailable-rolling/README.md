# How to configure DaemonSet maxUnavailable for controlled rolling updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Rolling Updates

Description: Learn how to configure maxUnavailable in DaemonSets to control the pace of rolling updates and minimize service disruption across your cluster nodes.

---

When updating DaemonSets in Kubernetes, controlling the rollout speed is critical to maintaining service availability. The maxUnavailable parameter determines how many pods can be unavailable during an update, directly impacting your cluster's stability and performance during deployments.

## Understanding maxUnavailable in DaemonSets

Unlike Deployments that use maxSurge and maxUnavailable together, DaemonSets only support maxUnavailable because they maintain exactly one pod per node. This parameter defines the maximum number of DaemonSet pods that can be unavailable during the update process.

The maxUnavailable value can be specified as an absolute number or as a percentage of total nodes. For example, if you have 10 nodes and set maxUnavailable to 20%, only 2 pods can be unavailable at any time during the rollout.

## Basic DaemonSet with maxUnavailable configuration

Here's a DaemonSet configuration with maxUnavailable set to control update speed:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: logging-agent
  namespace: kube-system
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Update one node at a time
  selector:
    matchLabels:
      app: logging-agent
  template:
    metadata:
      labels:
        app: logging-agent
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 100Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

This configuration updates only one node at a time, providing the safest but slowest rollout strategy.

## Using percentage-based maxUnavailable

For larger clusters, absolute numbers become unwieldy. Percentage-based values scale automatically with cluster size:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
  namespace: monitoring
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%  # Update 25% of nodes simultaneously
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        ports:
        - containerPort: 9100
          hostPort: 9100
          name: metrics
        securityContext:
          privileged: true
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
```

With a 40-node cluster, this configuration allows up to 10 pods to be unavailable simultaneously, significantly speeding up the rollout while maintaining service availability.

## Conservative update strategy for critical services

For critical node services like network plugins or security agents, use the most conservative approach:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: network-policy-agent
  namespace: kube-system
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Extremely conservative
  selector:
    matchLabels:
      app: network-policy
  template:
    metadata:
      labels:
        app: network-policy
    spec:
      hostNetwork: true  # Critical for network functionality
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
        securityContext:
          privileged: true
        livenessProbe:
          httpGet:
            path: /liveness
            port: 9099
          periodSeconds: 10
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /readiness
            port: 9099
          periodSeconds: 10
```

This ensures that network functionality remains stable by updating only one node at a time.

## Aggressive update strategy for non-critical workloads

For less critical DaemonSets like log collectors or monitoring agents, you can use more aggressive settings:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-shipper
  namespace: logging
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 50%  # Fast rollout
  selector:
    matchLabels:
      app: log-shipper
  template:
    metadata:
      labels:
        app: log-shipper
    spec:
      containers:
      - name: filebeat
        image: elastic/filebeat:8.11.0
        args:
        - "-c"
        - "/etc/filebeat.yml"
        - "-e"
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: filebeat-config
      - name: varlog
        hostPath:
          path: /var/log
```

This configuration sacrifices some safety for deployment speed, which is acceptable when missing logs temporarily won't cause critical issues.

## Monitoring rollout progress

After applying your DaemonSet update, monitor the rollout progress:

```bash
# Watch the rollout status
kubectl rollout status daemonset/logging-agent -n kube-system

# Check which pods are being updated
kubectl get pods -n kube-system -l app=logging-agent -o wide

# View detailed rollout information
kubectl describe daemonset logging-agent -n kube-system
```

The output shows you how many pods are ready, updated, and available during the rollout process.

## Combining maxUnavailable with node selectors

You can also control which nodes get updated first by combining maxUnavailable with node labels:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: security-agent
  namespace: security
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 10%
  selector:
    matchLabels:
      app: security-agent
  template:
    metadata:
      labels:
        app: security-agent
    spec:
      nodeSelector:
        node-role.kubernetes.io/worker: ""
      containers:
      - name: falco
        image: falcosecurity/falco:0.36.2
        securityContext:
          privileged: true
        volumeMounts:
        - name: dev
          mountPath: /host/dev
        - name: proc
          mountPath: /host/proc
          readOnly: true
      volumes:
      - name: dev
        hostPath:
          path: /dev
      - name: proc
        hostPath:
          path: /proc
```

This ensures the security agent runs only on worker nodes and updates them gradually.

## Best practices for maxUnavailable configuration

Start conservatively with low values like 1 or 10%, especially for critical infrastructure components. Monitor your first few rollouts carefully and gradually increase the value if everything works smoothly.

Consider your cluster size when choosing between absolute numbers and percentages. For small clusters under 20 nodes, absolute numbers provide better control. For larger clusters, percentages scale better.

Always include proper health checks in your pod specifications. The maxUnavailable setting works in conjunction with readiness probes to ensure pods are truly ready before moving to the next node.

Test your rollout strategy in a staging environment before applying it to production. This helps you identify the optimal maxUnavailable value for your specific workload.

Remember that the actual rollout speed also depends on pod startup time, image pull duration, and health check intervals. Factor these into your calculations when choosing maxUnavailable values.

## Conclusion

The maxUnavailable parameter in DaemonSet rolling updates gives you precise control over deployment speed and risk. By carefully tuning this value based on your service criticality and cluster size, you can achieve the right balance between fast deployments and high availability. Start with conservative values and gradually optimize based on your monitoring and testing results.
