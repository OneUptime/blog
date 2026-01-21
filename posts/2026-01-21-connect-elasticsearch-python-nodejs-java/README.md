# How to Connect to Elasticsearch from Python, Node.js, and Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Python, Node.js, Java, Client Libraries, API, Integration

Description: A comprehensive guide to connecting to Elasticsearch from Python, Node.js, and Java applications, covering client library setup, authentication, connection pooling, and best practices.

---

Connecting your applications to Elasticsearch requires using the official client libraries, which provide type-safe, efficient ways to interact with your cluster. This guide covers setting up and using Elasticsearch clients in Python, Node.js, and Java with practical examples.

## Python Client

### Installation

Install the official Elasticsearch Python client:

```bash
pip install elasticsearch
```

For async support:

```bash
pip install elasticsearch[async]
```

### Basic Connection

```python
from elasticsearch import Elasticsearch

# Connect to local Elasticsearch
es = Elasticsearch("https://localhost:9200")

# Check connection
print(es.info())
```

### Authenticated Connection

```python
from elasticsearch import Elasticsearch

# Connection with basic authentication
es = Elasticsearch(
    "https://localhost:9200",
    basic_auth=("elastic", "your_password"),
    verify_certs=True,
    ca_certs="/path/to/ca.crt"
)

# Or with API key
es = Elasticsearch(
    "https://localhost:9200",
    api_key="your_api_key",
    verify_certs=True,
    ca_certs="/path/to/ca.crt"
)

# Skip certificate verification (development only)
es = Elasticsearch(
    "https://localhost:9200",
    basic_auth=("elastic", "your_password"),
    verify_certs=False
)
```

### Connection with Multiple Nodes

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(
    [
        "https://node1.example.com:9200",
        "https://node2.example.com:9200",
        "https://node3.example.com:9200"
    ],
    basic_auth=("elastic", "your_password"),
    verify_certs=True,
    ca_certs="/path/to/ca.crt",
    # Connection pool settings
    max_retries=3,
    retry_on_timeout=True,
    request_timeout=30
)
```

### Indexing Documents

```python
from elasticsearch import Elasticsearch
from datetime import datetime

es = Elasticsearch(
    "https://localhost:9200",
    basic_auth=("elastic", "your_password"),
    verify_certs=False
)

# Index a single document
doc = {
    "title": "Introduction to Elasticsearch",
    "content": "Elasticsearch is a distributed search engine...",
    "author": "John Doe",
    "created_at": datetime.now(),
    "views": 100
}

response = es.index(index="articles", id=1, document=doc)
print(f"Indexed document: {response['result']}")

# Index without specifying ID (auto-generated)
response = es.index(index="articles", document=doc)
print(f"Document ID: {response['_id']}")
```

### Bulk Indexing

```python
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

es = Elasticsearch(
    "https://localhost:9200",
    basic_auth=("elastic", "your_password"),
    verify_certs=False
)

# Prepare documents for bulk indexing
documents = [
    {
        "_index": "articles",
        "_id": i,
        "_source": {
            "title": f"Article {i}",
            "content": f"Content for article {i}",
            "views": i * 10
        }
    }
    for i in range(1, 1001)
]

# Bulk index
success, failed = bulk(es, documents, stats_only=True)
print(f"Indexed {success} documents, {failed} failed")
```

### Searching Documents

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(
    "https://localhost:9200",
    basic_auth=("elastic", "your_password"),
    verify_certs=False
)

# Simple match query
response = es.search(
    index="articles",
    query={
        "match": {
            "title": "Elasticsearch"
        }
    }
)

print(f"Total hits: {response['hits']['total']['value']}")
for hit in response['hits']['hits']:
    print(f"Score: {hit['_score']}, Title: {hit['_source']['title']}")

# Complex bool query
response = es.search(
    index="articles",
    query={
        "bool": {
            "must": [
                {"match": {"title": "Elasticsearch"}}
            ],
            "filter": [
                {"range": {"views": {"gte": 100}}}
            ]
        }
    },
    sort=[
        {"views": {"order": "desc"}}
    ],
    size=10
)
```

