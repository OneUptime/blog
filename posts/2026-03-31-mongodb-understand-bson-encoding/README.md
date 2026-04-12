# How to Understand BSON Encoding in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, BSON, Encoding, Data Type, Serialization

Description: Learn how BSON encoding works in MongoDB, the wire format for documents, how BSON types differ from JSON, and how to inspect raw BSON for debugging.

---

## What Is BSON?

BSON (Binary JSON) is the binary serialization format MongoDB uses to store documents on disk and transmit them over the wire. Unlike JSON (which is text-based), BSON is binary, supports additional data types, and includes byte-length prefixes that enable fast document traversal without parsing the entire document.

## BSON vs. JSON

| Feature | JSON | BSON |
|---------|------|------|
| Encoding | UTF-8 text | Binary |
| Data types | string, number, boolean, null, array, object | All JSON types + Date, ObjectId, Binary, Decimal128, etc. |
| Number precision | IEEE 754 double | int32, int64, double, Decimal128 |
| Field ordering | Unspecified | Preserved |
| Document size limit | None | 16 MB |

## BSON Document Structure

Every BSON document starts with a 4-byte little-endian int32 indicating the document's total size in bytes, followed by elements, ending with a null byte:

```text
[int32: total bytes] [element...] [0x00: terminator]

Each element:
[uint8: type] [cstring: field name] [value bytes]
```

## BSON Type Codes

Common BSON type codes used in the wire protocol:

```text
0x01 - Double (8 bytes, IEEE 754)
0x02 - String (int32 length + UTF-8 bytes + null)
0x03 - Document (embedded document)
0x04 - Array (document with "0", "1", "2"... keys)
0x05 - Binary (int32 length + subtype byte + bytes)
0x07 - ObjectId (12 bytes)
0x08 - Boolean (1 byte: 0x00=false, 0x01=true)
0x09 - UTC datetime (int64 milliseconds since epoch)
0x0A - Null
0x0B - Regex
0x10 - Int32 (4 bytes)
0x12 - Int64 (8 bytes)
0x13 - Decimal128 (16 bytes)
0xFF - MinKey
0x7F - MaxKey
```

## Inspecting BSON with bsondump

MongoDB ships with `bsondump` to convert `.bson` files to human-readable JSON:

```bash
bsondump /data/db/shop/orders.bson | head -5
```

Output:

```json
{"_id":{"$oid":"507f1f77bcf86cd799439011"},"status":"paid","total":{"$numberDouble":"149.99"}}
```

## BSON in Node.js

The `bson` npm package lets you encode and decode BSON manually:

```javascript
const { BSON, ObjectId, Long, Decimal128 } = require("bson");

// Encode a document to BSON bytes
const doc = {
  _id: new ObjectId(),
  name: "Wireless Headphones",
  price: Decimal128.fromString("149.99"),
  qty: 50,
  inStock: true,
  createdAt: new Date()
};

const bytes = BSON.serialize(doc);
console.log("BSON size:", bytes.byteLength, "bytes");

// Decode back
const decoded = BSON.deserialize(bytes);
console.log(decoded);
```

## BSON Size Considerations

You can calculate a document's BSON size before inserting it to avoid the 16 MB limit:

```javascript
const { BSON } = require("bson");

function checkDocumentSize(doc) {
  const bytes = BSON.serialize(doc);
  const sizeMB = bytes.byteLength / (1024 * 1024);
  if (sizeMB > 15) {
    throw new Error(`Document too large: ${sizeMB.toFixed(2)} MB`);
  }
  return sizeMB;
}
```

## ObjectId Anatomy

The 12-byte ObjectId encodes three pieces of information:

```text
Bytes 0-3:  Unix timestamp (seconds since epoch)
Bytes 4-8:  Random value unique to machine/process
Bytes 9-11: Incrementing counter (random start)
```

Extract the creation time from an ObjectId:

```javascript
const oid = new ObjectId("507f1f77bcf86cd799439011");
console.log("Created at:", oid.getTimestamp());
```

## Summary

BSON is MongoDB's binary document format that extends JSON with richer data types (Date, ObjectId, Int32, Int64, Decimal128, Binary), preserves field order, and enables efficient document traversal through embedded size fields. Understanding BSON helps you choose the right data types (Decimal128 for currency, Int64 for counters, Binary for blobs), estimate document sizes before hitting the 16 MB limit, and inspect raw data files with `bsondump` during debugging or recovery.
