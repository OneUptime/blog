# How to Use Cloudflare Workers KV for Edge Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloudflare Workers, KV, Edge Computing, Serverless, Storage

Description: Learn how to use Cloudflare Workers KV for globally distributed key-value storage, including CRUD operations, expiration, and best practices.

---

> Workers KV gives you a global key-value store that lives at the edge - your data is replicated across 300+ locations worldwide, putting it milliseconds away from your users.

## What is Workers KV?

Cloudflare Workers KV is a globally distributed, eventually consistent key-value storage system designed for read-heavy workloads. It integrates directly with Cloudflare Workers, allowing you to store and retrieve data at the edge without managing infrastructure.

KV excels at storing configuration data, feature flags, user sessions, cached API responses, and any data that gets read far more often than it gets written. With sub-millisecond reads at the edge and automatic global replication, it handles use cases where low latency matters.

## Creating and Binding Namespaces

A namespace is a container for your key-value pairs. You create namespaces using Wrangler (Cloudflare's CLI tool) and bind them to your Workers.

```bash
# Install Wrangler if you haven't already
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login

# Create a new KV namespace
wrangler kv:namespace create "MY_STORE"
# Output: Created namespace "MY_STORE" with id "abc123..."

# Create a preview namespace for development
wrangler kv:namespace create "MY_STORE" --preview
# Output: Created namespace "MY_STORE_preview" with id "def456..."
```

Add the namespace binding to your `wrangler.toml`:

```toml
name = "my-worker"
main = "src/index.js"

# Production KV binding
kv_namespaces = [
  { binding = "MY_STORE", id = "abc123...", preview_id = "def456..." }
]
```

The `binding` name is how you access the namespace in your Worker code.

## Basic CRUD Operations

Workers KV provides simple methods for creating, reading, updating, and deleting data.

```javascript
export default {
  async fetch(request, env) {
    // CREATE / UPDATE - put() writes a value
    // If the key exists, it overwrites the value
    await env.MY_STORE.put("user:1234", JSON.stringify({
      name: "Alice",
      email: "alice@example.com",
      role: "admin"
    }));

    // READ - get() retrieves a value
    // Returns null if the key does not exist
    const userData = await env.MY_STORE.get("user:1234");

    // Parse JSON data when needed
    const user = JSON.parse(userData);

    // READ with type hint - avoids manual parsing
    const userDirect = await env.MY_STORE.get("user:1234", { type: "json" });

    // DELETE - delete() removes a key
    await env.MY_STORE.delete("user:1234");

    // Check if a key exists without fetching the full value
    const exists = await env.MY_STORE.get("user:1234", { type: "stream" });
    if (exists === null) {
      console.log("Key does not exist");
    }

    return new Response(JSON.stringify(user), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

## Key Expiration with TTL

KV supports automatic key expiration using TTL (time-to-live) or absolute expiration timestamps. This is useful for caching, sessions, and temporary data.

```javascript
export default {
  async fetch(request, env) {
    // Set expiration using TTL (seconds from now)
    // This key will be deleted after 1 hour
    await env.MY_STORE.put("session:abc123", JSON.stringify({
      userId: "1234",
      createdAt: Date.now()
    }), {
      expirationTtl: 3600  // 60 minutes in seconds
    });

    // Set expiration using absolute Unix timestamp
    // Key expires at a specific moment in time
    const oneWeekFromNow = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    await env.MY_STORE.put("promo:summer-sale", JSON.stringify({
      discount: 20,
      code: "SUMMER20"
    }), {
      expiration: oneWeekFromNow  // Unix timestamp in seconds
    });

    // Cache API responses with TTL
    const cacheKey = "api:weather:london";
    let weatherData = await env.MY_STORE.get(cacheKey, { type: "json" });

    if (!weatherData) {
      // Fetch fresh data and cache it for 5 minutes
      const response = await fetch("https://api.weather.example/london");
      weatherData = await response.json();

      await env.MY_STORE.put(cacheKey, JSON.stringify(weatherData), {
        expirationTtl: 300  // 5 minutes
      });
    }

    return new Response(JSON.stringify(weatherData));
  }
};
```

The minimum TTL is 60 seconds. Keys with shorter TTLs will be rounded up.

## Metadata Storage

Every key can store up to 1024 bytes of metadata alongside its value. Metadata is returned with list operations, making it efficient to filter or display information without fetching full values.

```javascript
export default {
  async fetch(request, env) {
    // Store a file with metadata
    const fileContent = "...file bytes...";

    await env.MY_STORE.put("file:doc-001", fileContent, {
      metadata: {
        filename: "report.pdf",
        contentType: "application/pdf",
        uploadedBy: "user:1234",
        uploadedAt: Date.now(),
        size: fileContent.length
      }
    });

    // Retrieve value with metadata
    const { value, metadata } = await env.MY_STORE.getWithMetadata(
      "file:doc-001",
      { type: "text" }
    );

    console.log(`File: ${metadata.filename}`);
    console.log(`Type: ${metadata.contentType}`);
    console.log(`Uploaded by: ${metadata.uploadedBy}`);

    // Metadata is also available from list operations
    // See the next section for examples

    return new Response(value, {
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Disposition": `attachment; filename="${metadata.filename}"`
      }
    });
  }
};
```

## List Operations and Pagination

KV provides list operations to enumerate keys. Since namespaces can contain millions of keys, listing is paginated using cursors.

```javascript
export default {
  async fetch(request, env) {
    // List all keys with a specific prefix
    // Returns up to 1000 keys per call
    const result = await env.MY_STORE.list({ prefix: "user:" });

    // Result structure:
    // {
    //   keys: [{ name: "user:1", metadata: {...} }, ...],
    //   list_complete: false,
    //   cursor: "xyz..."
    // }

    // Process the first batch
    for (const key of result.keys) {
      console.log(`Key: ${key.name}`);
      if (key.metadata) {
        console.log(`Metadata: ${JSON.stringify(key.metadata)}`);
      }
    }

    // Paginate through all results
    async function listAllKeys(prefix) {
      const allKeys = [];
      let cursor = undefined;
      let done = false;

      while (!done) {
        const result = await env.MY_STORE.list({
          prefix: prefix,
          cursor: cursor,
          limit: 1000  // Maximum keys per request
        });

        allKeys.push(...result.keys);

        if (result.list_complete) {
          done = true;
        } else {
          cursor = result.cursor;
        }
      }

      return allKeys;
    }

    const allUsers = await listAllKeys("user:");
    console.log(`Total users: ${allUsers.length}`);

    // Use metadata to filter without fetching values
    const adminUsers = allUsers.filter(
      key => key.metadata?.role === "admin"
    );

    return new Response(JSON.stringify({
      total: allUsers.length,
      admins: adminUsers.length
    }));
  }
};
```

## Understanding the Consistency Model

Workers KV uses eventual consistency. When you write a value, it propagates globally within 60 seconds, but the change may not be immediately visible in all locations.

```javascript
export default {
  async fetch(request, env) {
    // Write a value
    await env.MY_STORE.put("counter", "100");

    // Immediately reading might return the old value
    // depending on which edge location serves the request
    const value = await env.MY_STORE.get("counter");

    // In practice, this matters for:
    // 1. Read-after-write in different locations
    // 2. High-frequency updates to the same key
    // 3. Distributed counters or locks

    // KV is NOT suitable for:
    // - Real-time counters that need strong consistency
    // - Distributed locks or semaphores
    // - Shopping carts with concurrent updates

    // KV IS great for:
    // - Configuration that changes infrequently
    // - Cached data where staleness is acceptable
    // - User preferences and settings
    // - Feature flags and A/B test assignments

    return new Response(value);
  }
};
```

If you need strong consistency, consider Cloudflare Durable Objects or an external database.

## Use Cases and Patterns

Here are practical patterns for common use cases.

```javascript
// Pattern 1: Feature Flags
async function getFeatureFlags(env, userId) {
  // Fetch flags, cached at the edge
  const flags = await env.MY_STORE.get("config:feature-flags", { type: "json" });

  // Check user-specific overrides
  const userOverrides = await env.MY_STORE.get(
    `flags:user:${userId}`,
    { type: "json" }
  );

  return { ...flags, ...userOverrides };
}

