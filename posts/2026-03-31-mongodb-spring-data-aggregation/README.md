# How to Use Spring Data MongoDB Aggregation Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Spring, Aggregation, Pipeline, Java

Description: Learn how to build MongoDB aggregation pipelines in Spring Data using the type-safe Aggregation API with match, group, project, and lookup stages.

---

## Overview

MongoDB's aggregation framework processes documents through a pipeline of stages. Spring Data MongoDB wraps this in a fluent Java API via `Aggregation.newAggregation()`, making it easy to construct multi-stage pipelines while staying within the Spring ecosystem.

## Dependency and Configuration

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/analytics
```

## Basic Pipeline: Match and Group

```java
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;

Aggregation agg = Aggregation.newAggregation(
    Aggregation.match(Criteria.where("status").is("completed")),
    Aggregation.group("category")
        .sum("amount").as("totalRevenue")
        .avg("amount").as("avgOrderValue")
        .count().as("orderCount"),
    Aggregation.sort(Sort.Direction.DESC, "totalRevenue")
);

AggregationResults<CategorySummary> results =
    mongoTemplate.aggregate(agg, "orders", CategorySummary.class);

results.getMappedResults().forEach(System.out::println);
```

Result class:

```java
public class CategorySummary {
    private String id;        // maps to _id (the group key)
    private double totalRevenue;
    private double avgOrderValue;
    private int orderCount;
    // getters/setters
}
```

## Project Stage

Use `project` to reshape documents and add computed fields:

```java
Aggregation agg = Aggregation.newAggregation(
    Aggregation.project("name", "price", "category")
        .andExpression("price * 1.2").as("priceWithTax")
        .andExpression("toLower(name)").as("nameLower"),
    Aggregation.match(Criteria.where("priceWithTax").lte(100))
);
```

## Unwind Stage

```java
Aggregation agg = Aggregation.newAggregation(
    Aggregation.unwind("tags"),
    Aggregation.group("tags").count().as("articleCount"),
    Aggregation.sort(Sort.Direction.DESC, "articleCount"),
    Aggregation.limit(10)
);

AggregationResults<TagCount> topTags =
    mongoTemplate.aggregate(agg, "articles", TagCount.class);
```

## Lookup Stage (Left Outer Join)

```java
Aggregation agg = Aggregation.newAggregation(
    Aggregation.match(Criteria.where("status").is("PENDING")),
    Aggregation.lookup("customers", "customerId", "_id", "customerDetails"),
    Aggregation.unwind("customerDetails"),
    Aggregation.project("orderId", "amount")
        .and("customerDetails.name").as("customerName")
        .and("customerDetails.email").as("customerEmail")
);

AggregationResults<OrderWithCustomer> result =
    mongoTemplate.aggregate(agg, "orders", OrderWithCustomer.class);
```

## AddFields Stage

```java
Aggregation agg = Aggregation.newAggregation(
    Aggregation.addFields()
        .addFieldWithValue("fullName",
            StringOperators.Concat.valueOf("firstName")
                .concat(" ")
                .concatValueOf("lastName"))
        .build(),
    Aggregation.project().andExclude("firstName", "lastName")
);
```

## Facet for Multi-Dimensional Analytics

```java
Aggregation agg = Aggregation.newAggregation(
    Aggregation.facet(
        Aggregation.group("category").count().as("count")
    ).as("byCategory")
    .and(
        Aggregation.bucket("price")
            .withBoundaries(0, 50, 100, 500)
            .withDefaultBucket("500+")
            .andOutputCount().as("count")
    ).as("byPriceRange")
);
```

## Pagination in Aggregation

```java
int page = 0;
int size = 20;

Aggregation agg = Aggregation.newAggregation(
    Aggregation.match(Criteria.where("status").is("active")),
    Aggregation.sort(Sort.Direction.DESC, "createdAt"),
    Aggregation.skip((long) page * size),
    Aggregation.limit(size)
);
```

## Using @Aggregation in Repositories

For simpler cases, annotate repository methods directly:

```java
@Aggregation(pipeline = {
    "{ $match: { 'year': ?0 } }",
    "{ $group: { _id: '$month', total: { $sum: '$revenue' } } }",
    "{ $sort: { _id: 1 } }"
})
List<MonthlyRevenue> getMonthlyRevenue(int year);
```

## Summary

Spring Data MongoDB's aggregation API mirrors MongoDB's pipeline stages - `match`, `group`, `project`, `unwind`, `lookup`, `limit`, `skip`, and `facet` - using a fluent Java builder. Pass the assembled `Aggregation` to `MongoTemplate.aggregate()` with an output POJO class for automatic deserialization. For simple pipelines, the `@Aggregation` annotation on repository methods avoids injecting `MongoTemplate` entirely.
