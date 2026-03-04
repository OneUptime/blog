# How to Create an Isolated Docker Network for Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, Testing, Containers, Isolation, DevOps

Description: Learn how to create fully isolated Docker networks for testing, preventing containers from accessing the internet or other networks.

---

Testing often requires containers that can talk to each other but cannot reach the outside world. Maybe you want to test how your application handles network failures. Maybe you need to prevent test containers from accidentally hitting production APIs. Or maybe you need a sandbox where nothing leaks out. Docker's `internal` network option creates exactly this kind of isolated environment.

## Creating an Internal Network

The `--internal` flag creates a network with no external connectivity. Containers on this network can communicate with each other, but they cannot reach the internet or any host outside the Docker network.

```bash
# Create an isolated internal network
docker network create --internal isolated-test
```

Test the isolation:

```bash
# Start a container on the isolated network
docker run --rm --network isolated-test alpine ping -c 1 8.8.8.8
```

This fails with a "Network unreachable" error. The container cannot reach any external address.

But containers on the same network can still talk to each other:

```bash
# Start two containers on the isolated network
docker run -d --name server --network isolated-test nginx
docker run --rm --network isolated-test alpine ping -c 3 server
```

The ping succeeds because both containers are on the same isolated network.

## How Internal Networks Work

Docker implements internal networks by not creating a masquerade (NAT) rule for the network's bridge. Normal Docker networks get an iptables rule that masquerades outbound traffic through the host's interface. Internal networks skip this rule, so packets from containers have no route to the outside world.

Compare the iptables rules:

```bash
# Show NAT rules - internal networks won't have masquerade entries
sudo iptables -t nat -L POSTROUTING -v | grep -E "docker|br-"
```

You will see masquerade rules for regular networks but none for internal networks.

## Building a Complete Test Environment

A typical test environment includes an application, a database, and maybe a message queue, all isolated from the outside world:

```yaml
# docker-compose.test.yml - Isolated test environment
services:
  app:
    image: my-app:latest
    networks:
      - test-net
    environment:
      DATABASE_URL: postgresql://test:test@db:5432/testdb
      REDIS_URL: redis://cache:6379
    depends_on:
      - db
      - cache

  db:
    image: postgres:16
    networks:
      - test-net
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb

  cache:
    image: redis:7
    networks:
      - test-net

  test-runner:
    image: my-test-runner:latest
    networks:
      - test-net
    depends_on:
      - app
    command: pytest /tests -v

networks:
  test-net:
    driver: bridge
    internal: true
```

Every container in this stack can reach every other container, but none can access the internet. This prevents tests from accidentally calling external APIs, sending emails, or posting to production webhooks.

## Partially Isolated Networks

Sometimes you need containers that can reach the internet for specific purposes (like downloading packages) but want to test isolation for your application traffic. Use multiple networks:

```yaml
# docker-compose.yml with mixed connectivity
services:
  app:
    image: my-app:latest
    networks:
      - internal-net
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/mydb

  db:
    image: postgres:16
    networks:
      - internal-net

  # This container has internet access for downloading test data
  setup:
    image: alpine/curl
    networks:
      - internal-net
      - external-net
    command: sh -c "curl -o /data/fixtures.json https://example.com/fixtures.json"
    volumes:
      - test-data:/data

networks:
  internal-net:
    internal: true
  external-net:
    driver: bridge

volumes:
  test-data:
```

The `setup` container is on both networks, so it can download data from the internet and store it in a shared volume. The `app` and `db` containers are only on the internal network.

## Network Isolation for CI/CD Pipelines

In CI/CD environments, test isolation prevents flaky tests caused by external dependencies:

```bash
#!/bin/bash
# ci-test.sh - Run tests in an isolated network

# Create the isolated network
docker network create --internal ci-test-net

# Start the database
docker run -d --name test-db --network ci-test-net \
  -e POSTGRES_PASSWORD=test \
  postgres:16

# Wait for the database to be ready
until docker exec test-db pg_isready; do
  sleep 1
done

# Run the application tests
docker run --rm --network ci-test-net \
  -e DATABASE_URL=postgresql://postgres:test@test-db:5432/postgres \
  my-app-tests pytest -v

# Store the exit code
EXIT_CODE=$?

# Clean up
docker rm -f test-db
docker network rm ci-test-net

exit $EXIT_CODE
```

