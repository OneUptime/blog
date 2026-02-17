# How to Pull Images from a Private Registry in Azure Container Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Instances, Private Registry, ACR, Docker, Security, Cloud Computing

Description: How to configure Azure Container Instances to pull container images from private registries including Azure Container Registry, Docker Hub, and others.

---

Most production container images live in private registries. You do not want your application code and dependencies sitting in a public repository for anyone to pull. Azure Container Instances supports pulling images from private registries, including Azure Container Registry (ACR), Docker Hub private repos, and any registry that supports the Docker Registry HTTP API V2.

This post covers the different ways to authenticate ACI with private registries, from the simplest approach to the most secure.

## Option 1: Registry Credentials (Username and Password)

The most straightforward method is providing registry credentials directly. This works with any registry that supports username/password authentication.

### Azure Container Registry with Admin Credentials

```bash
# Enable admin user on your ACR (if not already enabled)
az acr update \
    --name myregistry \
    --admin-enabled true

# Get the credentials
ACR_USERNAME=$(az acr credential show --name myregistry --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name myregistry --query "passwords[0].value" -o tsv)

# Deploy a container using the credentials
az container create \
    --resource-group my-resource-group \
    --name my-app \
    --image myregistry.azurecr.io/my-app:v1.0 \
    --cpu 1 \
    --memory 1.5 \
    --registry-login-server myregistry.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --ports 80 \
    --ip-address Public
```

### Docker Hub Private Repository

```bash
# Deploy a container from a private Docker Hub repository
az container create \
    --resource-group my-resource-group \
    --name my-app \
    --image myusername/my-private-app:latest \
    --cpu 1 \
    --memory 1.5 \
    --registry-login-server docker.io \
    --registry-username myusername \
    --registry-password "my-docker-hub-password" \
    --ports 8080 \
    --ip-address Public
```

### Using YAML with Credentials

When deploying via YAML, specify credentials in the `imageRegistryCredentials` section:

```yaml
# private-registry.yaml - Container with registry credentials
apiVersion: '2021-09-01'
location: eastus
name: my-private-app
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/my-app:v1.0
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        ports:
          - port: 80
            protocol: TCP

  # Registry credentials for authenticating with the private registry
  imageRegistryCredentials:
    - server: myregistry.azurecr.io
      username: myregistry
      password: 'your-acr-password-here'

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 80
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

The downside of this approach is that you need to manage credentials, and they can end up in your YAML files or CI/CD logs. Let us look at better options.

## Option 2: Managed Identity with Azure Container Registry

Managed Identity is the recommended approach for ACI with ACR. No credentials to manage, no secrets to rotate, and no risk of leaked passwords.

### Using a User-Assigned Managed Identity

```bash
# Create a user-assigned managed identity
az identity create \
    --resource-group my-resource-group \
    --name aci-acr-identity

# Get the identity's resource ID, client ID, and principal ID
IDENTITY_ID=$(az identity show --resource-group my-resource-group --name aci-acr-identity --query id -o tsv)
IDENTITY_CLIENT_ID=$(az identity show --resource-group my-resource-group --name aci-acr-identity --query clientId -o tsv)
IDENTITY_PRINCIPAL_ID=$(az identity show --resource-group my-resource-group --name aci-acr-identity --query principalId -o tsv)

# Get the ACR resource ID
ACR_ID=$(az acr show --name myregistry --query id -o tsv)

# Grant the identity AcrPull permission on the registry
az role assignment create \
    --assignee $IDENTITY_PRINCIPAL_ID \
    --scope $ACR_ID \
    --role AcrPull

# Wait a minute for the role assignment to propagate, then deploy
az container create \
    --resource-group my-resource-group \
    --name my-app \
    --image myregistry.azurecr.io/my-app:v1.0 \
    --cpu 1 \
    --memory 1.5 \
    --assign-identity $IDENTITY_ID \
    --acr-identity $IDENTITY_ID \
    --ports 80 \
    --ip-address Public
```

### Using Managed Identity in YAML

```yaml
# managed-identity-acr.yaml - Container using managed identity for ACR
apiVersion: '2021-09-01'
location: eastus
name: my-app-with-identity
identity:
  type: UserAssigned
  userAssignedIdentities:
    # Replace with your managed identity's resource ID
    '/subscriptions/<sub-id>/resourceGroups/my-resource-group/providers/Microsoft.ManagedIdentity/userAssignedIdentities/aci-acr-identity': {}
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/my-app:v1.0
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        ports:
          - port: 80
            protocol: TCP
  # Use the managed identity for image pull
  imageRegistryCredentials:
    - server: myregistry.azurecr.io
      identity: '/subscriptions/<sub-id>/resourceGroups/my-resource-group/providers/Microsoft.ManagedIdentity/userAssignedIdentities/aci-acr-identity'
  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 80
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