### Aggregations

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(
    "https://localhost:9200",
    basic_auth=("elastic", "your_password"),
    verify_certs=False
)

response = es.search(
    index="articles",
    size=0,
    aggs={
        "authors": {
            "terms": {
                "field": "author.keyword",
                "size": 10
            }
        },
        "avg_views": {
            "avg": {
                "field": "views"
            }
        }
    }
)

print("Author distribution:")
for bucket in response['aggregations']['authors']['buckets']:
    print(f"  {bucket['key']}: {bucket['doc_count']} articles")

print(f"Average views: {response['aggregations']['avg_views']['value']}")
```

### Async Client

```python
import asyncio
from elasticsearch import AsyncElasticsearch

async def main():
    es = AsyncElasticsearch(
        "https://localhost:9200",
        basic_auth=("elastic", "your_password"),
        verify_certs=False
    )

    try:
        # Perform search
        response = await es.search(
            index="articles",
            query={"match_all": {}}
        )
        print(f"Found {response['hits']['total']['value']} documents")
    finally:
        await es.close()

asyncio.run(main())
```

## Node.js Client

### Installation

```bash
npm install @elastic/elasticsearch
```

### Basic Connection

```javascript
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: 'https://localhost:9200'
});

async function run() {
  const info = await client.info();
  console.log(info);
}

run().catch(console.error);
```

### Authenticated Connection

```javascript
const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');

// With basic authentication
const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'your_password'
  },
  tls: {
    ca: fs.readFileSync('/path/to/ca.crt'),
    rejectUnauthorized: true
  }
});

// With API key
const clientWithApiKey = new Client({
  node: 'https://localhost:9200',
  auth: {
    apiKey: 'your_api_key'
  },
  tls: {
    ca: fs.readFileSync('/path/to/ca.crt'),
    rejectUnauthorized: true
  }
});

// Skip certificate verification (development only)
const devClient = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'your_password'
  },
  tls: {
    rejectUnauthorized: false
  }
});
```

### Connection with Multiple Nodes

```javascript
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  nodes: [
    'https://node1.example.com:9200',
    'https://node2.example.com:9200',
    'https://node3.example.com:9200'
  ],
  auth: {
    username: 'elastic',
    password: 'your_password'
  },
  maxRetries: 3,
  requestTimeout: 30000,
  sniffOnStart: true,
  sniffInterval: 60000
});
```

### Indexing Documents

```javascript
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'your_password'
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function indexDocument() {
  // Index a single document
  const response = await client.index({
    index: 'articles',
    id: '1',
    document: {
      title: 'Introduction to Elasticsearch',
      content: 'Elasticsearch is a distributed search engine...',
      author: 'John Doe',
      created_at: new Date(),
      views: 100
    }
  });

  console.log(`Indexed document: ${response.result}`);

  // Refresh to make document searchable immediately
  await client.indices.refresh({ index: 'articles' });
}

indexDocument().catch(console.error);
```

### Bulk Indexing

```javascript
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'your_password'
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function bulkIndex() {
  // Prepare operations
  const operations = [];
  for (let i = 1; i <= 1000; i++) {
    operations.push({ index: { _index: 'articles', _id: i.toString() } });
    operations.push({
      title: `Article ${i}`,
      content: `Content for article ${i}`,
      views: i * 10
    });
  }

  const response = await client.bulk({
    refresh: true,
    operations
  });

  if (response.errors) {
    const erroredDocuments = [];
    response.items.forEach((action, i) => {
      const operation = Object.keys(action)[0];
      if (action[operation].error) {
        erroredDocuments.push({
          status: action[operation].status,
          error: action[operation].error,
          document: operations[i * 2 + 1]
        });
      }
    });
    console.log('Errors:', erroredDocuments);
  }

  console.log(`Bulk indexed ${response.items.length} documents`);
}

