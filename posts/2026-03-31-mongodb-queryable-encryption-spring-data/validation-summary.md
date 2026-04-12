# Validation Summary: How to Use Queryable Encryption with Spring Data MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Queryable Encryption
- Spring Data MongoDB 4.3.0
- MongoDB Java Driver (mongodb-driver-sync) 5.1.0
- mongodb-crypt 1.10.0
- Java (Spring Boot, Spring Configuration)

## Sources Consulted
- MongoDB Java Driver AutoEncryptionSettings API: https://github.com/mongodb/mongo-java-driver/blob/main/driver-core/src/main/com/mongodb/AutoEncryptionSettings.java
- MongoDB official Queryable Encryption Java examples: https://github.com/mongodb-university/docs-in-use-encryption-examples/blob/main/queryable-encryption/java/exp/reader/src/main/java/com/mongodb/qe/MakeDataKey.java
- MongoDB Java Driver CSFLE example: https://github.com/mongodb/mongo-java-driver/blob/master/driver-sync/src/examples/tour/ClientSideEncryptionAutoEncryptionSettingsTour.java
- Spring Data MongoDB AbstractMongoClientConfiguration Javadoc: https://docs.spring.io/spring-data/mongodb/docs/current/api/org/springframework/data/mongodb/config/AbstractMongoClientConfiguration.html
- MongoDB CreateCollectionOptions API: https://github.com/mongodb/mongo-java-driver/blob/main/driver-core/src/main/com/mongodb/client/model/CreateCollectionOptions.java

## Issues Found

### 1. Incorrect KMS provider key type (BsonBinary instead of byte[])
- **What was wrong:** The `kmsProviders` map used `new BsonBinary(localMasterKey)` for the local KMS provider key value.
- **What was changed:** Replaced `new BsonBinary(localMasterKey)` with `localMasterKey` (raw `byte[]`).
- **Why:** The MongoDB Java driver's `AutoEncryptionSettings.kmsProviders()` expects a raw `byte[]` for the local provider's key, not a `BsonBinary` wrapper. All official MongoDB examples and documentation use a plain `byte[]` for this value.

### 2. MongoDatabase is not a Spring bean
- **What was wrong:** The `CollectionInitializer` class used `@Autowired private MongoDatabase db;`, but `MongoDatabase` is not exposed as a Spring bean by `AbstractMongoClientConfiguration`.
- **What was changed:** Replaced the `MongoDatabase` injection with `@Autowired private MongoDatabaseFactory mongoDbFactory;` and added `MongoDatabase db = mongoDbFactory.getMongoDatabase();` at the start of the `run()` method.
- **Why:** `AbstractMongoClientConfiguration` exposes `MongoDatabaseFactory`, `MongoTemplate`, and `MappingMongoConverter` as beans, but not `MongoDatabase` directly. The `MongoDatabaseFactory.getMongoDatabase()` method provides access to the underlying `MongoDatabase` instance.

## Review Notes
- The `mongoClient()` override on `AbstractMongoClientConfiguration` works correctly but is not annotated with `@Bean` in the base class. The base class calls it internally to create the `MongoDatabaseFactory`, so it functions correctly without the annotation. If the author wanted to also expose the `MongoClient` as a standalone bean, they would need to add `@Bean`.
- The post correctly limits Queryable Encryption queries to equality, which is the primary supported query type. Range queries require additional configuration not covered here.
- The `BsonDocument.parse(/* same map */)` placeholder comment in the `CollectionInitializer` is acceptable for a blog post but would not compile as-is. This is clearly intentional as a placeholder.
