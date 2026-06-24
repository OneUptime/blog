# How to Serialize and Deserialize MongoDB Documents in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Java, BSON, Serialization, Driver

Description: Learn how to serialize and deserialize MongoDB documents in Java using the official driver, POJO codec, and Jackson integration for mapping BSON types to Java classes.

---

## How the Java Driver Handles Documents

The MongoDB Java driver works with `Document` objects (essentially `Map<String, Object>`) or strongly typed POJOs through the POJO codec. BSON types map to Java counterparts automatically.

## BSON Type Mappings in Java

```text
Java Type              <->  BSON Type
--------------------        ---------
String                       String
Integer                      Int32
Long                         Int64
Double                       Double
Boolean                      Boolean
null                         Null
java.util.Date               Date
org.bson.types.ObjectId      ObjectId
org.bson.types.Decimal128    Decimal128
byte[]                       Binary (subtype 0)
org.bson.Document            Document (embedded)
java.util.List               Array
```

## Working with Document Objects

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.bson.types.Decimal128;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

MongoClient client = MongoClients.create(uri);
MongoDatabase db = client.getDatabase("shop");
MongoCollection<Document> products = db.getCollection("products");

// Build a document
Document product = new Document("_id", new ObjectId())
    .append("name", "Wireless Headphones")
    .append("price", new Decimal128(new BigDecimal("149.99")))
    .append("qty", 50)
    .append("tags", List.of("electronics", "audio"))
    .append("createdAt", new Date())
    .append("active", true);

products.insertOne(product);

// Read and extract typed values
Document retrieved = products.find(
    new Document("_id", product.getObjectId("_id"))
).first();

ObjectId id = retrieved.getObjectId("_id");
Decimal128 price = retrieved.get("price", Decimal128.class);
BigDecimal priceDecimal = price.bigDecimalValue();
Date createdAt = retrieved.getDate("createdAt");
```

## Using POJOs with the POJO Codec

Map MongoDB documents directly to Java classes:

```java
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;

public class Product {
    @BsonId
    private ObjectId id;
    private String name;
    private Decimal128 price;
    private int qty;
    private List<String> tags;
    private Date createdAt;
    private boolean active;
    // getters and setters omitted for brevity
}
```

Configure the POJO codec:

```java
import org.bson.codecs.configuration.CodecRegistry;
import org.bson.codecs.pojo.PojoCodecProvider;
import static com.mongodb.MongoClientSettings.getDefaultCodecRegistry;
import static org.bson.codecs.configuration.CodecRegistries.fromProviders;
import static org.bson.codecs.configuration.CodecRegistries.fromRegistries;

CodecRegistry pojoRegistry = fromRegistries(
    getDefaultCodecRegistry(),
    fromProviders(PojoCodecProvider.builder().automatic(true).build())
);

MongoCollection<Product> productCollection = db
    .getCollection("products", Product.class)
    .withCodecRegistry(pojoRegistry);

// Insert POJO directly
Product p = new Product();
p.setId(new ObjectId());
p.setName("Wireless Headphones");
p.setPrice(new Decimal128(new BigDecimal("149.99")));
productCollection.insertOne(p);

// Find as POJO
Product found = productCollection.find(
    new Document("_id", p.getId())
).first();
System.out.println(found.getName()); // Wireless Headphones
```

## Serializing Documents to JSON

```java
import org.bson.Document;
import org.bson.json.JsonMode;
import org.bson.json.JsonWriterSettings;

Document doc = products.find().first();

// Relaxed Extended JSON (default mode)
String relaxedJson = doc.toJson();

// Canonical Extended JSON (preserves all BSON type information)
JsonWriterSettings canonical = JsonWriterSettings.builder()
    .outputMode(JsonMode.EXTENDED)
    .build();
String canonicalJson = doc.toJson(canonical);

// Shell mode (for use in mongosh)
JsonWriterSettings shellMode = JsonWriterSettings.builder()
    .outputMode(JsonMode.SHELL)
    .build();
System.out.println(doc.toJson(shellMode));
```

## Deserializing from JSON String

```java
import org.bson.Document;

String json = "{\"name\": \"Headphones\", \"price\": {\"$numberDecimal\": \"149.99\"}}";
Document doc = Document.parse(json);
Decimal128 price = doc.get("price", Decimal128.class);
```

## Summary

The MongoDB Java driver maps BSON types to Java objects automatically through the `Document` API or strongly typed POJOs via the POJO codec. Use `Decimal128` and `BigDecimal` for monetary values, `ObjectId` for document IDs, and `java.util.Date` or `java.time.Instant` for timestamps. Serialize documents to JSON with `Document.toJson()` using `JsonWriterSettings` to control output mode (canonical, relaxed, or shell). POJOs with the POJO codec provide the cleanest integration with domain-driven Java applications.
