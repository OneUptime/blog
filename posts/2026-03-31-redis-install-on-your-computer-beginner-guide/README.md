# How to Install Redis on Your Computer (Beginner Guide)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Install, Beginner, macOS, Windows

Description: Step-by-step instructions to install Redis on macOS, Windows, Linux, and Docker - a beginner guide to getting Redis running locally.

---

Installing Redis locally is the first step to learning it. This guide covers every major operating system so you can get Redis running in minutes.

## Install on macOS

The easiest way on macOS is with Homebrew:

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Redis
brew install redis

# Start Redis as a background service
brew services start redis

# Verify it's running
redis-cli ping
# Expected output: PONG
```

To stop Redis: `brew services stop redis`

## Install on Ubuntu / Debian

```bash
# Update package list
sudo apt update

# Install Redis
sudo apt install redis-server -y

# Start and enable at boot
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
# Expected: PONG

# Check status
sudo systemctl status redis-server
```

## Install on Windows (via WSL)

Redis does not have an official Windows binary. The best approach is WSL2 (Windows Subsystem for Linux):

```bash
# 1. Enable WSL2 in PowerShell (as Administrator)
wsl --install

# 2. Open Ubuntu from Start menu, then install Redis
sudo apt update && sudo apt install redis-server -y
sudo service redis-server start

# 3. Verify
redis-cli ping
```

Alternatively, use Docker Desktop for Windows (see below).

## Install via Docker (Any OS)

Docker is the simplest cross-platform approach:

```bash
# Pull and run the latest Redis image
docker run -d \
  --name redis-local \
  -p 6379:6379 \
  redis:latest

# Verify
redis-cli -h 127.0.0.1 ping
# PONG

# Connect to the Redis CLI inside the container
docker exec -it redis-local redis-cli
```

For persistent data across restarts:

```bash
docker run -d \
  --name redis-local \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:latest --appendonly yes
```

## Verify Your Installation

Once Redis is running, test it with a few commands:

```bash
redis-cli

# Inside redis-cli:
127.0.0.1:6379> PING
PONG

127.0.0.1:6379> SET greeting "Hello Redis"
OK

127.0.0.1:6379> GET greeting
"Hello Redis"

127.0.0.1:6379> DEL greeting
(integer) 1

127.0.0.1:6379> EXIT
```

## Check the Redis Version

```bash
redis-server --version
# Redis server v=7.2.4
```

## What's Installed?

After installation you have two programs:

- `redis-server` - the Redis server daemon
- `redis-cli` - the command-line client for interacting with Redis

The default configuration file is at:
- macOS (Homebrew): `/usr/local/etc/redis.conf` or `/opt/homebrew/etc/redis.conf`
- Ubuntu: `/etc/redis/redis.conf`

## Summary

Redis can be installed on macOS with Homebrew, Ubuntu with apt, Windows via WSL2, or any OS using Docker. After installation, `redis-cli ping` confirms the server is running. The quickest way to get started on any platform is Docker, since it requires no package manager or system-level changes.
