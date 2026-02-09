# How to implement Kustomize components for reusable configuration snippets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Configuration

Description: Learn how to create reusable Kustomize components that can be mixed and matched across different overlays for modular configuration management.

---

Kustomize components are reusable configuration modules that you can optionally include in your overlays. Unlike bases that are always applied, components are opt-in additions that provide specific features like monitoring, security hardening, or debugging capabilities. This modularity reduces duplication and makes complex configurations more maintainable.

## Understanding Kustomize components

Components differ from bases in that they are not automatically included when referenced. Instead, you explicitly choose which components to apply in each overlay. This makes them perfect for optional features that some environments need but others don't.

A component is a directory with a kustomization file that has `kind: Component` instead of `kind: Kustomization`. Components can include resources, patches, config generators, and transformers just like regular kustomizations.

## Creating a basic component

Create a monitoring component that adds Prometheus annotations:

```yaml
# components/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

patches:
- patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: not-important
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      template:
        metadata:
          annotations:
            prometheus.io/scrape: "true"
            prometheus.io/port: "9090"
  target:
    kind: Deployment

resources:
- servicemonitor.yaml
```

The ServiceMonitor resource:

```yaml
# components/monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-metrics
spec:
  selector:
    matchLabels:
      app: web-app
  endpoints:
  - port: metrics
    interval: 30s
```

Use it in an overlay:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

components:
- ../../components/monitoring
```

## Security hardening component

Create a component that enforces security best practices:

```yaml
# components/security/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

patches:
- patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: not-important
    spec:
      template:
        spec:
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
            fsGroup: 2000
            seccompProfile:
              type: RuntimeDefault
          containers:
          - name: not-important
            securityContext:
              allowPrivilegeEscalation: false
              readOnlyRootFilesystem: true
              capabilities:
                drop:
                - ALL
  target:
    kind: Deployment

resources:
- networkpolicy.yaml
```

Network policy for the component:

```yaml
# components/security/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}
```

Apply it only in production:

```yaml
# overlays/production/kustomization.yaml
components:
- ../../components/security
- ../../components/monitoring
```

## Horizontal pod autoscaling component

Create an HPA component:

```yaml
# components/autoscaling/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
- hpa.yaml

patches:
- patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: not-important
    spec:
      replicas: null
  target:
    kind: Deployment
```

The HPA resource:

```yaml
# components/autoscaling/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

The patch removes the replicas field so HPA can control it.

## Debug mode component

Create a component that enables debugging:

```yaml
# components/debug/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

patches:
- patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: not-important
    spec:
      template:
        spec:
          containers:
          - name: not-important
            env:
            - name: LOG_LEVEL
              value: debug
            - name: DEBUG
              value: "true"
            - name: PROFILING_ENABLED
              value: "true"
  target:
    kind: Deployment

resources:
- debug-service.yaml
```

Debug service for port forwarding:

```yaml
# components/debug/debug-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: debug-port
spec:
  type: NodePort
  selector:
    app: web-app
  ports:
  - port: 6060
    targetPort: 6060
    name: pprof
```

Use it temporarily in staging:

```yaml
# overlays/staging/kustomization.yaml
components:
- ../../components/debug
```

## Service mesh component

Create a component for service mesh integration:

```yaml
# components/istio/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

patches:
- patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: not-important
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "true"
            proxy.istio.io/config: |
              holdApplicationUntilProxyStarts: true
          labels:
            version: v1
  target:
    kind: Deployment

resources:
- virtualservice.yaml
- destinationrule.yaml
```

Virtual service definition:

```yaml
# components/istio/virtualservice.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routes
spec:
  hosts:
  - web-app
  http:
  - route:
    - destination:
        host: web-app
        subset: v1
      weight: 100
```

## Resource management component

Component for resource quotas and limits:

```yaml
# components/resource-management/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
- resourcequota.yaml
- limitrange.yaml

patches:
- patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: not-important
    spec:
      template:
        spec:
          containers:
          - name: not-important
            resources:
              requests:
                memory: "256Mi"
                cpu: "250m"
              limits:
                memory: "512Mi"
                cpu: "500m"
  target:
    kind: Deployment
```

Resource quota:

```yaml
# components/resource-management/resourcequota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    limits.cpu: "200"
    limits.memory: 400Gi
    pods: "100"
```

## Backup and restore component

Component for backup annotations and resources:

```yaml
# components/backup/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

patches:
- patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: not-important
      annotations:
        backup.velero.io/backup-volumes: data
    spec:
      template:
        metadata:
          labels:
            backup: enabled
  target:
    kind: Deployment

resources:
- schedule.yaml
```

Velero backup schedule:

```yaml
# components/backup/schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - production
    labelSelector:
      matchLabels:
        backup: enabled
    ttl: 720h
```

## Combining multiple components

Use multiple components together:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

components:
- ../../components/monitoring
- ../../components/security
- ../../components/autoscaling
- ../../components/istio
- ../../components/backup
```

Each component adds its functionality independently.

## Component with configuration

Create configurable components:

```yaml
# components/logging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

configMapGenerator:
- name: logging-config
  literals:
  - log_format=json
  - log_level=info
  - output=stdout

patches:
- patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: not-important
    spec:
      template:
        spec:
          containers:
          - name: not-important
            envFrom:
            - configMapRef:
                name: logging-config
            volumeMounts:
            - name: logs
              mountPath: /var/log
          volumes:
          - name: logs
            emptyDir: {}
  target:
    kind: Deployment
```

## Testing components

Test components in isolation:

```bash
# Create a test overlay
mkdir -p test/component-test

cat > test/component-test/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

components:
- ../../components/monitoring
EOF

# Build and validate
kustomize build test/component-test/

# Check specific component effect
kustomize build test/component-test/ | grep -A 5 "prometheus.io"
```

## Component organization

Organize components by feature:

```
components/
├── monitoring/
│   ├── kustomization.yaml
│   └── servicemonitor.yaml
├── security/
│   ├── kustomization.yaml
│   ├── networkpolicy.yaml
│   └── podsecuritypolicy.yaml
├── autoscaling/
│   ├── kustomization.yaml
│   └── hpa.yaml
├── debug/
│   ├── kustomization.yaml
│   └── debug-service.yaml
└── istio/
    ├── kustomization.yaml
    ├── virtualservice.yaml
    └── destinationrule.yaml
```

Each component is self-contained and independently testable.

## Conclusion

Kustomize components provide modular, reusable configuration blocks that you can mix and match across overlays. They enable a composable approach to Kubernetes configuration, where optional features like monitoring, security hardening, or autoscaling become plug-and-play modules. By organizing configuration into components, you reduce duplication and make it easy to maintain consistent features across multiple applications and environments.
