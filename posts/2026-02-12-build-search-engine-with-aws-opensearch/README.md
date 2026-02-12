# How to Build a Search Engine with AWS OpenSearch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Elasticsearch, Search, Lambda

Description: A practical guide to building a full-text search engine on AWS using OpenSearch Service, covering indexing strategies, query optimization, and relevance tuning.

---

Database queries hit a wall when users want to search by keywords, handle typos, and get results ranked by relevance. That's where a dedicated search engine comes in. AWS OpenSearch Service (the managed Elasticsearch/OpenSearch offering) gives you full-text search, faceted navigation, and analytics without running your own cluster.

Let's build a search engine from scratch - setting up OpenSearch, indexing data, and building a search API with relevance tuning.

## Setting Up the OpenSearch Domain

Start with a domain (OpenSearch's term for a cluster). For development, a single-node cluster is fine. For production, you want multiple nodes across availability zones.

```typescript
// CDK stack for OpenSearch domain
import * as cdk from 'aws-cdk-lib';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class SearchStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const domain = new opensearch.Domain(this, 'SearchDomain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_11,
      capacity: {
        dataNodeInstanceType: 'r6g.large.search',
        dataNodes: 2,
        masterNodeInstanceType: 'r6g.large.search',
        masterNodes: 3,
      },
      ebs: {
        volumeSize: 100,
        volumeType: ec2.EbsDeviceVolumeType.GP3,
      },
      zoneAwareness: {
        availabilityZoneCount: 2,
      },
      encryptionAtRest: { enabled: true },
      nodeToNodeEncryption: true,
      enforceHttps: true,
      fineGrainedAccessControl: {
        masterUserName: 'admin',
      },
    });
  }
}
```

## Designing the Index

Before indexing data, define your mappings. This tells OpenSearch how to analyze and store each field.

```json
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "custom_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "snowball", "synonym_filter"]
        }
      },
      "filter": {
        "synonym_filter": {
          "type": "synonym",
          "synonyms": [
            "laptop, notebook, computer",
            "phone, mobile, smartphone",
            "tv, television, monitor"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "custom_analyzer",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": {
            "type": "text",
            "analyzer": "edge_ngram_analyzer"
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "custom_analyzer"
      },
      "category": {
        "type": "keyword"
      },
      "price": {
        "type": "float"
      },
      "rating": {
        "type": "float"
      },
      "tags": {
        "type": "keyword"
      },
      "createdAt": {
        "type": "date"
      }
    }
  }
}
```

## Indexing Data

You have two main approaches: real-time indexing as data changes, or batch indexing from your database. Most systems use both.

Here's a Lambda that indexes records in real time when they change in DynamoDB.

```javascript
// lambda/indexer.js - Triggered by DynamoDB Streams
const { Client } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

// Create OpenSearch client with IAM auth
const client = new Client({
  ...AwsSigv4Signer({
    region: process.env.AWS_REGION,
    service: 'es',
    getCredentials: () => defaultProvider()(),
  }),
  node: process.env.OPENSEARCH_ENDPOINT,
});

exports.handler = async (event) => {
  const bulkBody = [];

  for (const record of event.Records) {
    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
      const newImage = record.dynamodb.NewImage;
      const document = {
        title: newImage.title.S,
        description: newImage.description.S,
        category: newImage.category.S,
        price: parseFloat(newImage.price.N),
        rating: parseFloat(newImage.rating?.N || '0'),
        tags: newImage.tags?.SS || [],
        createdAt: newImage.createdAt.S,
      };

      // Bulk index operation
      bulkBody.push({ index: { _index: 'products', _id: newImage.id.S } });
      bulkBody.push(document);
    }

    if (record.eventName === 'REMOVE') {
      const oldImage = record.dynamodb.OldImage;
      bulkBody.push({ delete: { _index: 'products', _id: oldImage.id.S } });
    }
  }

  if (bulkBody.length > 0) {
    const result = await client.bulk({ body: bulkBody });
    if (result.body.errors) {
      console.error('Bulk indexing errors:', JSON.stringify(result.body.items.filter(i => i.index?.error)));
    }
    console.log(`Indexed ${bulkBody.length / 2} documents`);
  }
};
```

## Building the Search API

Now the fun part - searching. A good search API supports keywords, filters, facets, and pagination.

```javascript
// lambda/search-api.js
const { Client } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

const client = new Client({
  ...AwsSigv4Signer({
    region: process.env.AWS_REGION,
    service: 'es',
    getCredentials: () => defaultProvider()(),
  }),
  node: process.env.OPENSEARCH_ENDPOINT,
});

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const query = params.q || '';
  const category = params.category;
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : null;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : null;
  const page = parseInt(params.page || '1');
  const size = parseInt(params.size || '20');

  // Build the search query
  const searchBody = {
    from: (page - 1) * size,
    size,
    query: {
      bool: {
        must: query ? [{
          multi_match: {
            query,
            fields: ['title^3', 'description', 'tags^2'],
            type: 'best_fields',
            fuzziness: 'AUTO', // Handle typos
          },
        }] : [{ match_all: {} }],
        filter: [],
      },
    },
    // Faceted search - get counts for each category
    aggs: {
      categories: {
        terms: { field: 'category', size: 20 },
      },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 25 },
            { from: 25, to: 50 },
            { from: 50, to: 100 },
            { from: 100 },
          ],
        },
      },
      avg_rating: {
        avg: { field: 'rating' },
      },
    },
    highlight: {
      fields: {
        title: {},
        description: { fragment_size: 150, number_of_fragments: 2 },
      },
    },
  };

  // Apply filters
  if (category) {
    searchBody.query.bool.filter.push({ term: { category } });
  }
  if (minPrice || maxPrice) {
    const rangeFilter = { range: { price: {} } };
    if (minPrice) rangeFilter.range.price.gte = minPrice;
    if (maxPrice) rangeFilter.range.price.lte = maxPrice;
    searchBody.query.bool.filter.push(rangeFilter);
  }

  const result = await client.search({
    index: 'products',
    body: searchBody,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      total: result.body.hits.total.value,
      page,
      size,
      results: result.body.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
        highlights: hit.highlight,
      })),
      facets: {
        categories: result.body.aggregations.categories.buckets,
        priceRanges: result.body.aggregations.price_ranges.buckets,
        avgRating: result.body.aggregations.avg_rating.value,
      },
    }),
  };
};
```

## Autocomplete

For type-ahead suggestions, use the `search_as_you_type` field type or edge n-grams.

```javascript
// Autocomplete endpoint
async function autocomplete(prefix) {
  const result = await client.search({
    index: 'products',
    body: {
      size: 5,
      query: {
        multi_match: {
          query: prefix,
          type: 'bool_prefix',
          fields: ['title', 'title._2gram', 'title._3gram'],
        },
      },
      _source: ['title', 'category'],
    },
  });

  return result.body.hits.hits.map(hit => ({
    title: hit._source.title,
    category: hit._source.category,
  }));
}
```

## Monitoring and Alerting

OpenSearch provides built-in metrics through CloudWatch. Monitor these key metrics:

- `ClusterStatus.red` - Data loss risk, needs immediate attention
- `FreeStorageSpace` - Running out of disk crashes the cluster
- `JVMMemoryPressure` - High memory pressure causes slow queries
- `SearchLatency` - User-facing performance

For setting up comprehensive monitoring, see our guide on [building a logging and monitoring stack on AWS](https://oneuptime.com/blog/post/build-logging-and-monitoring-stack-on-aws/view).

## Cost Tips

OpenSearch isn't cheap, especially for large datasets. A few things to keep costs reasonable:

- Use UltraWarm nodes for older data you still need to search
- Set up index lifecycle policies to roll over and delete old indices
- Right-size your instances based on actual query patterns
- Use snapshot-based recovery instead of extra replicas for non-critical data

## Summary

AWS OpenSearch gives you a managed search engine with full-text search, faceted navigation, autocomplete, and analytics. Index your data through DynamoDB Streams for real-time updates, build a search API with proper relevance tuning, and monitor cluster health. It's significantly more capable than database-level text search, and the managed service means you don't need to become an Elasticsearch cluster admin.