bulkIndex().catch(console.error);
```

### Searching Documents

```javascript
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'your_password'
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function search() {
  // Simple match query
  const response = await client.search({
    index: 'articles',
    query: {
      match: {
        title: 'Elasticsearch'
      }
    }
  });

  console.log(`Total hits: ${response.hits.total.value}`);
  response.hits.hits.forEach(hit => {
    console.log(`Score: ${hit._score}, Title: ${hit._source.title}`);
  });

  // Complex bool query
  const complexResponse = await client.search({
    index: 'articles',
    query: {
      bool: {
        must: [
          { match: { title: 'Elasticsearch' } }
        ],
        filter: [
          { range: { views: { gte: 100 } } }
        ]
      }
    },
    sort: [
      { views: { order: 'desc' } }
    ],
    size: 10
  });

  console.log('Complex query results:', complexResponse.hits.hits.length);
}

search().catch(console.error);
```

### Aggregations

```javascript
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'your_password'
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function aggregations() {
  const response = await client.search({
    index: 'articles',
    size: 0,
    aggs: {
      authors: {
        terms: {
          field: 'author.keyword',
          size: 10
        }
      },
      avg_views: {
        avg: {
          field: 'views'
        }
      }
    }
  });

  console.log('Author distribution:');
  response.aggregations.authors.buckets.forEach(bucket => {
    console.log(`  ${bucket.key}: ${bucket.doc_count} articles`);
  });

  console.log(`Average views: ${response.aggregations.avg_views.value}`);
}

aggregations().catch(console.error);
```

### TypeScript Support

```typescript
import { Client } from '@elastic/elasticsearch';

interface Article {
  title: string;
  content: string;
  author: string;
  created_at: Date;
  views: number;
}

const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'your_password'
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function searchArticles(): Promise<Article[]> {
  const response = await client.search<Article>({
    index: 'articles',
    query: {
      match_all: {}
    }
  });

  return response.hits.hits.map(hit => hit._source!);
}
```

## Java Client

### Maven Dependency

Add to your `pom.xml`:

```xml
<dependencies>
  <dependency>
    <groupId>co.elastic.clients</groupId>
    <artifactId>elasticsearch-java</artifactId>
    <version>8.12.0</version>
  </dependency>
  <dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.15.2</version>
  </dependency>
</dependencies>
```

### Gradle Dependency

```groovy
dependencies {
    implementation 'co.elastic.clients:elasticsearch-java:8.12.0'
    implementation 'com.fasterxml.jackson.core:jackson-databind:2.15.2'
}
```

### Basic Connection

```java
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest_client.RestClientTransport;
import org.apache.http.HttpHost;
import org.elasticsearch.client.RestClient;

public class ElasticsearchConnection {
    public static void main(String[] args) throws Exception {
        // Create the low-level client
        RestClient restClient = RestClient.builder(
            new HttpHost("localhost", 9200, "https")
        ).build();

        // Create the transport with Jackson mapper
        ElasticsearchTransport transport = new RestClientTransport(
            restClient, new JacksonJsonpMapper());

        // Create the API client
        ElasticsearchClient client = new ElasticsearchClient(transport);

        // Test connection
        var info = client.info();
        System.out.println("Cluster name: " + info.clusterName());
        System.out.println("Version: " + info.version().number());

        // Close resources
        transport.close();
        restClient.close();
    }
}
```

### Authenticated Connection

```java
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest_client.RestClientTransport;
import org.apache.http.HttpHost;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.ssl.SSLContexts;
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestClientBuilder;

import javax.net.ssl.SSLContext;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;

