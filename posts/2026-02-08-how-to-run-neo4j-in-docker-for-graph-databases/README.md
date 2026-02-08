# How to Run Neo4j in Docker for Graph Databases

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Neo4j, Graph Database, Databases, DevOps, Cypher

Description: Step-by-step guide to deploying Neo4j graph database in Docker with Cypher queries and practical examples

---

Graph databases model relationships as first-class citizens. Instead of joining tables through foreign keys, you traverse edges between nodes. Neo4j is the most popular graph database, and running it in Docker strips away the installation friction so you can focus on modeling your data.

This guide covers everything from a basic container to production-ready configurations with plugins, authentication, and backups.

## When to Use a Graph Database

Relational databases handle tabular data well, but they struggle when queries need to traverse deep relationships. Think social networks, recommendation engines, fraud detection, knowledge graphs, or dependency trees. If your queries frequently involve "find all things connected to X within N hops," a graph database will outperform a traditional RDBMS by orders of magnitude.

## Quick Start

Pull and run Neo4j with a single command.

```bash
# Start Neo4j with the browser UI exposed on port 7474
# and the Bolt protocol on port 7687
docker run -d \
  --name neo4j \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/changeme123 \
  -v neo4j_data:/data \
  -v neo4j_logs:/logs \
  neo4j:5
```

Open `http://localhost:7474` in your browser to access the Neo4j Browser. Log in with `neo4j` / `changeme123`.

## Docker Compose Configuration

A production-friendly setup with memory limits, plugins, and health checks.

```yaml
# docker-compose.yml
version: "3.8"

services:
  neo4j:
    image: neo4j:5-community
    container_name: neo4j
    restart: unless-stopped
    ports:
      - "7474:7474"   # HTTP browser
      - "7687:7687"   # Bolt protocol
    environment:
      # Set initial password (minimum 8 characters)
      NEO4J_AUTH: neo4j/s3cureP@ssword
      # Memory configuration
      NEO4J_server_memory_heap_initial__size: 512m
      NEO4J_server_memory_heap_max__size: 1G
      NEO4J_server_memory_pagecache_size: 512m
      # Enable APOC plugin for advanced procedures
      NEO4J_PLUGINS: '["apoc"]'
      # Allow file imports from the import directory
      NEO4J_dbms_security_procedures_unrestricted: apoc.*
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - neo4j_import:/var/lib/neo4j/import
      - neo4j_plugins:/plugins
    healthcheck:
      test: ["CMD", "neo4j", "status"]
      interval: 15s
      timeout: 10s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G

volumes:
  neo4j_data:
  neo4j_logs:
  neo4j_import:
  neo4j_plugins:
```

Bring it up.

```bash
docker compose up -d
```

## Cypher Query Basics

Cypher is Neo4j's query language. Connect using the Neo4j Browser or the `cypher-shell` inside the container.

```bash
# Open a Cypher shell session
docker exec -it neo4j cypher-shell -u neo4j -p 's3cureP@ssword'
```

Create nodes and relationships.

```cypher
// Create person nodes
CREATE (alice:Person {name: 'Alice', age: 32, role: 'engineer'})
CREATE (bob:Person {name: 'Bob', age: 28, role: 'designer'})
CREATE (charlie:Person {name: 'Charlie', age: 35, role: 'manager'})

// Create a company node
CREATE (acme:Company {name: 'Acme Corp', founded: 2015})

// Create relationships
CREATE (alice)-[:WORKS_AT {since: 2020}]->(acme)
CREATE (bob)-[:WORKS_AT {since: 2021}]->(acme)
CREATE (charlie)-[:WORKS_AT {since: 2018}]->(acme)
CREATE (charlie)-[:MANAGES]->(alice)
CREATE (charlie)-[:MANAGES]->(bob)
CREATE (alice)-[:FRIENDS_WITH]->(bob);
```

Query the graph to find who Charlie manages.

```cypher
// Find all people managed by Charlie
MATCH (manager:Person {name: 'Charlie'})-[:MANAGES]->(report:Person)
RETURN report.name AS employee, report.role AS role;
```

Traverse multiple hops to find second-degree connections.

```cypher
// Find friends of friends (2 hops away)
MATCH (p:Person {name: 'Alice'})-[:FRIENDS_WITH*1..2]-(friend)
WHERE friend.name <> 'Alice'
RETURN DISTINCT friend.name AS connection;
```

