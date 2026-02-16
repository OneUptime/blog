# How to Implement Azure Cosmos DB Graph API with Gremlin SDK in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Cosmos DB, Graph API, Gremlin, Java, Graph Database, SDK, NoSQL

Description: Use the Gremlin Java SDK with Azure Cosmos DB Graph API to model and query graph data for relationship-heavy applications.

---

Graph databases excel at modeling and querying data with complex relationships. Think social networks, recommendation engines, fraud detection, and knowledge graphs. Azure Cosmos DB supports the Gremlin graph traversal language through its Graph API, giving you a globally distributed graph database without the operational overhead of managing your own cluster.

In this post, we will use the Gremlin Java SDK to interact with Azure Cosmos DB's Graph API. We will model a social network, add vertices and edges, and write graph traversals to answer relationship questions.

## When to Use Graph

Relational databases handle simple relationships well. A user has many orders, an order has many items - these are straightforward joins. But when your queries involve traversing many levels of relationships ("find friends of friends who also like this product") or when the number of relationship types is large and evolving, a graph database is a better fit.

Cosmos DB's Graph API is backed by the same distributed infrastructure as the SQL API, so you get the same SLAs for latency and availability.

## Setup

Create a Cosmos DB account with the Gremlin (Graph) API.

```bash
# Create a Cosmos DB account with Gremlin API
az cosmosdb create \
  --name my-graph-db \
  --resource-group graph-rg \
  --kind GlobalDocumentDB \
  --capabilities EnableGremlin

# Create a graph database
az cosmosdb gremlin database create \
  --account-name my-graph-db \
  --resource-group graph-rg \
  --name SocialNetwork

# Create a graph container
az cosmosdb gremlin graph create \
  --account-name my-graph-db \
  --resource-group graph-rg \
  --database-name SocialNetwork \
  --name People \
  --partition-key-path /city \
  --throughput 400
```

## Add the Maven Dependency

```xml
<!-- pom.xml - Gremlin Java driver dependency -->
<dependency>
    <groupId>org.apache.tinkerpop</groupId>
    <artifactId>gremlin-driver</artifactId>
    <version>3.6.4</version>
</dependency>
```

## Configure the Gremlin Client

The Gremlin client connects to the Cosmos DB Gremlin endpoint using WebSockets.

```java
// src/main/java/com/example/graph/GremlinConfig.java
// Configures the Gremlin client for Azure Cosmos DB
package com.example.graph;

import org.apache.tinkerpop.gremlin.driver.Client;
import org.apache.tinkerpop.gremlin.driver.Cluster;
import org.apache.tinkerpop.gremlin.driver.ser.GraphSONMessageSerializerV2d0;

public class GremlinConfig {

    // Connection details from the Azure portal
    private static final String HOST = "my-graph-db.gremlin.cosmos.azure.com";
    private static final int PORT = 443;
    private static final String USERNAME = "/dbs/SocialNetwork/colls/People";
    private static final String PASSWORD = "your-cosmos-key";

    public static Client createClient() {
        // Build the cluster configuration
        Cluster cluster = Cluster.build()
            .addContactPoint(HOST)
            .port(PORT)
            .credentials(USERNAME, PASSWORD)
            .enableSsl(true)
            .serializer(new GraphSONMessageSerializerV2d0())
            // Connection pool settings
            .maxConnectionPoolSize(10)
            .maxInProcessPerConnection(32)
            .maxContentLength(65536)
            .create();

        return cluster.connect();
    }
}
```

## Add Vertices (People)

Vertices represent entities in the graph. Let us add people with properties.

