# How to Configure Environment Variables for Workloads in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Workload, ConfigMap, Secret

Description: Learn how to configure environment variables for workloads in Rancher using direct values, ConfigMaps, Secrets, and field references.

Environment variables are a standard way to pass configuration to containerized applications. Kubernetes supports multiple sources for environment variables, including direct values, ConfigMaps, Secrets, and pod/container field references. Rancher provides an intuitive UI for configuring all of these. This guide covers every method for setting environment variables in Rancher workloads.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster registered in Rancher
- Access to a project and namespace

## Method 1: Direct Key-Value Pairs

The simplest approach is setting environment variables directly on the container.

### Via the Rancher UI

1. Navigate to **Workload**, click **Create**, and choose **Deployment** (or edit an existing workload)
2. Scroll to the **Environment Variables** section in the container configuration
3. Click **Add Variable**
4. Enter the **Key** (e.g., `APP_ENV`) and **Value** (e.g., `production`)
5. Repeat for each variable you need

### Via YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          env:
            - name: APP_ENV
              value: "production"
            - name: LOG_LEVEL
              value: "info"
            - name: MAX_CONNECTIONS
              value: "100"
            - name: FEATURE_FLAG_ENABLED
              value: "true"
```

Note that all values must be strings, even for numbers and booleans. Wrap them in quotes in YAML.

## Method 2: Environment Variables from ConfigMaps

ConfigMaps store non-sensitive configuration data that can be shared across multiple workloads.

### Step 1: Create a ConfigMap

In Rancher, navigate to **More Resources > Core > ConfigMaps** and click **Create**:

- **Name**: `app-config`
- **Namespace**: `default`
- Add key-value pairs:
  - `DATABASE_HOST`: `postgres.default.svc.cluster.local`
  - `DATABASE_PORT`: `5432`
  - `DATABASE_NAME`: `myapp`

Or via YAML:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  DATABASE_HOST: "postgres.default.svc.cluster.local"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "myapp"
  LOG_FORMAT: "json"
```

### Step 2: Reference Individual Keys

In the Rancher workload form:

1. In the **Environment Variables** section, click **Add Variable**
2. Select **ConfigMap** as the source type
3. Select the ConfigMap name (`app-config`)
4. Select the key (`DATABASE_HOST`)
5. Optionally set a different environment variable name

YAML equivalent:

```yaml
env:
  - name: DATABASE_HOST
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: DATABASE_HOST
  - name: DATABASE_PORT
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: DATABASE_PORT
```

### Step 3: Load All Keys from a ConfigMap

To load all keys from a ConfigMap as environment variables at once:

```yaml
envFrom:
  - configMapRef:
      name: app-config
```

In the Rancher UI, look for the **Add From Source** option in the Environment Variables section and select the ConfigMap.

## Method 3: Environment Variables from Secrets

Secrets store sensitive data like passwords, API keys, and tokens.

### Step 1: Create a Secret

Navigate to **Storage > Secrets** in Rancher and click **Create**:

- **Name**: `app-secrets`
- **Namespace**: `default`
- Add key-value pairs:
  - `DATABASE_PASSWORD`: `mysecretpassword`
  - `API_KEY`: `sk-abc123def456`

Or via YAML (values must be base64-encoded):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: default
type: Opaque
data:
  DATABASE_PASSWORD: bXlzZWNyZXRwYXNzd29yZA==
  API_KEY: c2stYWJjMTIzZGVmNDU2
```

To base64-encode values:

```bash
echo -n "mysecretpassword" | base64
```

### Step 2: Reference Secret Keys

In the Rancher UI:

1. In the **Environment Variables** section, click **Add Variable**
2. Select **Secret** as the source type
3. Select the Secret name (`app-secrets`)
4. Select the key (`DATABASE_PASSWORD`)

YAML:

```yaml
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: DATABASE_PASSWORD
  - name: API_KEY
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: API_KEY
```

### Load All Keys from a Secret

```yaml
envFrom:
  - secretRef:
      name: app-secrets
```

## Method 4: Field References

You can inject pod metadata and resource information as environment variables.

### Pod Fields

```yaml
env:
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
  - name: POD_IP
    valueFrom:
      fieldRef:
        fieldPath: status.podIP
  - name: NODE_NAME
    valueFrom:
      fieldRef:
        fieldPath: spec.nodeName
  - name: SERVICE_ACCOUNT
    valueFrom:
      fieldRef:
        fieldPath: spec.serviceAccountName
```

Resource Fields

```yaml
env:
  - name: CPU_REQUEST
    valueFrom:
      resourceFieldRef:
        containerName: my-app
        resource: requests.cpu
  - name: MEMORY_LIMIT
    valueFrom:
      resourceFieldRef:
        containerName: my-app
        resource: limits.memory
```

In the Rancher UI, use the **Resource Reference** option when adding environment variables.

## Combining Multiple Sources

A complete example using all methods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
          env:
            - name: APP_ENV
              value: "production"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: EXTRA_CONFIG
              valueFrom:
                configMapKeyRef:
                  name: extra-config
                  key: setting
                  optional: true
```

In this example, the `optional: true` flag prevents the pod from failing if the referenced ConfigMap or key does not exist.

## Verifying Environment Variables

After deploying, verify the environment variables are set correctly:

1. Use the **Execute Shell** feature in Rancher to open a shell in the container
2. Run `env` or `printenv` to list all environment variables

Or with kubectl:

```bash
kubectl exec my-app-pod -n default -- env | sort
```

## Summary

Rancher supports all Kubernetes methods for setting environment variables on workloads. Use direct values for simple configuration, ConfigMaps for shared non-sensitive settings, Secrets for sensitive data, and field references for pod metadata. The `envFrom` directive is convenient for loading all keys from a ConfigMap or Secret at once. Always use Secrets rather than direct values for passwords, API keys, and other sensitive information.
