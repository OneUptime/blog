# How to Add Docker Hub Credentials to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Hub, Registry, Authentication, Container Management

Description: Learn how to add Docker Hub credentials to Portainer to pull private images and avoid rate limiting.

## Why Add Docker Hub Credentials?

Docker Hub enforces rate limits on pulls (100 pulls per 6 hours for unauthenticated users, 200 pulls per 6 hours for Docker Personal accounts). Authenticated pulls use your account's limits. Additionally, private Docker Hub repositories require credentials to pull images.

## Steps to Add Docker Hub Credentials

1. Log in to Portainer as an administrator.
2. Go to **Registries** in the left sidebar.
3. Click **Add registry**.
4. Select **DockerHub** as the registry provider.
5. Enter a registry **name**, your Docker Hub **username**, and your Docker Hub **access token**.
6. Click **Test connection**.
7. After the test succeeds, click **Add registry**.

## Using Access Tokens Instead of Passwords

Docker Hub supports access tokens as a more secure alternative to passwords:

1. Log in to [Docker Home](https://app.docker.com).
2. Go to **Account settings > Personal access tokens**.
3. Click **Generate new token**, give it a name, and copy the token.
4. Use this token in the **DockerHub access token** field in Portainer.

```bash
# Test your credentials via CLI before adding to Portainer

docker login -u your-username
# Enter your access token when prompted for password
```

## Assigning Credentials to Environments

After adding the registry, you need to make it available in your environments:

1. Select your environment in Portainer.
2. Go to **Host > Registries** for Docker environments, or **Swarm/Cluster > Registries** for those environment types.
3. Find the Docker Hub registry, click **Manage access**, and grant access to the appropriate users, teams, or namespaces for that environment.

## Using Credentials When Pulling Images

When deploying a stack that references a private Docker Hub image, use the standard Docker Hub image name:

```yaml
version: "3.8"

services:
  app:
    # Example private Docker Hub image reference
    image: your-dockerhub-username/private-image:latest
```

## Verifying Credentials

```bash
# Verify your Docker Hub login works from the CLI
echo 'your-access-token' | docker login --username your-username --password-stdin

# Test pulling a private image
docker pull your-username/private-image:latest
```

## Conclusion

Adding Docker Hub credentials to Portainer ensures private images are accessible and prevents anonymous rate limit errors. Use access tokens rather than passwords for better security and easier rotation.
