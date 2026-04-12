# How to Validate Phone Numbers in MongoDB Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, Phone Number, Regex, Data Quality

Description: Learn how to validate phone number formats in MongoDB using $jsonSchema pattern constraints to enforce E.164 and regional phone number standards.

---

## Choosing a Phone Number Format

Phone number validation in databases typically targets one of two standards:

- **E.164**: International format (`+14155552671`). Best for applications with international users.
- **NANP**: North American format (`(415) 555-2671` or `415-555-2671`). For US/Canada-only apps.

Storing in E.164 is strongly recommended - it is unambiguous, parseable, and compatible with SMS/telephony APIs.

## E.164 Pattern Validation

```javascript
db.createCollection("contacts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["phone"],
      properties: {
        phone: {
          bsonType: "string",
          pattern: "^\\+[1-9]\\d{6,14}$",
          description: "Must be a valid E.164 phone number (e.g., +14155552671)"
        }
      }
    }
  },
  validationAction: "error",
  validationLevel: "strict"
});
```

The pattern `^\+[1-9]\d{6,14}$` matches:
- Leading `+`
- Country code starting digit (no leading zero)
- Followed by 6 to 14 more digits (7 to 15 digits total, matching the E.164 max of 15)

## Testing E.164 Validation

```javascript
// Valid
db.contacts.insertOne({ phone: "+14155552671" });   // US
db.contacts.insertOne({ phone: "+442071234567" });  // UK
db.contacts.insertOne({ phone: "+919876543210" });  // India

// Invalid - rejected
db.contacts.insertOne({ phone: "4155552671" });     // missing +
db.contacts.insertOne({ phone: "+0123456789" });    // leading 0 after +
db.contacts.insertOne({ phone: "+1" });             // too short
```

## Supporting Optional International Prefix

Some systems accept phone numbers with or without the `+` country code prefix. Allow both with an alternation pattern:

```javascript
phone: {
  bsonType: "string",
  pattern: "^(\\+[1-9]\\d{6,14}|0[1-9]\\d{8,12})$",
  description: "E.164 or local format starting with 0"
}
```

## US-Specific NANP Pattern

For US/Canada-only applications:

```javascript
phone: {
  bsonType: "string",
  pattern: "^(\\+1)?[2-9]\\d{2}[2-9]\\d{2}\\d{4}$",
  description: "US/Canada phone number in E.164 or 10-digit format"
}
```

This accepts `+12125551234` and `2125551234` but rejects numbers starting with 0 or 1 in the area code.

## Handling Multiple Phone Numbers

A contact may have several phone numbers with types:

```javascript
db.createCollection("customers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        phones: {
          bsonType: "array",
          maxItems: 5,
          items: {
            bsonType: "object",
            required: ["type", "number"],
            properties: {
              type: {
                bsonType: "string",
                enum: ["mobile", "home", "work", "fax"]
              },
              number: {
                bsonType: "string",
                pattern: "^\\+[1-9]\\d{6,14}$"
              },
              primary: {
                bsonType: "bool"
              }
            }
          }
        }
      }
    }
  }
});
```

## Normalizing Before Insert

Schema validation catches bad formats, but normalization before insertion makes validation more flexible:

```javascript
const { parsePhoneNumber } = require("libphonenumber-js");

function normalizePhone(input, defaultCountry = "US") {
  const parsed = parsePhoneNumber(input, defaultCountry);
  if (!parsed.isValid()) throw new Error(`Invalid phone: ${input}`);
  return parsed.format("E.164");  // returns "+14155552671"
}

// Normalize then insert
const normalized = normalizePhone("(415) 555-2671");
await db.collection("contacts").insertOne({ phone: normalized });
```

Combining `libphonenumber-js` normalization with MongoDB schema validation gives you both user-friendly input handling and strict database-level enforcement.

## Viewing Existing Validation Rules

```javascript
const info = db.getCollectionInfos({ name: "contacts" });
printjson(info[0].options.validator);
```

## Summary

Validating phone numbers in MongoDB schema validation is best done with E.164 format using the pattern `^\+[1-9]\d{6,14}$`. This standard format is unambiguous and works with telephony APIs. Normalize user input with a library like `libphonenumber-js` before insertion to handle varied formats, then let MongoDB's `$jsonSchema` validator enforce the canonical E.164 format as a data quality guarantee at the database layer.