public class AuthenticatedConnection {
    public static ElasticsearchClient createClient() throws Exception {
        // Load CA certificate
        Path caCertificatePath = Path.of("/path/to/ca.crt");
        CertificateFactory factory = CertificateFactory.getInstance("X.509");
        Certificate trustedCa;
        try (InputStream is = Files.newInputStream(caCertificatePath)) {
            trustedCa = factory.generateCertificate(is);
        }

        // Create trust store
        KeyStore trustStore = KeyStore.getInstance("pkcs12");
        trustStore.load(null, null);
        trustStore.setCertificateEntry("ca", trustedCa);

        // Build SSL context
        SSLContext sslContext = SSLContexts.custom()
            .loadTrustMaterial(trustStore, null)
            .build();

        // Create credentials provider
        BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
        credentialsProvider.setCredentials(
            AuthScope.ANY,
            new UsernamePasswordCredentials("elastic", "your_password")
        );

        // Build REST client
        RestClient restClient = RestClient.builder(
            new HttpHost("localhost", 9200, "https")
        ).setHttpClientConfigCallback(httpClientBuilder -> httpClientBuilder
            .setSSLContext(sslContext)
            .setDefaultCredentialsProvider(credentialsProvider)
        ).build();

        // Create transport and client
        ElasticsearchTransport transport = new RestClientTransport(
            restClient, new JacksonJsonpMapper());

        return new ElasticsearchClient(transport);
    }
}
```

### Indexing Documents

```java
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.IndexResponse;

import java.time.Instant;

public class IndexExample {
    public static void main(String[] args) throws Exception {
        ElasticsearchClient client = AuthenticatedConnection.createClient();

        // Create article object
        Article article = new Article();
        article.setTitle("Introduction to Elasticsearch");
        article.setContent("Elasticsearch is a distributed search engine...");
        article.setAuthor("John Doe");
        article.setCreatedAt(Instant.now());
        article.setViews(100);

        // Index the document
        IndexResponse response = client.index(i -> i
            .index("articles")
            .id("1")
            .document(article)
        );

        System.out.println("Indexed document: " + response.result().name());
    }
}

// Article POJO
class Article {
    private String title;
    private String content;
    private String author;
    private Instant createdAt;
    private int views;

    // Getters and setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public int getViews() { return views; }
    public void setViews(int views) { this.views = views; }
}
```

### Bulk Indexing

```java
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.BulkRequest;
import co.elastic.clients.elasticsearch.core.BulkResponse;
import co.elastic.clients.elasticsearch.core.bulk.BulkResponseItem;

import java.util.ArrayList;
import java.util.List;

public class BulkIndexExample {
    public static void main(String[] args) throws Exception {
        ElasticsearchClient client = AuthenticatedConnection.createClient();

        // Prepare documents
        List<Article> articles = new ArrayList<>();
        for (int i = 1; i <= 1000; i++) {
            Article article = new Article();
            article.setTitle("Article " + i);
            article.setContent("Content for article " + i);
            article.setViews(i * 10);
            articles.add(article);
        }

        // Build bulk request
        BulkRequest.Builder br = new BulkRequest.Builder();
        for (int i = 0; i < articles.size(); i++) {
            final int index = i;
            br.operations(op -> op
                .index(idx -> idx
                    .index("articles")
                    .id(String.valueOf(index + 1))
                    .document(articles.get(index))
                )
            );
        }

        // Execute bulk request
        BulkResponse response = client.bulk(br.build());

        if (response.errors()) {
            System.out.println("Bulk had errors");
            for (BulkResponseItem item : response.items()) {
                if (item.error() != null) {
                    System.out.println("Error: " + item.error().reason());
                }
            }
        } else {
            System.out.println("Bulk indexed " + response.items().size() + " documents");
        }
    }
}
```

### Searching Documents

```java
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;

