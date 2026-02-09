# How to Run Apache Solr in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Apache Solr, Search, Full-Text Search, DevOps, Java

Description: Deploy Apache Solr in Docker for full-text search with schema configuration, data indexing, and query examples for your applications.

---

Apache Solr is an enterprise search platform built on Apache Lucene. It powers the search functionality for some of the largest websites in the world, including Netflix, Instagram, and eBay. Solr provides full-text search, faceted navigation, highlighting, spell checking, and analytics capabilities.

Running Solr in Docker eliminates the need to install Java, configure paths, or manage Solr's directory structure manually. You get a fully functional search engine with a single command.

## Quick Start

Run Solr in standalone mode:

```bash
# Start Solr with the admin UI on port 8983
docker run -d \
  --name solr \
  -p 8983:8983 \
  solr:9

# Create a new core (collection in standalone mode)
docker exec solr solr create_core -c products
```

Open `http://localhost:8983/solr` to access the Solr Admin UI.

## Docker Compose Setup

```yaml
# docker-compose.yml - Solr for development
version: "3.8"

services:
  solr:
    image: solr:9
    ports:
      # Solr Admin UI and API
      - "8983:8983"
    volumes:
      # Persist index data and core configurations
      - solr_data:/var/solr
    environment:
      # Set JVM memory limits
      SOLR_JAVA_MEM: "-Xms512m -Xmx1g"
    command: solr-precreate products
    restart: unless-stopped

volumes:
  solr_data:
```

The `solr-precreate` command creates a core named "products" on startup, so it is ready to use immediately.

## Custom Schema Configuration

Solr uses a schema to define what fields exist in your documents and how they should be indexed. Create a custom schema for a product catalog:

```bash
# Create the directory structure for a custom core configuration
mkdir -p solr-config/products/conf
```

Define the schema:

```xml
<!-- solr-config/products/conf/schema.xml - Product search schema -->
<?xml version="1.0" encoding="UTF-8"?>
<schema name="products" version="1.6">
    <!-- Unique identifier field -->
    <uniqueKey>id</uniqueKey>

    <!-- Field types -->
    <fieldType name="string" class="solr.StrField" sortMissingLast="true"/>
    <fieldType name="long" class="solr.LongPointField" docValues="true"/>
    <fieldType name="double" class="solr.DoublePointField" docValues="true"/>
    <fieldType name="boolean" class="solr.BoolField" sortMissingLast="true"/>
    <fieldType name="date" class="solr.DatePointField" docValues="true"/>

    <!-- Text field with English analysis for full-text search -->
    <fieldType name="text_en" class="solr.TextField" positionIncrementGap="100">
        <analyzer type="index">
            <tokenizer class="solr.StandardTokenizerFactory"/>
            <filter class="solr.StopFilterFactory" ignoreCase="true" words="stopwords.txt"/>
            <filter class="solr.LowerCaseFilterFactory"/>
            <filter class="solr.EnglishPossessiveFilterFactory"/>
            <filter class="solr.PorterStemFilterFactory"/>
        </analyzer>
        <analyzer type="query">
            <tokenizer class="solr.StandardTokenizerFactory"/>
            <filter class="solr.StopFilterFactory" ignoreCase="true" words="stopwords.txt"/>
            <filter class="solr.LowerCaseFilterFactory"/>
            <filter class="solr.EnglishPossessiveFilterFactory"/>
            <filter class="solr.PorterStemFilterFactory"/>
        </analyzer>
    </fieldType>

    <!-- Autocomplete field type -->
    <fieldType name="text_suggest" class="solr.TextField" positionIncrementGap="100">
        <analyzer>
            <tokenizer class="solr.StandardTokenizerFactory"/>
            <filter class="solr.LowerCaseFilterFactory"/>
            <filter class="solr.EdgeNGramFilterFactory" minGramSize="2" maxGramSize="15"/>
        </analyzer>
    </fieldType>

    <!-- Document fields -->
    <field name="id" type="string" indexed="true" stored="true" required="true"/>
    <field name="name" type="text_en" indexed="true" stored="true"/>
    <field name="description" type="text_en" indexed="true" stored="true"/>
    <field name="category" type="string" indexed="true" stored="true" docValues="true"/>
    <field name="brand" type="string" indexed="true" stored="true" docValues="true"/>
    <field name="price" type="double" indexed="true" stored="true" docValues="true"/>
    <field name="in_stock" type="boolean" indexed="true" stored="true"/>
    <field name="created_at" type="date" indexed="true" stored="true"/>
    <field name="tags" type="string" indexed="true" stored="true" multiValued="true"/>

    <!-- Suggestion field that copies from name -->
    <field name="suggest" type="text_suggest" indexed="true" stored="false" multiValued="true"/>
    <copyField source="name" dest="suggest"/>

    <!-- Catch-all field -->
    <field name="_text_" type="text_en" indexed="true" stored="false" multiValued="true"/>
    <copyField source="name" dest="_text_"/>
    <copyField source="description" dest="_text_"/>
</schema>
```