```java
// src/main/java/com/example/graph/GraphOperations.java
// Graph operations for managing vertices and edges
package com.example.graph;

import org.apache.tinkerpop.gremlin.driver.Client;
import org.apache.tinkerpop.gremlin.driver.Result;
import org.apache.tinkerpop.gremlin.driver.ResultSet;

import java.util.*;
import java.util.concurrent.CompletableFuture;

public class GraphOperations {

    private final Client client;

    public GraphOperations(Client client) {
        this.client = client;
    }

    // Add a person vertex to the graph
    public void addPerson(String id, String name, String city, int age) {
        // Gremlin query to add a vertex with properties
        // The partition key (city) must be included as a property
        String query = "g.addV('person')" +
            ".property('id', id)" +
            ".property('name', name)" +
            ".property('city', city)" +       // This is the partition key
            ".property('age', age)" +
            ".property('pk', city)";           // Cosmos DB requires pk property

        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("name", name);
        params.put("city", city);
        params.put("age", age);

        executeQuery(query, params);
        System.out.println("Added person: " + name);
    }

    // Add a friendship edge between two people
    public void addFriendship(String fromId, String fromCity, String toId, String toCity, String since) {
        // Gremlin query to add an edge between two vertices
        String query = "g.V([fromCity, fromId])" +
            ".addE('friends_with')" +
            ".property('since', since)" +
            ".to(g.V([toCity, toId]))";

        Map<String, Object> params = new HashMap<>();
        params.put("fromId", fromId);
        params.put("fromCity", fromCity);
        params.put("toId", toId);
        params.put("toCity", toCity);
        params.put("since", since);

        executeQuery(query, params);
        System.out.println("Added friendship: " + fromId + " -> " + toId);
    }

    // Add an interest edge (person likes a topic)
    public void addInterest(String personId, String city, String topic) {
        // First add the topic as a vertex if it does not exist
        String addTopic = "g.V().has('topic', 'name', topic).fold()" +
            ".coalesce(unfold(), addV('topic').property('name', topic).property('city', 'global'))";

        Map<String, Object> topicParams = new HashMap<>();
        topicParams.put("topic", topic);
        executeQuery(addTopic, topicParams);

        // Then add the edge
        String addEdge = "g.V([city, personId])" +
            ".addE('interested_in')" +
            ".to(g.V().has('topic', 'name', topic))";

        Map<String, Object> edgeParams = new HashMap<>();
        edgeParams.put("personId", personId);
        edgeParams.put("city", city);
        edgeParams.put("topic", topic);

        executeQuery(addEdge, edgeParams);
    }

    // Helper method to execute a Gremlin query
    private List<Result> executeQuery(String query, Map<String, Object> params) {
        try {
            ResultSet results = client.submit(query, params);
            return results.all().get();
        } catch (Exception e) {
            System.err.println("Query failed: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
}
```

## Query the Graph

Now the interesting part - querying relationships.

```java
// src/main/java/com/example/graph/GraphQueries.java
// Graph traversal queries for the social network
package com.example.graph;

import org.apache.tinkerpop.gremlin.driver.Client;
import org.apache.tinkerpop.gremlin.driver.Result;

import java.util.*;

public class GraphQueries {

    private final Client client;

    public GraphQueries(Client client) {
        this.client = client;
    }

    // Find all friends of a person
    public List<Map<String, Object>> getFriends(String personId, String city) {
        String query = "g.V([city, personId])" +
            ".both('friends_with')" +     // Traverse friendship edges in both directions
            ".project('name', 'city', 'age')" +
            ".by('name').by('city').by('age')";

        return executeAndCollect(query, Map.of("personId", personId, "city", city));
    }

    // Find friends of friends (2nd degree connections)
    public List<Map<String, Object>> getFriendsOfFriends(String personId, String city) {
        // Traverse two levels of friendship, excluding the person and their direct friends
        String query = "g.V([city, personId]).as('self')" +
            ".both('friends_with').as('friend')" +
            ".both('friends_with')" +
            ".where(neq('self'))" +           // Exclude the starting person
            ".where(neq('friend'))" +         // Exclude direct friends
            ".dedup()" +                       // Remove duplicates
            ".project('name', 'city')" +
            ".by('name').by('city')";

        return executeAndCollect(query, Map.of("personId", personId, "city", city));
    }

    // Find people who share common interests
    public List<Map<String, Object>> findPeopleWithSharedInterests(String personId, String city) {
        // Follow interest edges to topics, then back to other people
        String query = "g.V([city, personId]).as('self')" +
            ".out('interested_in')" +         // Go to topics this person likes
            ".in('interested_in')" +          // Go back to people who share those topics
            ".where(neq('self'))" +           // Exclude the starting person
            ".groupCount()" +                 // Count how many topics they share
            ".by('name')" +
            ".unfold()" +
            ".order().by(values, desc)" +     // Sort by shared topic count descending
            ".limit(10)";

        return executeAndCollect(query, Map.of("personId", personId, "city", city));
    }

    // Find the shortest path between two people
    public List<Map<String, Object>> shortestPath(
            String fromId, String fromCity, String toId, String toCity) {
        String query = "g.V([fromCity, fromId])" +
            ".repeat(both('friends_with').simplePath())" +
            ".until(hasId(toId))" +
            ".limit(1)" +                     // Take only the first (shortest) path
            ".path()" +                        // Return the full path
            ".by('name')";

        Map<String, Object> params = Map.of(
            "fromId", fromId, "fromCity", fromCity,
            "toId", toId, "toCity", toCity
        );

        return executeAndCollect(query, params);
    }

    // Get graph statistics
    public Map<String, Long> getStats() {
        Map<String, Long> stats = new HashMap<>();

        // Count vertices by label
        String vertexCount = "g.V().groupCount().by(label)";
        List<Result> vResults = client.submit(vertexCount).all().join();
        if (!vResults.isEmpty()) {
            // Parse the results into the stats map
            System.out.println("Vertex counts: " + vResults.get(0));
        }

        // Count edges by label
        String edgeCount = "g.E().groupCount().by(label)";
        List<Result> eResults = client.submit(edgeCount).all().join();
        if (!eResults.isEmpty()) {
            System.out.println("Edge counts: " + eResults.get(0));
        }

        return stats;
    }

    private List<Map<String, Object>> executeAndCollect(String query, Map<String, Object> params) {
        try {
            List<Result> results = client.submit(query, params).all().get();
            List<Map<String, Object>> output = new ArrayList<>();
            for (Result result : results) {
                output.add(result.getObject() instanceof Map
                    ? (Map<String, Object>) result.getObject()
                    : Map.of("value", result.getObject()));
            }
            return output;
        } catch (Exception e) {
            throw new RuntimeException("Query failed: " + e.getMessage(), e);
        }
    }
}
```

