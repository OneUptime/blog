# How to Use Immutable ConfigMaps on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, ConfigMaps, Immutable Configuration, Performance

Description: Learn how to use immutable ConfigMaps on Talos Linux to improve cluster performance and protect configuration data from accidental changes.

---

Immutable ConfigMaps were introduced in Kubernetes 1.21 as a stable feature. They allow you to mark a ConfigMap as unchangeable after creation, which brings two significant benefits: protection against accidental or unwanted updates, and a performance improvement since the kubelet stops watching immutable ConfigMaps for changes. On Talos Linux, where immutability is already a core design principle at the OS level, using immutable ConfigMaps aligns perfectly with the platform philosophy.

This guide covers when and how to use immutable ConfigMaps on your Talos Linux cluster.

## What Makes a ConfigMap Immutable?

When you set the `immutable` field to `true` on a ConfigMap, Kubernetes enforces the following:

- The `data` and `binaryData` fields cannot be modified
- The `immutable` field itself cannot be changed back to `false`
- The only way to change the configuration is to delete the ConfigMap and create a new one

This is a one-way switch. Once a ConfigMap is immutable, there is no going back.

## Why Use Immutable ConfigMaps?

There are several good reasons to make your ConfigMaps immutable:

**Performance at scale.** For clusters with thousands of ConfigMaps, the kubelet maintains watches on all of them to detect changes. Immutable ConfigMaps are excluded from this watch, reducing load on the API server and the kubelet. On large Talos Linux clusters, this can make a noticeable difference.

**Protection against accidental changes.** In a shared cluster, someone might accidentally modify a ConfigMap that multiple applications depend on. Making it immutable prevents this.

**Cleaner versioning.** Instead of updating ConfigMaps in place, you create new versions with new names. This makes rollbacks as simple as pointing your workload back to the previous ConfigMap version.

## Creating an Immutable ConfigMap

Creating an immutable ConfigMap is straightforward. Just add the `immutable: true` field:

```yaml
# immutable-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v1
  namespace: default
  labels:
    app: myapp
    version: v1
data:
  DATABASE_HOST: "postgres.default.svc.cluster.local"
  DATABASE_PORT: "5432"
  LOG_LEVEL: "info"
  config.yaml: |
    server:
      port: 8080
      workers: 4
    cache:
      ttl: 3600
      max_entries: 10000
immutable: true
```

```bash
# Apply the immutable ConfigMap
kubectl apply -f immutable-configmap.yaml

# Verify it was created
kubectl get configmap app-config-v1 -o yaml
```

## Verifying Immutability

Try to update the ConfigMap and see what happens:

```bash
# Attempt to modify the immutable ConfigMap
kubectl patch configmap app-config-v1 --type merge \
  -p '{"data":{"LOG_LEVEL":"debug"}}'
```

You will get an error like:

```
The ConfigMap "app-config-v1" is invalid: data: Forbidden: field is immutable when `immutable` is set
```

This confirms that the ConfigMap cannot be changed.

## Versioning Strategy for Immutable ConfigMaps

Since immutable ConfigMaps cannot be updated, you need a versioning strategy. The most common approach is to include a version identifier in the ConfigMap name:

```yaml
# Version 1
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v1
  labels:
    app: myapp
    config-version: "1"
data:
  LOG_LEVEL: "info"
  MAX_CONNECTIONS: "100"
immutable: true
---
# Version 2 - with updated settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v2
  labels:
    app: myapp
    config-version: "2"
data:
  LOG_LEVEL: "debug"
  MAX_CONNECTIONS: "200"
immutable: true
```

When you need to update configuration, create a new version and update your Deployment to reference it:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        envFrom:
        # Change this to app-config-v2 when ready
        - configMapRef:
            name: app-config-v1
```

## Using Content Hashes for Versioning

Another approach is to use a hash of the ConfigMap content as the version identifier. This is what tools like Kustomize and Helm do:

```bash
# Generate a hash-based name
CONFIG_HASH=$(kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=MAX_CONNECTIONS=100 \
  --dry-run=client -o yaml | sha256sum | cut -c1-8)

