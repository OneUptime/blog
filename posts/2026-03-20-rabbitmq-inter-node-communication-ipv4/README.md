# How to Configure RabbitMQ Inter-Node Communication on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, IPv4, Inter-Node, Erlang Distribution, Clustering, Network

Description: Configure RabbitMQ inter-node communication ports on IPv4, including Erlang distribution (25672) and EPMD (4369), for reliable cluster operation.

## Introduction

RabbitMQ cluster nodes communicate via the Erlang Distribution Protocol. Two ports are involved: EPMD (Erlang Port Mapper Daemon) on port 4369, which helps nodes and CLI tools find each other, and the Erlang distribution port (default 25672), which carries cluster peer and CLI tool traffic.

## Port Overview

| Port | Service | Purpose |
|---|---|---|
| 4369 | EPMD | Node discovery for cluster peers and CLI tools |
| 25672 | Erlang distribution | Cluster peer and CLI tool communication |
| 5672 | AMQP | Client connections |
| 15672 | Management | HTTP API / web UI (when enabled) |

## Configuring the Distribution Port

```bash
# /etc/rabbitmq/rabbitmq.conf

# Restrict inter-node and CLI tool communication to specific IPv4

distribution.listener.interface = 10.0.0.1    # Node-specific IP

# Fix Erlang distribution port range (optional but helps with firewalls)
distribution.listener.port_range.min = 25672
distribution.listener.port_range.max = 25672
```

## Node Name and IP Address

```bash
# RabbitMQ node names normally use hostnames
# Default: rabbit@hostname

# To use an IP-based node name (less common), longnames must be enabled:
# Set in /etc/rabbitmq/rabbitmq-env.conf
USE_LONGNAME=true
NODENAME=rabbit@10.0.0.1

# This affects all rabbit* commands:
sudo rabbitmqctl --longnames -n rabbit@10.0.0.1 status
```

## Firewall Rules for Inter-Node Traffic

```bash
#!/bin/bash
# Configure firewall for RabbitMQ cluster inter-node communication

TRUSTED_HOSTS=("10.0.0.1" "10.0.0.2" "10.0.0.3")  # Cluster nodes and any remote CLI hosts

for host in "${TRUSTED_HOSTS[@]}"; do
  # EPMD - node discovery for clustering and CLI tools
  sudo iptables -A INPUT -p tcp --dport 4369 -s "$host" -j ACCEPT

  # Erlang distribution port for cluster and CLI tool traffic
  sudo iptables -A INPUT -p tcp --dport 25672 -s "$host" -j ACCEPT
done

# App clients: AMQP only, no inter-node ports
sudo iptables -A INPUT -p tcp --dport 5672 -s 10.0.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5672 -j DROP

# Block EPMD and distribution from all other IPs
sudo iptables -A INPUT -p tcp --dport 4369 -j DROP
sudo iptables -A INPUT -p tcp --dport 25672 -j DROP
```

## Troubleshooting Inter-Node Connectivity

```bash
# Test if EPMD can reach another node
epmd -names  # List registered Erlang nodes locally
ssh 10.0.0.2 "epmd -names"  # Check on remote node

# Test Erlang distribution port
nc -zv 10.0.0.2 25672

# Basic broker/CLI connectivity check from RabbitMQ perspective
sudo rabbitmq-diagnostics -n rabbit@node2 ping

# Check if nodes see each other
sudo rabbitmqctl cluster_status | grep -A5 "Running Nodes"

# Check logs for distribution errors
sudo grep -i "connect\|distribution\|net_kernel" /var/log/rabbitmq/rabbit@*.log
```

## Conclusion

RabbitMQ inter-node communication uses EPMD (4369) and Erlang distribution (25672 by default). Both must be open between all cluster nodes, and also from any host where remote RabbitMQ CLI tools will run. Use `distribution.listener.interface` in `rabbitmq.conf` to bind the distribution listener to a specific internal IPv4. Block these ports from untrusted networks; AMQP-only clients need port 5672. Fix the distribution port range in `rabbitmq.conf` to make iptables rules predictable.
