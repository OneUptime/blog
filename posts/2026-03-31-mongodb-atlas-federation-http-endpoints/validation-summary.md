# Validation Summary: How to Query HTTP Endpoints in Atlas Data Federation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Data Federation
- HTTP/HTTPS data stores (federated database instances)
- MongoDB Query Language (MQL) aggregation pipelines
- `$lookup` cross-data-source joins
- REST API integration

## Sources Consulted
- MongoDB Atlas Data Federation documentation: Define Data Stores for a Federated Database Instance (https://www.mongodb.com/docs/atlas/data-federation/config/config-data-stores/)
- MongoDB Atlas Data Federation HTTP store configuration reference (https://www.mongodb.com/docs/atlas/data-federation/config/config-http-store/)
- MongoDB Atlas Data Federation supported operations documentation
- MongoDB `$lookup` aggregation stage documentation (https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/)

## Issues Found
1. **Fabricated authentication headers configuration (critical):** The "Handling Authentication" section described a `headers` field on the HTTP store with `name`/`value` pairs and a `{secret:api_bearer_token}` syntax for referencing Atlas secrets. This is incorrect — the official MongoDB documentation explicitly states that HTTP data stores do not support URLs that require authentication. The `headers` field does not exist in the HTTP store configuration schema. The section was rewritten to accurately describe this limitation and suggest alternative approaches (reverse proxy with IP allowlisting, or pre-fetching data into S3/Atlas).

## Review Notes
- The storage configuration structure (`databases`, `collections`, `dataSources`, `stores`) is accurate for Atlas Data Federation.
- The `provider: "http"`, `urls`, `defaultFormat: ".json"`, and `allowInsecure` fields are all valid and correctly used.
- The aggregation pipeline examples use valid MQL syntax, including `$project`, `$addFields`, `$lookup` with sub-pipeline, `$unwind`, and `$multiply`.
- Cross-data-source `$lookup` between HTTP and Atlas cluster collections is a documented and supported feature of Data Federation.
- The `$lookup` example uses the simple `from: "products"` syntax; for collections in a different database, the object syntax `{db: "<db>", coll: "<coll>"}` would be needed. This is a minor omission but acceptable for a simplified example.
- The limitations section accurately notes that HTTP data sources are for small responses, don't support caching, and fetch fresh on each query.