# Create the ConfigMap with the hash suffix
kubectl create configmap "app-config-${CONFIG_HASH}" \
  --from-literal=LOG_LEVEL=info \
  --from-literal=MAX_CONNECTIONS=100

# Make it immutable
kubectl patch configmap "app-config-${CONFIG_HASH}" \
  --type merge -p '{"immutable": true}'

echo "Created ConfigMap: app-config-${CONFIG_HASH}"
```

With Kustomize, this happens automatically:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
- name: app-config
  literals:
  - LOG_LEVEL=info
  - MAX_CONNECTIONS=100
  options:
    immutable: true
```

When you run `kustomize build`, it generates a ConfigMap with a content-based hash suffix and automatically updates all references in your Deployments and other resources.

## Converting Existing ConfigMaps to Immutable

If you have existing ConfigMaps that you want to make immutable, you can patch them:

```bash
# Make an existing ConfigMap immutable
kubectl patch configmap my-existing-config \
  --type merge -p '{"immutable": true}'

# Verify the change
kubectl get configmap my-existing-config -o jsonpath='{.immutable}'
```

Remember, once you set this flag, you cannot unset it. Make sure the ConfigMap content is finalized before making it immutable.

## Cleanup Strategy

With versioned immutable ConfigMaps, old versions accumulate over time. You should have a cleanup strategy:

```bash
# List all versions of a config
kubectl get configmaps -l app=myapp --sort-by='.metadata.creationTimestamp'

# Delete old versions that are no longer in use
kubectl delete configmap app-config-v1

# Script to find ConfigMaps not referenced by any pod
# This helps identify candidates for cleanup
for cm in $(kubectl get configmaps -o name); do
  cm_name=$(echo "$cm" | cut -d/ -f2)
  refs=$(kubectl get pods -o json | grep -c "$cm_name" || true)
  if [ "$refs" -eq 0 ]; then
    echo "Unused: $cm_name"
  fi
done
```

## Immutable ConfigMaps in Helm Charts

If you use Helm to deploy applications on your Talos cluster, you can make ConfigMaps immutable in your templates:

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config-{{ .Values.configVersion }}
  labels:
    app: {{ .Release.Name }}
    chart: {{ .Chart.Name }}
data:
  {{- range $key, $value := .Values.config }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
immutable: true
```

```yaml
# values.yaml
configVersion: "v3"
config:
  LOG_LEVEL: "info"
  DATABASE_URL: "postgres://db:5432/myapp"
  CACHE_TTL: "3600"
```

Each time you update the `configVersion` and run `helm upgrade`, a new immutable ConfigMap is created.

## Performance Impact

The performance benefit of immutable ConfigMaps becomes significant at scale. Here is what happens under the hood:

1. For mutable ConfigMaps, the kubelet watches each one through the API server, polling for updates every sync cycle (default 60 seconds).
2. For immutable ConfigMaps, the kubelet skips the watch entirely after the initial fetch.

On a Talos Linux cluster with hundreds of nodes and thousands of ConfigMaps, reducing the number of active watches can lower API server CPU usage and network traffic measurably. If you have ConfigMaps that rarely or never change, making them immutable is an easy performance win.

```bash
# Check how many ConfigMaps you have across all namespaces
kubectl get configmaps --all-namespaces --no-headers | wc -l

# Check how many are already immutable
kubectl get configmaps --all-namespaces -o json | \
  jq '[.items[] | select(.immutable == true)] | length'
```

## Wrapping Up

Immutable ConfigMaps are a natural fit for Talos Linux, a platform built on the principle of immutability. They protect your configuration from accidental changes and improve cluster performance by reducing API server load. Adopt a versioning strategy - whether sequential numbers, content hashes, or Kustomize-generated suffixes - and implement a cleanup process for old versions. For any ConfigMap whose content is finalized and should not change during the lifetime of a deployment, marking it as immutable is a best practice worth following.
