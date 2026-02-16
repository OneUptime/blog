# How to Create a Container Group in Azure Container Instances Using YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Instances, YAML, Containers, ACI, DevOps, Cloud Computing

Description: How to define and deploy Azure Container Instances container groups using YAML configuration files for repeatable and version-controlled deployments.

---

Azure Container Instances (ACI) is the fastest way to run a container in Azure without managing any infrastructure. While you can create containers through the portal or CLI commands, using YAML files gives you version-controlled, repeatable deployments. You define your container group in a YAML file, commit it to your repo, and deploy it with a single CLI command.

This post covers the YAML schema for ACI container groups, walks through practical examples, and covers the features you can configure.

## What is a Container Group?

A container group in ACI is a collection of containers that are scheduled on the same host, share a network namespace (same IP address), and can share storage volumes. It is conceptually similar to a Kubernetes pod.

Container groups are useful when you have containers that need to work closely together - for example, a web application and a sidecar that handles logging or proxying.

## Basic YAML Structure

Here is the simplest possible container group YAML:

```yaml
# simple-container.yaml - A basic single-container group
apiVersion: '2021-09-01'
location: eastus
name: my-container-group
properties:
  containers:
    - name: my-app
      properties:
        image: nginx:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 1.5
        ports:
          - port: 80
            protocol: TCP
  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 80
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

Let me break down the key fields:

- `apiVersion` - The ACI API version. Use `2021-09-01` or later for the latest features.
- `location` - The Azure region where the container group runs.
- `name` - The name of the container group (must be unique within the resource group).
- `properties.containers` - A list of containers in the group.
- `properties.osType` - Either `Linux` or `Windows`.
- `properties.ipAddress` - Network configuration for the group.

## Deploying with the CLI

Deploy your YAML file using the Azure CLI:

```bash
# Deploy a container group from a YAML file
az container create \
    --resource-group my-resource-group \
    --file simple-container.yaml

# Check the status
az container show \
    --resource-group my-resource-group \
    --name my-container-group \
    --output table

# Get the public IP address
az container show \
    --resource-group my-resource-group \
    --name my-container-group \
    --query "ipAddress.ip" \
    --output tsv
```

## Multi-Container Group

Here is a more realistic example with two containers - a web application and a Redis sidecar:

```yaml
# multi-container.yaml - Web app with Redis sidecar
apiVersion: '2021-09-01'
location: eastus
name: web-app-group
properties:
  containers:
    # Primary web application container
    - name: web-app
      properties:
        image: myregistry.azurecr.io/web-app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 1.5
          limits:
            cpu: 2.0
            memoryInGb: 3.0
        ports:
          - port: 80
            protocol: TCP
        environmentVariables:
          - name: REDIS_HOST
            value: 'localhost'
          - name: REDIS_PORT
            value: '6379'
          - name: NODE_ENV
            value: 'production'
          # Secure environment variable (not visible in logs or API responses)
          - name: API_KEY
            secureValue: 'sk-secret-api-key-here'

    # Redis sidecar container
    - name: redis
      properties:
        image: redis:7-alpine
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 0.5
        ports:
          - port: 6379
            protocol: TCP
        command:
          - redis-server
          - '--maxmemory'
          - '256mb'
          - '--maxmemory-policy'
          - 'allkeys-lru'

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 80
        protocol: TCP
    dnsNameLabel: my-web-app
  restartPolicy: Always
type: Microsoft.ContainerInstance/containerGroups
```

Key things to note:

- Both containers share the same IP address. The web app connects to Redis using `localhost` because they share the network namespace.
- `resources.requests` defines the guaranteed resources. `resources.limits` defines the maximum.
- `environmentVariables` can have plain `value` or `secureValue` (encrypted, not visible in API responses).
- `command` overrides the container's default entrypoint.
- `dnsNameLabel` gives you a DNS name like `my-web-app.eastus.azurecontainer.io`.
- `restartPolicy` can be `Always`, `OnFailure`, or `Never`.

## Container Group with Volumes

You can mount Azure File Shares as volumes for persistent storage:

```yaml
# container-with-volumes.yaml - Container group with mounted storage
apiVersion: '2021-09-01'
location: eastus
name: app-with-storage
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/data-processor:latest
        resources:
          requests:
            cpu: 2.0
            memoryInGb: 4.0
        volumeMounts:
          # Mount the Azure File Share into the container
          - name: data-volume
            mountPath: /app/data
            readOnly: false
          # Mount a config file from a secret
          - name: config-volume
            mountPath: /app/config
            readOnly: true

  # Define the volumes at the group level
  volumes:
    # Azure Files volume
    - name: data-volume
      azureFile:
        shareName: app-data
        storageAccountName: mystorageaccount
        storageAccountKey: 'your-storage-account-key-here'
    # Secret volume - files are created from secret values
    - name: config-volume
      secret:
        config.json: 'eyJkYXRhYmFzZSI6ICJteWRiIn0='

  osType: Linux
  restartPolicy: OnFailure
