# How to Serialize Cross-Language Objects in Apache Geode with PDX

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Serialization, Distributed Database, Java, Data Persistence

Description: Define a stable PDX type contract that Java, .NET, and C++ clients can read, query, evolve, and persist without sharing domain classes.

---

Apache Geode's Portable Data eXchange (PDX) format is the right starting point when producers and consumers are written in different languages. PDX stores a type name plus named, typed fields. Geode keeps the type metadata in a distributed registry, so a server can query a field without loading the producer's domain class and another client can reconstruct the data in its own language.

PDX portability is not automatic merely because both applications use PDX. The applications still need a shared wire contract:

- the same PDX type name;
- exactly matching, case-sensitive field names;
- a stable PDX field type for every field;
- the same identity fields; and
- compatible rules for optional and newly added fields.

Treat that contract like an API schema. A Java `long` and a .NET `Int64` are compatible PDX fields; a Java `long` and a .NET string containing digits are not.

## Prefer a PdxInstance for a Language-Neutral Contract

There are three common Java serialization styles:

| Style | Best fit | Cross-language consideration |
| --- | --- | --- |
| `PdxSerializable` | You own the Java domain class | Other languages must reproduce its PDX type and fields |
| `PdxSerializer` or `ReflectionBasedAutoSerializer` | You cannot modify the class | Configure the same serializer everywhere that materializes that Java class |
| `PdxInstanceFactory` | The wire record is the contract | No Java domain class is needed to create or inspect the record |

`PdxInstanceFactory` makes the contract visible in code and avoids accidental coupling to Java reflection. This Java producer creates a `com.acme.Customer` record:

```java
PdxInstance customer = cache
    .createPdxInstanceFactory("com.acme.Customer")
    .writeString("customerId", "C-1042")
    .markIdentityField("customerId")
    .writeString("displayName", "Mina Patel")
    .writeLong("loyaltyPoints", 840L)
    .writeBoolean("marketingAllowed", false)
    .writeString("schemaVersion", "2")
    .create();

Region<String, PdxInstance> customers = cache.getRegion("customers");
customers.put("C-1042", customer);
```

The factory is single-use: create a new factory for each new instance. The PDX type name is not required to name a loadable Java class if all consumers use `PdxInstance`; calling `neverDeserialize()` makes that intent explicit. Passing an empty type name also creates a never-deserialized instance, but a stable, meaningful type name is better for diagnostics and type separation.

A .NET client can create the same logical record with the corresponding native-client API:

```csharp
var customer = cache
    .CreatePdxInstanceFactory("com.acme.Customer")
    .WriteString("customerId", "C-1042")
    .MarkIdentityField("customerId")
    .WriteString("displayName", "Mina Patel")
    .WriteLong("loyaltyPoints", 840L)
    .WriteBoolean("marketingAllowed", false)
    .WriteString("schemaVersion", "2")
    .Create();
```

The local class names do not have to match if a native client's PDX type mapper deliberately maps them, but the resulting PDX type name must match. Keeping one explicit PDX name across languages is easier to operate than relying on implicit local-class mapping.

## Fix the Field Types Before Shipping

Every PDX field has one `FieldType`. Once a type definition says that `loyaltyPoints` is `LONG`, another client must not write it as `INT`, `DOUBLE`, `STRING`, or generic `OBJECT` under the same PDX type and field name. A later writer that changes the field type can receive `PdxFieldTypeMismatchException` or introduce a second incompatible type definition.

Use the narrow, explicit writer method that matches the contract:

| Logical value | Java writer | .NET value |
| --- | --- | --- |
| Boolean | `writeBoolean` | `Boolean` |
| 32-bit integer | `writeInt` | `Int32` |
| 64-bit integer | `writeLong` | `Int64` |
| Text | `writeString` | `String` |
| Instant represented as a date | `writeDate` | `DateTime` through the native PDX API |
| Nested portable value | `writeObject` | Another PDX-supported object |

Do not use a language-specific object graph as a shortcut inside `writeObject`. Every nested object, collection element, map key, and map value must also be representable to all participating clients. If a field genuinely needs to change from one physical type to another, add a new field such as `loyaltyPointsV2`, migrate readers, then retire the old field after the compatibility window. Do not reuse the original field name with a new type.

## Mark Stable Identity Fields

PDX identity fields drive `PdxInstance.equals()` and `hashCode()`. If no field is marked, all fields participate. That makes equality more expensive and means adding an otherwise optional field can change identity behavior.

Mark only immutable business identity fields, and mark the same set in every language:

```java
.writeString("customerId", customerId)
.markIdentityField("customerId")
```

The `markIdentityField` call comes after writing that field. Identity selection is important for `DISTINCT` queries and any code that places `PdxInstance` objects in hash-based collections. Avoid using PDX objects as region keys; Geode's documentation strongly discourages it. Prefer a simple string, number, or carefully implemented portable key.