// Pattern 2: URL Shortener
async function handleShortUrl(env, shortCode) {
  const destination = await env.MY_STORE.get(`url:${shortCode}`);

  if (!destination) {
    return new Response("Not found", { status: 404 });
  }

  return Response.redirect(destination, 301);
}

// Pattern 3: API Response Caching
async function cachedApiCall(env, endpoint, ttl = 300) {
  const cacheKey = `cache:api:${endpoint}`;

  // Try cache first
  let data = await env.MY_STORE.get(cacheKey, { type: "json" });

  if (!data) {
    // Cache miss - fetch from origin
    const response = await fetch(endpoint);
    data = await response.json();

    // Store in cache with TTL
    await env.MY_STORE.put(cacheKey, JSON.stringify(data), {
      expirationTtl: ttl
    });
  }

  return data;
}

// Pattern 4: Rate Limiting (basic, eventual consistency aware)
async function checkRateLimit(env, ip, limit = 100, windowSeconds = 60) {
  const key = `ratelimit:${ip}`;
  const { value, metadata } = await env.MY_STORE.getWithMetadata(key);

  const now = Date.now();
  const windowStart = metadata?.windowStart || now;
  const count = parseInt(value || "0", 10);

  // Reset if window expired
  if (now - windowStart > windowSeconds * 1000) {
    await env.MY_STORE.put(key, "1", {
      metadata: { windowStart: now },
      expirationTtl: windowSeconds * 2
    });
    return { allowed: true, remaining: limit - 1 };
  }

  // Check limit
  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Increment counter
  await env.MY_STORE.put(key, String(count + 1), {
    metadata: { windowStart },
    expirationTtl: windowSeconds * 2
  });

  return { allowed: true, remaining: limit - count - 1 };
}
```

## Limits and Pricing

Understanding KV limits helps you design within constraints.

| Resource | Limit |
|----------|-------|
| Key size | 512 bytes |
| Value size | 25 MB |
| Metadata size | 1024 bytes |
| Namespace count | 100 per account |
| Keys per namespace | Unlimited |
| Reads per second | 100,000+ |
| Writes per second | 1,000 per key |

**Pricing (as of 2025):**
- Free tier: 100,000 reads/day, 1,000 writes/day, 1 GB stored
- Paid: $0.50 per million reads, $5.00 per million writes, $0.50 per GB stored

KV is optimized for read-heavy workloads. If you need high write throughput to the same keys, consider Durable Objects.

## Local Development with Wrangler

Wrangler provides local KV emulation for development.

```bash
# Start local development server with KV support
wrangler dev