## Putting It Together

```java
// src/main/java/com/example/graph/Main.java
// Main class that demonstrates graph operations
package com.example.graph;

import org.apache.tinkerpop.gremlin.driver.Client;

public class Main {
    public static void main(String[] args) {
        Client client = GremlinConfig.createClient();
        GraphOperations ops = new GraphOperations(client);
        GraphQueries queries = new GraphQueries(client);

        // Build the social network
        ops.addPerson("alice", "Alice", "Seattle", 30);
        ops.addPerson("bob", "Bob", "Seattle", 28);
        ops.addPerson("carol", "Carol", "Portland", 35);
        ops.addPerson("dave", "Dave", "Portland", 32);

        // Add friendships
        ops.addFriendship("alice", "Seattle", "bob", "Seattle", "2020");
        ops.addFriendship("bob", "Seattle", "carol", "Portland", "2021");
        ops.addFriendship("carol", "Portland", "dave", "Portland", "2019");

        // Add interests
        ops.addInterest("alice", "Seattle", "hiking");
        ops.addInterest("bob", "Seattle", "hiking");
        ops.addInterest("carol", "Portland", "hiking");
        ops.addInterest("dave", "Portland", "cooking");

        // Query the graph
        System.out.println("Alice's friends: " + queries.getFriends("alice", "Seattle"));
        System.out.println("Alice's friends of friends: " + queries.getFriendsOfFriends("alice", "Seattle"));
        System.out.println("Similar interests to Alice: " + queries.findPeopleWithSharedInterests("alice", "Seattle"));

        client.close();
    }
}
```

## Partition Key Strategy

With Cosmos DB's Graph API, the partition key affects how graph traversals perform. Traversals within a single partition are fast. Cross-partition traversals are slower because they require network hops between physical partitions.

For a social network, common partition key choices are:

- **City/Region**: Good if most friendships are local
- **Community ID**: Good if you can assign users to communities
- **A constant value**: Puts everything on one partition (only works for small graphs under 20GB)

Choose based on your query patterns. If most traversals stay within a partition, your queries will be fast.

## RU Considerations

Graph traversals can be expensive in terms of request units. Each hop in a traversal costs RUs because it requires reading edges and vertices. A three-hop traversal can easily cost 50-100 RUs or more, depending on the fan-out at each level.

To optimize:

- Limit the depth of traversals with `.loops().is(lt(maxDepth))`
- Use `.limit()` to cap the number of results
- Store frequently queried relationships as properties to avoid traversals
- Monitor RU consumption and add indexes for commonly traversed properties

## Summary

Azure Cosmos DB's Graph API with the Gremlin SDK gives you a globally distributed graph database. The Gremlin traversal language is expressive enough for complex relationship queries, and Cosmos DB handles the infrastructure. The main trade-off is that cross-partition traversals are more expensive, so your partition key strategy matters. For applications where relationships are the primary concern - social networks, recommendation engines, knowledge graphs - this combination is a strong choice.
