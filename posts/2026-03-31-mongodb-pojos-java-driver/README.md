# How to Use POJOs with the MongoDB Java Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Java, POJO, BSON, Codec

Description: Learn how to map plain Java objects (POJOs) directly to MongoDB documents using the built-in POJO codec in the Java Driver.

---

## Why Use POJOs?

Working directly with `Document` objects means accessing fields by string keys, which is error-prone and verbose. The MongoDB Java Driver includes a POJO codec framework that automatically serializes and deserializes Java classes to and from BSON documents - giving you type safety and cleaner code.

## Maven Dependency

```xml
<dependency>
    <groupId>org.mongodb</groupId>
    <artifactId>mongodb-driver-sync</artifactId>
    <version>5.1.0</version>
</dependency>
```

## Defining a POJO

```java
import org.bson.types.ObjectId;

public class Product {
    private ObjectId id;
    private String name;
    private double price;
    private int stock;

    // Required: public no-arg constructor
    public Product() {}

    public Product(String name, double price, int stock) {
        this.name = name;
        this.price = price;
        this.stock = stock;
    }

    // Getters and setters (required for codec)
    public ObjectId getId() { return id; }
    public void setId(ObjectId id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }
}
```

Key requirements: a public no-arg constructor and public getters/setters for all fields you want mapped. Using `ObjectId` for the `id` field enables the driver to auto-generate the `_id` on insert.

## Configuring the POJO Codec

```java
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.codecs.configuration.CodecRegistry;
import org.bson.codecs.pojo.PojoCodecProvider;

import static org.bson.codecs.configuration.CodecRegistries.fromProviders;
import static org.bson.codecs.configuration.CodecRegistries.fromRegistries;

CodecRegistry pojoCodecRegistry = fromRegistries(
    MongoClientSettings.getDefaultCodecRegistry(),
    fromProviders(PojoCodecProvider.builder().automatic(true).build())
);

MongoClient client = MongoClients.create(
    MongoClientSettings.builder()
        .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
        .codecRegistry(pojoCodecRegistry)
        .build()
);
```

Setting `automatic(true)` means all POJOs are mapped without explicit registration.

## Inserting a POJO

```java
import com.mongodb.client.MongoCollection;

MongoCollection<Product> products = client
    .getDatabase("shop")
    .getCollection("products", Product.class);

Product p = new Product("Wireless Keyboard", 49.99, 100);
products.insertOne(p);

// The driver generates and sets the _id before sending to MongoDB
System.out.println("Inserted with id: " + p.getId());
```

## Querying and Deserializing

```java
import com.mongodb.client.model.Filters;

// Find one
Product found = products.find(Filters.eq("name", "Wireless Keyboard")).first();
System.out.println(found.getPrice()); // 49.99

// Find many
for (Product product : products.find(Filters.lt("price", 100.0))) {
    System.out.println(product.getName() + " - $" + product.getPrice());
}
```

## Updating with POJOs

```java
import com.mongodb.client.model.Updates;
import com.mongodb.client.result.UpdateResult;

UpdateResult result = products.updateOne(
    Filters.eq("name", "Wireless Keyboard"),
    Updates.combine(
        Updates.set("price", 44.99),
        Updates.inc("stock", -1)
    )
);
System.out.println("Modified: " + result.getModifiedCount());
```

## Customizing Field Mapping with Annotations

```java
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

public class Product {
    @BsonId
    private ObjectId id;

    @BsonProperty("product_name")
    private String name;

    // rest of fields...
}
```

`@BsonId` maps the field to the `_id` field. `@BsonProperty` overrides the default field name.

## Handling Nested Objects

Nested POJOs are serialized automatically:

```java
public class Order {
    private String orderId;
    private Product product;  // nested POJO
    private int quantity;
    // getters/setters...
}
```

The `Product` nested inside `Order` is serialized as an embedded document without any extra configuration.

## Summary

The MongoDB Java Driver's POJO codec eliminates boilerplate Document manipulation by mapping Java classes directly to BSON. Register the `PojoCodecProvider` with `automatic(true)` in your `MongoClientSettings`, define your POJO with a no-arg constructor and getters/setters, then use typed `MongoCollection<YourClass>` for all operations. Use `@BsonId` and `@BsonProperty` annotations when you need to customize field naming.
