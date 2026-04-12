# Validation Summary: How to Validate Phone Numbers in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation with `$jsonSchema`)
- Regular expressions (E.164 and NANP patterns)
- libphonenumber-js (phone number parsing and normalization library)
- Node.js / JavaScript

## Sources Consulted
- ITU-T E.164 specification — max 15 digits for international phone numbers
- MongoDB documentation on `$jsonSchema` validator and `pattern` keyword (https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/)
- MongoDB documentation on `db.createCollection()` with `validator`, `validationAction`, and `validationLevel` options
- MongoDB documentation on `db.getCollectionInfos()` method
- NANP (North American Numbering Plan) format: NPA-NXX-XXXX where N=2-9, X=0-9
- libphonenumber-js documentation — `parsePhoneNumber()`, `.isValid()`, `.format("E.164")` API

## Issues Found
- **Incorrect digit count in regex explanation**: The description of the E.164 regex `^\+[1-9]\d{6,14}$` stated "6 to 14 digits total (E.164 max is 15 digits including country code)." This was incorrect because `[1-9]` matches 1 digit and `\d{6,14}` matches 6-14 more digits, giving a total of 7 to 15 digits after the `+`. Fixed the explanation to read "Followed by 6 to 14 more digits (7 to 15 digits total, matching the E.164 max of 15)."

## Review Notes
- The NANP regex also restricts the first digit of the exchange (central office) code to 2-9, but the post only mentions the area code restriction. This is not wrong, just incomplete — acceptable for a tutorial.
- NANP has additional restrictions beyond this regex (e.g., N11 service codes, reserved area codes), but the regex is a reasonable general-purpose validation pattern.
- The `parsePhoneNumber()` function from libphonenumber-js can throw on completely unparseable input; the blog's error handling only checks `.isValid()` after parsing. This is a minor simplification acceptable for a tutorial context.
- All MongoDB `$jsonSchema` keywords used (`bsonType`, `pattern`, `required`, `enum`, `maxItems`, `items`, `description`) are correct and current.
