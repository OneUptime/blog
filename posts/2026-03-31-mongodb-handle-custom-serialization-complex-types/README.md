# How to Handle Custom Serialization for Complex Types in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, BSON, Serialization, Codec, Custom Type

Description: Learn how to implement custom serialization for complex types in MongoDB using custom BSON codecs in Java, custom type maps in Python, and custom toBSON methods in Node.js.

---

## Why Custom Serialization?

The default BSON type mappings cover primitives and common types, but applications often need to store domain-specific types - Money objects, enums, versioned identifiers, geospatial value objects - as BSON fields. Custom serialization keeps the domain model clean while controlling exactly how types are stored.

## Node.js: Custom toBSON

The MongoDB Node.js driver calls `toBSON()` on objects before serialization. Implement it to control how custom types serialize:

```javascript
class Money {
  constructor(amount, currency) {
    this.amount = amount;         // number
    this.currency = currency;     // string
  }

  // Called by the MongoDB driver when inserting
  toBSON() {
    return {
      amount: this.amount,
      currency: this.currency,
      amountCents: Math.round(this.amount * 100)
    };
  }

  static fromDocument(doc) {
    return new Money(doc.amount, doc.currency);
  }

  toString() {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

// Usage
const order = {
  _id: new ObjectId(),
  total: new Money(149.99, "USD"),  // toBSON() called automatically
  createdAt: new Date()
};
await db.orders.insertOne(order);

// Reading back - convert manually
const raw = await db.orders.findOne({ _id: order._id });
raw.total = Money.fromDocument(raw.total);
console.log(raw.total.toString()); // USD 149.99
```

## Python: Custom TypeEncoder and TypeDecoder

PyMongo's `TypeRegistry` allows registering custom encoders and decoders:

```python
from bson import Decimal128
from bson.codec_options import TypeDecoder, TypeEncoder, TypeRegistry, CodecOptions
from decimal import Decimal

class DecimalEncoder(TypeEncoder):
    python_type = Decimal

    def transform_python(self, value):
        return Decimal128(str(value))

class DecimalDecoder(TypeDecoder):
    bson_type = Decimal128

    def transform_bson(self, value):
        return Decimal(str(value))

registry = TypeRegistry([DecimalEncoder(), DecimalDecoder()])
codec_options = CodecOptions(type_registry=registry)

collection = db.get_collection("orders", codec_options=codec_options)

# Now Python Decimal works transparently
collection.insert_one({"total": Decimal("149.99")})
doc = collection.find_one({})
print(type(doc["total"]))  # <class 'decimal.Decimal'>
```

## Java: Custom BSON Codec

Implement the `Codec<T>` interface to control serialization for a custom type:

```java
import org.bson.BsonReader;
import org.bson.BsonWriter;
import org.bson.codecs.Codec;
import org.bson.codecs.DecoderContext;
import org.bson.codecs.EncoderContext;
import java.util.Currency;
import java.math.BigDecimal;

public class MoneyCodec implements Codec<Money> {
    @Override
    public void encode(BsonWriter writer, Money money, EncoderContext ctx) {
        writer.writeStartDocument();
        writer.writeDecimal128("amount", new org.bson.types.Decimal128(money.getAmount()));
        writer.writeString("currency", money.getCurrency().getCurrencyCode());
        writer.writeEndDocument();
    }

    @Override
    public Money decode(BsonReader reader, DecoderContext ctx) {
        reader.readStartDocument();
        BigDecimal amount = null;
        String currency = null;
        while (reader.readBsonType() != org.bson.BsonType.END_OF_DOCUMENT) {
            String fieldName = reader.readName();
            if ("amount".equals(fieldName)) {
                amount = reader.readDecimal128().bigDecimalValue();
            } else if ("currency".equals(fieldName)) {
                currency = reader.readString();
            } else {
                reader.skipValue();
            }
        }
        reader.readEndDocument();
        return new Money(amount, Currency.getInstance(currency));
    }

    @Override
    public Class<Money> getEncoderClass() { return Money.class; }
}
```

Register the codec:

```java
import org.bson.codecs.configuration.CodecRegistry;
import static com.mongodb.MongoClientSettings.getDefaultCodecRegistry;
import static org.bson.codecs.configuration.CodecRegistries.*;

CodecRegistry customRegistry = fromRegistries(
    fromCodecs(new MoneyCodec()),
    getDefaultCodecRegistry()
);
```

## Storing Enums as Strings

A common pattern across all languages is serializing Java/Python enums as strings rather than integers:

```javascript
// Node.js
const OrderStatus = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  SHIPPED: "shipped"
});

await db.orders.insertOne({ status: OrderStatus.PAID });
```

```python
# Python
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPED = "shipped"

collection.insert_one({"status": OrderStatus.PAID})  # stores "paid"
```

## Summary

Custom serialization for complex types in MongoDB is handled differently per language: Node.js uses `toBSON()` for encoding and manual mapping for decoding; Python uses PyMongo's `TypeRegistry` with custom `TypeEncoder` and `TypeDecoder` classes; Java uses the `Codec<T>` interface registered in a `CodecRegistry`. Store enums as strings (not integers) for readability and use domain value objects like `Money` to encapsulate serialization logic, keeping persistence concerns out of your core domain model.
