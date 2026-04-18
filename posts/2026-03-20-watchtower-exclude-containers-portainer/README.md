# How to Exclude Containers from Watchtower Updates via Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Watchtower, Container Updates, Docker Labels, Configuration

Description: Learn how to prevent specific containers from being automatically updated by Watchtower when running in a Portainer-managed environment, protecting critical services from unplanned changes.

## Why Exclude Containers?

Not all containers should auto-update:

- **Databases**: Image updates may require migrations or break compatibility
- **Pinned versions**: Production services locked to a tested version
- **Stateful services**: Services where restart timing matters
- **Portainer itself**: Some prefer to manually control Portainer updates

## Method 1: Label-Based Exclusion (Opt-In Mode)

Run Watchtower with `WATCHTOWER_LABEL_ENABLE=true` so it only updates explicitly labeled containers:

```yaml
# watchtower stack

services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_LABEL_ENABLE=true    # Only update labeled containers
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=86400
```

Containers **without** `com.centurylinklabs.watchtower.enable=true` are automatically excluded.

## Method 2: Explicit Opt-Out Label

If Watchtower monitors all containers by default, explicitly exclude with:

```yaml
services:
  postgres:
    image: postgres:16.1    # Pinned exact version
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
    volumes:
      - pg_data:/var/lib/postgresql/data
```

## Method 3: Exclude by Container Name

Use Watchtower's `--disable-containers` option (not via labels):

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: >
      --cleanup
      --disable-containers portainer,postgres,redis
```

## Protecting Portainer Itself

To prevent Watchtower from updating Portainer automatically:

```yaml
# In the Portainer stack definition
services:
  portainer:
    image: portainer/portainer-ce:2.21.0    # Pin to specific version
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
```

Or if using opt-in mode, simply don't add the `enable=true` label to Portainer.

## Mixed Strategy: Protect Databases, Update Apps

```yaml
services:
  # App: auto-update enabled
  webapp:
    image: myorg/webapp:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  api:
    image: myorg/api:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"

  # Database: always excluded
  mysql:
    image: mysql:8.0.35    # Exact version pinned
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
    volumes:
      - mysql_data:/var/lib/mysql

  # Cache: excluded, manage separately
  redis:
    image: redis:7.2.4
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
```

## Verifying Exclusions

Run Watchtower in monitor-only mode to see which containers would be updated:

```bash
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WATCHTOWER_LABEL_ENABLE=true \
  containrrr/watchtower \
  --monitor-only --run-once --debug
```

Output shows which containers are being watched and which are skipped.

## Exclude Watchtower from Updating Itself

Watchtower will update itself by default. To prevent this:

```yaml
services:
  watchtower:
    image: containrrr/watchtower:1.7.1    # Pinned version
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_LABEL_ENABLE=true
    # Watchtower won't update itself since it lacks the enable label
```

## Conclusion

The safest Watchtower configuration for production Portainer environments is the opt-in model (`WATCHTOWER_LABEL_ENABLE=true`). Only services explicitly marked for auto-update receive updates, while databases, pinned services, and infrastructure components like Portainer itself remain untouched until manually updated.
