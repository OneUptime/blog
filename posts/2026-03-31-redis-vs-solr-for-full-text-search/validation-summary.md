# Validation Summary: Redis vs Solr for Full-Text Search

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- RediSearch (Redis Stack)
- Apache Solr
- Apache Lucene
- redis-py (Python Redis client)
- pysolr (Python Solr client)
- Redis CLI (FT.CREATE, FT.SEARCH, FT.AGGREGATE, HSET)
- SolrCloud / ZooKeeper

## Sources Consulted
- RediSearch command reference: https://redis.io/docs/latest/commands/?group=search
- RediSearch FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- RediSearch FT.SEARCH documentation: https://redis.io/docs/latest/commands/ft.search/
- RediSearch FT.AGGREGATE documentation: https://redis.io/docs/latest/commands/ft.aggregate/
- redis-py search module documentation: https://redis-py.readthedocs.io/en/stable/redismodules.html
- Apache Solr Reference Guide (schema fields): https://solr.apache.org/guide/solr/latest/indexing-guide/fields.html
- Apache Solr Update Request Handlers: https://solr.apache.org/guide/solr/latest/indexing-guide/indexing-with-update-handlers.html
- Apache Solr Faceting: https://solr.apache.org/guide/solr/latest/query-guide/faceting.html
- pysolr documentation: https://github.com/django-haystack/pysolr

## Issues Found
No technical issues found.

## Review Notes
- The comparison table latency figures (RediSearch < 1 ms, Solr 5-50 ms) are reasonable ballpark numbers but will vary significantly based on hardware, dataset size, query complexity, and Solr commit strategy. They are fair for a general comparison.
- The geospatial row mentions "GEODIST" for RediSearch. While not wrong, RediSearch's native geo support uses GEO field types in schemas and geo filter syntax (`@geo:[lon lat radius unit]`), whereas `GEODIST` is a separate Redis command for sorted sets. This is a minor imprecision but not an error in the comparison context.
- The post correctly identifies RediSearch as part of Redis Stack. Note that Redis changed its licensing in 2024 to dual RSALv2/SSPL, which may be relevant for readers evaluating these options.
- SolrCloud's ZooKeeper dependency is correctly noted. While Solr 9+ has explored reducing ZooKeeper coupling, it remains the standard coordination layer.