## Simulating Network Partitions

Isolated networks are perfect for testing how your application handles network partitions. You can disconnect containers from the network to simulate failures:

```bash
# Create the test network and start services
docker network create --internal partition-test
docker run -d --name service-a --network partition-test my-service-a
docker run -d --name service-b --network partition-test my-service-b

# Everything works normally
docker exec service-a ping -c 1 service-b

# Simulate a network partition by disconnecting service-b
docker network disconnect partition-test service-b

# service-a can no longer reach service-b
docker exec service-a ping -c 1 -W 2 service-b
# ping: bad address 'service-b'

# Reconnect to heal the partition
docker network connect partition-test service-b
```

This is valuable for testing distributed systems that need to handle network splits gracefully.

## Subnet Configuration for Test Networks

Give your test network a specific subnet to avoid conflicts with production networks:

```bash
# Create an isolated network with a specific subnet
docker network create \
  --internal \
  --subnet 10.99.0.0/16 \
  --gateway 10.99.0.1 \
  test-subnet
```

Assign specific IPs to containers for predictable test configurations:

```bash
# Start containers with known IP addresses
docker run -d --name test-server \
  --network test-subnet \
  --ip 10.99.0.10 \
  nginx

docker run -d --name test-client \
  --network test-subnet \
  --ip 10.99.0.20 \
  alpine sleep infinity
```

## Verifying Network Isolation

Always verify that your isolated network is actually isolated. Here are several checks:

```bash
# Test 1: Cannot reach the internet
docker run --rm --network isolated-test alpine \
  sh -c "wget -q --timeout=5 -O /dev/null http://google.com && echo 'FAIL: Internet reachable' || echo 'PASS: Internet blocked'"

# Test 2: Cannot reach the Docker host
HOST_IP=$(ip route | grep default | awk '{print $3}')
docker run --rm --network isolated-test alpine \
  sh -c "ping -c 1 -W 2 $HOST_IP && echo 'FAIL: Host reachable' || echo 'PASS: Host blocked'"

# Test 3: Can reach other containers on the same network
docker run --rm --network isolated-test alpine \
  sh -c "ping -c 1 server && echo 'PASS: Container reachable' || echo 'FAIL: Container unreachable'"
```

## Isolated Networks with Resource Limits

Combine network isolation with resource limits for comprehensive test sandboxing:

```yaml
# docker-compose.sandbox.yml - Fully sandboxed test environment
services:
  app:
    image: my-app:latest
    networks:
      - sandbox
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges

  db:
    image: postgres:16
    networks:
      - sandbox
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 512M
    environment:
      POSTGRES_PASSWORD: test

networks:
  sandbox:
    driver: bridge
    internal: true
```

## Cleanup

Isolated test networks should be cleaned up after testing:

```bash
# Remove all containers on the test network
docker network inspect isolated-test -f '{{range .Containers}}{{.Name}} {{end}}' | \
  xargs -r docker rm -f

# Remove the network
docker network rm isolated-test

# Or prune all unused networks at once
docker network prune -f
```

## Using Internal Networks with Docker Swarm

In Docker Swarm, overlay networks can also be internal:

```bash
# Create an internal overlay network in Swarm mode
docker network create \
  --driver overlay \
  --internal \
  --attachable \
  swarm-test-net
```

The `--attachable` flag lets standalone containers (not just services) join the network, which is useful for running ad-hoc test commands.

## Summary

Docker's `--internal` flag creates networks where containers can communicate with each other but have no route to the outside world. This is essential for test environments that must not touch external services, CI/CD pipelines that need reproducible results, and security testing where you want to observe container behavior in isolation. Combine internal networks with specific subnets, resource limits, and read-only filesystems for comprehensive test sandboxing. Always verify isolation by testing that external connectivity is actually blocked.
