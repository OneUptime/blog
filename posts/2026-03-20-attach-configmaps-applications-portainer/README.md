# How to Attach ConfigMaps to Applications in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ConfigMap, Configuration Management, DevOps

Description: Learn how to create ConfigMaps and attach them to Kubernetes applications as environment variables or mounted files in Portainer.

## What Are ConfigMaps?

ConfigMaps store non-sensitive configuration data as key-value pairs. They decouple configuration from container images, making it easy to change application settings without rebuilding images.

## Creating a ConfigMap in Portainer

1. Select your Kubernetes environment.
2. Go to **ConfigMaps & Secrets** and make sure the **ConfigMaps** tab is selected.
3. Click **Add with form**.
4. Enter a name, namespace, and key-value pairs.
5. Click **Create ConfigMap**.

## Attaching a ConfigMap to an Application

When deploying or editing an application in Portainer:

1. Scroll to the **ConfigMaps** section.
2. Select the ConfigMap you want to make available to the application.
3. By default, Portainer exposes all keys from the ConfigMap as environment variables.
4. Use **Override** if you want to mount specific keys as files instead.

## Usage Pattern 1: Single Key from ConfigMap

```yaml
# Load a single key from a ConfigMap as an env var

env:
  - name: DATABASE_URL
    valueFrom:
      configMapKeyRef:
        name: app-config        # ConfigMap name
        key: database_url       # Specific key in the ConfigMap
```

## Usage Pattern 2: All Keys from ConfigMap

```yaml
# Load all keys from a ConfigMap as environment variables
envFrom:
  - configMapRef:
      name: app-config          # All keys become env vars
```

## Usage Pattern 3: Mount ConfigMap as a File

ConfigMaps can also be mounted as files in the container filesystem. This is useful for config files like `nginx.conf` or `application.properties`:

```yaml
spec:
  containers:
    - name: app
      volumeMounts:
        - name: config-volume
          mountPath: /etc/app/config    # Mount path in container
          readOnly: true
  volumes:
    - name: config-volume
      configMap:
        name: app-config-files          # ConfigMap containing file data
```

## Creating a ConfigMap from a File

```bash
# Create a ConfigMap from a file (the filename becomes the key)
kubectl create configmap nginx-config \
  --from-file=nginx.conf=./nginx.conf \
  --namespace=production

# Create from multiple files
kubectl create configmap app-configs \
  --from-file=./config/               # All regular files in the directory become keys
  --namespace=production
```

## Updating a ConfigMap

```bash
# Update a ConfigMap (applications using env vars must restart to pick up changes)
kubectl edit configmap app-config --namespace=production

# Or recreate it
kubectl create configmap app-config \
  --from-literal=key=newvalue \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Picking Up ConfigMap Changes

Mounted ConfigMap files are updated automatically, but not instantly; with default kubelet settings the delay can be up to about 2 minutes. ConfigMap values consumed through environment variables require a pod restart:

```bash
# Force a rolling restart to pick up ConfigMap changes
kubectl rollout restart deployment/my-app --namespace=production
```

## Conclusion

ConfigMaps are the Kubernetes-native way to externalize application configuration. Portainer makes it easy to create ConfigMaps and attach them to applications through a UI rather than writing YAML by hand.
