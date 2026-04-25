# Pod Affinity and Anti-Affinity in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Pod Affinity, Scheduling, Reliability

Description: Learn how to configure Kubernetes pod affinity and anti-affinity rules through Portainer to control pod placement for high availability and performance.

## What are Pod Affinity and Anti-Affinity?

Kubernetes scheduler uses affinity and anti-affinity rules to influence where pods are placed relative to other pods:

- **Pod Affinity** - Schedule a pod in the same topology domain, such as a node or zone, as pods with a matching label
- **Pod Anti-Affinity** - Schedule a pod away from the same topology domain as pods with a matching label

These rules are critical for:
- **High availability**: Spreading replicas across failure domains
- **Performance**: Co-locating tightly coupled services
- **Resource isolation**: Keeping resource-intensive workloads apart

## Configuring via Portainer

In Portainer, navigate to your Kubernetes environment → **Applications**. For a new application, click **Create from code** and choose **Manifest**, then paste a full YAML manifest including affinity rules into the **Web editor**. For an existing application, Portainer lets you edit manifests deployed from the Web Editor, and Portainer Business Edition also provides a **YAML** tab for direct YAML edits.

## Pod Anti-Affinity for High Availability

Spread replicas of the same application across different nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - web-app
              topologyKey: kubernetes.io/hostname
      containers:
        - name: web
          image: myapp/web:v2.0.0
```

This ensures no two scheduled `web-app` pods land on the same node. If the cluster does not have enough eligible nodes, extra replicas remain Pending.

## Preferred Anti-Affinity (Soft Rule)

Use preferred rules when hard constraints would prevent scheduling:

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: web-app
          topologyKey: topology.kubernetes.io/zone
```

Weight ranges from 1–100; higher weights are preferred more strongly.

## Pod Affinity for Co-Location

Co-locate a caching layer with the application that uses it:

```yaml
affinity:
  podAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 80
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: my-app
          topologyKey: kubernetes.io/hostname
```

This places the cache pod on the same node as `my-app` pods when possible.

## Topology Keys

Common `topologyKey` values, if those labels are present on your nodes:

| Key | Scope |
|---|---|
| `kubernetes.io/hostname` | Same node |
| `topology.kubernetes.io/zone` | Same availability zone |
| `topology.kubernetes.io/region` | Same region |

## Spreading Across Zones

For zone-level HA, combine anti-affinity with topology spread constraints:

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: web-app
```

## Applying in Portainer

1. Navigate to **Kubernetes → Applications**
2. Click **Create from code** for a new application, or open an existing application and click **Edit this application**
3. For a new application, choose **Manifest** and paste the full YAML with the `affinity` section into the **Web editor**
4. For an existing application, edit the manifest in the **Web editor** if it was deployed that way, or use the **YAML** tab in Portainer Business Edition
5. Click **Deploy** or **Update application**

Alternatively, deploy the manifest from a Git repository and enable Portainer's **GitOps updates**.

## Troubleshooting

**Pods stuck in Pending:**
```bash
kubectl describe pod <pod-name> | grep -A10 Events
```
Look for `FailedScheduling` events indicating affinity constraints cannot be satisfied.

**Check node labels:**
```bash
kubectl get nodes --show-labels
```

**Inspect scheduling details:**
```bash
kubectl describe pod <pending-pod>
```

## Best Practices

1. **Use `required` anti-affinity** for critical HA requirements; `preferred` for best-effort spreading
2. **Match topology keys** to your actual infrastructure topology (zones, nodes)
3. **Combine with topology spread constraints** for more granular spreading control
4. **Test with fewer replicas than nodes** first to verify constraints are satisfiable
5. **Monitor pod distribution** to ensure rules are being honored

## Conclusion

Pod affinity and anti-affinity rules give you precise control over Kubernetes scheduling behavior. Applied through Portainer's YAML editor or manifest feature, they help you build highly available and well-distributed workloads without complex manual node management.
