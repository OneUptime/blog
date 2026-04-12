# How to Use MongoDB with Morphia ODM in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Java, Morphia, ODM, Annotation

Description: Learn how to use Morphia, the Java ODM for MongoDB, to map annotated Java classes to collections and perform type-safe queries.

---

## What Is Morphia?

Morphia is an Object Document Mapper (ODM) for MongoDB in Java. It maps annotated Java classes to MongoDB collections, provides a type-safe query API, and handles BSON serialization automatically. Unlike Spring Data MongoDB, Morphia has no Spring dependency - it works with any Java application.

## Maven Dependency

```xml
<dependency>
    <groupId>dev.morphia.morphia</groupId>
    <artifactId>morphia-core</artifactId>
    <version>2.4.0</version>
</dependency>
<dependency>
    <groupId>org.mongodb</groupId>
    <artifactId>mongodb-driver-sync</artifactId>
    <version>5.1.0</version>
</dependency>
```

## Connecting and Creating a Datastore

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import dev.morphia.Datastore;
import dev.morphia.Morphia;

MongoClient client = MongoClients.create("mongodb://localhost:27017");
Datastore datastore = Morphia.createDatastore(client, "shopdb");

// Ensure indexes defined with @Indexes are created
datastore.getMapper().mapPackage("com.example.models");
datastore.ensureIndexes();
```

## Defining an Entity

```java
import dev.morphia.annotations.*;
import org.bson.types.ObjectId;

@Entity("products")
@Indexes({
    @Index(fields = @Field("category")),
    @Index(fields = { @Field("category"), @Field("price") })
})
public class Product {

    @Id
    private ObjectId id;

    @Property("product_name")
    private String name;

    private double price;
    private String category;
    private int stock;

    @Transient
    private String tempField; // not persisted

    public Product() {}

    public Product(String name, double price, String category, int stock) {
        this.name = name;
        this.price = price;
        this.category = category;
        this.stock = stock;
    }

    // getters/setters
}
```

## Inserting Documents

```java
Product p = new Product("Wireless Keyboard", 49.99, "electronics", 100);
datastore.save(p);

System.out.println("Saved with ID: " + p.getId());
```

`save()` performs an upsert based on the `@Id` field.

## Querying with the Morphia Query API

```java
import dev.morphia.query.Query;
import dev.morphia.query.filters.Filters;
import java.util.List;

// Find by field equality
List<Product> electronics = datastore.find(Product.class)
    .filter(Filters.eq("category", "electronics"))
    .iterator()
    .toList();

// Combined filters
List<Product> affordable = datastore.find(Product.class)
    .filter(
        Filters.eq("category", "electronics"),
        Filters.lte("price", 100.0),
        Filters.gt("stock", 0)
    )
    .iterator()
    .toList();

// Find first
Product kb = datastore.find(Product.class)
    .filter(Filters.eq("name", "Wireless Keyboard"))
    .first();
```

## Updating Documents

```java
import dev.morphia.query.updates.UpdateOperators;

datastore.find(Product.class)
    .filter(Filters.eq("name", "Wireless Keyboard"))
    .update(
        UpdateOperators.set("price", 44.99),
        UpdateOperators.inc("stock", -1)
    )
    .execute();
```

## Deleting Documents

```java
import dev.morphia.DeleteOptions;

// Delete all matching documents
datastore.find(Product.class)
    .filter(Filters.eq("category", "discontinued"))
    .delete(new DeleteOptions().multi(true));
```

## Sorting and Pagination

```java
import dev.morphia.query.FindOptions;
import dev.morphia.query.Sort;

List<Product> page = datastore.find(Product.class)
    .filter(Filters.eq("category", "electronics"))
    .iterator(new FindOptions()
        .sort(Sort.ascending("price"))
        .skip(0)
        .limit(10))
    .toList();
```

## Embedded Documents and References

```java
@Embedded
public class Address {
    private String street;
    private String city;
    // getters/setters
}

@Entity("customers")
public class Customer {
    @Id private ObjectId id;
    private String name;
    private Address address;          // embedded
    @Reference private List<Order> orders; // reference to another collection
}
```

## Summary

Morphia provides a clean annotation-driven ODM for MongoDB in Java without requiring Spring. Define entities with `@Entity`, declare indexes with `@Indexes`, and use the fluent query API with `Filters` and `UpdateOperators` for type-safe operations. It is a lightweight alternative to Spring Data MongoDB when you want ODM convenience without the full Spring ecosystem dependency.
