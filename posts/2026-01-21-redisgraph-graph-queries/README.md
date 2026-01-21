# How to Use RedisGraph for Graph Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisGraph, Graph Database, Cypher, Social Networks, Recommendation Systems

Description: A comprehensive guide to using RedisGraph for graph queries, covering Cypher query language, relationship modeling, traversals, and practical use cases like social networks and recommendations.

---

RedisGraph is a graph database module for Redis that supports property graphs with Cypher query language. It enables you to model and query complex relationships at Redis speed, making it ideal for social networks, recommendation engines, fraud detection, and knowledge graphs.

## Why RedisGraph?

RedisGraph offers several advantages:

- **Speed**: In-memory processing with sparse matrix operations
- **Cypher Support**: Industry-standard graph query language
- **Property Graphs**: Nodes and edges can have attributes
- **Integration**: Embedded in Redis, no separate infrastructure
- **Scalability**: Handles millions of nodes and relationships

## Installation

### Using Redis Stack

```bash
# Docker
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

# Verify
redis-cli GRAPH.QUERY test "RETURN 1"
```

### Using RedisGraph Module

```bash
# Load module
redis-server --loadmodule /path/to/redisgraph.so
```

## Basic Concepts

### Graph Elements

- **Nodes**: Entities with labels and properties
- **Relationships**: Connections between nodes with types and properties
- **Labels**: Categories for nodes (e.g., Person, Product)
- **Properties**: Key-value attributes on nodes and relationships

## Python Client Setup

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Helper function for graph queries
def graph_query(graph_name, query):
    return r.graph(graph_name).query(query)
```

## Creating Graphs

### Creating Nodes

```python
# Create a single node
r.graph("social").query("""
    CREATE (:Person {name: 'Alice', age: 30, city: 'San Francisco'})
""")

# Create multiple nodes
r.graph("social").query("""
    CREATE
        (:Person {name: 'Bob', age: 28, city: 'New York'}),
        (:Person {name: 'Charlie', age: 35, city: 'Los Angeles'}),
        (:Person {name: 'Diana', age: 32, city: 'San Francisco'}),
        (:Person {name: 'Eve', age: 27, city: 'Seattle'})
""")

# Create nodes with different labels
r.graph("social").query("""
    CREATE
        (:Company {name: 'TechCorp', industry: 'Technology'}),
        (:Company {name: 'DataInc', industry: 'Analytics'}),
        (:Skill {name: 'Python'}),
        (:Skill {name: 'Redis'}),
        (:Skill {name: 'Graph Databases'})
""")
```

### Creating Relationships

```python
# Create relationships between existing nodes
r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
    CREATE (a)-[:FRIENDS_WITH {since: 2020}]->(b)
""")

# Create multiple relationships
r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'})
    MATCH (c:Person {name: 'Charlie'})
    MATCH (d:Person {name: 'Diana'})
    CREATE (a)-[:FRIENDS_WITH {since: 2019}]->(c)
    CREATE (a)-[:FRIENDS_WITH {since: 2021}]->(d)
    CREATE (c)-[:FRIENDS_WITH {since: 2020}]->(d)
""")

# Create work relationships
r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'}), (t:Company {name: 'TechCorp'})
    CREATE (a)-[:WORKS_AT {role: 'Engineer', since: 2018}]->(t)
""")

r.graph("social").query("""
    MATCH (b:Person {name: 'Bob'}), (d:Company {name: 'DataInc'})
    CREATE (b)-[:WORKS_AT {role: 'Data Scientist', since: 2019}]->(d)
""")

# Create skill relationships
r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'})
    MATCH (py:Skill {name: 'Python'})
    MATCH (redis:Skill {name: 'Redis'})
    CREATE (a)-[:KNOWS {level: 'expert'}]->(py)
    CREATE (a)-[:KNOWS {level: 'intermediate'}]->(redis)
""")
```

### MERGE for Idempotent Operations

```python
# MERGE creates if not exists, matches if exists
r.graph("social").query("""
    MERGE (p:Person {name: 'Frank'})
    ON CREATE SET p.age = 29, p.city = 'Boston'
    ON MATCH SET p.last_login = timestamp()
    RETURN p
""")

