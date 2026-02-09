# How to use Kustomize strategic merge patches for selective updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Configuration

Description: Learn how to use Kustomize strategic merge patches to selectively modify Kubernetes resources without replacing entire configuration blocks.

---

Strategic merge patches in Kustomize allow you to modify specific fields in Kubernetes resources while preserving the rest of the configuration. Unlike JSON patches that require precise paths, strategic merge patches understand Kubernetes resource structure and merge intelligently based on field semantics. This makes them ideal for making targeted changes to complex resources.

## Understanding strategic merge patches

Strategic merge is the default patching strategy used by kubectl apply and Kustomize. It knows how to merge different field types: replace scalars, merge maps, and use merge keys for lists. This intelligence comes from Kubernetes API definitions that specify how each field should be merged.

For example, when patching a container's environment variables, strategic merge knows to merge by the name field rather than replacing the entire env array. This behavior makes patches more resilient to changes in the base configuration.

## Basic strategic merge patch

Here's a simple patch that adds environment variables:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: myapi:v1.0
        ports:
        - containerPort: 8080
```

Create a strategic merge patch:

```yaml
# overlays/production/env-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        env:
        - name: LOG_LEVEL
          value: info
        - name: DB_HOST
          value: prod-db.example.com
        - name: CACHE_ENABLED
          value: "true"
```

Reference it in kustomization:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

patchesStrategicMerge:
- env-patch.yaml
```

The patch adds environment variables without affecting other container configuration.

## Modifying resource limits

Patch resource requests and limits:

```yaml
# overlays/production/resources-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

This replaces the entire resources block while leaving other container fields unchanged.

## Adding volume mounts

Patch to add additional volume mounts:

```yaml
# overlays/production/volume-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        volumeMounts:
        - name: config
          mountPath: /etc/config
        - name: secrets
          mountPath: /etc/secrets
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-config
      - name: secrets
        secret:
          secretName: api-secrets
```

Strategic merge intelligently combines volumes and volume mounts.

## Modifying probe configurations

Update liveness and readiness probes:

```yaml
# overlays/production/probes-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

This adds comprehensive health checking to production deployments.

## Adding security context

Patch security settings:

```yaml
# overlays/production/security-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      containers:
      - name: api
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
```

Security patches can be applied consistently across all production deployments.

## Patching multiple containers

When a pod has multiple containers, specify which to patch:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
      - name: sidecar
        image: sidecar:latest
```

Patch specific containers:

```yaml
# overlays/production/multi-container-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          limits:
            memory: "1Gi"
      - name: sidecar
        resources:
          limits:
            memory: "256Mi"
```

Strategic merge uses the name field to identify which container to patch.

## Adding annotations and labels

Patch metadata fields:

```yaml
# overlays/production/metadata-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    deployment.kubernetes.io/revision: "5"
  labels:
    team: platform
    cost-center: engineering
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "true"
      labels:
        version: v2.0
```

Annotations and labels merge additively with existing values.

## Patching service configuration

Modify service specifications:

```yaml
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
```

Add additional ports and annotations:

```yaml
# overlays/production/service-patch.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 443
    targetPort: 8443
    name: https
```

## Conditional patching

Use $patch: delete to remove fields:

```yaml
# overlays/development/remove-limits-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        resources:
          limits:
            $patch: delete
```

This removes resource limits in development environments.

## Replacing arrays

Some fields need complete replacement:

```yaml
# overlays/production/command-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        command:
        - /app/server
        - --mode=production
        - --workers=10
        args:
        - --config=/etc/config/prod.yaml
```

Commands and args are typically replaced entirely rather than merged.

## Patch ordering

When using multiple patches, order matters:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

patchesStrategicMerge:
- security-patch.yaml      # Apply security first
- resources-patch.yaml     # Then resources
- volume-patch.yaml        # Then volumes
- env-patch.yaml           # Finally environment
```

Later patches can override earlier ones if they modify the same fields.

## Complex nested patches

Patch deeply nested structures:

```yaml
# overlays/production/affinity-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - api
            topologyKey: kubernetes.io/hostname
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: node-type
                operator: In
                values:
                - compute-optimized
```

Strategic merge handles complex nested structures effectively.

## Patching StatefulSets

StatefulSet-specific patches:

```yaml
# overlays/production/statefulset-patch.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 5
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

VolumeClaimTemplates merge by name like other list fields.

## Validation and testing

Test your strategic merge patches:

```bash
# Build and view the result
kustomize build overlays/production/ | less

# Check specific resource
kustomize build overlays/production/ | kubectl get -f - -o yaml deployment/api-server

# Validate before applying
kustomize build overlays/production/ | kubectl apply --dry-run=server -f -

# Diff with current cluster state
kubectl diff -k overlays/production/
```

## Common pitfalls

Watch out for these issues:

```yaml
# Wrong - won't merge properly without name
spec:
  template:
    spec:
      containers:
      - env:  # Missing name field
        - name: NEW_VAR
          value: value

# Correct - includes container name
spec:
  template:
    spec:
      containers:
      - name: api  # Identifies which container
        env:
        - name: NEW_VAR
          value: value
```

Always include merge key fields like name when patching list items.

## Conclusion

Strategic merge patches provide an intuitive way to modify Kubernetes resources in Kustomize. By understanding Kubernetes resource structure, they enable targeted updates without complex path specifications. Use strategic merge patches for common modifications like adding environment variables, adjusting resources, or enhancing security settings. Their intelligent merging behavior makes them more maintainable than JSON patches for most use cases.
