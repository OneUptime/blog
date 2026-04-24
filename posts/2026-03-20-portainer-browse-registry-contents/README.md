# How to Browse Registry Contents in Portainer Business Edition (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Registry, Business Edition, DevOps

Description: Learn how to use Portainer Business Edition's registry browser to navigate and manage container images directly from the Portainer UI.

## Introduction

Portainer Business Edition includes a built-in registry browser that lets you explore registry contents - repositories and tags - without needing separate tools. Instead of knowing image paths by memory or using the registry's own web UI, you can look up the exact repository and tag directly within Portainer. This guide covers using the registry browser.

## Prerequisites

- Portainer Business Edition (BE) installed
- At least one registry configured in Portainer (Docker Hub, ECR, ACR, Harbor, etc.)
- Registry credentials with list/read permissions (and write/delete permissions if you plan to manage tags)

## Supported Registries for Browsing

| Registry | Browsable in BE |
|---------|---------------|
| Docker Hub | Yes (authenticated) |
| Harbor | Yes |
| Custom Docker Registry v2 | Yes |
| AWS ECR | Yes |
| Azure ACR | Yes |
| GitHub GHCR | Yes |
| GitLab Registry | Yes |

Portainer documents registry browsing for registries that support Docker Registry API v2.

## Step 1: Open the Registry Browser

1. Log in to Portainer BE
2. Click **Registries** in the left sidebar
3. Find the registry you want to browse
4. Click the **Browse** button (folder icon) next to the registry

The registry browser opens.

## Step 2: Navigate the Registry Structure

The browser shows a list of repositories in the registry. Repository names can include slash-delimited paths:

```text
Registry: harbor.company.com

Repository               Tags count
production/myapp         3
production/api           2
staging/myapp            1
staging/api              1
```

## Step 3: Explore Image Tags

1. Click on a repository to see available tags
2. Each tag shows:
   - Tag name
   - OS/Architecture
   - Image ID
   - Compressed size
   - Creation date

```text
Repository: harbor.company.com/production/myapp
────────────────────────────────────────────────────────────────────
Name       OS/Architecture  Image ID      Compressed Size  Created
latest     linux/amd64      b0b21e0ef55e  125.0 MB         2024-01-15 10:00:00
v2.1.0     linux/amd64      def456abc789  124.0 MB         2024-01-10 09:30:00
v2.0.0     linux/amd64      ghi789def012  118.0 MB         2023-12-01 08:00:00
```

## Step 4: Use Images from the Browser

When browsing, you can use the exact repository name and tag you find in the browser when deploying elsewhere in Portainer:

1. Find the image and tag you want
2. Note the exact image reference (for example, `harbor.company.com/production/myapp:v2.1.0`)
3. Use that image reference in the deployment form for your container, service, or stack

This eliminates typos and ensures you use the exact image you intended.

## Step 5: Delete Tags or Repositories

In the registry browser (BE feature with appropriate permissions):

1. Open the repository you want to manage
2. Select the checkbox next to the tag you want to remove
3. Click **Remove** and confirm the deletion

If you host your own Docker Registry and want to remove tags, Portainer documents enabling `REGISTRY_STORAGE_DELETE_ENABLED=TRUE`. You can also use **Delete this repository** on the repository page to remove the whole repository.

On Docker Registry v2-style backends, removing a tag removes the registry reference. Storage is reclaimed only when the registry's garbage collection process removes unreferenced blobs.

**Warning:** Deleting a tag is irreversible. Ensure you no longer need the image before deleting.

## Step 6: Tag an Image from the Browser

From the browser, you can add a new tag to an existing image:

1. Open the repository you want to manage
2. Choose an existing tag/image as the source
3. Enter the new tag name (e.g., `stable`, `production`)
4. Confirm the clone/add-tag action

This creates a new tag pointing to the same image without duplicating the underlying layers.

## Step 7: Review Repository Information and Tags

Select a repository to see summary information and its tags:

```text
Repository: production/myapp
────────────────────────────────────────────────────────────────────
Repository:    production/myapp
Tags count:    3
Images count:  3

Name       OS/Architecture  Image ID      Compressed Size  Created
latest     linux/amd64      b0b21e0ef55e  125.0 MB         2024-01-15 10:00:00
v2.1.0     linux/amd64      def456abc789  124.0 MB         2024-01-10 09:30:00
v2.0.0     linux/amd64      ghi789def012  118.0 MB         2023-12-01 08:00:00
```

## Step 8: Manage Registry Access (BE)

In Portainer BE, registry access is managed per environment:

1. Open the environment's **Registries** view (`Host`, `Swarm`, or `Cluster`, depending on environment type)
2. Find the registry and click **Manage access**
3. Select the users or teams that should have access, or namespaces for Kubernetes, then click **Create access**
4. If access is managed by a registry policy, update the policy instead

Registry access assigned here applies only to the selected environment. It is not global.

## Comparing Registry Browser vs Registry UI

| Feature | Portainer BE Browser | Harbor UI | AWS ECR Console |
|---------|---------------------|-----------|----------------|
| View repositories and tags | Yes | Yes | Yes |
| Delete tags/images | Yes | Yes | Yes |
| Delete repository | Yes | Yes | Yes |
| Scan results | No | Yes | Yes |
| Replication policies | No | Yes | Yes |

Use the Portainer browser for browsing and tag management; use the native registry UI for advanced registry-specific features such as scanning and replication.

## Conclusion

The registry browser in Portainer Business Edition streamlines the deployment workflow by letting you navigate your container image catalog without leaving the Portainer interface. Instead of memorizing image paths and tags, you browse visually and use exact image references in your deployment forms. For teams managing multiple registries with many images, this feature significantly reduces friction in the deployment process.
