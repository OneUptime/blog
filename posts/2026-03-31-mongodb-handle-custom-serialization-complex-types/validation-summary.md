# Validation Summary: How to Handle Custom Serialization for Complex Types in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- BSON serialization
- Node.js MongoDB driver (js-bson `toBSON()`)
- PyMongo (`TypeEncoder`, `TypeDecoder`, `TypeRegistry`, `CodecOptions`)
- Java MongoDB driver (`Codec<T>`, `CodecRegistry`)
- Python enums with MongoDB
- JavaScript frozen objects as enums

## Sources Consulted
- MongoDB Node.js driver BSON serialization documentation (js-bson `toBSON()` support)
- PyMongo `bson.codec_options` API documentation — `TypeRegistry`, `TypeEncoder`, `TypeDecoder`, `CodecOptions` class signatures
- MongoDB Java driver `org.bson.codecs.Codec` interface documentation
- MongoDB Java driver `CodecRegistries` and `MongoClientSettings.getDefaultCodecRegistry()` API

## Issues Found

1. **Node.js section title referenced non-existent `fromBSON` hook**: The section was titled "Custom toBSON and fromBSON" but the MongoDB Node.js driver has no `fromBSON()` deserialization hook. The code correctly uses a manual `fromDocument()` static method. Fixed the title to "Custom toBSON".

2. **Python `TypeRegistry` used invalid parameter names**: The original code used `type_encoders=` which is not a valid parameter. The correct parameter is `type_codecs`, which accepts a list of `TypeEncoder`, `TypeDecoder`, or `TypeCodec` instances.

3. **Python `DecimalDecoder` was broken dead code**: The `DecimalDecoder` class had `bson_type = type(None)` with a workaround comment and was never passed to the `TypeRegistry`. The code relied on a `fallback_decoder` parameter which does not exist on `TypeRegistry` (only `fallback_encoder` exists). Fixed by setting `bson_type = Decimal128` and including both the encoder and decoder in `TypeRegistry([DecimalEncoder(), DecimalDecoder()])`.

4. **Python section lacked proper decoding**: Without a working `TypeDecoder`, reading documents back would return `Decimal128` objects, not Python `Decimal` — contradicting the `# <class 'decimal.Decimal'>` comment. The fix ensures round-trip serialization works correctly.

5. **Summary paragraph referenced "fallback decoders"**: Updated to reference `TypeEncoder` and `TypeDecoder` classes, which is what the corrected code actually uses.

## Review Notes
- The Java `MoneyCodec` implementation is correct and follows the standard `Codec<T>` pattern. The decode loop properly handles unknown fields with `skipValue()`.
- The Node.js `toBSON()` approach is still supported in driver v6.x but only covers serialization — the post correctly notes that deserialization requires manual mapping.
- The Python enum example using `class OrderStatus(str, Enum)` works because PyMongo serializes `str` subclass instances as BSON strings.
- The `Decimal128` import was moved to the module level in the Python section for clarity and because it is needed for the `DecimalDecoder.bson_type` class attribute.
