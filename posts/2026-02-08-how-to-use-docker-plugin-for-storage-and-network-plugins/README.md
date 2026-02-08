# How to Use docker plugin for Storage and Network Plugins

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Plugins, Storage Drivers, Network Plugins, Volume Plugins, DevOps

Description: Extend Docker with storage and network plugins to integrate cloud volumes, distributed filesystems, and advanced networking.

---

Docker's built-in storage and networking covers most common scenarios. But what if you need NFS volumes, cloud-provider storage, overlay networks across data centers, or encrypted network traffic? Docker plugins extend the platform with capabilities that do not ship in the default installation. The `docker plugin` command manages the full lifecycle of these extensions.

## Understanding Docker Plugins

Docker supports a plugin system that lets third parties add functionality in three main areas:

- **Volume plugins** - Add new storage backends (NFS, cloud storage, distributed filesystems)
- **Network plugins** - Add new network drivers (overlay networks, encrypted tunnels, mesh networking)
- **Authorization plugins** - Add access control to the Docker API

Plugins run as containers themselves, managed separately from your application containers. They have access to specific host resources based on their declared capabilities.

## Managing Plugins

### Installing a Plugin

```bash
# Install a plugin from Docker Hub
docker plugin install <plugin-name>

# Install with specific settings
docker plugin install <plugin-name> SETTING=value

# Install without the confirmation prompt
docker plugin install --grant-all-permissions <plugin-name>
```

### Listing Installed Plugins

```bash
# List all installed plugins
docker plugin ls

# Output:
# ID             NAME                  DESCRIPTION                      ENABLED
# abc123         vieux/sshfs:latest    sshFS plugin for Docker         true
```

### Enabling and Disabling Plugins

```bash
# Disable a plugin (required before changing settings)
docker plugin disable <plugin-name>

# Enable a plugin
docker plugin enable <plugin-name>

# Remove a plugin
docker plugin rm <plugin-name>

# Force remove (even if in use)
docker plugin rm -f <plugin-name>
```

### Inspecting a Plugin

```bash
# View detailed plugin information
docker plugin inspect <plugin-name>

# View as formatted JSON
docker plugin inspect <plugin-name> | jq .

# Check plugin settings
docker plugin inspect <plugin-name> --format '{{.Settings}}'
```

## Volume Plugins

Volume plugins are the most commonly used Docker plugins. They connect Docker volumes to external storage systems.

### SSHFS Plugin

Mount remote directories over SSH as Docker volumes.

```bash
# Install the SSHFS plugin
docker plugin install vieux/sshfs

# Create a volume using SSHFS
docker volume create -d vieux/sshfs \
  -o sshcmd=user@remote-server:/path/to/data \
  -o password=mypassword \
  my-ssh-volume

# Or use SSH keys (more secure)
docker volume create -d vieux/sshfs \
  -o sshcmd=user@remote-server:/path/to/data \
  -o IdentityFile=/root/.ssh/id_rsa \
  my-ssh-volume
```

Use the volume in a Docker Compose file:

```yaml
# Docker Compose with SSHFS volume
version: "3.8"

services:
  app:
    image: my-app:latest
    volumes:
      - remote-data:/data

volumes:
  remote-data:
    driver: vieux/sshfs
    driver_opts:
      sshcmd: "deploy@storage-server:/shared/data"
      IdentityFile: "/root/.ssh/id_rsa"
      allow_other: ""
```

### NFS Volume Plugin

NFS is the standard for shared filesystem access across multiple hosts. Docker has built-in NFS support through the local driver, but dedicated NFS plugins offer more features.

```yaml
# NFS volume using Docker's built-in local driver
version: "3.8"

services:
  app:
    image: my-app:latest
    volumes:
      - nfs-data:/data

volumes:
  nfs-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server.example.com,rw,nfsvers=4
      device: ":/exports/app-data"
```

For more advanced NFS features, use a dedicated plugin:

```bash
# Install an NFS plugin (example: NetApp Trident)
docker plugin install netapp/trident-plugin:latest --grant-all-permissions

# Create an NFS-backed volume
docker volume create -d netapp/trident-plugin \
  --name app-data \
  -o size=100g
```

### Cloud Storage Plugins

#### AWS EBS (Elastic Block Store)

```bash
# Install the REX-Ray plugin for AWS EBS
docker plugin install rexray/ebs \
  EBS_ACCESSKEY=AKIAIOSFODNN7EXAMPLE \
  EBS_SECRETKEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  EBS_REGION=us-east-1

# Create an EBS-backed volume
docker volume create -d rexray/ebs \
  --name my-ebs-volume \
  -o size=50
```

```yaml
# Docker Compose with EBS volumes
services:
  database:
    image: postgres:16
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
    driver: rexray/ebs
    driver_opts:
      size: "100"
      volumeType: "gp3"
```

#### Azure Disk

```bash
# Install Azure Disk plugin
docker plugin install cloudstor/azure-disk \
  CLOUD_PLATFORM=AZURE \
  AZURE_STORAGE_ACCOUNT=mystorageaccount \
  AZURE_STORAGE_ACCOUNT_KEY=mykey
```