## Option 3: Service Principal

A service principal gives you a dedicated identity for ACI to use when pulling images. It is more secure than the admin user but requires more setup than managed identity.

```bash
# Create a service principal with AcrPull role on the registry
ACR_ID=$(az acr show --name myregistry --query id -o tsv)

SP_CREDENTIALS=$(az ad sp create-for-rbac \
    --name aci-image-puller \
    --role AcrPull \
    --scopes $ACR_ID \
    --query "{appId: appId, password: password}" \
    -o json)

SP_APP_ID=$(echo $SP_CREDENTIALS | jq -r '.appId')
SP_PASSWORD=$(echo $SP_CREDENTIALS | jq -r '.password')

# Deploy using the service principal credentials
az container create \
    --resource-group my-resource-group \
    --name my-app \
    --image myregistry.azurecr.io/my-app:v1.0 \
    --cpu 1 \
    --memory 1.5 \
    --registry-login-server myregistry.azurecr.io \
    --registry-username $SP_APP_ID \
    --registry-password $SP_PASSWORD \
    --ports 80 \
    --ip-address Public
```

The advantage over the admin user is that the service principal has only the AcrPull role, following the principle of least privilege.

## Pulling from Multiple Registries

If your container group uses images from different registries, provide credentials for each:

```yaml
# multi-registry.yaml - Pulling from multiple private registries
apiVersion: '2021-09-01'
location: eastus
name: multi-registry-app
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/web-app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 1.5
        ports:
          - port: 80
            protocol: TCP
    - name: sidecar
      properties:
        # This image comes from a different registry
        image: ghcr.io/myorg/log-forwarder:latest
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 0.5

  # Provide credentials for each registry
  imageRegistryCredentials:
    - server: myregistry.azurecr.io
      username: myregistry
      password: 'acr-password'
    - server: ghcr.io
      username: myghuser
      password: 'github-pat-token'

  osType: Linux
  ipAddress:
    type: Public
    ports:
      - port: 80
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

## Pulling from Self-Hosted Registries

If you run your own Docker registry (like Harbor or Nexus), the setup is the same as any other private registry:

```bash
# Deploy from a self-hosted registry
az container create \
    --resource-group my-resource-group \
    --name my-app \
    --image registry.mycompany.com/team/my-app:v2.0 \
    --cpu 1 \
    --memory 1.5 \
    --registry-login-server registry.mycompany.com \
    --registry-username deploy-user \
    --registry-password "deploy-password" \
    --ports 8080 \
    --ip-address Public
```

Make sure your self-hosted registry is accessible from Azure. If it is behind a firewall, you need to allow inbound connections from Azure's IP ranges.

## Troubleshooting Image Pull Failures

When an image pull fails, ACI reports the error in the container group's events. Check them with:

```bash
# View container group events including image pull status
az container show \
    --resource-group my-resource-group \
    --name my-app \
    --query "containers[0].instanceView.events" \
    --output table
```

Common errors and fixes:

### "unauthorized: authentication required"

The credentials are wrong or missing. Double-check:
- The registry login server URL
- The username and password
- That the credential user has pull permissions on the repository

### "manifest unknown: manifest unknown"

The image tag does not exist. Verify the image name and tag:

```bash
# List tags for a repository in ACR
az acr repository show-tags \
    --name myregistry \
    --repository my-app \
    --output table
```

### "dial tcp: lookup myregistry.azurecr.io: no such host"

DNS resolution failed. Check that the registry URL is correct and accessible from Azure.

### "toomanyrequests: rate limit exceeded"

Docker Hub has rate limits for anonymous and free accounts. Either authenticate to get a higher limit or switch to ACR which has no pull rate limits within Azure.

## Security Best Practices

1. **Prefer managed identity over credentials** - No secrets to manage or leak
2. **Use AcrPull role, not admin** - The admin account has full access to the registry
3. **Never commit credentials to source control** - Use Key Vault or CI/CD secrets
4. **Scan images for vulnerabilities** - ACR has built-in vulnerability scanning with Microsoft Defender
5. **Pin image tags** - Use specific version tags rather than `latest` to ensure reproducible deployments
6. **Enable content trust** - Sign your images to verify they have not been tampered with

## Summary

Pulling images from private registries in ACI is straightforward once you know the authentication options. For ACR, use managed identity - it is the most secure and requires the least maintenance. For other registries, use credentials stored securely in Key Vault. And always follow the principle of least privilege: grant only the pull permission needed to run your containers.
