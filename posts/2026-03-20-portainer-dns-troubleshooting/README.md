# How to Troubleshoot DNS Resolution Issues in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DNS, Troubleshooting, Docker Networking, Container Networking

Description: Learn how to diagnose and fix DNS resolution issues in Docker containers managed by Portainer, including inter-container DNS and external name resolution.

---

DNS resolution failures are one of the most common networking issues in Docker. This guide covers diagnosing and fixing both inter-container DNS (service names) and external DNS (internet hostnames) problems.

## Diagnosing DNS Issues

Test DNS from inside a container (if the image includes `nslookup` or `dig`):

```bash
# Test internal DNS (service name resolution)

docker exec -it $(docker ps -qf name=api) nslookup postgres

# Test external DNS
docker exec -it $(docker ps -qf name=api) nslookup google.com

# Check which DNS server the container is using
docker exec -it $(docker ps -qf name=api) cat /etc/resolv.conf

# Test with dig for more detail
docker exec -it $(docker ps -qf name=api) dig google.com +short
```

## Common DNS Issues and Fixes

### Issue 1: Service Name Not Resolving

Symptom: `nslookup postgres` returns `NXDOMAIN`.

Cause: Containers are on different networks, or one is attached only to the default `docker0` bridge, which does not provide automatic container-name DNS resolution.

```bash
# Check which network each container is on
docker inspect $(docker ps -qf name=api) | jq '.[0].NetworkSettings.Networks | keys'
docker inspect $(docker ps -qf name=postgres) | jq '.[0].NetworkSettings.Networks | keys'

# If they're on different networks, connect the api container to the database network
docker network connect my-app_backend $(docker ps -qf name=api)
```

### Issue 2: External DNS Not Working

Symptom: `nslookup google.com` times out.

Cause: On user-defined networks, Docker's embedded DNS server (`127.0.0.11`) cannot forward queries to an upstream resolver, or the host itself has broken DNS. Containers on the default `bridge` network instead inherit the host's `/etc/resolv.conf`.

```bash
# Check if the host has working DNS
nslookup google.com

# Check the container's DNS configuration
docker exec -it $(docker ps -qf name=api) cat /etc/resolv.conf
# On a user-defined network this typically shows: nameserver 127.0.0.11

# Test directly against a public DNS server
docker exec -it $(docker ps -qf name=api) nslookup google.com 8.8.8.8
```

Fix by specifying a custom DNS server for all containers in `/etc/docker/daemon.json`:

```json
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
```

Then restart Docker: `sudo systemctl restart docker`

### Issue 3: Intermittent DNS Failures

Symptom: DNS works sometimes but fails randomly.

Cause: Resolver retries under load, or resolver options and search domains causing extra lookup attempts.

```yaml
# Fix in your Compose stack by tuning DNS options
services:
  api:
    dns_opt:
      - ndots:1      # Use a lower ndots value if your environment sets it higher
      - timeout:2    # Seconds before retry
      - attempts:3   # Retry count
```

### Issue 4: Slow DNS Lookups

Symptom: Application startup is slow; DNS queries take >1 second.

Cause: A high `ndots` value or long search list causes the resolver to try multiple names before the bare hostname.

```bash
# Check the current resolver options
docker exec -it $(docker ps -qf name=api) cat /etc/resolv.conf | grep options

# If resolv.conf shows a high ndots value, set ndots:1 in your stack (see above)
```

### Issue 5: DNS on the Default Bridge Network

Containers on the default `docker0` bridge do not get automatic container-name DNS resolution. Move containers to a custom network:

```yaml
services:
  api:
    networks:
      - custom_net   # Custom bridge supports DNS

networks:
  custom_net:
    driver: bridge
```

## DNS Configuration in Compose

Compose does not provide a per-network DNS override; set DNS options per service:

```yaml
services:
  api:
    dns:
      - 8.8.8.8
      - 1.1.1.1
    dns_opt:
      - ndots:1
```

## Checking Docker's Embedded DNS

On user-defined networks, Docker's embedded DNS resolver runs at `127.0.0.11:53` inside the container. If this is unreachable:

```bash
# Test DNS directly against Docker's embedded resolver
docker exec -it $(docker ps -qf name=api) \
  nslookup postgres 127.0.0.11

# Confirm the container is attached to a user-defined network
docker inspect $(docker ps -qf name=api) | jq '.[0].NetworkSettings.Networks | keys'
```
