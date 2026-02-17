# How to Customize Indexing Policies in Azure Cosmos DB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Indexing, Query Performance, NoSQL, Optimization

Description: Learn how to customize indexing policies in Azure Cosmos DB to speed up queries, reduce RU costs, and optimize storage by including or excluding specific paths.

---

By default, Azure Cosmos DB indexes every property in every document. This means any query against any field works without you having to think about indexes. That sounds great, but it comes at a cost - every write operation pays the price of updating all those indexes. For write-heavy workloads or large documents, customizing your indexing policy can significantly reduce RU consumption and storage costs.

## How Indexing Works in Cosmos DB

Cosmos DB uses an inverted index structure, similar to what search engines use. When a document is written, the indexer walks through every property path and creates index entries. When you query, the engine uses these indexes to quickly locate matching documents without scanning the entire partition.

The default indexing policy looks like this:

```json
{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [
        {
            "path": "/*"
        }
    ],
    "excludedPaths": [
        {
            "path": "/\"_etag\"/?"
        }
    ]
}
```

The `/*` wildcard means everything is indexed. The `_etag` field is excluded because it is a system field that is not useful to query on.

## Why Customize the Indexing Policy?

There are three main reasons to customize:

1. **Reduce write RU costs**: If you have properties you never query on (like large text fields, binary data, or nested objects), excluding them from the index saves RUs on every write.

2. **Reduce storage**: Index entries take space. For containers with billions of documents, this adds up.

3. **Add composite or spatial indexes**: Some query patterns require specific index types that are not created by the default policy.

## Excluding Paths

The most common customization is excluding paths you do not query on:

```json
{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [
        {
            "path": "/*"
        }
    ],
    "excludedPaths": [
        {
            "path": "/description/?",
            "comment": "Large text field we never filter on"
        },
        {
            "path": "/metadata/*",
            "comment": "Nested object with many properties not used in queries"
        },
        {
            "path": "/rawPayload/?",
            "comment": "Binary or large JSON payload"
        },
        {
            "path": "/\"_etag\"/?"
        }
    ]
}
```

Path syntax rules:

- `/?` matches a single scalar value at that path
- `/*` matches everything under that path (recursive)
- Property names with special characters need double-quote escaping

## Including Only Specific Paths

Instead of indexing everything and excluding a few paths, you can flip the approach and only index what you need:

```json
{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [
        {
            "path": "/customerId/?"
        },
        {
            "path": "/status/?"
        },
        {
            "path": "/createdAt/?"
        },
        {
            "path": "/category/?"
        }
    ],
    "excludedPaths": [
        {
            "path": "/*"
        }
    ]
}
```

This is much more aggressive - only the four specified properties are indexed. Every other property is excluded. This dramatically reduces write costs but means queries filtering on non-indexed properties will do a full partition scan.

## Composite Indexes

Composite indexes are required for queries with ORDER BY on multiple properties, and they can improve performance for queries with multiple equality filters.

```json
{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [
        {
            "path": "/*"
        }
    ],
    "excludedPaths": [
        {
            "path": "/\"_etag\"/?"
        }
    ],
    "compositeIndexes": [
        [
            {
                "path": "/category",
                "order": "ascending"
            },
            {
                "path": "/price",
                "order": "descending"
            }
        ],
        [
            {
                "path": "/status",
                "order": "ascending"
            },
            {
                "path": "/createdAt",
                "order": "descending"
            }
        ]
    ]
}
```

The first composite index supports queries like:

```sql
-- This query benefits from the composite index on category (asc), price (desc)
SELECT * FROM c
WHERE c.category = 'electronics'
ORDER BY c.price DESC
```

Without the composite index, this query would either fail or consume significantly more RUs.

Important rules for composite indexes:

- The order of properties in the index definition matters
- The sort direction (ascending/descending) in the index must match your ORDER BY clause
- You need separate composite indexes for different sort order combinations

## Spatial Indexes

If your data contains geographic coordinates and you want to run proximity or containment queries, add spatial indexes:

```json
{
    "indexingMode": "consistent",
    "automatic": true,
    "includedPaths": [
        {
            "path": "/*"
        }
    ],
    "excludedPaths": [
        {
            "path": "/\"_etag\"/?"
        }
    ],
    "spatialIndexes": [
        {
            "path": "/location/*",
            "types": [
                "Point",
                "Polygon"
            ]
        }
    ]
}
```