public class SearchExample {
    public static void main(String[] args) throws Exception {
        ElasticsearchClient client = AuthenticatedConnection.createClient();

        // Simple match query
        SearchResponse<Article> response = client.search(s -> s
            .index("articles")
            .query(q -> q
                .match(m -> m
                    .field("title")
                    .query("Elasticsearch")
                )
            ),
            Article.class
        );

        System.out.println("Total hits: " + response.hits().total().value());
        for (Hit<Article> hit : response.hits().hits()) {
            System.out.println("Score: " + hit.score() +
                ", Title: " + hit.source().getTitle());
        }

        // Complex bool query
        SearchResponse<Article> complexResponse = client.search(s -> s
            .index("articles")
            .query(q -> q
                .bool(b -> b
                    .must(m -> m
                        .match(mt -> mt
                            .field("title")
                            .query("Elasticsearch")
                        )
                    )
                    .filter(f -> f
                        .range(r -> r
                            .field("views")
                            .gte(co.elastic.clients.json.JsonData.of(100))
                        )
                    )
                )
            )
            .sort(so -> so
                .field(f -> f
                    .field("views")
                    .order(co.elastic.clients.elasticsearch._types.SortOrder.Desc)
                )
            )
            .size(10),
            Article.class
        );

        System.out.println("Complex query results: " +
            complexResponse.hits().hits().size());
    }
}
```

### Aggregations

```java
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch._types.aggregations.*;

public class AggregationExample {
    public static void main(String[] args) throws Exception {
        ElasticsearchClient client = AuthenticatedConnection.createClient();

        SearchResponse<Void> response = client.search(s -> s
            .index("articles")
            .size(0)
            .aggregations("authors", a -> a
                .terms(t -> t
                    .field("author.keyword")
                    .size(10)
                )
            )
            .aggregations("avg_views", a -> a
                .avg(av -> av
                    .field("views")
                )
            ),
            Void.class
        );

        // Process terms aggregation
        StringTermsAggregate authors = response.aggregations()
            .get("authors")
            .sterms();

        System.out.println("Author distribution:");
        for (StringTermsBucket bucket : authors.buckets().array()) {
            System.out.println("  " + bucket.key().stringValue() +
                ": " + bucket.docCount() + " articles");
        }

        // Process avg aggregation
        AvgAggregate avgViews = response.aggregations()
            .get("avg_views")
            .avg();

        System.out.println("Average views: " + avgViews.value());
    }
}
```

## Connection Best Practices

### 1. Use Connection Pooling

All clients use connection pooling by default. Configure pool sizes for your workload:

**Python:**
```python
from elasticsearch import Elasticsearch

es = Elasticsearch(
    "https://localhost:9200",
    basic_auth=("elastic", "password"),
    connections_per_node=10,
    http_compress=True
)
```

**Node.js:**
```javascript
const client = new Client({
  node: 'https://localhost:9200',
  maxRetries: 3,
  requestTimeout: 30000,
  compression: true
});
```

### 2. Handle Errors Gracefully

**Python:**
```python
from elasticsearch import Elasticsearch, NotFoundError, ConnectionError

try:
    response = es.get(index="articles", id="nonexistent")
except NotFoundError:
    print("Document not found")
except ConnectionError:
    print("Connection failed")
```

**Node.js:**
```javascript
try {
  const response = await client.get({
    index: 'articles',
    id: 'nonexistent'
  });
} catch (error) {
  if (error.meta.statusCode === 404) {
    console.log('Document not found');
  } else {
    console.error('Error:', error.message);
  }
}
```

### 3. Use Bulk Operations for Large Datasets

Always use bulk operations when indexing many documents to reduce network overhead.

### 4. Enable Compression

Enable HTTP compression for better performance:

**Python:**
```python
es = Elasticsearch("https://localhost:9200", http_compress=True)
```

**Node.js:**
```javascript
const client = new Client({
  node: 'https://localhost:9200',
  compression: true
});
```

## Conclusion

Connecting to Elasticsearch from your applications is straightforward with the official client libraries. Key takeaways:

1. **Use official clients** - They provide type safety and optimal performance
2. **Configure authentication** - Use API keys for production applications
3. **Enable TLS** - Always use encrypted connections in production
4. **Use connection pooling** - Configured by default, tune for your workload
5. **Handle errors gracefully** - Implement proper error handling for resilience
6. **Use bulk operations** - For indexing large amounts of data

With these clients properly configured, you can build powerful search-enabled applications across Python, Node.js, and Java platforms.
