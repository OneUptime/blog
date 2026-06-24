# How to Browse Registry Contents in Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Container Registry, Portainer Business Edition, Image Management, DevOps

Description: Learn how to use Portainer Business Edition's registry browser to view repositories, tags, and image details without using the CLI.

## Overview

Portainer Business Edition includes a built-in registry browser that lets you explore the contents of connected registries that support Docker Registry API v2 directly from the UI. This eliminates the need to use the Docker CLI or registry API manually to find available images and tags.

## Accessing the Registry Browser

1. Log in to Portainer Business Edition.
2. From the menu, select **Registries**.
3. Click **Browse** next to the registry you want to browse.

You will see a list of repositories in the registry, along with the number of tags in each repository.

## What You Can Do in the Registry Browser

- **View repositories**: See image repositories in the registry and the number of tags in each one.
- **Explore tags**: Click a repository to see all available tags.
- **View repository details**: See the repository name and image count, plus the list of tags.
- **Delete tags**: Remove old or unused tags directly from the UI on a self-hosted Docker registry with `REGISTRY_STORAGE_DELETE_ENABLED=TRUE`.
- **Retag images**: Clone an existing tag to a new name, then remove the old tag if you want to retag it.

## Equivalent CLI Commands

The registry browser replaces these manual CLI workflows:

```bash
# List all repositories in a registry (Docker Registry API v2)

curl -u user:password \
  https://registry.mycompany.com/v2/_catalog

# List tags for a specific repository
curl -u user:password \
  https://registry.mycompany.com/v2/myapp/tags/list

# Get image manifest details
curl -u user:password \
  -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  https://registry.mycompany.com/v2/myapp/manifests/latest
```

## Deleting Old Tags via the Browser

Old image tags consume storage. Use the registry browser to identify and remove stale images:

If you host your own Docker registry, Portainer documents that tag removal requires `REGISTRY_STORAGE_DELETE_ENABLED=TRUE`.

1. Navigate to the repository in the browser.
2. Check the boxes next to tags you want to remove.
3. Click **Remove** and confirm.

## Note on Tag Deletion

On a self-hosted Docker Distribution registry, removing a tag only makes unreferenced content eligible for garbage collection. Before running garbage collection, restart the registry in read-only mode:

```bash
# Example using the official registry container image
docker exec registry /bin/registry garbage-collect \
  /etc/distribution/config.yml
```

## Conclusion

The registry browser in Portainer Business Edition significantly reduces the friction of managing image lifecycles. Instead of juggling API calls or CLI commands, you get a visual interface to audit, clean up, and inspect your registry contents.
