# Validation Summary: MongoDB vs CouchDB: Document Database Comparison

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- MongoDB (BSON documents, replica sets, aggregation pipeline, sharding)
- Apache CouchDB (MVCC, multi-master replication, Mango queries, MapReduce views)
- PouchDB (browser-side offline sync with CouchDB)
- Couchbase (mentioned in summary as related product)

## Sources Consulted
- Apache CouchDB official documentation — https://docs.couchdb.org/en/stable/
- CouchDB 2.0 clustering documentation — https://docs.couchdb.org/en/stable/cluster/index.html
- MongoDB official documentation — https://www.mongodb.com/docs/manual/
- MongoDB replica set documentation — https://www.mongodb.com/docs/manual/replication/
- MongoDB sharding documentation — https://www.mongodb.com/docs/manual/sharding/
- PouchDB API documentation — https://pouchdb.com/api.html
- CouchDB Mango query documentation — https://docs.couchdb.org/en/stable/api/database/find.html

## Issues Found
- **CouchDB horizontal scaling description was incorrect.** The Performance and Scale table listed CouchDB's horizontal scaling as "Federation + sharding (Couchbase)". Couchbase is a separate database product, not CouchDB's scaling mechanism. Apache CouchDB 2.0+ introduced its own built-in clustering with automatic sharding across nodes. Changed to "Clustering with sharding (built-in since 2.0)".

## Review Notes
- The summary refers to Couchbase as CouchDB's "commercial sibling." While they share some historical heritage (CouchOne, a CouchDB company, merged with Membase to form Couchbase Inc. in 2011), Couchbase Server is architecturally a different database with its own query language (N1QL) and storage engine. The characterization is informal but not strictly wrong — just imprecise.
- The MongoDB HTTP API claim ("no native HTTP API") is correct for the core database. MongoDB Atlas does offer a Data API for HTTP access, but that is a cloud-platform feature, not part of the core database server.
- The CouchDB MapReduce view example uses an arrow function in the forEach callback. This works on CouchDB 3.x builds that ship with SpiderMonkey 60+ or QuickJS, but may fail on older CouchDB installations using SpiderMonkey 1.8.5. For maximum compatibility, a traditional `function` expression could be used instead.
- The CouchDB Mango query syntax and PouchDB sync examples are correct and follow current API conventions.