Create the solrconfig.xml for the core:

```xml
<!-- solr-config/products/conf/solrconfig.xml - Core configuration -->
<?xml version="1.0" encoding="UTF-8"?>
<config>
    <luceneMatchVersion>9.0</luceneMatchVersion>

    <requestHandler name="/select" class="solr.SearchHandler">
        <lst name="defaults">
            <str name="echoParams">explicit</str>
            <str name="wt">json</str>
            <int name="rows">10</int>
            <str name="df">_text_</str>
        </lst>
    </requestHandler>

    <requestHandler name="/update" class="solr.UpdateRequestHandler"/>

    <!-- Suggest handler for autocomplete -->
    <searchComponent name="suggest" class="solr.SuggestComponent">
        <lst name="suggester">
            <str name="name">default</str>
            <str name="lookupImpl">BlendedInfixLookupFactory</str>
            <str name="dictionaryImpl">DocumentDictionaryFactory</str>
            <str name="field">suggest</str>
            <str name="suggestAnalyzerFieldType">text_suggest</str>
            <str name="buildOnStartup">true</str>
        </lst>
    </searchComponent>

    <requestHandler name="/suggest" class="solr.SearchHandler">
        <lst name="defaults">
            <str name="suggest">true</str>
            <str name="suggest.count">5</str>
        </lst>
        <arr name="components">
            <str>suggest</str>
        </arr>
    </requestHandler>
</config>
```

Mount the configuration in Docker Compose:

```yaml
# docker-compose.yml - Solr with custom schema
version: "3.8"

services:
  solr:
    image: solr:9
    ports:
      - "8983:8983"
    volumes:
      - solr_data:/var/solr
      # Mount custom core configuration
      - ./solr-config/products:/opt/solr/server/solr/configsets/products
    command: solr-precreate products /opt/solr/server/solr/configsets/products
    environment:
      SOLR_JAVA_MEM: "-Xms512m -Xmx1g"
    restart: unless-stopped

volumes:
  solr_data:
```

## Indexing Data

Add documents to the index using the Solr API:

```bash
# Index a single product document
curl -X POST http://localhost:8983/solr/products/update/json/docs \
  -H "Content-Type: application/json" \
  -d '{
    "id": "PROD-001",
    "name": "Wireless Bluetooth Headphones",
    "description": "Premium noise-cancelling headphones with 30-hour battery life",
    "category": "Electronics",
    "brand": "AudioTech",
    "price": 149.99,
    "in_stock": true,
    "tags": ["wireless", "bluetooth", "noise-cancelling"]
  }'

# Index multiple documents in a batch
curl -X POST http://localhost:8983/solr/products/update/json/docs \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": "PROD-002",
      "name": "Mechanical Gaming Keyboard",
      "description": "RGB backlit mechanical keyboard with Cherry MX switches",
      "category": "Electronics",
      "brand": "KeyMaster",
      "price": 89.99,
      "in_stock": true,
      "tags": ["gaming", "mechanical", "rgb"]
    },
    {
      "id": "PROD-003",
      "name": "Organic Cotton T-Shirt",
      "description": "Soft organic cotton t-shirt available in multiple colors",
      "category": "Clothing",
      "brand": "EcoWear",
      "price": 29.99,
      "in_stock": true,
      "tags": ["organic", "cotton", "casual"]
    }
  ]'

# Commit the changes to make them searchable
curl http://localhost:8983/solr/products/update?commit=true
```

