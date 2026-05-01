# How to Enable IPv6 in Docker Daemon Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Daemon, Configuration, Networking

Description: Enable IPv6 support in the Docker daemon by editing daemon.json, configure IPv6 address pools, and restart Docker to provide IPv6 connectivity to containers.

## Introduction

Docker does not enable IPv6 on the default bridge network by default. On Linux hosts, to use IPv6 for containers attached to the default `bridge` network, you must enable it in the Docker daemon configuration file `/etc/docker/daemon.json`. If you set `fixed-cidr-v6`, Docker assigns container IPv6 addresses from that subnet; otherwise Docker can choose a ULA prefix automatically. The daemon must be restarted after configuration changes for them to take effect.

## Enable IPv6 in daemon.json

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef::/48",
  "ip6tables": true,
  "experimental": false
}
```

```bash
# Apply configuration

sudo systemctl restart docker

# Verify IPv6 is enabled
docker info | grep -i ipv6
# Output: IPv6: true

# Check daemon configuration was applied
docker network inspect bridge | grep -A5 "EnableIPv6"
```

## Full daemon.json with IPv6 and Logging

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef::/48",
  "ip6tables": true,
  "default-address-pools": [
    {
      "base": "172.30.0.0/16",
      "size": 24
    },
    {
      "base": "fd00::/48",
      "size": 64
    }
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "dns": ["8.8.8.8", "2001:4860:4860::8888"]
}
```

## Verify Configuration

```bash
# Inspect default bridge network for IPv6
docker network inspect bridge --format '{{.EnableIPv6}}'
docker network inspect bridge --format '{{json .IPAM.Config}}'

# Run a container on the default bridge and verify IPv6 reachability
docker run --rm -d --name ipv6-test -p 80:80 traefik/whoami
curl http://[::1]:80
docker rm -f ipv6-test
```

## Troubleshooting daemon.json Changes

```bash
# Check for JSON syntax errors
cat /etc/docker/daemon.json | python3 -m json.tool

# View daemon logs if restart fails
journalctl -u docker.service -n 50

# Validate daemon is running
systemctl status docker

# Test IPv6 connectivity from a container
docker run --rm alpine ping -6 -c 3 2001:4860:4860::8888
```

## Conclusion

Enable Docker IPv6 on the default bridge network by setting `"ipv6": true` in `/etc/docker/daemon.json`. Set `"fixed-cidr-v6"` if you want to choose the subnet explicitly, then restart the Docker daemon with `systemctl restart docker`. The `ip6tables` flag enables network isolation rules for IPv6. Use a ULA prefix (`fd00::/8`) for container networks unless you have a routable IPv6 prefix available. Verify with `docker info | grep -i ipv6` and test with `curl http://[::1]:80` after publishing a container port or with `docker run --rm alpine ping -6 2001:4860:4860::8888`.
