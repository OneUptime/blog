# How to Query Neptune with SPARQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Neptune, SPARQL, RDF, Graph Database

Description: A practical guide to querying Amazon Neptune with SPARQL, covering RDF data modeling, query patterns, filtering, aggregation, and optimization techniques.

---

SPARQL is the query language for RDF (Resource Description Framework) graphs in Amazon Neptune. While Gremlin works with property graphs, SPARQL operates on triples - subject, predicate, object statements that form a knowledge graph. If you're working with linked data, ontologies, or any scenario where standardized data interchange matters, SPARQL on Neptune is a powerful combination.

If you haven't set up Neptune yet, check out our [Neptune setup guide](https://oneuptime.com/blog/post/amazon-neptune-graph-databases/view) first. Already have your cluster running? Let's dive into writing SPARQL queries.

## Understanding RDF and Triples

Everything in RDF boils down to triples. A triple has three parts: a subject (the thing you're describing), a predicate (the property or relationship), and an object (the value or related thing).

For example, "Alice knows Bob" becomes:

- Subject: `:Alice`
- Predicate: `:knows`
- Object: `:Bob`

In SPARQL, you use URIs (Uniform Resource Identifiers) to identify things. Prefixes make these shorter and more readable.

## Loading RDF Data into Neptune

Before querying, let's get some data in. You can load RDF data in several formats: N-Triples, N-Quads, Turtle, or RDF/XML. Here's a Turtle file that defines a small social network.

```turtle
# social-network.ttl - sample RDF data in Turtle format
@prefix : <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

:Alice a foaf:Person ;
  foaf:name "Alice" ;
  foaf:age "30"^^xsd:integer ;
  :city "Seattle" ;
  foaf:knows :Bob, :Charlie ;
  :worksAt :TechCorp .

:Bob a foaf:Person ;
  foaf:name "Bob" ;
  foaf:age "28"^^xsd:integer ;
  :city "Portland" ;
  foaf:knows :Charlie ;
  :worksAt :TechCorp .

:Charlie a foaf:Person ;
  foaf:name "Charlie" ;
  foaf:age "35"^^xsd:integer ;
  :city "Seattle" .

:TechCorp a :Company ;
  :companyName "TechCorp" ;
  :industry "Software" .
```

Upload this to S3 and use the Neptune bulk loader.

```bash
# Trigger bulk load of RDF data from S3
curl -X POST \
  -H 'Content-Type: application/json' \
  https://your-neptune-endpoint:8182/loader \
  -d '{
    "source": "s3://your-bucket/social-network.ttl",
    "format": "turtle",
    "iamRoleArn": "arn:aws:iam::123456789:role/NeptuneS3Role",
    "region": "us-east-1",
    "failOnError": "FALSE"
  }'
```

## Sending SPARQL Queries to Neptune

Neptune exposes a SPARQL endpoint at `/sparql`. You can send queries via HTTP POST.

```bash
# Run a simple SPARQL query against Neptune
curl -X POST \
  https://your-neptune-endpoint:8182/sparql \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'query=SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10'
```

For Python applications, the SPARQLWrapper library makes things cleaner.

```python
# Install with: pip install sparqlwrapper
from SPARQLWrapper import SPARQLWrapper, JSON

# Set up the connection to Neptune's SPARQL endpoint
sparql = SPARQLWrapper("https://your-neptune-endpoint:8182/sparql")
sparql.setReturnFormat(JSON)

# Run a query
sparql.setQuery("""
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  SELECT ?name ?age
  WHERE {
    ?person a foaf:Person ;
            foaf:name ?name ;
            foaf:age ?age .
  }
""")

results = sparql.query().convert()
for result in results["results"]["bindings"]:
    print(f"{result['name']['value']} - age {result['age']['value']}")
```

## Basic SPARQL Query Patterns

The SELECT query is the workhorse of SPARQL. Here are the patterns you'll use most often.

```sparql
# Find all people and their names
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?person ?name
WHERE {
  ?person a foaf:Person ;
          foaf:name ?name .
}
```

```sparql
# Find who Alice knows
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?friendName
WHERE {
  :Alice foaf:knows ?friend .
  ?friend foaf:name ?friendName .
}
```

```sparql
# Get all properties of a specific resource
PREFIX : <http://example.org/>

SELECT ?property ?value
WHERE {
  :Alice ?property ?value .
}
```

## Filtering Results

SPARQL's FILTER clause gives you fine-grained control over which results to include.

```sparql
# Find people older than 30
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?name ?age
WHERE {
  ?person a foaf:Person ;
          foaf:name ?name ;
          foaf:age ?age .
  FILTER (?age > 30)
}
```

```sparql
# Find people whose names start with a specific letter
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?name
WHERE {
  ?person a foaf:Person ;
          foaf:name ?name .
  FILTER (STRSTARTS(?name, "A"))
}
```

```sparql
# Combine multiple filter conditions
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?name ?age
WHERE {
  ?person a foaf:Person ;
          foaf:name ?name ;
          foaf:age ?age ;
          :city ?city .
  FILTER (?age >= 28 && ?city = "Seattle")
}
```

## OPTIONAL Patterns

Unlike SQL joins, SPARQL lets you handle missing data gracefully with OPTIONAL.

```sparql
# Get all people with their employer if they have one
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?name ?companyName
WHERE {
  ?person a foaf:Person ;
          foaf:name ?name .
  OPTIONAL {
    ?person :worksAt ?company .
    ?company :companyName ?companyName .
  }
}
```

This query returns all people, and for those who have a `worksAt` relationship, it includes the company name. Charlie would show up with a null company value.

## Aggregation and Grouping

SPARQL supports the same aggregation functions you'd expect from SQL.

```sparql
# Count people per city
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?city (COUNT(?person) AS ?count)
WHERE {
  ?person a foaf:Person ;
          :city ?city .
}
GROUP BY ?city
ORDER BY DESC(?count)
```

```sparql
# Average age of people per city
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?city (AVG(?age) AS ?avgAge)
WHERE {
  ?person a foaf:Person ;
          :city ?city ;
          foaf:age ?age .
}
GROUP BY ?city
```

## CONSTRUCT Queries

While SELECT returns tabular data, CONSTRUCT creates new RDF triples from your query results. This is powerful for data transformation.

```sparql
# Build a simplified graph of just names and friendships
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

CONSTRUCT {
  ?person :simpleName ?name .
  ?person :friendWith ?friend .
}
WHERE {
  ?person a foaf:Person ;
          foaf:name ?name ;
          foaf:knows ?friend .
}
```

## Modifying Data with SPARQL Update

Neptune supports SPARQL Update for inserting, deleting, and modifying triples.

```sparql
# Insert new triples
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

INSERT DATA {
  :Diana a foaf:Person ;
         foaf:name "Diana" ;
         foaf:age 32 ;
         :city "Denver" .
}
```

```sparql
# Update a property value
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

DELETE { :Alice foaf:age 30 }
INSERT { :Alice foaf:age 31 }
WHERE { :Alice foaf:age 30 }
```

```sparql
# Delete specific triples
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

DELETE WHERE {
  :Diana :city ?city .
}
```

Send update queries to the SPARQL endpoint using the `update` parameter instead of `query`.

```bash
# Send a SPARQL Update request to Neptune
curl -X POST \
  https://your-neptune-endpoint:8182/sparql \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'update=INSERT DATA { <http://example.org/Eve> a <http://xmlns.com/foaf/0.1/Person> }'
```

## Performance Optimization

SPARQL query performance in Neptune depends heavily on how you structure your queries.

Put the most selective triple pattern first. If you're looking for a specific person, start with that.

```sparql
# Good - starts with a specific subject
PREFIX : <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?friendName
WHERE {
  :Alice foaf:knows ?friend .
  ?friend foaf:name ?friendName .
}

# Less efficient - starts with a broad scan
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?friendName
WHERE {
  ?friend foaf:name ?friendName .
  ?person foaf:knows ?friend .
  FILTER (?person = <http://example.org/Alice>)
}
```

Use LIMIT when you don't need all results. Avoid `SELECT *` when you only need specific variables. And watch out for Cartesian products that happen when triple patterns don't share variables.

## When to Choose SPARQL Over Gremlin

SPARQL is the right choice when you're working with standardized vocabularies (like FOAF, Dublin Core, or Schema.org), when you need to merge data from multiple sources using linked data principles, or when your team already has experience with RDF and semantic web technologies. For application-centric graph queries like social features or recommendation engines, [Gremlin](https://oneuptime.com/blog/post/query-neptune-gremlin/view) might be a better fit.

Both languages can coexist in the same Neptune cluster, but you can't mix them in the same query, and the underlying data models (property graph vs RDF) are separate.

## Wrapping Up

SPARQL gives you a standards-based way to query graph data in Neptune. The triple pattern matching is intuitive once you get comfortable with it, and features like OPTIONAL, CONSTRUCT, and federated queries give you flexibility that's hard to match. Start with simple SELECT queries, get comfortable with the pattern matching model, and then layer in the more advanced features as your needs grow.
