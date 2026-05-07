# How to Configure Helm Chart Values in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm

Description: Learn how to configure Helm chart values in Rancher using the form editor, YAML editor, and CLI for customizing application deployments.

Helm chart values are the primary mechanism for customizing application deployments. They control everything from replica counts and resource limits to feature flags and database connection strings. Rancher provides multiple interfaces for configuring these values, from chart-provided configuration forms to a full YAML editor. This guide covers how to work with Helm chart values effectively in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster registered in Rancher
- A Helm chart repository configured in Rancher
- Helm CLI installed locally, and any chart repository used in CLI examples added to your local Helm configuration
- Basic understanding of YAML syntax

## Understanding Helm Values

Helm charts use a `values.yaml` file to define default configuration. When you install or upgrade a chart, you can override these defaults with your own values. The values are passed to the chart's templates to generate Kubernetes manifests.

The value hierarchy (from lowest to highest priority):

1. Chart's `values.yaml` (defaults)
2. Parent chart's values for subcharts
3. Values files passed with `-f` / `--values`
4. Individual values set with `--set`

## Step 1: View Default Values

### Via the Rancher UI

1. Navigate to **Apps > Charts**
2. Click on a chart to see its detail page
3. Click **Install** to see the default values in the form or YAML view

### Via the Helm CLI

```bash
# Show the default values

helm show values bitnami/redis --version 19.0.0

# Show the chart README for documentation
helm show readme bitnami/redis --version 19.0.0

# Show the chart metadata
helm show chart bitnami/redis --version 19.0.0
```

## Step 2: Configure Values via the Rancher Form UI

When you install or upgrade a Rancher chart that includes `questions.yaml`, the form view provides an intuitive interface for setting values.

1. Go to **Apps > Charts** and select a chart
2. Click **Install**
3. Rancher shows configuration fields based on the chart's `questions.yaml`

Form fields map directly to values in the `values.yaml`. For example:

- A field labeled "Replica Count" maps to `replicaCount`
- A checkbox labeled "Enable Persistence" maps to `persistence.enabled`
- A dropdown labeled "Service Type" maps to `service.type`

The form also supports:

- **Groups**: Values organized into sections (General, Networking, Storage, etc.)
- **Conditional fields**: Fields that appear only when a related option is enabled
- **Validation**: Input type checking and required field enforcement

## Step 3: Configure Values via the YAML Editor

For full control, use the YAML editor in the Rancher install/upgrade form. Native Helm charts in Rancher are configured this way by default.

1. Open the YAML editor
2. Enter or edit the values you want to apply
3. Modify the values as needed

Example configuration:

```yaml
image:
  repository: bitnami/redis
  pullPolicy: IfNotPresent

# Authentication
auth:
  enabled: true
  password: "my-secure-password"

# Architecture
architecture: replication

# Master configuration
master:
  count: 1
  persistence:
    enabled: true
    size: 10Gi
    storageClass: "standard"
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 512Mi
  service:
    type: ClusterIP
    ports:
      redis: 6379

# Replica configuration
replica:
  replicaCount: 3
  persistence:
    enabled: true
    size: 8Gi
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi

# Metrics
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: monitoring

# Pod disruption budget
pdb:
  create: true
  minAvailable: 1

# Network policy
networkPolicy:
  enabled: false
```

## Step 4: Configure Values via the Helm CLI

### Using --set Flags

Set individual values with `--set`:

```bash
helm install my-redis bitnami/redis \
  --namespace default \
  --set auth.password=mysecretpassword \
  --set architecture=replication \
  --set replica.replicaCount=3 \
  --set master.persistence.size=10Gi
```

### Using Values Files

Create a `values.yaml` file and pass it with `-f`:

```bash
helm install my-redis bitnami/redis \
  --namespace default \
  -f my-values.yaml
```

### Combining Multiple Values Files

Layer values files for different environments:

```bash
# base-values.yaml contains common settings
# production-values.yaml contains production overrides

helm install my-redis bitnami/redis \
  --namespace production \
  -f base-values.yaml \
  -f production-values.yaml
```

Later files override earlier ones.

### Using --set-file and --set-string

```bash
# Set a value from a file (useful for certificates)
helm install my-app my-chart \
  --set-file tls.cert=./cert.pem \
  --set-file tls.key=./key.pem

# Force a value to be treated as a string
helm install my-app my-chart \
  --set-string image.tag=1234
```

## Step 5: View Current Values of a Release

### Via the Rancher UI

1. Go to **Apps > Installed Apps**
2. Click on the release name
3. The detail page shows the currently applied values

### Via the Helm CLI

```bash
# Show user-supplied values only
helm get values my-redis -n default -o yaml

# Show all values including defaults
helm get values my-redis -n default --all -o yaml

# Output as YAML for editing
helm get values my-redis -n default -o yaml > current-values.yaml
```

## Step 6: Update Values on an Existing Release

### Via the Rancher UI

1. Go to **Apps > Installed Apps**
2. Click the three-dot menu and select **Edit/Upgrade**
3. Modify values in the form or YAML editor
4. Click **Upgrade**

### Via the Helm CLI

```bash
# Reuse existing values and add/override specific ones
helm upgrade my-redis bitnami/redis \
  --namespace default \
  --reuse-values \
  --set replica.replicaCount=5

# Replace all values with a new file
helm upgrade my-redis bitnami/redis \
  --namespace default \
  -f new-values.yaml

# Reset values to defaults and apply overrides
helm upgrade my-redis bitnami/redis \
  --namespace default \
  --reset-values \
  --set auth.password=mysecretpassword
```

## Working with Complex Values

### Lists and Arrays

```yaml
# In values.yaml
extraEnvVars:
  - name: LOG_LEVEL
    value: debug
  - name: FEATURE_X
    value: enabled
```

With `--set`:

```bash
--set "extraEnvVars[0].name=LOG_LEVEL" \
--set "extraEnvVars[0].value=debug" \
--set "extraEnvVars[1].name=FEATURE_X" \
--set "extraEnvVars[1].value=enabled"
```

### Nested Objects

```yaml
# In values.yaml
master:
  nodeSelector:
    disktype: ssd
    zone: us-east-1a
```

With `--set`:

```bash
--set "master.nodeSelector.disktype=ssd" \
--set "master.nodeSelector.zone=us-east-1a"
```

### Values with Special Characters

```bash
# Escape commas with backslash
--set "annotations.description=This\, is a test"

# Use --set-string for numeric strings
--set-string image.tag=20260319
```

## Validating Values

### Use Dry Run

```bash
helm install my-redis bitnami/redis \
  --namespace default \
  -f my-values.yaml \
  --dry-run
```

### Use Template

```bash
helm template my-redis bitnami/redis \
  -f my-values.yaml
```

This renders the templates locally without connecting to the cluster, useful for validating your values produce correct manifests.

### Use Schema Validation

Many charts include a `values.schema.json` that validates values against a JSON schema. Helm automatically validates against this schema during install and upgrade.

## Best Practices

1. Store values files in version control alongside your infrastructure code
2. Use separate values files for each environment (dev, staging, production)
3. Never put secrets directly in values files; use external secret management instead
4. Document your custom values with comments explaining why each override exists
5. Review default values before installing to understand available options
6. Use `--dry-run` to validate values before applying them
7. Keep values files minimal by only overriding what differs from defaults

## Summary

Helm chart values give you full control over how applications are deployed in Rancher. The form UI provides a guided experience for common configurations, while the YAML editor and CLI offer complete flexibility. Use values files for version-controlled, repeatable deployments, and layer multiple files for environment-specific overrides. Always validate your values with dry runs before applying them to production releases.
