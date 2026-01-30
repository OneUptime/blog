# How to Create Kubernetes ConfigMap Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, ConfigMaps, Configuration, DevOps

Description: Learn strategies for managing ConfigMaps in Kubernetes including immutable configs, hot reloading, and environment-specific values.

---

Managing configuration in Kubernetes applications requires careful planning. ConfigMaps provide a powerful way to decouple configuration from container images, but using them effectively demands understanding various strategies. This guide covers essential ConfigMap patterns that help you build maintainable and scalable Kubernetes deployments.

## Creating ConfigMaps

ConfigMaps can be created from literal values, files, or directories. Here's how to create them using different approaches:

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  DATABASE_HOST: "postgres.database.svc.cluster.local"
  LOG_LEVEL: "info"
  app.properties: |
    server.port=8080
    cache.ttl=3600
    feature.flags.enabled=true
```

You can also create ConfigMaps imperatively:

```bash
# From literal values
kubectl create configmap app-config --from-literal=DATABASE_HOST=postgres.local

# From a file
kubectl create configmap app-config --from-file=config.properties

# From a directory
kubectl create configmap app-config --from-file=./config/
```

## Mounting as Volumes vs Environment Variables

Choosing between volume mounts and environment variables depends on your use case. Environment variables work well for simple key-value pairs:

```yaml
spec:
  containers:
  - name: app
    env:
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: DATABASE_HOST
    envFrom:
    - configMapRef:
        name: app-config
```

Volume mounts are better for configuration files or when you need hot reloading:

```yaml
spec:
  containers:
  - name: app
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
      readOnly: true
  volumes:
  - name: config-volume
    configMap:
      name: app-config
```

Volume-mounted ConfigMaps update automatically when the ConfigMap changes, while environment variables require a pod restart.

## Immutable ConfigMaps

For configurations that should never change after deployment, use immutable ConfigMaps. This improves cluster performance by reducing API server load:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: static-config
immutable: true
data:
  STATIC_VALUE: "never-changes"
```

Immutable ConfigMaps cannot be modified. To update the configuration, you must create a new ConfigMap with a different name and update your deployments accordingly.

## Kustomize Overlays for Environment-Specific Values

Kustomize enables managing environment-specific configurations without duplicating YAML files:

```yaml
# base/kustomization.yaml
resources:
- deployment.yaml
configMapGenerator:
- name: app-config
  literals:
  - LOG_LEVEL=info
  - CACHE_ENABLED=true

# overlays/production/kustomization.yaml
resources:
- ../../base
configMapGenerator:
- name: app-config
  behavior: merge
  literals:
  - LOG_LEVEL=warn
  - REPLICAS=5
```

Apply with `kubectl apply -k overlays/production/`. Kustomize automatically appends a hash to ConfigMap names, ensuring pods restart when configuration changes.

## Secret vs ConfigMap Decisions

Use Secrets for sensitive data and ConfigMaps for non-sensitive configuration:

| Use ConfigMap | Use Secret |
|--------------|------------|
| Application settings | Passwords |
| Feature flags | API keys |
| Log levels | TLS certificates |
| Non-sensitive URLs | Database credentials |

```yaml
# Combine both in a deployment
spec:
  containers:
  - name: app
    envFrom:
    - configMapRef:
        name: app-config
    - secretRef:
        name: app-secrets
```

## Rolling Updates on Config Change

When ConfigMaps change, pods using environment variables don't automatically restart. Use annotations to trigger rolling updates:

```yaml
spec:
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
```

Alternatively, use a ConfigMap hash in the deployment name or leverage tools like Reloader:

```bash
# Install Reloader
kubectl apply -f https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml

# Add annotation to deployment
metadata:
  annotations:
    reloader.stakater.com/auto: "true"
```

This ensures your application always runs with the latest configuration without manual intervention.

## Best Practices

Keep ConfigMaps small and focused on specific components. Use namespaces to isolate configurations across environments. Always version your ConfigMaps in source control and use GitOps practices for deployments. Consider using Helm or Kustomize for managing complex configuration hierarchies across multiple environments.

By implementing these strategies, you create a robust configuration management system that scales with your Kubernetes infrastructure while maintaining clarity and operational efficiency.
