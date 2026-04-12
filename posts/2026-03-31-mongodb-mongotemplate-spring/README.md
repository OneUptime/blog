# How to Use MongoTemplate for Advanced Operations in Spring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Spring, MongoTemplate, Query, Java

Description: Learn how to use Spring Data's MongoTemplate for advanced MongoDB operations including complex queries, updates, and aggregation pipelines.

---

## Why MongoTemplate?

`MongoTemplate` is the lower-level Spring Data MongoDB API that gives you direct control over queries, updates, and aggregations. While Spring Data repositories are excellent for standard CRUD, `MongoTemplate` shines when you need atomic update operators, complex field selection, upserts, or multi-stage aggregation pipelines without the constraints of method-name derivation.

## Getting MongoTemplate

Spring Boot auto-configures `MongoTemplate`. Inject it directly:

```java
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private final MongoTemplate mongoTemplate;

    public ProductService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }
}
```

## Building Queries

```java
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import java.util.List;

// Single criterion
Query query = new Query(Criteria.where("category").is("electronics"));
List<Product> products = mongoTemplate.find(query, Product.class);

// Combined criteria
Query complex = new Query(
    new Criteria().andOperator(
        Criteria.where("price").lte(200.0),
        Criteria.where("stock").gt(0),
        Criteria.where("category").in("electronics", "accessories")
    )
);
List<Product> found = mongoTemplate.find(complex, Product.class);

// Find one
Product p = mongoTemplate.findOne(
    new Query(Criteria.where("sku").is("KB-001")), Product.class);
```

## Field Projection

```java
Query query = new Query(Criteria.where("category").is("books"));
query.fields().include("title").include("price").exclude("_id");

List<Product> summaries = mongoTemplate.find(query, Product.class);
```

## Update Operations

`MongoTemplate` exposes fine-grained update operators:

```java
import org.springframework.data.mongodb.core.query.Update;
import com.mongodb.client.result.UpdateResult;

// updateFirst: update only the first matching document
UpdateResult result = mongoTemplate.updateFirst(
    new Query(Criteria.where("sku").is("KB-001")),
    new Update()
        .set("price", 44.99)
        .inc("stock", -1)
        .currentDate("lastModified"),
    Product.class
);

// updateMulti: update all matching documents
mongoTemplate.updateMulti(
    new Query(Criteria.where("stock").is(0)),
    new Update().set("available", false),
    Product.class
);
```

## Upsert

```java
mongoTemplate.upsert(
    new Query(Criteria.where("sku").is("NEW-001")),
    new Update()
        .setOnInsert("sku", "NEW-001")
        .set("name", "New Product")
        .set("price", 29.99)
        .set("stock", 50),
    Product.class
);
```

## Find and Modify (Atomic)

```java
import org.springframework.data.mongodb.core.FindAndModifyOptions;

Product updated = mongoTemplate.findAndModify(
    new Query(Criteria.where("sku").is("KB-001")),
    new Update().inc("stock", -1),
    FindAndModifyOptions.options().returnNew(true),
    Product.class
);
```

`returnNew(true)` returns the document state after the modification, which is essential for reservation-style operations.

## Aggregation Pipeline

```java
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;

Aggregation agg = Aggregation.newAggregation(
    Aggregation.match(Criteria.where("status").is("SOLD")),
    Aggregation.group("category")
        .sum("price").as("revenue")
        .count().as("unitsSold"),
    Aggregation.sort(Sort.Direction.DESC, "revenue"),
    Aggregation.limit(5)
);

AggregationResults<CategoryRevenue> results =
    mongoTemplate.aggregate(agg, "products", CategoryRevenue.class);

results.getMappedResults().forEach(r ->
    System.out.printf("%s: $%.2f (%d units)%n",
        r.getId(), r.getRevenue(), r.getUnitsSold()));
```

## Counting and Existence Checks

```java
long count = mongoTemplate.count(
    new Query(Criteria.where("category").is("electronics")), Product.class);

boolean exists = mongoTemplate.exists(
    new Query(Criteria.where("sku").is("KB-001")), Product.class);
```

## Summary

`MongoTemplate` fills the gap between Spring Data repositories and the raw MongoDB Java Driver. Use it when you need atomic update operators like `$inc` and `$set`, field projections, upserts, find-and-modify patterns, or complex aggregation pipelines. Inject it via constructor injection, build queries with `Criteria`, and combine with `Update` for precise, performant document mutations.