# MERGE relationships
r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'}), (f:Person {name: 'Frank'})
    MERGE (a)-[r:FRIENDS_WITH]->(f)
    ON CREATE SET r.since = 2024
    RETURN r
""")
```

## Querying Graphs

### Basic Queries

```python
# Find a node by property
result = r.graph("social").query("""
    MATCH (p:Person {name: 'Alice'})
    RETURN p.name, p.age, p.city
""")
for record in result.result_set:
    print(f"Name: {record[0]}, Age: {record[1]}, City: {record[2]}")

# Find all nodes of a label
result = r.graph("social").query("""
    MATCH (p:Person)
    RETURN p.name, p.city
    ORDER BY p.name
""")

# Find nodes with conditions
result = r.graph("social").query("""
    MATCH (p:Person)
    WHERE p.age > 30 AND p.city = 'San Francisco'
    RETURN p.name, p.age
""")
```

### Relationship Queries

```python
# Find direct friends
result = r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'})-[:FRIENDS_WITH]->(friend)
    RETURN friend.name
""")

# Find friends with relationship properties
result = r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'})-[r:FRIENDS_WITH]->(friend)
    RETURN friend.name, r.since
""")

# Find bidirectional relationships
result = r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'})-[:FRIENDS_WITH]-(friend)
    RETURN DISTINCT friend.name
""")

# Find friends of friends
result = r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'})-[:FRIENDS_WITH*2]->(fof)
    WHERE fof <> a
    RETURN DISTINCT fof.name
""")

# Variable length paths (1 to 3 hops)
result = r.graph("social").query("""
    MATCH (a:Person {name: 'Alice'})-[:FRIENDS_WITH*1..3]->(connection)
    RETURN DISTINCT connection.name
""")
```

### Aggregations

```python
# Count friends
result = r.graph("social").query("""
    MATCH (p:Person)-[:FRIENDS_WITH]->(friend)
    RETURN p.name, COUNT(friend) as friend_count
    ORDER BY friend_count DESC
""")

# Average age by city
result = r.graph("social").query("""
    MATCH (p:Person)
    RETURN p.city, AVG(p.age) as avg_age, COUNT(*) as count
    ORDER BY count DESC
""")

# Collect into lists
result = r.graph("social").query("""
    MATCH (p:Person)-[:KNOWS]->(s:Skill)
    RETURN p.name, COLLECT(s.name) as skills