type: Microsoft.ContainerInstance/containerGroups
```

The secret volume base64-encodes the content. The file `config.json` will be created at `/app/config/config.json` inside the container.

## Using a Private Container Registry

If your images are in Azure Container Registry or another private registry:

```yaml
# private-registry.yaml - Pulling from a private registry
apiVersion: '2021-09-01'
location: eastus
name: private-app
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/my-private-app:v1.2.3
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        ports:
          - port: 8080
            protocol: TCP

  # Registry credentials for pulling private images
  imageRegistryCredentials:
    - server: myregistry.azurecr.io
      username: myregistry
      password: 'your-acr-password'

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 8080
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

For production deployments, consider using a managed identity instead of embedding credentials in the YAML file.

## Liveness and Readiness Probes

You can configure health probes to monitor your containers:

```yaml
# container-with-probes.yaml - Health check configuration
containers:
  - name: web-app
    properties:
      image: myregistry.azurecr.io/web-app:latest
      resources:
        requests:
          cpu: 1.0
          memoryInGb: 1.5
      ports:
        - port: 80
          protocol: TCP
      # Liveness probe - restarts the container if it fails
      livenessProbe:
        httpGet:
          path: /health
          port: 80
          scheme: http
        initialDelaySeconds: 30
        periodSeconds: 10
        failureThreshold: 3
        successThreshold: 1
        timeoutSeconds: 5
      # Readiness probe - stops traffic if it fails
      readinessProbe:
        httpGet:
          path: /ready
          port: 80
          scheme: http
        initialDelaySeconds: 10
        periodSeconds: 5
        failureThreshold: 3
        timeoutSeconds: 3
```

## Managing Container Groups

After deployment, manage your container group with these CLI commands:

```bash
# View container group details
az container show \
    --resource-group my-resource-group \
    --name my-container-group

# View logs from a specific container
az container logs \
    --resource-group my-resource-group \
    --name my-container-group \
    --container-name web-app

# Execute a command in a running container
az container exec \
    --resource-group my-resource-group \
    --name my-container-group \
    --container-name web-app \
    --exec-command /bin/sh

# Stop the container group
az container stop \
    --resource-group my-resource-group \
    --name my-container-group

# Start it again
az container start \
    --resource-group my-resource-group \
    --name my-container-group

# Delete the container group
az container delete \
    --resource-group my-resource-group \
    --name my-container-group \
    --yes
```

## Updating a Container Group

To update a container group, modify the YAML file and redeploy:

```bash
# Update an existing container group with a modified YAML file
az container create \
    --resource-group my-resource-group \
    --file updated-container.yaml
```

Note that some properties cannot be updated in place (like OS type). In those cases, you need to delete and recreate the container group.

## Tips for Production Use

1. **Always specify resource limits** - Without limits, a runaway container can consume all available resources.
2. **Use secureValue for secrets** - Never put sensitive values in plain `value` fields.
3. **Pin image tags** - Use specific version tags (`:v1.2.3`) instead of `:latest` for reproducible deployments.
4. **Set appropriate restart policies** - Use `Always` for long-running services, `OnFailure` for batch jobs, and `Never` for one-shot tasks.
5. **Store YAML files in version control** - Treat your container group definitions like infrastructure as code.

## Summary

YAML-based deployment of Azure Container Instances gives you a clean, declarative way to define your container groups. It works well with version control and CI/CD pipelines, making your container deployments repeatable and auditable. Start with a simple single-container YAML, and expand to multi-container groups with volumes, health probes, and registry credentials as your needs grow.