## Searching

Query the index using Solr's query syntax:

```bash
# Simple keyword search
curl "http://localhost:8983/solr/products/select?q=headphones"

# Search with filters and facets
curl "http://localhost:8983/solr/products/select?q=*:*&fq=category:Electronics&fq=price:[50 TO 200]&facet=true&facet.field=brand&facet.field=category"

# Full-text search with boosting and highlighting
curl "http://localhost:8983/solr/products/select?q=wireless+keyboard&qf=name^2+description&defType=edismax&hl=true&hl.fl=name,description"

# Range query on price
curl "http://localhost:8983/solr/products/select?q=*:*&fq=price:[0 TO 100]&sort=price+asc"

# Autocomplete suggestions
curl "http://localhost:8983/solr/products/suggest?suggest.q=wire"
```

## Python Client

```python
# search_client.py - Solr search client using pysolr
import pysolr

# Connect to the Solr core
solr = pysolr.Solr('http://localhost:8983/solr/products', always_commit=True)

# Index documents
docs = [
    {"id": "PROD-004", "name": "Running Shoes", "category": "Footwear", "price": 119.99},
    {"id": "PROD-005", "name": "Yoga Mat", "category": "Fitness", "price": 39.99},
]
solr.add(docs)

# Search with facets
results = solr.search('shoes', **{
    'fq': 'price:[0 TO 150]',
    'facet': 'true',
    'facet.field': 'category',
    'rows': 10,
})

print(f"Found {results.hits} results")
for doc in results:
    print(f"  {doc['name']} - ${doc['price']}")
```

## SolrCloud with ZooKeeper

For production deployments with replication and distributed search:

```yaml
# docker-compose-cloud.yml - SolrCloud with ZooKeeper
version: "3.8"

services:
  zookeeper:
    image: zookeeper:3.9
    ports:
      - "2181:2181"
    volumes:
      - zk_data:/data
    environment:
      ZOO_MY_ID: 1

  solr1:
    image: solr:9
    ports:
      - "8983:8983"
    environment:
      ZK_HOST: zookeeper:2181
      SOLR_JAVA_MEM: "-Xms512m -Xmx1g"
    volumes:
      - solr1_data:/var/solr
    depends_on:
      - zookeeper

  solr2:
    image: solr:9
    ports:
      - "8984:8983"
    environment:
      ZK_HOST: zookeeper:2181
      SOLR_JAVA_MEM: "-Xms512m -Xmx1g"
    volumes:
      - solr2_data:/var/solr
    depends_on:
      - zookeeper

volumes:
  zk_data:
  solr1_data:
  solr2_data:
```

Create a collection in SolrCloud:

```bash
# Create a collection with 2 shards and 2 replicas
curl "http://localhost:8983/solr/admin/collections?action=CREATE&name=products&numShards=2&replicationFactor=2"
```

## Summary

Apache Solr provides enterprise-grade full-text search that scales from a development laptop to large production clusters. The Docker setup simplifies initial deployment, and the custom schema configuration lets you define exactly how your data should be indexed and searched. Solr's faceted search, highlighting, and suggestion features make it well-suited for e-commerce search, document search, and any application that needs advanced text querying beyond what a database can provide. Start with the standalone Docker Compose setup and upgrade to SolrCloud when you need replication and horizontal scaling.
