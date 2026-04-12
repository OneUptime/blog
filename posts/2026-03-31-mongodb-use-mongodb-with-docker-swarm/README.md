# How to Use MongoDB with Docker Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Docker, Swarm, Container, Orchestration

Description: Learn how to deploy and manage MongoDB in a Docker Swarm cluster with persistent storage, replica sets, and secure configuration.

---

## Introduction

Docker Swarm provides a simpler alternative to Kubernetes for container orchestration, and MongoDB can be deployed effectively within a Swarm cluster. This guide walks through setting up MongoDB with persistent volumes, secrets management, and basic replication in Docker Swarm.

## Setting Up a Docker Swarm Cluster

Before deploying MongoDB, initialize your Swarm:

```bash
# Initialize Swarm on the manager node
docker swarm init --advertise-addr <MANAGER-IP>

# Join worker nodes
docker swarm join --token <TOKEN> <MANAGER-IP>:2377

# Verify nodes
docker node ls
```

## Creating MongoDB Secrets

Store sensitive credentials as Docker secrets:

```bash
echo "myAdminPassword" | docker secret create mongo_root_password -
echo "myAppPassword" | docker secret create mongo_app_password -
```

## Defining the MongoDB Stack

Create a `docker-compose.yml` for the Swarm stack:

```yaml
version: "3.8"

services:
  mongodb:
    image: mongo:7.0
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD_FILE: /run/secrets/mongo_root_password
    secrets:
      - mongo_root_password
    volumes:
      - mongo_data:/data/db
      - mongo_config:/data/configdb
    ports:
      - "27017:27017"
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 5s
    networks:
      - mongo_net

volumes:
  mongo_data:
    driver: local
  mongo_config:
    driver: local

secrets:
  mongo_root_password:
    external: true

networks:
  mongo_net:
    driver: overlay
    attachable: true
```

## Deploying the Stack

```bash
# Deploy the stack
docker stack deploy -c docker-compose.yml mongo_stack

# Verify services
docker stack services mongo_stack

# Check service logs
docker service logs mongo_stack_mongodb
```

## Initializing a Replica Set

After deployment, initialize the replica set for high availability:

```bash
# Connect to the container
docker exec -it $(docker ps -q -f name=mongo_stack_mongodb) mongosh -u admin -p

# Initialize replica set
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "localhost:27017" }]
})

# Verify status
rs.status()
```

## Connecting an Application Service

Add an application service that connects to MongoDB:

```yaml
services:
  app:
    image: myapp:latest
    environment:
      MONGODB_URI: "mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/mydb?authSource=admin"
    networks:
      - mongo_net
    deploy:
      replicas: 3
```

## Scaling and Updates

```bash
# Scale a service
docker service scale mongo_stack_app=5

# Rolling update
docker service update --image mongo:7.0.1 mongo_stack_mongodb

# Remove the stack
docker stack rm mongo_stack
```

## Monitoring Stack Health

```bash
# List tasks and their state
docker service ps mongo_stack_mongodb

# Inspect service details
docker service inspect mongo_stack_mongodb --pretty
```

## Summary

Docker Swarm provides a straightforward way to run MongoDB in a clustered environment. By using Docker secrets for credential management, named volumes for persistence, and overlay networks for service communication, you can deploy a reliable MongoDB setup without the complexity of Kubernetes. For production workloads, ensure you configure replica sets across multiple nodes and set up regular backups using `mongodump` or a dedicated backup service.
