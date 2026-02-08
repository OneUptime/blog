# How to Run Couchbase in Docker with Clustering

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Couchbase, Databases, NoSQL, Clustering, DevOps

Description: Learn how to deploy a Couchbase cluster in Docker with multi-node setup, bucket configuration, and N1QL queries

---

Couchbase is a distributed NoSQL document database that combines the flexibility of JSON documents with the power of SQL-like queries through N1QL. Running Couchbase in Docker simplifies the process of spinning up multi-node clusters for development and testing. This guide walks through setting up a single node, expanding to a cluster, and working with data.

## Why Couchbase?

Couchbase occupies a unique spot in the database landscape. It blends key-value performance with document store flexibility and adds built-in caching, full-text search, and a SQL dialect called N1QL. If your application needs sub-millisecond key lookups alongside complex queries over JSON documents, Couchbase delivers both without bolting on extra components.

## Single Node Quick Start

Start with a single Couchbase node.

```bash
# Pull and run Couchbase Server
docker run -d \
  --name couchbase-node1 \
  -p 8091-8096:8091-8096 \
  -p 11210-11211:11210-11211 \
  -v couchbase_data1:/opt/couchbase/var \
  couchbase:community-7.2.0
```

The web console is available at `http://localhost:8091`. During first access, you will walk through initial cluster setup.

## Automating Cluster Initialization

Instead of using the web UI, automate the setup with the Couchbase CLI.

```bash
# Wait for the node to be ready
sleep 15

# Initialize the cluster with memory quotas
docker exec couchbase-node1 couchbase-cli cluster-init \
  --cluster localhost:8091 \
  --cluster-username admin \
  --cluster-password password123 \
  --cluster-ramsize 512 \
  --cluster-index-ramsize 256 \
  --cluster-fts-ramsize 256 \
  --services data,index,query,fts

# Create a bucket for your application
docker exec couchbase-node1 couchbase-cli bucket-create \
  --cluster localhost:8091 \
  --username admin \
  --password password123 \
  --bucket myapp \
  --bucket-type couchbase \
  --bucket-ramsize 256 \
  --bucket-replica 1
```

## Multi-Node Cluster with Docker Compose

For a proper cluster, you need multiple nodes on the same Docker network. This Compose file sets up three nodes.

```yaml
# docker-compose.yml
version: "3.8"

services:
  couchbase-node1:
    image: couchbase:community-7.2.0
    container_name: cb-node1
    ports:
      - "8091-8096:8091-8096"
      - "11210-11211:11210-11211"
    volumes:
      - cb_data1:/opt/couchbase/var
    networks:
      - couchbase-net
    deploy:
      resources:
        limits:
          memory: 2G

  couchbase-node2:
    image: couchbase:community-7.2.0
    container_name: cb-node2
    volumes:
      - cb_data2:/opt/couchbase/var
    networks:
      - couchbase-net
    deploy:
      resources:
        limits:
          memory: 2G

  couchbase-node3:
    image: couchbase:community-7.2.0
    container_name: cb-node3
    volumes:
      - cb_data3:/opt/couchbase/var
    networks:
      - couchbase-net
    deploy:
      resources:
        limits:
          memory: 2G

networks:
  couchbase-net:
    driver: bridge

volumes:
  cb_data1:
  cb_data2:
  cb_data3:
```

Start all three nodes.

```bash
docker compose up -d
```

## Joining Nodes to the Cluster

After all containers are running, initialize the first node and then join the others.

```bash
# Initialize the first node as the cluster coordinator
docker exec cb-node1 couchbase-cli cluster-init \
  --cluster cb-node1:8091 \
  --cluster-username admin \
  --cluster-password password123 \
  --cluster-ramsize 512 \
  --cluster-index-ramsize 256 \
  --services data,index,query

# Initialize node 2 and add it to the cluster
docker exec cb-node2 couchbase-cli node-init --cluster cb-node2:8091
docker exec cb-node1 couchbase-cli server-add \
  --cluster cb-node1:8091 \
  --username admin \
  --password password123 \
  --server-add cb-node2:8091 \
  --server-add-username admin \
  --server-add-password password123 \
  --services data,index,query

# Initialize node 3 and add it to the cluster
docker exec cb-node3 couchbase-cli node-init --cluster cb-node3:8091
docker exec cb-node1 couchbase-cli server-add \
  --cluster cb-node1:8091 \
  --username admin \
  --password password123 \
  --server-add cb-node3:8091 \
  --server-add-username admin \
  --server-add-password password123 \
  --services data,index,query

# Rebalance the cluster to distribute data evenly
docker exec cb-node1 couchbase-cli rebalance \
  --cluster cb-node1:8091 \
  --username admin \
  --password password123
```

