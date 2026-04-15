# How to Set Resource Requests and Limits for ClickHouse on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kubernetes, Resource Management, CPU, Memory, Limit, Production

Description: Configure CPU and memory requests and limits for ClickHouse pods on Kubernetes to ensure stable scheduling, prevent OOM kills, and enable proper capacity planning.

---

Running ClickHouse on Kubernetes requires careful resource configuration. Unlike stateless services, ClickHouse is memory- and CPU-intensive: queries can buffer large intermediate results and saturate cores. Setting incorrect requests and limits leads to OOM kills, throttling, or poor scheduling decisions by the Kubernetes scheduler.

## Recommended Resource Configuration

For a production ClickHouse shard with 128 GB RAM and 16 vCPU on the node:

```yaml
resources:
  requests:
    cpu: "8"
    memory: "64Gi"
  limits:
    cpu: "16"
    memory: "96Gi"
```

**Key rules:**
- Set memory request equal to at least 50% of node RAM so the pod is scheduled on a node with enough headroom.
- Do NOT set memory limit equal to the node's total RAM - leave room for the OS and other system pods.
- CPU requests drive scheduling; CPU limits throttle bursting. For analytical workloads, consider omitting CPU limits to avoid throttling during heavy queries.

## ClickHouseInstallation CRD (Altinity Operator)

```yaml
apiVersion: clickhouse.altinity.com/v1
kind: ClickHouseInstallation
metadata:
  name: clickhouse-prod
  namespace: analytics
spec:
  defaults:
    templates:
      podTemplate: clickhouse-pod-template

  templates:
    podTemplates:
      - name: clickhouse-pod-template
        spec:
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:24.3
              resources:
                requests:
                  cpu: "8"
                  memory: "64Gi"
                limits:
                  cpu: "16"
                  memory: "96Gi"
              volumeMounts:
                - name: data
                  mountPath: /var/lib/clickhouse

    volumeClaimTemplates:
      - name: data
        spec:
          accessModes: [ReadWriteOnce]
          storageClassName: premium-ssd
          resources:
            requests:
              storage: 500Gi
```

## StatefulSet with Resource Config (Without Operator)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: clickhouse
  namespace: analytics
spec:
  serviceName: clickhouse-headless
  replicas: 1
  selector:
    matchLabels:
      app: clickhouse
  template:
    metadata:
      labels:
        app: clickhouse
    spec:
      containers:
        - name: clickhouse
          image: clickhouse/clickhouse-server:24.3
          ports:
            - name: http
              containerPort: 8123
            - name: native
              containerPort: 9000
          resources:
            requests:
              cpu: "8"
              memory: "64Gi"
            limits:
              cpu: "16"
              memory: "96Gi"
          readinessProbe:
            httpGet:
              path: /ping
              port: 8123
            initialDelaySeconds: 30
            periodSeconds: 10
          volumeMounts:
            - name: data
              mountPath: /var/lib/clickhouse
            - name: config
              mountPath: /etc/clickhouse-server/config.d
      volumes:
        - name: config
          configMap:
            name: clickhouse-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: premium-ssd
        resources:
          requests:
            storage: 500Gi
```

## Tune ClickHouse Memory Settings to Match Limits

ClickHouse has its own memory management separate from container limits. Configure it to stay within the container's limit:

```xml
<!-- /etc/clickhouse-server/config.d/memory.xml -->
<clickhouse>
    <!-- Use ~85% of container memory limit -->
    <max_server_memory_usage_to_ram_ratio>0.85</max_server_memory_usage_to_ram_ratio>
</clickhouse>
```

Per-query and per-user memory limits are session-level settings. Configure them in the user profiles, not in the server config:

```xml
<!-- /etc/clickhouse-server/users.d/memory.xml -->
<clickhouse>
    <profiles>
        <default>
            <!-- Per-query limit -->
            <max_memory_usage>10000000000</max_memory_usage>
            <!-- Per-user limit -->
            <max_memory_usage_for_user>30000000000</max_memory_usage_for_user>
        </default>
    </profiles>
</clickhouse>
```

## Limit Range for Namespace Defaults

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: analytics-defaults
  namespace: analytics
spec:
  limits:
    - type: Container
      default:
        cpu: "2"
        memory: "4Gi"
      defaultRequest:
        cpu: "500m"
        memory: "2Gi"
```

## Summary

ClickHouse resource configuration on Kubernetes requires balancing scheduler visibility (requests) with hard safety boundaries (limits). Set memory requests at 50-80% of the node's available RAM, configure ClickHouse's internal memory ratio to match the container limit, and consider omitting CPU limits for query-intensive deployments. Use the Altinity operator for production clusters to simplify configuration management.