## Modeling a Real-World Example: Microservice Dependencies

Graph databases excel at dependency mapping. Model your microservices and their dependencies.

```cypher
// Create service nodes
CREATE (api:Service {name: 'api-gateway', version: '2.1.0', port: 8080})
CREATE (auth:Service {name: 'auth-service', version: '1.5.0', port: 8081})
CREATE (user:Service {name: 'user-service', version: '3.0.1', port: 8082})
CREATE (db:Service {name: 'postgres', version: '16', port: 5432})
CREATE (cache:Service {name: 'redis', version: '7.2', port: 6379})

// Define dependencies
CREATE (api)-[:DEPENDS_ON {protocol: 'HTTP'}]->(auth)
CREATE (api)-[:DEPENDS_ON {protocol: 'HTTP'}]->(user)
CREATE (auth)-[:DEPENDS_ON {protocol: 'TCP'}]->(db)
CREATE (auth)-[:DEPENDS_ON {protocol: 'TCP'}]->(cache)
CREATE (user)-[:DEPENDS_ON {protocol: 'TCP'}]->(db);
```

Now query for impact analysis - what breaks if Postgres goes down?

```cypher
// Find all services that depend on postgres, directly or transitively
MATCH (target:Service {name: 'postgres'})<-[:DEPENDS_ON*1..5]-(dependent)
RETURN dependent.name AS affected_service,
       length(shortestPath((dependent)-[:DEPENDS_ON*]->(target))) AS hops_away
ORDER BY hops_away;
```

## Indexes and Constraints

Performance matters. Create indexes on properties you query frequently.

```cypher
// Create a unique constraint (also creates an index)
CREATE CONSTRAINT person_name IF NOT EXISTS
FOR (p:Person) REQUIRE p.name IS UNIQUE;

// Create a composite index for faster lookups
CREATE INDEX service_lookup IF NOT EXISTS
FOR (s:Service) ON (s.name, s.version);

// List all indexes
SHOW INDEXES;
```

## Importing CSV Data

Place CSV files in the mapped import directory and load them with Cypher.

```bash
# Copy a CSV file into the import volume
docker cp users.csv neo4j:/var/lib/neo4j/import/users.csv
```

Load the data.

```cypher
// Import users from CSV
LOAD CSV WITH HEADERS FROM 'file:///users.csv' AS row
CREATE (u:User {
    id: toInteger(row.id),
    name: row.name,
    email: row.email,
    joined: date(row.join_date)
});
```

## Backup and Restore

Neo4j provides a dump utility for backups.

```bash
# Stop the database before dumping (community edition requirement)
docker exec neo4j neo4j-admin database dump neo4j --to-path=/data/backups/

# Copy the backup to the host
docker cp neo4j:/data/backups/ ./neo4j-backups/
```

Restore from a dump.

```bash
# Restore a database from a dump file
docker exec neo4j neo4j-admin database load neo4j --from-path=/data/backups/ --overwrite-destination
```

## Connecting from Applications

Use the official Bolt driver for your language. Here is a Python example.

```python
# pip install neo4j
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    "bolt://localhost:7687",
    auth=("neo4j", "s3cureP@ssword")
)

# Run a query and process results
with driver.session() as session:
    result = session.run(
        "MATCH (p:Person)-[:WORKS_AT]->(c:Company) "
        "RETURN p.name AS person, c.name AS company"
    )
    for record in result:
        print(f"{record['person']} works at {record['company']}")

driver.close()
```

## Performance Monitoring

Check database statistics from within the container.

```bash
# View database info
docker exec neo4j cypher-shell -u neo4j -p 's3cureP@ssword' \
  "CALL db.stats.retrieve('GRAPH COUNTS') YIELD data RETURN data;"

# Monitor container resources
docker stats neo4j --no-stream
```

## Summary

Neo4j in Docker gets you a graph database running in under a minute. Model your data as nodes and relationships, query with Cypher, and lean on the Neo4j Browser for visual exploration. For production, configure memory settings, enable the APOC plugin for advanced procedures, create indexes on hot properties, and set up regular backups. Graph databases shine when your data is highly connected, so if your queries involve traversing relationships, Neo4j is worth the investment.