## Creating Buckets and Collections

Couchbase organizes data into buckets, scopes, and collections. Think of it like database > schema > table.

```bash
# Create a bucket
docker exec cb-node1 couchbase-cli bucket-create \
  --cluster cb-node1:8091 \
  --username admin \
  --password password123 \
  --bucket ecommerce \
  --bucket-type couchbase \
  --bucket-ramsize 256 \
  --bucket-replica 2

# Create a scope within the bucket
docker exec cb-node1 couchbase-cli collection-manage \
  --cluster cb-node1:8091 \
  --username admin \
  --password password123 \
  --bucket ecommerce \
  --create-scope inventory

# Create collections within the scope
docker exec cb-node1 couchbase-cli collection-manage \
  --cluster cb-node1:8091 \
  --username admin \
  --password password123 \
  --bucket ecommerce \
  --create-collection inventory.products

docker exec cb-node1 couchbase-cli collection-manage \
  --cluster cb-node1:8091 \
  --username admin \
  --password password123 \
  --bucket ecommerce \
  --create-collection inventory.orders
```

## Working with N1QL Queries

N1QL (pronounced "nickel") is Couchbase's SQL-like query language for JSON documents. Access the query service through the web console or the cbq shell.

```bash
# Open the interactive query shell
docker exec -it cb-node1 cbq -u admin -p password123 -e http://cb-node1:8091
```

Insert and query documents.

```sql
-- Insert a product document
INSERT INTO `ecommerce`.`inventory`.`products` (KEY, VALUE)
VALUES ("prod-001", {
  "name": "Wireless Mouse",
  "category": "electronics",
  "price": 29.99,
  "stock": 150,
  "tags": ["wireless", "mouse", "peripheral"]
});

-- Create a primary index (needed for ad-hoc queries)
CREATE PRIMARY INDEX ON `ecommerce`.`inventory`.`products`;

-- Query products by category
SELECT name, price, stock
FROM `ecommerce`.`inventory`.`products`
WHERE category = "electronics"
AND price < 50
ORDER BY price ASC;
```

## Monitoring the Cluster

Check cluster health through the REST API.

```bash
# Get cluster node status
curl -s -u admin:password123 http://localhost:8091/pools/default | python3 -m json.tool

# Check bucket statistics
curl -s -u admin:password123 http://localhost:8091/pools/default/buckets/ecommerce/stats | python3 -m json.tool
```

Monitor resource usage across containers.

```bash
# Watch all Couchbase containers
docker stats cb-node1 cb-node2 cb-node3 --no-stream
```

## Backup and Restore

Use the `cbbackupmgr` tool for cluster backups.

```bash
# Configure a backup repository
docker exec cb-node1 cbbackupmgr config \
  --archive /opt/couchbase/var/backups \
  --repo mybackup

# Run a full backup
docker exec cb-node1 cbbackupmgr backup \
  --archive /opt/couchbase/var/backups \
  --repo mybackup \
  --cluster cb-node1:8091 \
  --username admin \
  --password password123

# List available backups
docker exec cb-node1 cbbackupmgr list \
  --archive /opt/couchbase/var/backups \
  --repo mybackup
```

## Application Connectivity

Connect from a Node.js application.

```javascript
// npm install couchbase
const couchbase = require('couchbase');

async function main() {
  // Connect to the cluster
  const cluster = await couchbase.connect('couchbase://localhost', {
    username: 'admin',
    password: 'password123',
  });

  const bucket = cluster.bucket('ecommerce');
  const collection = bucket.scope('inventory').collection('products');

  // Upsert a document
  await collection.upsert('prod-002', {
    name: 'Mechanical Keyboard',
    category: 'electronics',
    price: 89.99,
    stock: 75,
  });

  // Fetch by key (sub-millisecond)
  const result = await collection.get('prod-002');
  console.log(result.content);

  // Run a N1QL query
  const query = await cluster.query(
    'SELECT * FROM `ecommerce`.`inventory`.`products` WHERE price > $1',
    { parameters: [50] }
  );
  console.log(query.rows);
}

main().catch(console.error);
```

## Summary

Couchbase in Docker gives you a full-featured distributed NoSQL database with key-value, document, and SQL query capabilities. Start with a single node for development, then scale to a multi-node cluster using Docker Compose. The CLI tools make it straightforward to automate cluster initialization, bucket creation, and node joining. For production-like testing, run at least three nodes with replica counts set to 2, and practice rebalancing operations so you understand how Couchbase redistributes data when nodes join or leave the cluster.
