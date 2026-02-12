# How to Query Neptune with Gremlin

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Neptune, Gremlin, Graph Database

Description: Learn how to write Gremlin queries against Amazon Neptune, covering traversals, filtering, pattern matching, and performance optimization for graph workloads.

---

Gremlin is the query language you'll reach for when working with property graphs in Amazon Neptune. If you've already [set up your Neptune cluster](https://oneuptime.com/blog/post/amazon-neptune-graph-databases/view), the next step is learning how to actually query your data. Gremlin takes a different approach compared to SQL - instead of declaring what data you want, you describe how to traverse the graph to find it.

This post covers everything from basic vertex and edge operations to complex traversals that'll handle real production queries.

## Understanding the Gremlin Traversal Model

In Gremlin, everything starts with a traversal source, typically called `g`. From there, you chain steps together to navigate through vertices (nodes) and edges (relationships). Each step transforms or filters the set of elements you're working with.

Think of it like walking through a city. You start at a location, walk along streets (edges) to reach new locations (vertices), and along the way you can decide which paths to take based on conditions.

## Connecting to Neptune with Gremlin

Before running queries, you need a connection. Here's how to connect from a Python application using the gremlinpython library.

```python
# Install with: pip install gremlinpython
from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
from gremlin_python.process.anonymous_traversal import traversal
from gremlin_python.process.graph_traversal import __

# Connect to your Neptune cluster endpoint
neptune_endpoint = 'wss://your-cluster.cluster-xxx.us-east-1.neptune.amazonaws.com:8182/gremlin'
connection = DriverRemoteConnection(neptune_endpoint, 'g')
g = traversal().withRemote(connection)
```

For Node.js applications, the setup looks like this.

```javascript
// Install with: npm install gremlin
const gremlin = require('gremlin');
const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

// Create connection to Neptune
const endpoint = 'wss://your-cluster.cluster-xxx.us-east-1.neptune.amazonaws.com:8182/gremlin';
const dc = new DriverRemoteConnection(endpoint);
const graph = new Graph();
const g = graph.traversal().withRemote(dc);
```

## Creating Vertices and Edges

Let's build a small social network to run queries against. Here's how to add vertices (people) and edges (relationships).

```python
# Add vertices with labels and properties
g.addV('person').property('name', 'Alice').property('age', 30).property('city', 'Seattle').next()
g.addV('person').property('name', 'Bob').property('age', 28).property('city', 'Portland').next()
g.addV('person').property('name', 'Charlie').property('age', 35).property('city', 'Seattle').next()
g.addV('person').property('name', 'Diana').property('age', 32).property('city', 'Denver').next()

# Add a different type of vertex
g.addV('company').property('name', 'TechCorp').property('industry', 'Software').next()

# Create edges between vertices
# First, get the vertices we want to connect
alice = g.V().has('person', 'name', 'Alice').next()
bob = g.V().has('person', 'name', 'Bob').next()
charlie = g.V().has('person', 'name', 'Charlie').next()
techcorp = g.V().has('company', 'name', 'TechCorp').next()

# Add friendship edges
g.V(alice).addE('knows').to(bob).property('since', 2020).next()
g.V(alice).addE('knows').to(charlie).property('since', 2018).next()
g.V(bob).addE('knows').to(charlie).property('since', 2021).next()

# Add employment edges
g.V(alice).addE('works_at').to(techcorp).property('role', 'Engineer').next()
g.V(bob).addE('works_at').to(techcorp).property('role', 'Designer').next()
```

## Basic Query Patterns

Here are the fundamental query patterns you'll use constantly.

```python
# Get all vertices with a specific label
all_people = g.V().hasLabel('person').valueMap(True).toList()

# Find a specific vertex by property
alice = g.V().has('person', 'name', 'Alice').valueMap(True).next()

# Get all edges from a vertex
alice_relationships = g.V().has('person', 'name', 'Alice').outE().valueMap(True).toList()

# Find who Alice knows
alice_friends = g.V().has('person', 'name', 'Alice').out('knows').values('name').toList()
# Returns: ['Bob', 'Charlie']

# Find who knows Alice (reverse direction)
who_knows_alice = g.V().has('person', 'name', 'Alice').in_('knows').values('name').toList()
```

## Filtering and Conditions

Gremlin provides several ways to filter your traversals.

```python
from gremlin_python.process.traversal import P

# Find people older than 30
seniors = g.V().hasLabel('person').has('age', P.gt(30)).values('name').toList()
# Returns: ['Charlie', 'Diana']

# Find people in Seattle
seattle_people = g.V().hasLabel('person').has('city', 'Seattle').values('name').toList()
# Returns: ['Alice', 'Charlie']

# Combine multiple conditions - people in Seattle over 30
g.V().hasLabel('person') \
  .has('city', 'Seattle') \
  .has('age', P.gt(30)) \
  .values('name').toList()
# Returns: ['Charlie']

# Range queries - people aged 28 to 33
g.V().hasLabel('person') \
  .has('age', P.between(28, 34)) \
  .values('name').toList()
```

## Multi-Hop Traversals

This is where graph databases really shine. Finding connections across multiple hops is natural in Gremlin but would require ugly self-joins in SQL.

```python
# Friends of friends (2 hops)
fof = g.V().has('person', 'name', 'Alice') \
  .out('knows') \
  .out('knows') \
  .dedup() \
  .values('name').toList()

# Exclude the starting person and direct friends
fof_new = g.V().has('person', 'name', 'Alice') \
  .as_('start') \
  .out('knows').aggregate('friends') \
  .out('knows') \
  .where(P.neq('start')) \
  .where(P.without('friends')) \
  .dedup() \
  .values('name').toList()

# Find the shortest path between two people
path = g.V().has('person', 'name', 'Alice') \
  .repeat(__.out('knows').simplePath()) \
  .until(__.has('person', 'name', 'Diana')) \
  .path() \
  .limit(1) \
  .toList()
```

## Aggregation and Grouping

Gremlin handles aggregation differently than SQL, but it's quite powerful.

```python
# Count people per city
city_counts = g.V().hasLabel('person') \
  .groupCount().by('city').next()
# Returns: {'Seattle': 2, 'Portland': 1, 'Denver': 1}

# Group people by city
city_groups = g.V().hasLabel('person') \
  .group().by('city').by('name').next()

# Average age of people
avg_age = g.V().hasLabel('person') \
  .values('age').mean().next()

# Find the most connected person
most_connected = g.V().hasLabel('person') \
  .project('name', 'connections') \
  .by('name') \
  .by(__.both('knows').count()) \
  .order().by('connections', Order.desc) \
  .limit(1).next()
```

## Pattern Matching with match()

For more complex queries, the `match()` step lets you express patterns declaratively.

```python
# Find people who work at the same company and know each other
coworker_friends = g.V().match(
  __.as_('a').hasLabel('person'),
  __.as_('b').hasLabel('person'),
  __.as_('a').out('works_at').as_('company'),
  __.as_('b').out('works_at').as_('company'),
  __.as_('a').out('knows').as_('b')
).select('a', 'b').by('name').dedup().toList()
```

## Performance Tips for Neptune

Writing efficient Gremlin queries against Neptune is a bit different from running them against an in-memory TinkerGraph. Here are the key things to keep in mind.

Always start traversals with a specific vertex or a well-indexed property lookup. Scanning all vertices is expensive.

```python
# Good - starts with an indexed lookup
g.V().has('person', 'name', 'Alice').out('knows').toList()

# Bad - scans every vertex then filters
g.V().hasLabel('person').filter(__.values('name').is_('Alice')).out('knows').toList()
```

Use `limit()` when you only need a subset of results. Neptune will stop traversing once the limit is reached.

```python
# Only get the first 10 results instead of materializing everything
g.V().hasLabel('person').limit(10).valueMap(True).toList()
```

Avoid using `valueMap()` without filtering properties when vertices have many properties. Fetch only what you need.

```python
# Better - only get the properties you need
g.V().has('person', 'name', 'Alice').project('name', 'city').by('name').by('city').next()
```

## Handling Transactions

Neptune supports transactions for Gremlin. If you need to make multiple changes atomically, wrap them in a single request.

```python
# Multiple mutations in a single traversal ensure atomicity
g.addV('person').property('name', 'Eve').property('age', 27) \
  .addV('person').property('name', 'Frank').property('age', 29) \
  .V().has('person', 'name', 'Eve') \
  .addE('knows').to(__.V().has('person', 'name', 'Frank')) \
  .iterate()
```

## Wrapping Up

Gremlin's traversal-based approach takes some getting used to if you're coming from SQL, but once it clicks, you'll find it incredibly natural for graph problems. Start with simple vertex lookups and edge traversals, then work your way up to multi-hop patterns and aggregations. The key to good performance in Neptune is always starting your traversal from a specific, indexed starting point and limiting results when possible.