### GlusterFS Plugin

For distributed storage across multiple servers.

```bash
# Install GlusterFS plugin
docker plugin install glusterfs/glusterfs-plugin --grant-all-permissions

# Create a GlusterFS volume
docker volume create -d glusterfs/glusterfs-plugin \
  -o servers=server1,server2,server3 \
  -o volname=my-gluster-vol \
  my-distributed-volume
```

## Network Plugins

Network plugins add networking capabilities beyond Docker's built-in bridge and overlay drivers.

### Weave Net

Weave creates a mesh network that connects Docker hosts across any infrastructure.

```bash
# Install Weave Net
curl -sL https://git.io/weave -o /usr/local/bin/weave
chmod +x /usr/local/bin/weave

# Launch Weave
weave launch

# Connect to peers
weave connect peer-host-1 peer-host-2
```

```yaml
# Docker Compose using Weave network
version: "3.8"

services:
  app:
    image: my-app:latest
    networks:
      - weave-net

networks:
  weave-net:
    driver: weave
```

### Calico

Calico provides high-performance networking with fine-grained network policy support.

```bash
# Install the Calico Docker plugin
docker plugin install calico/node:latest --grant-all-permissions

# Create a Calico network
docker network create --driver calico --ipam-driver calico-ipam my-calico-net
```

### Macvlan and IPvlan

These are built into Docker but worth mentioning as they solve common networking challenges.

```yaml
# Macvlan network - containers get IPs on the physical network
version: "3.8"

services:
  app:
    image: my-app:latest
    networks:
      physical-net:
        ipv4_address: 192.168.1.100

networks:
  physical-net:
    driver: macvlan
    driver_opts:
      parent: eth0
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
```

## Plugin Configuration

Plugins have settings that you can configure at install time or update later.

```bash
# View plugin settings
docker plugin inspect my-plugin --format '{{.Settings.Env}}'

# Change a setting (plugin must be disabled first)
docker plugin disable my-plugin
docker plugin set my-plugin MY_SETTING=new_value
docker plugin enable my-plugin
```

### Setting Plugin Capabilities

When installing a plugin, Docker shows which capabilities it requires. Review these carefully.

```bash
# Install and review requested capabilities
docker plugin install my-plugin

# Output:
# Plugin "my-plugin" is requesting the following privileges:
#  - network: [host]
#  - mount: [/var/lib/docker/plugins/]
#  - device: [/dev/fuse]
# Do you grant the above permissions? [y/N]
```

Only grant permissions that make sense for the plugin's purpose. A volume plugin should not need network host access, for example.

## Building Custom Plugins

If existing plugins do not meet your needs, you can build your own.

```bash
# Create a plugin from a rootfs and config.json
docker plugin create my-custom-plugin ./plugin-directory/

# The directory must contain:
# plugin-directory/
#   config.json    - Plugin metadata and capabilities
#   rootfs/        - The plugin's filesystem
```

The `config.json` defines the plugin's interface:

```json
{
  "description": "My custom volume plugin",
  "documentation": "https://example.com/docs",
  "entrypoint": ["/plugin-binary"],
  "interface": {
    "types": ["docker.volumedriver/1.0"],
    "socket": "my-plugin.sock"
  },
  "network": {
    "type": "host"
  },
  "mounts": [
    {
      "source": "/var/lib/docker/plugins/",
      "destination": "/mnt/state",
      "type": "bind",
      "options": ["rbind"]
    }
  ]
}
```

## Troubleshooting Plugins

```bash
# Check plugin status
docker plugin ls

# View plugin logs (plugins log to Docker's logging system)
journalctl -u docker | grep plugin

# Check if a plugin is responding
docker plugin inspect my-plugin --format '{{.Enabled}}'

# Reinstall a problematic plugin
docker plugin disable my-plugin
docker plugin rm my-plugin
docker plugin install my-plugin --grant-all-permissions

# Check volume driver health
docker volume create -d my-plugin test-vol
docker volume rm test-vol
```

Common issues:
- **Plugin fails to enable** - Check the plugin's logs for configuration errors. The required settings might not be set.
- **Volume operations timeout** - The plugin's backend storage might be unreachable. Check network connectivity.
- **Permission denied** - The plugin might need additional capabilities that were not granted during installation.

## Plugin Upgrades

```bash
# Upgrade a plugin to a newer version
docker plugin disable my-plugin
docker plugin upgrade my-plugin my-plugin:new-version
docker plugin enable my-plugin
```

Upgrades preserve the plugin's settings and volumes. However, always check the changelog for breaking changes before upgrading in production.

Docker plugins extend the platform in powerful ways. Whether you need cloud storage volumes that follow containers between hosts, encrypted mesh networking across data centers, or custom storage backends for your specific infrastructure, the plugin system makes it possible without modifying Docker itself. Start with well-maintained plugins from reputable sources, test them in staging, and roll them out to production once you are confident in their stability.
