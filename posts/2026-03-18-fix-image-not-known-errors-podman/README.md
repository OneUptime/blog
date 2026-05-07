# How to Fix 'image not known' Errors in Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, Image, Registry, Troubleshooting

Description: A thorough guide to resolving 'image not known' errors in Podman, covering registry configuration, image naming, storage issues, and rootless vs rootful image stores.

---

> The "image not known" error in Podman means the container runtime cannot find the image you referenced. This can be caused by missing registry prefixes, separate rootless and rootful image stores, short name ambiguity, or corrupted local storage.

When Podman tells you an image is "not known," it is not being vague. It is telling you that the image reference could not be matched in the local image store at the point Podman tried to use it. This happens more often with Podman than with Docker because Podman does not default to Docker Hub as the only registry, because rootless and rootful modes have separate image stores, and because Podman is stricter about image naming.

This guide covers every common scenario that produces this error and how to resolve each one.

---

## Understanding Image Naming in Podman

Unlike Docker, which implicitly prepends `docker.io/library/` to short image names, Podman can be configured to search multiple registries. When you run:

```bash
podman run nginx
```

Podman needs to resolve `nginx` to a fully qualified image name. Depending on your configuration, it might search Docker Hub, Quay.io, or other registries. If the image is not found or the resolution is ambiguous, you get an error.

Always use fully qualified image names to avoid ambiguity:

```bash
podman run docker.io/library/nginx
```

## Configuring Unqualified Search Registries

Podman uses the file `/etc/containers/registries.conf` (or `~/.config/containers/registries.conf` for rootless) to determine where to search for short image names.

Check your current configuration:

```bash
podman info --format '{{.Registries}}'
```

Edit the registries configuration to add Docker Hub:

```toml
# /etc/containers/registries.conf

unqualified-search-registries = ["docker.io", "quay.io", "ghcr.io"]
```

For rootless Podman, create or edit `~/.config/containers/registries.conf`:

```bash
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf << 'EOF'
unqualified-search-registries = ["docker.io", "quay.io"]
EOF
```

## Short Name Aliasing

Podman supports short name aliases that map common names to their fully qualified equivalents. When you pull an image using a short name for the first time, Podman may prompt you to select a registry. The selection is cached in a local alias file.

View packaged or administrator-defined aliases. The exact filename can vary by distribution, so check the drop-in directory:

```bash
ls /etc/containers/registries.conf.d/
```

For machine-generated aliases, rootful Podman uses:

```bash
cat /var/cache/containers/short-name-aliases.conf
```

Or for rootless Podman, check:

```bash
cat ~/.cache/containers/short-name-aliases.conf
```

If an alias is pointing to the wrong registry, edit the aliases file or remove it to be prompted again:

```bash
rm ~/.cache/containers/short-name-aliases.conf
```

## Rootless vs Rootful Image Stores

One of the most common causes of "image not known" is pulling an image with `sudo podman` and then trying to use it with rootless `podman`, or vice versa. These have completely separate storage locations.

Rootful images are stored in:
```text
/var/lib/containers/storage/
```

Rootless images are stored in:
```text
~/.local/share/containers/storage/
```

Check which images exist in each store:

```bash
# Rootless images

podman images

# Rootful images
sudo podman images
```

If you pulled an image with `sudo`, you need to either pull it again without `sudo` or configure an additional image store.

### Using Additional Image Stores

You can configure rootless Podman to read from the rootful image store as an additional (read-only) store. Edit `~/.config/containers/storage.conf`:

```ini
[storage]
driver = "overlay"

[storage.options]
additionalimagestores = ["/var/lib/containers/storage"]
```

This lets rootless Podman use images from the rootful store without duplicating them.

## Image Was Removed or Never Pulled

Sometimes the simplest answer is the right one. Verify the image exists locally:

```bash
podman images --format "{{.Repository}}:{{.Tag}}"
```

If the image is not listed, pull it:

```bash
podman pull docker.io/library/nginx:latest
```

If you are referencing an image by ID, make sure you are using the correct ID:

```bash
podman images --no-trunc
```

## Corrupted Local Storage

If Podman's local storage becomes corrupted, it might not recognize images that should be available. Symptoms include images appearing in `podman images` but failing with "image not known" when you try to run them.

Try resetting the storage:

```bash
# WARNING: This removes all images, containers, and volumes
podman system reset
```

If you want to be less destructive, try migrating first:

```bash
podman system migrate
```

This reconfigures the storage without deleting everything.

## Image Tag Does Not Exist

If you specify a tag that does not exist on the registry, the pull fails and subsequent run commands cannot find the image:

```bash
# This will fail if the tag "v99" does not exist
podman pull docker.io/library/nginx:v99
```

Always verify the available tags. You can use `skopeo` to inspect a remote registry:

```bash
skopeo list-tags docker://docker.io/library/nginx
```

Or check the digest of a specific tag:

```bash
skopeo inspect docker://docker.io/library/nginx:latest
```

## Platform Mismatch

If you are on an ARM system and the image only has an AMD64 manifest (or vice versa), the pull might succeed but the image might not be usable. Check the platform:

```bash
podman image inspect myimage --format '{{.Architecture}}'
```

Pull for a specific platform:

```bash
podman pull --platform linux/amd64 docker.io/library/nginx:latest
```

## Image References in Podman Compose and Pods

When using `podman-compose` or pod YAML files, short image names are still subject to Podman's short-name resolution rules. In local-only workflows or environments without an interactive prompt, using `image: nginx` can fail or resolve differently from the image you expected, while `docker.io/library/nginx` is unambiguous.

In your `docker-compose.yml` or pod spec, use the fully qualified name:

```yaml
services:
  web:
    image: docker.io/library/nginx:latest
    ports:
      - "8080:80"
```

## Debugging Image Resolution

When you are not sure why an image is not being found, increase the log level:

```bash
podman --log-level=debug pull nginx 2>&1 | head -50
```

This shows the exact registries being searched and why resolution fails.

You can also check which storage Podman is using:

```bash
podman info --format '{{.Store.GraphRoot}}'
podman info --format '{{.Store.ImageStore.Number}}'
```

## Conclusion

The "image not known" error in Podman comes down to four main causes: the image was never pulled, it was pulled in a different mode (rootful vs rootless), the short name could not be resolved to a registry, or local storage is corrupted. Always use fully qualified image names to avoid registry ambiguity. Be aware that `sudo podman` and `podman` maintain separate image stores. When in doubt, check `podman images` to see what is actually available, and use `podman --log-level=debug` to trace exactly how Podman resolves image references.
