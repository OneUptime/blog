# How to Map C# Classes to MongoDB Documents with BsonClassMap

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CSharp, BsonClassMap, Serialization, DotNet

Description: Learn how to control MongoDB BSON serialization in C# using BsonClassMap for custom field names, ignored properties, and type discriminators.

---

## Overview

The MongoDB .NET Driver serializes C# classes to BSON using either attribute-based or convention-based configuration. `BsonClassMap` provides the convention-based approach, letting you configure serialization in code without polluting your domain classes with MongoDB-specific attributes.

## Setup

```bash
dotnet add package MongoDB.Driver
```

## Attribute-Based Mapping (Quick Start)

For simple cases, use attributes directly on your class:

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class Product
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }

    [BsonElement("product_name")]
    public string Name { get; set; }

    [BsonIgnore]
    public string InternalCode { get; set; }

    [BsonDefaultValue(0.0)]
    public double Price { get; set; }

    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; }
}
```

## Code-Based Mapping with BsonClassMap

Register class maps once at application startup (before any MongoDB operations):

```csharp
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Bson;

BsonClassMap.RegisterClassMap<Product>(cm =>
{
    cm.AutoMap(); // map all public properties by default

    cm.MapIdMember(p => p.Id)
      .SetSerializer(new StringSerializer(BsonType.ObjectId));

    cm.MapMember(p => p.Name)
      .SetElementName("product_name")
      .SetIsRequired(true);

    cm.UnmapMember(p => p.InternalCode); // do not serialize

    cm.MapMember(p => p.Price)
      .SetDefaultValue(0.0);

    cm.SetIgnoreExtraElements(true); // ignore unknown fields from DB
});
```

Register in `Program.cs` before building the host.

## Custom Serializers

Implement `IBsonSerializer<T>` for non-standard types:

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.IO;

public class MoneySerializer : IBsonSerializer<decimal>
{
    public Type ValueType => typeof(decimal);

    public void Serialize(BsonSerializationContext ctx,
        BsonSerializationArgs args, decimal value)
    {
        ctx.Writer.WriteDecimal128(new Decimal128(value));
    }

    public decimal Deserialize(BsonDeserializationContext ctx,
        BsonDeserializationArgs args)
    {
        return (decimal)ctx.Reader.ReadDecimal128();
    }

    object IBsonSerializer.Deserialize(BsonDeserializationContext ctx,
        BsonDeserializationArgs args) => Deserialize(ctx, args);

    void IBsonSerializer.Serialize(BsonSerializationContext ctx,
        BsonSerializationArgs args, object value) => Serialize(ctx, args, (decimal)value);
}

// Register
BsonSerializer.RegisterSerializer(new MoneySerializer());
```

## Polymorphism with Discriminators

When you store multiple subclasses in the same collection:

```csharp
[BsonDiscriminator(RootClass = true)]
[BsonKnownTypes(typeof(DigitalProduct), typeof(PhysicalProduct))]
public abstract class Product
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }
    public string Name { get; set; }
}

public class DigitalProduct : Product
{
    public string DownloadUrl { get; set; }
}

public class PhysicalProduct : Product
{
    public double WeightKg { get; set; }
    public string Sku { get; set; }
}
```

MongoDB adds a `_t` discriminator field automatically. You can query by subtype:

```csharp
var physical = db.GetCollection<Product>("products")
    .OfType<PhysicalProduct>()
    .Find(p => p.WeightKg > 1.0)
    .ToList();
```

## Conventions (Bulk Configuration)

Instead of per-class maps, apply conventions globally:

```csharp
using MongoDB.Bson.Serialization.Conventions;

var pack = new ConventionPack
{
    new CamelCaseElementNameConvention(),  // PascalCase -> camelCase
    new IgnoreExtraElementsConvention(true),
    new EnumRepresentationConvention(BsonType.String)
};

ConventionRegistry.Register("MyConventions", pack, t => true);
```

Apply before creating `MongoClient`.

## Summary

The MongoDB .NET Driver supports both attribute-based and convention-based BSON serialization. Use `[BsonElement]`, `[BsonId]`, and `[BsonIgnore]` attributes for quick, localized control. Use `BsonClassMap.RegisterClassMap` to configure serialization in a central location without coupling domain classes to MongoDB. Apply `ConventionPack` for bulk rules like camelCase naming across all models. Always register class maps and conventions before creating `MongoClient`.
