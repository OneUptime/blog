# How to Debug Docker DNS Resolution Failures for IPv4 Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, DNS, IPv4, Troubleshooting, Container

Description: Diagnose and fix DNS resolution failures inside Docker containers, including embedded DNS issues, external DNS failures, and container name resolution problems.

## Introduction

DNS failures inside Docker containers manifest as "Name or service not known" errors when connecting to services by hostname. The cause can be Docker's embedded DNS, external resolver configuration, or the container not being on a user-defined network.

## Understanding Docker's DNS Architecture

Docker containers use one of two DNS configurations:
- **Default bridge**: uses host's `/etc/resolv.conf` directly
- **User-defined networks**: uses Docker's embedded DNS at `127.0.0.11`, which handles container name resolution and forwards external queries

## Step 1: Check /etc/resolv.conf Inside the Container

```bash
# Inspect the container's resolver configuration

docker exec my-container cat /etc/resolv.conf
```

Expected for user-defined networks:

```text
nameserver 127.0.0.11
options ndots:0
```

Expected for default bridge:

```text
nameserver 8.8.8.8
```

## Step 2: Test Container Name Resolution

```bash
# On user-defined networks - test by container name
docker exec my-container nslookup other-container

# Test with the embedded DNS directly
docker exec my-container nslookup other-container 127.0.0.11
```

If container name resolution fails, confirm both containers are on the same user-defined network:

```bash
docker inspect my-container --format '{{json .NetworkSettings.Networks}}'
docker inspect other-container --format '{{json .NetworkSettings.Networks}}'
```

## Step 3: Test External DNS Resolution

```bash
# Test external hostname resolution
docker exec my-container nslookup google.com

# If this fails, test with a known working DNS server
docker exec my-container nslookup google.com 8.8.8.8
```

If `google.com 8.8.8.8` works but `google.com` fails, the container's configured DNS server is the problem.

## Step 4: Fix External DNS by Overriding /etc/resolv.conf

```bash
# Run container with explicit DNS
docker run -d --dns 8.8.8.8 --dns 1.1.1.1 my-image

# Or set daemon-wide DNS
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
EOF
sudo systemctl restart docker
```

## Step 5: Debug the Embedded DNS Server

```bash
# Check if the embedded DNS is listening
docker exec my-container ss -ulnp | grep 53

# Test the embedded resolver with dig
docker exec my-container dig @127.0.0.11 other-container

# Check iptables rules redirecting to Docker's DNS proxy
# (these rules live in the container's network namespace, not on the host)
sudo nsenter -t $(docker inspect -f '{{.State.Pid}}' my-container) -n iptables -t nat -L OUTPUT -n -v
```

## Step 6: Diagnose ndots Setting

The `ndots` option in `resolv.conf` controls how many dots a name must have before it is treated as absolute (not appended with search domains). A high `ndots` can cause resolution to try multiple queries before succeeding:

```bash
# Check ndots
docker exec my-container cat /etc/resolv.conf | grep ndots

# Reduce ndots for faster resolution in containers
docker run --dns-option ndots:1 -d my-image
```

## Common DNS Failure Scenarios

| Symptom | Cause | Fix |
|---|---|---|
| Container names don't resolve | Containers on different networks or on default bridge | Move to same user-defined network |
| External names fail | Wrong nameserver in resolv.conf | Set `--dns` or fix `daemon.json` |
| Intermittent resolution failures | `ndots` too high causing extra queries | Set `--dns-option ndots:1` |
| All resolution fails | Docker embedded DNS not running | Restart Docker daemon |

## Conclusion

Start with `cat /etc/resolv.conf` inside the container, then test with `nslookup`. Separate container name resolution (needs user-defined network and `127.0.0.11`) from external DNS (needs valid upstream servers). Use `--dns` flags to override at the container level.
