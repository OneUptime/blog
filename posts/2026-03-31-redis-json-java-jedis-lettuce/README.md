# How to Use Redis JSON with Java (Jedis/Lettuce)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, RedisJSON

Description: Learn how to store, retrieve, and update JSON documents in Redis using the RedisJSON module with Jedis and Lettuce in Java applications.

---

RedisJSON lets you store and manipulate JSON documents natively in Redis. Both Jedis (via `redis.clients:jedis`) and Lettuce (via `io.lettuce:lettuce-core`) support RedisJSON through their respective module APIs.

## Jedis - RedisJSON Setup

Add the dependency:

```xml
<dependency>
    <groupId>redis.clients</groupId>
    <artifactId>jedis</artifactId>
    <version>5.1.0</version>
</dependency>
```

Connect and use JSON commands:

```java
import redis.clients.jedis.UnifiedJedis;
import redis.clients.jedis.json.Path2;

UnifiedJedis jedis = new UnifiedJedis("redis://localhost:6379");

// Store a JSON object
String userJson = "{\"name\":\"Alice\",\"age\":30,\"roles\":[\"admin\",\"user\"]}";
jedis.jsonSet("user:1", Path2.ROOT_PATH, userJson);

// Retrieve the full document
Object doc = jedis.jsonGet("user:1");
System.out.println(doc);

// Get a nested field
Object name = jedis.jsonGet("user:1", Path2.of("$.name"));
System.out.println(name); // ["Alice"]
```

## Jedis - Update and Delete Fields

```java
// Update a field
jedis.jsonSet("user:1", Path2.of("$.age"), "31");

// Append to an array
jedis.jsonArrAppend("user:1", Path2.of("$.roles"), "\"moderator\"");

// Delete a field
jedis.jsonDel("user:1", Path2.of("$.roles[0]"));

// Check type
List<Class<?>> types = jedis.jsonType("user:1", Path2.of("$.roles"));
```

## Lettuce - RedisJSON Setup

```xml
<dependency>
    <groupId>io.lettuce</groupId>
    <artifactId>lettuce-core</artifactId>
    <version>6.8.0.RELEASE</version>
</dependency>
```

Lettuce uses a module command interface:

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.json.JsonPath;
import io.lettuce.core.json.arguments.JsonSetArgs;

RedisClient redisClient = RedisClient.create("redis://localhost:6379");
StatefulRedisConnection<String, String> connection = redisClient.connect();
var commands = connection.sync();

// Set JSON
String payload = "{\"product\":\"Widget\",\"price\":9.99,\"stock\":100}";
commands.jsonSet("product:1", JsonPath.ROOT_PATH, payload, JsonSetArgs.Builder.defaults());

// Get a field
var price = commands.jsonGet("product:1", JsonPath.of("$.price"));
System.out.println(price); // [9.99]

// Increment a number field
commands.jsonNumincrby("product:1", JsonPath.of("$.stock"), -1);
```

## Storing POJOs with Gson

```java
import com.google.gson.Gson;

Gson gson = new Gson();
User user = new User("Bob", 25, List.of("user"));

jedis.jsonSet("user:2", Path2.ROOT_PATH, gson.toJson(user));

// Deserialize back
String raw = jedis.jsonGet("user:2").toString();
User retrieved = gson.fromJson(raw, User.class);
```

## Summary

Both Jedis and Lettuce support RedisJSON through module-level commands. Jedis uses `jsonSet`, `jsonGet`, and `jsonDel` with `Path2` expressions, while Lettuce follows a similar pattern through its JSON command API. Combining these clients with a serialization library like Gson or Jackson makes it straightforward to persist and query complex Java objects in Redis.