# The dev server automatically creates a local KV store
# that persists to .wrangler/state/

# Seed data into your local KV for testing
wrangler kv:key put "user:1" '{"name":"Test User"}' \
  --namespace-id YOUR_NAMESPACE_ID \
  --local

# List keys in local development
wrangler kv:key list --namespace-id YOUR_NAMESPACE_ID --local

# Get a specific key
wrangler kv:key get "user:1" --namespace-id YOUR_NAMESPACE_ID --local

# Delete a key
wrangler kv:key delete "user:1" --namespace-id YOUR_NAMESPACE_ID --local

# Bulk upload from a JSON file
# Format: [{"key": "k1", "value": "v1"}, {"key": "k2", "value": "v2"}]
wrangler kv:bulk put data.json --namespace-id YOUR_NAMESPACE_ID --local
```

Configure your `wrangler.toml` for seamless local development:

```toml
name = "my-worker"
main = "src/index.js"

# KV namespaces with preview IDs for local dev
kv_namespaces = [
  { binding = "MY_STORE", id = "prod-id", preview_id = "preview-id" }
]

# Local persistence directory
[dev]
persist = true
```

## Best Practices Summary

1. **Design for eventual consistency.** Do not rely on immediate read-after-write visibility across locations.

2. **Use key prefixes for organization.** Structure keys like `type:id` or `type:subtype:id` for efficient listing and logical grouping.

3. **Store metadata wisely.** Put frequently accessed attributes in metadata to avoid fetching full values during list operations.

4. **Set appropriate TTLs.** Always expire cached data to prevent stale reads and reduce storage costs.

5. **Batch operations when possible.** Use bulk uploads for initial data seeding instead of individual puts.

6. **Keep values small.** While KV supports up to 25 MB, smaller values replicate faster and cost less.

7. **Monitor your usage.** Track read/write patterns to stay within limits and optimize costs.

8. **Use the preview namespace.** Always test changes in the preview namespace before deploying to production.

Workers KV provides a simple yet powerful storage layer for edge computing. Combined with proper monitoring, it enables fast, globally distributed applications without managing infrastructure.

---

For monitoring your Cloudflare Workers and KV performance, check out [OneUptime](https://oneuptime.com) - a comprehensive observability platform that helps you track latency, errors, and usage patterns across your edge deployments.
