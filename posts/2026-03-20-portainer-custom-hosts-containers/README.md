# How to Configure Custom Host File Entries for Containers in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, /etc/hosts, Custom DNS, Networking, Container Configuration

Description: Learn how to add custom host file entries to Docker containers in Portainer using extra_hosts in Compose stacks or the Portainer container configuration UI.

---

Custom `/etc/hosts` entries let you map hostnames to specific IP addresses inside a container, overriding DNS. This is useful for pointing service names at specific IPs, testing against local environments, or working around DNS in air-gapped setups.

## Adding Extra Hosts in a Stack

Use the `extra_hosts` key in your Compose file:

```yaml
services:
  api:
    image: my-api:latest
    extra_hosts:
      - "legacy-db=192.168.1.50"       # Internal server without DNS
      - "payment-gateway=10.0.0.200"   # Internal service
      - "host.docker.internal=host-gateway"  # Access the Docker host
    networks:
      - app_net

networks:
  app_net:
```

Verify the entries are injected:

```bash
docker exec -it $(docker ps -qf name=api) cat /etc/hosts
# Should include the custom entries

```

## Accessing the Docker Host from a Container

On Docker Desktop, `host.docker.internal` resolves automatically. On Docker Engine for Linux, add an extra host mapping so containers can reach services running on the host:

```yaml
services:
  api:
    extra_hosts:
      - "host.docker.internal=host-gateway"   # Docker Engine 20.10+ on Linux
```

On older Linux Docker versions, find the gateway manually:

```bash
# Get the gateway IP from inside a container
docker exec -it my-container ip route | grep default | awk '{print $3}'
# Then use that IP in extra_hosts
```

## Setting Extra Hosts via Portainer UI

For containers (not stacks), configure extra hosts in Portainer:

1. Go to **Containers > Add container**.
2. Open **Advanced container settings**.
3. In the **Network** section, find **Hosts file entries**.
4. Add entries in `hostname:address` format.

For existing containers, use **Duplicate/Edit**. Portainer recreates the container with the new settings and replaces the old one.

## Dynamic Hosts File Override with a Bind Mount

For more flexibility, mount a custom `hosts` file into the container:

```yaml
services:
  api:
    volumes:
      - /path/on/docker-host/custom_hosts:/etc/hosts:ro  # Mount a custom hosts file read-only
```

Create `custom_hosts` on the Docker host with your custom entries:

```text
127.0.0.1   localhost
::1         localhost ip6-localhost
192.168.1.50   legacy-db
10.0.0.200     payment-gateway
```

This approach lets you update hosts without restarting containers - however, the container's hostname and its own entry in the default hosts file are lost unless you include them manually.

## Common Use Cases

| Use Case | `extra_hosts` Value |
|----------|-------------|
| Local SSL testing | `myapp.local=127.0.0.1` |
| Pointing to an older API version | `api.internal=192.168.1.50` |
| Accessing Docker host services | `host.docker.internal=host-gateway` |
| Bypassing external DNS for a service | `thirdparty-api.com=10.0.0.10` |
| Testing service migration | `database.service=10.0.0.20` |

## Verifying Hostname Resolution

Check that your custom entries resolve correctly:

```bash
# Test the custom hostname resolves to the right IP
docker exec -it $(docker ps -qf name=api) ping -c 1 legacy-db

# Or inspect the injected hosts entry directly
docker exec -it $(docker ps -qf name=api) grep legacy-db /etc/hosts
```
