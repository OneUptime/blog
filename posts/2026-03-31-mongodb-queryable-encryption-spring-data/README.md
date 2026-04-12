# How to Use Queryable Encryption with Spring Data MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Spring Data, Queryable Encryption, Java, Security

Description: Configure MongoDB Queryable Encryption with Spring Data MongoDB using AutoEncryptionSettings, encrypted field maps, and annotated entity classes.

---

Spring Data MongoDB provides a rich mapping layer on top of the MongoDB Java driver. Queryable Encryption integrates at the driver level, so you configure it in your `MongoClient` bean and Spring Data's repositories work transparently.

## Dependencies

```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.springframework.data</groupId>
  <artifactId>spring-data-mongodb</artifactId>
  <version>4.3.0</version>
</dependency>
<dependency>
  <groupId>org.mongodb</groupId>
  <artifactId>mongodb-driver-sync</artifactId>
  <version>5.1.0</version>
</dependency>
<dependency>
  <groupId>org.mongodb</groupId>
  <artifactId>mongodb-crypt</artifactId>
  <version>1.10.0</version>
</dependency>
```

## Building the Encrypted MongoClient Bean

```java
@Configuration
public class MongoQEConfig extends AbstractMongoClientConfiguration {

    @Override
    protected String getDatabaseName() {
        return "myapp";
    }

    @Override
    public MongoClient mongoClient() {
        byte[] localMasterKey = loadMasterKey(); // 96 bytes

        Map<String, Map<String, Object>> kmsProviders = Map.of(
            "local", Map.of("key", localMasterKey)
        );

        BsonDocument encryptedFields = buildEncryptedFieldsMap();

        Map<String, BsonDocument> encryptedFieldsMaps = Map.of(
            "myapp.patients", encryptedFields
        );

        AutoEncryptionSettings autoEncryption = AutoEncryptionSettings.builder()
            .keyVaultNamespace("encryption.__keyVault")
            .kmsProviders(kmsProviders)
            .encryptedFieldsMap(encryptedFieldsMaps)
            .extraOptions(Map.of(
                "cryptSharedLibPath", "/usr/local/lib/mongo_crypt_v1.so"
            ))
            .build();

        MongoClientSettings settings = MongoClientSettings.builder()
            .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
            .autoEncryptionSettings(autoEncryption)
            .build();

        return MongoClients.create(settings);
    }

    private BsonDocument buildEncryptedFieldsMap() {
        return BsonDocument.parse("""
            {
              "fields": [
                {
                  "path": "ssn",
                  "bsonType": "string",
                  "queries": [{ "queryType": "equality" }]
                }
              ]
            }
        """);
    }
}
```

## Creating the Collection at Startup

Use a `CommandLineRunner` to create the collection with encrypted fields before any writes:

```java
@Component
public class CollectionInitializer implements CommandLineRunner {

    @Autowired
    private MongoDatabaseFactory mongoDbFactory;

    @Override
    public void run(String... args) {
        MongoDatabase db = mongoDbFactory.getMongoDatabase();
        boolean exists = db.listCollectionNames()
            .into(new ArrayList<>())
            .contains("patients");

        if (!exists) {
            BsonDocument encryptedFields = BsonDocument.parse(/* same map */);
            db.createCollection("patients",
                new CreateCollectionOptions().encryptedFields(encryptedFields));
        }
    }
}
```

## Defining the Entity

```java
@Document(collection = "patients")
public class Patient {

    @Id
    private String id;

    private String name;

    private String ssn; // encrypted transparently

    // getters and setters
}
```

## Repository Interface

```java
public interface PatientRepository extends MongoRepository<Patient, String> {
    Optional<Patient> findBySsn(String ssn);
}
```

## Querying Encrypted Fields

```java
@Service
public class PatientService {

    @Autowired
    private PatientRepository repository;

    public Patient findBySSN(String ssn) {
        return repository.findBySsn(ssn)
            .orElseThrow(() -> new RuntimeException("Not found"));
    }
}
```

The driver encrypts the `ssn` value before sending the query and decrypts matching documents when they are returned.

## Summary

Spring Data MongoDB works seamlessly with Queryable Encryption once the `MongoClient` bean is configured with `AutoEncryptionSettings`. Entities and repositories require no special annotations for encrypted fields - encryption is handled at the driver level. Create the collection with the encrypted fields map at startup using a `CommandLineRunner` to ensure the required metadata collections are in place before any data is written.
