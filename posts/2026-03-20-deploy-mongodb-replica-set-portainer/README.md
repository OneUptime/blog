# How to Deploy a MongoDB Replica Set via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, MongoDB, Replica Set, High Availability, Database, Docker

Description: Learn how to deploy a MongoDB replica set with three nodes via Portainer for automatic failover and read scaling.

---

A MongoDB replica set provides automatic failover and data redundancy. This guide walks through deploying a three-node replica set as a Portainer stack.

## Stack Definition

Deploy three MongoDB nodes on a shared network:

```yaml
version: "3.8"

services:
  mongo1:
    image: mongo:7.0
    hostname: mongo1
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    volumes:
      - mongo1_data:/data/db
    networks:
      - mongo_cluster
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongo2:
    image: mongo:7.0
    hostname: mongo2
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    volumes:
      - mongo2_data:/data/db
    networks:
      - mongo_cluster
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongo3:
    image: mongo:7.0
    hostname: mongo3
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    volumes:
      - mongo3_data:/data/db
    networks:
      - mongo_cluster
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mongo1_data:
  mongo2_data:
  mongo3_data:

networks:
  mongo_cluster:
    driver: bridge
```

## Initializing the Replica Set

After the stack is running, initialize the replica set from `mongo1`:

```bash
docker exec -it $(docker ps -qf name=mongo1) mongosh --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongo1:27017' },
    { _id: 1, host: 'mongo2:27017' },
    { _id: 2, host: 'mongo3:27017' }
  ]
})
"
```

The `host` values in `rs.initiate()` must be resolvable by the clients that connect to the replica set. The `mongo1`, `mongo2`, and `mongo3` names in this example work for containers on the same Docker network.

## Verifying Replica Set Status

Check which node is primary and confirm all members are healthy:

```bash
docker exec -it $(docker ps -qf name=mongo1) mongosh --eval "rs.status()" | grep -E "name|stateStr|health"
```

Expected output shows one `PRIMARY` and two `SECONDARY` members, all with `health: 1`.

## Creating an Admin User

Create the admin user on the primary. Creating a user alone does not enforce access control; to require authentication on the replica set, restart each member with a shared `--keyFile` (or use X.509 internal authentication):

```bash
docker exec -it $(docker ps -qf name=mongo1) mongosh --eval "
db.getSiblingDB('admin').createUser({
  user: 'admin',
  pwd: 'adminpassword',
  roles: [{ role: 'root', db: 'admin' }]
})
"
```

When access control is enabled, your application connection string uses all three hosts for automatic failover:

```text
mongodb://admin:adminpassword@mongo1:27017,mongo2:27017,mongo3:27017/appdb?replicaSet=rs0&authSource=admin
```

## Exposing Ports for External Access

If your application container is in the same stack, no port exposure is needed. For external access, add port mappings to each service:

```yaml
  mongo1:
    ports:
      - "27017:27017"
  mongo2:
    ports:
      - "27018:27017"
  mongo3:
    ports:
      - "27019:27017"
```

Use the external connection string with all three ports:

```text
mongodb://admin:adminpassword@HOST:27017,HOST:27018,HOST:27019/appdb?replicaSet=rs0&authSource=admin
```

For external clients, the replica set members must also advertise hostnames and ports that those clients can resolve. Port mappings alone are not enough if the replica set was initialized with internal-only names like `mongo1`, `mongo2`, and `mongo3`.

## Automatic Failover Test

Simulate a primary failure and confirm automatic election:

```bash
# Stop whichever member is currently primary
for node in mongo1 mongo2 mongo3; do
  if docker exec $(docker ps -qf name=$node) mongosh --quiet --eval "db.hello().isWritablePrimary" | grep -q true; then
    docker stop $(docker ps -qf name=$node)
    break
  fi
done

# Within ~10 seconds, check which node became primary
docker exec -it $(docker ps -qf name=mongo2) mongosh --quiet --eval "db.hello().primary"
```

MongoDB elects a new primary from the remaining two nodes automatically.
