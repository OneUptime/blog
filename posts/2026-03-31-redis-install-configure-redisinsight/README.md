# How to Install and Configure RedisInsight

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisInsight, GUI, Monitoring, Installation

Description: Learn how to install RedisInsight on Linux, macOS, and Docker, and configure it to connect to local and remote Redis instances securely.

---

RedisInsight is the official GUI for Redis, providing a visual interface for browsing keys, profiling commands, analyzing memory, and managing clusters. It runs as a desktop app or as a web server inside Docker.

## Install on macOS

Download the DMG from the Redis website or use Homebrew:

```bash
brew install --cask redis-insight
```

Launch it from your Applications folder. It opens a browser tab at `http://localhost:5530`.

## Install on Linux (Snap)

```bash
sudo snap install redisinsight
redisinsight &
```

## Install on Linux (Flatpak)

```bash
flatpak install flathub com.redis.RedisInsight
flatpak run com.redis.RedisInsight
```

## Install with Docker

Run RedisInsight as a container with persistent config:

```bash
docker run -d \
  --name redisinsight \
  -p 5540:5540 \
  -v redisinsight_data:/data \
  redis/redisinsight:latest
```

Access it at `http://localhost:5540`.

## Connect to a Local Redis Instance

After launching RedisInsight:

1. Click "Add Redis Database"
2. Enter `localhost` for host and `6379` for port
3. Leave password blank if Redis has no auth
4. Click "Test Connection", then "Add Database"

## Connect to a Redis Instance with TLS

```text
Host: redis.example.com
Port: 6380
Use TLS: enabled
CA Certificate: (paste your CA cert)
Client Certificate: (optional, for mTLS)
Client Private Key: (optional, for mTLS)
```

## Connect to a Redis Cluster

For Redis Cluster, enter the address of any cluster node. RedisInsight detects the cluster topology automatically.

```text
Host: cluster-node-1.example.com
Port: 6379
Cluster Mode: Auto-detected
```

## Configure RedisInsight Settings

RedisInsight stores its configuration in `~/.redisinsight-app/` on macOS/Linux. You can set environment variables when running via Docker:

```bash
docker run -d \
  --name redisinsight \
  -p 5540:5540 \
  -e RI_APP_PORT=5540 \
  -e RI_APP_HOST=0.0.0.0 \
  -e RI_LOG_LEVEL=info \
  -v redisinsight_data:/data \
  redis/redisinsight:latest
```

## Securing RedisInsight

RedisInsight does not provide built-in authentication by default. When exposing it over a network, add a reverse proxy with auth:

```bash
# Example using nginx basic auth
htpasswd -c /etc/nginx/.htpasswd admin
```

```text
location / {
    auth_basic "RedisInsight";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:5540;
}
```

## Verifying the Installation

Navigate to `http://localhost:5540` and confirm you see the RedisInsight welcome screen with your connected databases listed.

## Summary

RedisInsight can be installed via package manager, AppImage, or Docker. After installation, connect to your Redis instances by entering the host, port, and optional TLS or password settings. Secure the web interface with a reverse proxy when exposing it outside localhost.
