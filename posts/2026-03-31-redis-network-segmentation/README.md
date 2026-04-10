# How to Implement Redis Network Segmentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Network Segmentation, VPC, Firewall

Description: Isolate Redis instances using network segmentation with VPCs, security groups, and private subnets to prevent lateral movement and unauthorized access.

---

Network segmentation places Redis on an isolated network segment that only authorized services can reach. Even if an attacker compromises an application server, they cannot reach Redis from outside the designated network zone without traversing additional security controls.

## Segment Architecture

The recommended pattern:

```text
Internet
    |
[Load Balancer] - Public Subnet (10.0.1.0/24)
    |
[App Servers] - App Subnet (10.0.2.0/24)
    |
[Redis] - Data Subnet (10.0.3.0/24) - NO public route
```

Redis lives in the data subnet with no internet gateway route. Only the app subnet can reach it.

## AWS Security Group Configuration

In AWS, create a dedicated security group for Redis:

```bash
# Create Redis security group
aws ec2 create-security-group \
  --group-name redis-sg \
  --description "Redis access control" \
  --vpc-id vpc-12345678

# Allow inbound 6379 only from app servers security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-redis \
  --protocol tcp \
  --port 6379 \
  --source-group sg-app-servers

# Allow inbound 6379 from monitoring server
aws ec2 authorize-security-group-ingress \
  --group-id sg-redis \
  --protocol tcp \
  --port 6379 \
  --cidr 10.0.4.10/32

# Deny all other inbound (default deny is implicit in AWS)
```

## Linux Network Namespace Isolation

On bare metal or VMs, use Linux network namespaces to isolate Redis:

```bash
# Create a dedicated network namespace for Redis
sudo ip netns add redis-ns

# Create a veth pair
sudo ip link add veth-redis type veth peer name veth-host

# Move one end into the namespace
sudo ip link set veth-redis netns redis-ns

# Configure addresses
sudo ip addr add 10.10.0.1/30 dev veth-host
sudo ip netns exec redis-ns ip addr add 10.10.0.2/30 dev veth-redis

# Bring links up
sudo ip link set veth-host up
sudo ip netns exec redis-ns ip link set veth-redis up
sudo ip netns exec redis-ns ip link set lo up

# Run Redis inside the namespace
sudo ip netns exec redis-ns redis-server /etc/redis/redis.conf --bind 10.10.0.2
```

## Docker Network Segmentation

Use a dedicated Docker network for Redis:

```text
networks:
  app-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  redis-net:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/24

services:
  redis:
    image: redis:7-alpine
    networks:
      - redis-net

  app:
    image: myapp:latest
    networks:
      - app-net
      - redis-net
    depends_on:
      - redis

  nginx:
    image: nginx:alpine
    networks:
      - app-net
    ports:
      - "80:80"
```

The `internal: true` flag on `redis-net` prevents any traffic from leaving to the internet.

## Kubernetes NetworkPolicy

In Kubernetes, restrict Redis pod access with a NetworkPolicy:

```text
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: redis-network-policy
spec:
  podSelector:
    matchLabels:
      app: redis
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          redis-client: "true"
    ports:
    - protocol: TCP
      port: 6379
  egress: []
```

Label your app pods:

```bash
kubectl label pod myapp redis-client=true
```

## Verifying Segmentation

```bash
# From app server - should succeed
redis-cli -h 10.0.3.10 PING

# From a non-authorized host - should timeout
telnet 10.0.3.10 6379
# Connection refused or timeout
```

## Summary

Redis network segmentation places your Redis instances in private subnets or isolated network namespaces accessible only from authorized application servers. Use cloud security groups, Docker internal networks, or Kubernetes NetworkPolicy to enforce this isolation. Combined with authentication and TLS, network segmentation provides the most effective defense against unauthorized Redis access.