""")
```

### Path Finding

```python
# Shortest path between two nodes
result = r.graph("social").query("""
    MATCH path = shortestPath(
        (a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Eve'})
    )
    RETURN path
""")

# All paths up to length 4
result = r.graph("social").query("""
    MATCH path = (a:Person {name: 'Alice'})-[*..4]-(b:Person {name: 'Eve'})
    RETURN path, LENGTH(path) as hops
    ORDER BY hops
    LIMIT 5
""")
```

## Practical Use Cases

### Social Network Recommendations

```python
class SocialNetwork:
    def __init__(self, redis_client, graph_name="social"):
        self.r = redis_client
        self.graph_name = graph_name
        self.graph = redis_client.graph(graph_name)

    def add_user(self, user_id, properties):
        """Add a new user."""
        props = ", ".join([f"{k}: '{v}'" if isinstance(v, str) else f"{k}: {v}"
                         for k, v in properties.items()])
        self.graph.query(f"""
            MERGE (u:User {{id: '{user_id}', {props}}})
        """)

    def follow(self, follower_id, followee_id):
        """Create a follow relationship."""
        self.graph.query(f"""
            MATCH (a:User {{id: '{follower_id}'}})
            MATCH (b:User {{id: '{followee_id}'}})
            MERGE (a)-[:FOLLOWS]->(b)
        """)

    def unfollow(self, follower_id, followee_id):
        """Remove a follow relationship."""
        self.graph.query(f"""
            MATCH (a:User {{id: '{follower_id}'}})-[r:FOLLOWS]->(b:User {{id: '{followee_id}'}})
            DELETE r
        """)

    def get_followers(self, user_id):
        """Get all followers of a user."""
        result = self.graph.query(f"""
            MATCH (follower:User)-[:FOLLOWS]->(u:User {{id: '{user_id}'}})
            RETURN follower.id, follower.name
        """)
        return [{"id": r[0], "name": r[1]} for r in result.result_set]

    def get_following(self, user_id):
        """Get all users that a user follows."""
        result = self.graph.query(f"""
            MATCH (u:User {{id: '{user_id}'}})-[:FOLLOWS]->(following:User)
            RETURN following.id, following.name
        """)
        return [{"id": r[0], "name": r[1]} for r in result.result_set]

    def get_friend_suggestions(self, user_id, limit=10):
        """Suggest users to follow based on mutual connections."""
        result = self.graph.query(f"""
            MATCH (me:User {{id: '{user_id}'}})-[:FOLLOWS]->(friend)-[:FOLLOWS]->(suggestion:User)
            WHERE NOT (me)-[:FOLLOWS]->(suggestion) AND me <> suggestion
            RETURN suggestion.id, suggestion.name, COUNT(friend) as mutual_friends
            ORDER BY mutual_friends DESC
            LIMIT {limit}
        """)
        return [
            {"id": r[0], "name": r[1], "mutual_friends": r[2]}
            for r in result.result_set
        ]

    def get_mutual_friends(self, user1_id, user2_id):
        """Find mutual friends between two users."""
        result = self.graph.query(f"""
            MATCH (a:User {{id: '{user1_id}'}})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(b:User {{id: '{user2_id}'}})
            RETURN mutual.id, mutual.name
        """)
        return [{"id": r[0], "name": r[1]} for r in result.result_set]

    def get_influence_score(self, user_id, depth=2):
        """Calculate influence based on network reach."""
        result = self.graph.query(f"""
            MATCH (u:User {{id: '{user_id}'}})<-[:FOLLOWS*1..{depth}]-(follower:User)
            RETURN COUNT(DISTINCT follower) as reach
        """)
        return result.result_set[0][0] if result.result_set else 0


# Usage
social = SocialNetwork(r)

# Add users
social.add_user("u1", {"name": "Alice", "city": "SF"})
social.add_user("u2", {"name": "Bob", "city": "NYC"})
social.add_user("u3", {"name": "Charlie", "city": "LA"})
social.add_user("u4", {"name": "Diana", "city": "SF"})
social.add_user("u5", {"name": "Eve", "city": "Seattle"})

# Create follow relationships
social.follow("u1", "u2")
social.follow("u1", "u3")
social.follow("u2", "u3")
social.follow("u2", "u4")
social.follow("u3", "u4")
social.follow("u3", "u5")

# Get suggestions for Alice
suggestions = social.get_friend_suggestions("u1")
print(f"Friend suggestions: {suggestions}")

# Get influence score
score = social.get_influence_score("u3")
print(f"Influence score: {score}")
```

### Product Recommendations

```python
class ProductRecommender:
    def __init__(self, redis_client):
        self.graph = redis_client.graph("ecommerce")

    def add_product(self, product_id, name, category, price):
        """Add a product node."""
        self.graph.query(f"""
            MERGE (p:Product {{id: '{product_id}'}})
            SET p.name = '{name}', p.category = '{category}', p.price = {price}
        """)

    def add_customer(self, customer_id, name):
        """Add a customer node."""
        self.graph.query(f"""
            MERGE (c:Customer {{id: '{customer_id}', name: '{name}'}})
        """)

    def record_purchase(self, customer_id, product_id, rating=None):
        """Record a purchase with optional rating."""
        rating_clause = f", rating: {rating}" if rating else ""
        self.graph.query(f"""
            MATCH (c:Customer {{id: '{customer_id}'}})
            MATCH (p:Product {{id: '{product_id}'}})
            MERGE (c)-[r:PURCHASED]->(p)
            SET r.timestamp = timestamp(){rating_clause}
        """)

    def record_view(self, customer_id, product_id):
        """Record a product view."""
        self.graph.query(f"""
            MATCH (c:Customer {{id: '{customer_id}'}})
            MATCH (p:Product {{id: '{product_id}'}})
            MERGE (c)-[r:VIEWED]->(p)
            ON CREATE SET r.count = 1
            ON MATCH SET r.count = r.count + 1
        """)

    def collaborative_filtering(self, customer_id, limit=5):
        """Recommend products based on similar customers."""
        result = self.graph.query(f"""
            MATCH (me:Customer {{id: '{customer_id}'}})-[:PURCHASED]->(p:Product)
            MATCH (similar:Customer)-[:PURCHASED]->(p)
            WHERE similar <> me
            MATCH (similar)-[:PURCHASED]->(rec:Product)
            WHERE NOT (me)-[:PURCHASED]->(rec)
            RETURN rec.id, rec.name, rec.category, COUNT(similar) as score
            ORDER BY score DESC
            LIMIT {limit}
        """)
        return [
            {"id": r[0], "name": r[1], "category": r[2], "score": r[3]}
            for r in result.result_set
        ]

    def category_recommendations(self, customer_id, limit=5):
        """Recommend products from frequently purchased categories."""
        result = self.graph.query(f"""
            MATCH (c:Customer {{id: '{customer_id}'}})-[:PURCHASED]->(p:Product)
            WITH c, p.category as cat, COUNT(*) as purchases
            ORDER BY purchases DESC
            LIMIT 3
            MATCH (rec:Product)
            WHERE rec.category = cat AND NOT (c)-[:PURCHASED]->(rec)
            RETURN rec.id, rec.name, rec.category, rec.price
            LIMIT {limit}
        """)
        return [
            {"id": r[0], "name": r[1], "category": r[2], "price": r[3]}
            for r in result.result_set
        ]

    def frequently_bought_together(self, product_id, limit=5):
        """Find products frequently bought with a given product."""
        result = self.graph.query(f"""
            MATCH (p1:Product {{id: '{product_id}'}})<-[:PURCHASED]-(c:Customer)-[:PURCHASED]->(p2:Product)
            WHERE p1 <> p2
            RETURN p2.id, p2.name, p2.category, COUNT(c) as co_purchases
            ORDER BY co_purchases DESC
            LIMIT {limit}
        """)
        return [
            {"id": r[0], "name": r[1], "category": r[2], "co_purchases": r[3]}
            for r in result.result_set
        ]


# Usage
recommender = ProductRecommender(r)

# Add products
recommender.add_product("p1", "Laptop", "Electronics", 999)
recommender.add_product("p2", "Mouse", "Electronics", 29)
recommender.add_product("p3", "Keyboard", "Electronics", 79)
recommender.add_product("p4", "Headphones", "Electronics", 149)
recommender.add_product("p5", "Monitor", "Electronics", 299)

# Add customers and purchases
recommender.add_customer("c1", "Alice")
recommender.add_customer("c2", "Bob")
recommender.add_customer("c3", "Charlie")

recommender.record_purchase("c1", "p1", 5)
recommender.record_purchase("c1", "p2", 4)
recommender.record_purchase("c1", "p3", 5)
recommender.record_purchase("c2", "p1", 4)
recommender.record_purchase("c2", "p2", 5)
recommender.record_purchase("c2", "p4", 4)
recommender.record_purchase("c3", "p2", 5)
recommender.record_purchase("c3", "p3", 4)
recommender.record_purchase("c3", "p5", 5)

# Get recommendations for Alice
collab_recs = recommender.collaborative_filtering("c1")
print(f"Collaborative recommendations: {collab_recs}")

# Frequently bought together
fbt = recommender.frequently_bought_together("p1")
print(f"Frequently bought with Laptop: {fbt}")
```

### Fraud Detection

```python
class FraudDetector:
    def __init__(self, redis_client):
        self.graph = redis_client.graph("transactions")

    def add_transaction(self, tx_id, from_account, to_account, amount, timestamp):
        """Record a transaction."""
        self.graph.query(f"""
            MERGE (from:Account {{id: '{from_account}'}})
            MERGE (to:Account {{id: '{to_account}'}})
            CREATE (from)-[:SENT {{
                tx_id: '{tx_id}',
                amount: {amount},
                timestamp: {timestamp}
            }}]->(to)
        """)

    def detect_circular_transactions(self, account_id, max_depth=5):
        """Detect money laundering patterns (circular transactions)."""
        result = self.graph.query(f"""
            MATCH path = (a:Account {{id: '{account_id}'}})-[:SENT*2..{max_depth}]->(a)
            RETURN path, LENGTH(path) as hops
        """)
        return len(result.result_set) > 0

    def find_high_risk_connections(self, flagged_account_id, depth=2):
        """Find accounts connected to a flagged account."""
        result = self.graph.query(f"""
            MATCH (flagged:Account {{id: '{flagged_account_id}'}})-[:SENT*1..{depth}]-(connected:Account)
            WHERE connected <> flagged
            RETURN DISTINCT connected.id,
                   LENGTH(shortestPath((flagged)-[:SENT*]-(connected))) as distance
            ORDER BY distance
        """)
        return [{"account": r[0], "distance": r[1]} for r in result.result_set]

    def detect_rapid_transfers(self, account_id, time_window=3600, min_transactions=5):
        """Detect accounts with unusually rapid transactions."""
        result = self.graph.query(f"""
            MATCH (a:Account {{id: '{account_id}'}})-[t:SENT]->()
            WITH a, t
            ORDER BY t.timestamp
            WITH a, COLLECT(t.timestamp) as timestamps
            WHERE SIZE(timestamps) >= {min_transactions}
            RETURN a.id, timestamps
        """)
        # Analyze timestamps for rapid patterns
        # Implementation depends on specific requirements
        return result.result_set


# Usage
fraud = FraudDetector(r)

# Record transactions
import time
now = int(time.time())
fraud.add_transaction("tx1", "acc1", "acc2", 1000, now - 3600)
fraud.add_transaction("tx2", "acc2", "acc3", 950, now - 3000)
fraud.add_transaction("tx3", "acc3", "acc4", 900, now - 2400)
fraud.add_transaction("tx4", "acc4", "acc1", 850, now - 1800)  # Circular!

# Detect circular pattern
is_circular = fraud.detect_circular_transactions("acc1")
print(f"Circular transaction detected: {is_circular}")
```

## Performance Optimization

### Indexes

```python
# Create index on node property
r.graph("social").query("""
    CREATE INDEX FOR (p:Person) ON (p.name)
""")

# Create index on multiple properties
r.graph("social").query("""
    CREATE INDEX FOR (p:Person) ON (p.city, p.age)
""")

# Create index on relationship property
r.graph("social").query("""
    CREATE INDEX FOR ()-[r:FRIENDS_WITH]->() ON (r.since)
""")

# List indexes
result = r.graph("social").query("CALL db.indexes()")
```

### Query Optimization Tips

```python
# Use specific labels
# Good
result = r.graph("social").query("""
    MATCH (p:Person {name: 'Alice'})
    RETURN p
""")

# Avoid (slower)
result = r.graph("social").query("""
    MATCH (p {name: 'Alice'})
    RETURN p
""")

# Use LIMIT early
result = r.graph("social").query("""
    MATCH (p:Person)-[:FRIENDS_WITH]->(f)
    RETURN p.name, COUNT(f) as friends
    ORDER BY friends DESC
    LIMIT 10
""")

# Use WITH for query chaining
result = r.graph("social").query("""
    MATCH (p:Person)
    WHERE p.age > 25
    WITH p
    ORDER BY p.age DESC
    LIMIT 100
    MATCH (p)-[:FRIENDS_WITH]->(f)
    RETURN p.name, COLLECT(f.name) as friends
""")
```

## Conclusion

RedisGraph provides a powerful graph database within Redis, enabling complex relationship queries at Redis speed. Key takeaways:

- Use **Cypher** for expressive graph queries
- Model data with **nodes, relationships, and properties**
- Use **indexes** for frequently queried properties
- Leverage **path finding** for recommendations and fraud detection
- Use **aggregations** for network analysis

## Related Resources

- [RedisGraph Documentation](https://redis.io/docs/stack/graph/)
- [Cypher Query Language](https://neo4j.com/developer/cypher/)
- [RedisGraph Commands](https://redis.io/commands/?group=graph)
