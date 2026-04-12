# How to Validate URLs in MongoDB Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Validation, URL, Regex, Data Quality

Description: Learn how to validate URL formats in MongoDB using $jsonSchema pattern constraints to enforce valid HTTP/HTTPS URL structure in document fields.

---

## Why Validate URLs at the Database Level?

URL fields are commonly misused - users paste in email addresses, plain domain names, or paths without a scheme. Enforcing URL format at the database level catches these issues before they cause problems in downstream systems that process or fetch the URLs.

## Basic HTTP/HTTPS URL Validation

```javascript
db.createCollection("links", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["url"],
      properties: {
        url: {
          bsonType: "string",
          pattern: "^https?://[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?)*\\.[a-zA-Z]{2,}(/.*)?$",
          description: "Must be a valid HTTP or HTTPS URL"
        }
      }
    }
  },
  validationAction: "error",
  validationLevel: "strict"
});
```

## Testing URL Validation

```javascript
// Valid - succeeds
db.links.insertOne({ url: "https://example.com" });
db.links.insertOne({ url: "https://www.example.com/path?q=1#section" });
db.links.insertOne({ url: "http://api.example.co.uk/v1/users" });

// Invalid - rejected
db.links.insertOne({ url: "example.com" });             // missing scheme
db.links.insertOne({ url: "ftp://example.com" });       // non-http scheme
db.links.insertOne({ url: "not a url at all" });        // invalid
db.links.insertOne({ url: "https://" });                // missing host
```

## Accepting Additional Schemes

If your application also handles `ws://`, `wss://`, or `ftp://` URLs, broaden the scheme pattern:

```javascript
url: {
  bsonType: "string",
  pattern: "^(https?|wss?|ftp)://[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?)*",
  description: "Must be a valid URL with http, https, ws, wss, or ftp scheme"
}
```

## Validating URL Fields in a Content Collection

A realistic content schema combining URL fields with other validations:

```javascript
db.runCommand({
  collMod: "articles",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "slug", "authorId"],
      properties: {
        title: {
          bsonType: "string",
          minLength: 5,
          maxLength: 200
        },
        canonicalUrl: {
          bsonType: "string",
          pattern: "^https://[a-zA-Z0-9][a-zA-Z0-9\\-\\.]+\\.[a-zA-Z]{2,}(/.*)?$",
          description: "Must be an HTTPS URL"
        },
        imageUrl: {
          bsonType: "string",
          pattern: "^https?://[a-zA-Z0-9][a-zA-Z0-9\\-\\.]+\\.[a-zA-Z]{2,}(/.*)?\\.(jpg|jpeg|png|gif|webp|svg)(\\?.*)?$",
          description: "Must be a URL pointing to an image file"
        },
        externalLinks: {
          bsonType: "array",
          items: {
            bsonType: "string",
            pattern: "^https?://"
          }
        }
      }
    }
  }
});
```

The `imageUrl` pattern adds an extension check for common image formats.

## URL Normalization Before Insert

Schema validation enforces format, but normalization in the application prevents subtle duplicates (trailing slashes, case in scheme):

```javascript
const { URL } = require("url");

function normalizeUrl(input) {
  const parsed = new URL(input);  // throws on invalid URL
  return parsed.toString().replace(/\/$/, "");  // remove trailing slash
}

try {
  const normalized = normalizeUrl(rawInput);
  await db.collection("links").insertOne({ url: normalized, createdAt: new Date() });
} catch (err) {
  if (err instanceof TypeError) throw new Error("Invalid URL");
  throw err;
}
```

## Handling Optional URL Fields

Make the URL field optional but still validate it when present using `anyOf`:

```javascript
website: {
  anyOf: [
    { bsonType: "null" },
    {
      bsonType: "string",
      pattern: "^https?://[a-zA-Z0-9][a-zA-Z0-9\\-\\.]+\\.[a-zA-Z]{2,}(/.*)?$"
    }
  ],
  description: "Optional HTTP or HTTPS URL for the company website"
}
```

## Summary

MongoDB URL validation uses `$jsonSchema` with a `pattern` constraint requiring `http://` or `https://` scheme followed by a valid domain structure. Set `validationAction: "error"` and `validationLevel: "strict"` for new collections. Combine database-level pattern validation with application-level URL normalization using the built-in `URL` constructor to catch semantic errors before they reach MongoDB's regex check.