This enables queries like:

```sql
-- Find all stores within 5000 meters of a point
SELECT * FROM c
WHERE ST_DISTANCE(c.location, {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
}) < 5000
```

## Applying an Indexing Policy

### Using the Azure Portal

1. Navigate to your Cosmos DB container in Data Explorer
2. Click on Scale & Settings
3. Edit the Indexing Policy JSON
4. Click Save

The index transformation happens in the background and does not affect availability.

### Using the .NET SDK

```csharp
// Update the indexing policy programmatically
CosmosClient client = new CosmosClient(endpoint, key);
Container container = client.GetContainer("mydb", "mycontainer");

// Get the current container properties
ContainerResponse containerResponse = await container.ReadContainerAsync();
ContainerProperties properties = containerResponse.Resource;

// Modify the indexing policy
properties.IndexingPolicy = new IndexingPolicy
{
    IndexingMode = IndexingMode.Consistent,
    Automatic = true
};

// Exclude paths that are not queried
properties.IndexingPolicy.ExcludedPaths.Add(new ExcludedPath { Path = "/description/?" });
properties.IndexingPolicy.ExcludedPaths.Add(new ExcludedPath { Path = "/metadata/*" });

// Add a composite index for common query patterns
properties.IndexingPolicy.CompositeIndexes.Add(new Collection<CompositePath>
{
    new CompositePath { Path = "/category", Order = CompositePathSortOrder.Ascending },
    new CompositePath { Path = "/createdAt", Order = CompositePathSortOrder.Descending }
});

// Apply the updated policy
await container.ReplaceContainerAsync(properties);
Console.WriteLine("Indexing policy updated. Transformation running in background.");
```

### Using Azure CLI

```bash
# Update indexing policy from a JSON file
az cosmosdb sql container update \
    --account-name myCosmosAccount \
    --database-name mydb \
    --name mycontainer \
    --resource-group myResourceGroup \
    --idx @indexing-policy.json
```

## Monitoring Index Transformation

After updating the policy, the index transformation runs in the background. Monitor its progress:

```csharp
// Check the index transformation progress
ContainerResponse response = await container.ReadContainerAsync();
Console.WriteLine($"Index transformation progress: {response.Headers["x-ms-documentdb-collection-index-transformation-progress"]}%");
```

During transformation:

- Reads and writes continue to work normally
- Queries may consume more RUs temporarily as some data might not be indexed yet
- The transformation runs at a lower priority to avoid impacting your workload

## Measuring the Impact

Before and after changing your indexing policy, measure the RU cost of your write operations:

```csharp
// Measure write RU cost before and after indexing changes
var document = new {
    id = Guid.NewGuid().ToString(),
    customerId = "cust-123",
    description = "A very long description that we are excluding from the index...",
    metadata = new { source = "api", version = "2.0", tags = new[] { "a", "b", "c" } },
    status = "active"
};

ItemResponse<dynamic> response = await container.CreateItemAsync(
    item: document,
    partitionKey: new PartitionKey("cust-123")
);

// Compare this number before and after your indexing policy change
Console.WriteLine($"Write cost: {response.RequestCharge} RUs");
```

A typical result: a document that costs 15 RUs to write with full indexing might cost only 8 RUs with selective indexing. Multiply that by millions of writes per day and the savings are substantial.

## Best Practices

1. **Start with the default and optimize**: Do not prematurely optimize your indexing policy. Start with everything indexed, identify your actual query patterns, then exclude paths you do not need.

2. **Always test queries after changes**: Run your critical queries and compare RU costs before and after the policy change. A query on an excluded path will fall back to a scan and cost more.

3. **Use composite indexes for ORDER BY**: If you have multi-property ORDER BY clauses, you must add composite indexes or the query will fail.

4. **Monitor the index size**: In the Azure Portal under Metrics, check the "Index Usage" metric to see how much storage your indexes consume.

5. **Be careful with wildcard exclusions**: Excluding `/*` and only including specific paths is powerful but fragile. If a new query is added that filters on an excluded path, performance will degrade silently.

Indexing policy customization is one of the most effective ways to optimize Cosmos DB costs. The key is understanding your query patterns and making informed decisions about what to index. The good news is that you can change the policy at any time without downtime, so experimentation is easy.