## Keep Data Serialized Where Domain Classes Are Absent

Configure servers to prefer `PdxInstance` before starting data members:

```text
gfsh> configure pdx --read-serialized=true
```

The cluster configuration service stores this configuration for servers that start later. A server already running when `configure pdx` is issued does not adopt it until restart. In an embedded server the equivalent must be set before `CacheFactory.create()`:

```java
Cache cache = new CacheFactory()
    .setPdxReadSerialized(true)
    .create();
```

For a Java client that wants records instead of local domain objects:

```java
ClientCache client = new ClientCacheFactory()
    .setPdxReadSerialized(true)
    .addPoolLocator("locator.example.net", 10334)
    .create();
```

PDX-aware OQL can access named fields without full domain-object deserialization. For example:

```sql
SELECT *
FROM /customers c
WHERE c.loyaltyPoints >= 500
```

The server therefore does not need `com.acme.Customer` on its classpath for this field-based query. Server functions or listeners that call `PdxInstance.getObject()`, cast values to a domain class, or invoke domain behavior do need the class and compatible serialization code.

## Evolve the Schema Additively

PDX supports versions that add or remove fields. An old reader sees the default value for a field it does not have; a reader can use `PdxInstance.hasField()` to distinguish an absent field from a present field whose value is null or the primitive default.

Use an additive rollout:

1. Teach readers to accept both the old and new shape.
2. Deploy the compatible readers to every site.
3. Start writing the new optional field.
4. Backfill only if the application requires it.
5. Remove old-field handling after old data and old clients are gone.

For class-based deserialization, leave `ignore-unread-fields` false when rolling versions. Geode can preserve fields an older class did not read and write them back later. Setting `ignore-unread-fields=true` trades that preservation for memory and can discard data during a read-modify-write cycle.

Schema evolution does not make all changes compatible. Renaming a field is an add-and-retire operation. Changing a field's PDX type is incompatible. Changing identity fields can alter equality. Changing a nested value from portable to language-specific can force server deserialization.

## Persist the PDX Registry with Persistent Data and WAN Regions

The PDX registry assigns metadata used to interpret stored bytes. Geode requires PDX metadata persistence when PDX data is used with persistent regions or regions attached to a gateway sender. Configure it before the data members start and back up that disk store with the region data.

An embedded member can select a dedicated disk store:

```java
Cache cache = new CacheFactory()
    .setPdxReadSerialized(true)
    .setPdxPersistent(true)
    .setPdxDiskStore("PdxMetadata")
    .create();
```

The named disk store must exist in that member's cache configuration. If PDX objects are region keys in a persistent region, Geode requires the PDX metadata to use a different disk store from the persistent region. Even when values are the only PDX objects, separating metadata can make capacity monitoring and recovery intent clearer.

Never restore only the region oplogs while discarding the matching PDX metadata. Back up and restore the complete disk-store set for every persistent member.

## Validate the Contract Across Languages

An integration test should cross the process and language boundary; a round trip inside one client proves too little. For every supported schema version:

1. Java writes and the native client reads every field.
2. The native client writes and Java reads every field.
3. An OQL query filters on each indexed or business-critical field.
4. Old and new readers consume both old and new records.
5. Equality and hash codes agree for records with the same identity.
6. A restart recovers both persistent data and PDX metadata.

When diagnosing failures, inspect the value as `PdxInstance` and print `getClassName()`, `getFieldNames()`, and the runtime value returned by `getField()`. A mismatch usually becomes obvious: `customerID` versus `customerId`, `INT` versus `LONG`, a nested non-PDX object, or two clients mapping local classes to different PDX type names.

## Conclusion

Cross-language PDX succeeds when the serialized record, not a language's domain class, is the source of truth. Freeze type names and field types, mark stable identity fields, keep servers on `PdxInstance`, evolve additively, persist the registry alongside persistent data, and test writes in both directions. Those practices preserve Geode's query and versioning advantages without hiding compatibility failures until production.

## Official References

- [Geode PDX serialization](https://geode.apache.org/docs/guide/latest/developing/data_serialization/gemfire_pdx_serialization.html)
- [PDX serialization features](https://geode.apache.org/docs/guide/latest/developing/data_serialization/PDX_Serialization_Features.html)
- [Programming applications to use PdxInstance](https://geode.apache.org/docs/guide/latest/developing/data_serialization/program_application_for_pdx.html)
- [Persisting PDX metadata to disk](https://geode.apache.org/docs/guide/latest/developing/data_serialization/persist_pdx_metadata_to_disk.html)
- [`PdxInstance` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/pdx/PdxInstance.html)
- [`PdxInstanceFactory` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/pdx/PdxInstanceFactory.html)
- [`PdxWriter` Java API and cross-language type mappings](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/pdx/PdxWriter.html)
- [Apache Geode Native .NET `IPdxInstanceFactory` API](https://geode.apache.org/releases/latest/dotnetdocs/a00976.html)
