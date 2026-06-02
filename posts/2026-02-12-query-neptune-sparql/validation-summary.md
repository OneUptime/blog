# Validation Summary: How to Query Neptune with SPARQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Neptune
- SPARQL 1.1
- RDF and Turtle
- Neptune bulk loader
- SPARQLWrapper for Python
- curl HTTP requests

## Sources Consulted
- Amazon Neptune: Accessing the Neptune graph with SPARQL - https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-sparql.html
- Amazon Neptune: SPARQL HTTP API - https://docs.aws.amazon.com/neptune/latest/userguide/sparql-api-reference.html
- Amazon Neptune: Using the HTTP REST endpoint to connect to a Neptune DB instance - https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-sparql-http-rest.html
- Amazon Neptune: RDF load data formats - https://docs.aws.amazon.com/neptune/latest/userguide/bulk-load-tutorial-format-rdf.html
- Amazon Neptune: Neptune Loader Command - https://docs.aws.amazon.com/neptune/latest/userguide/load-api-reference-load.html
- Amazon Neptune: SPARQL standards compliance - https://docs.aws.amazon.com/neptune/latest/userguide/feature-sparql-compliance.html
- Amazon Neptune: SPARQL query hints - https://docs.aws.amazon.com/neptune/latest/userguide/sparql-query-hints.html
- Amazon Neptune: SPARQL federated queries using SERVICE - https://docs.aws.amazon.com/neptune/latest/userguide/sparql-service.html
- W3C: SPARQL 1.1 Query Language - https://www.w3.org/TR/sparql11-query/
- SPARQLWrapper documentation - https://sparqlwrapper.readthedocs.io/en/latest/SPARQLWrapper.Wrapper.html

## Issues Found
- The OPTIONAL example said Charlie would have a null company value. In SPARQL results, an OPTIONAL variable that does not match is unbound, and in JSON results the binding is omitted rather than represented as a null value. Changed the wording to say the company value is unbound.
- The aggregation section said SPARQL supports the same aggregation functions expected from SQL. That was too broad for SPARQL 1.1. Changed it to refer to common functions such as `COUNT` and `AVG`, matching the examples shown.
- The performance section implied Neptune evaluates triple patterns in written order. Neptune can automatically reorder joins, and its `joinOrder` query hint is the documented way to force evaluation order. Changed the advice to prefer direct, selective patterns and added the `joinOrder` caveat.
- The RDF identifier wording used only URI terminology. SPARQL 1.1 uses IRIs, so the wording now says IRIs and notes that they are often written as URIs.

## Review Notes
The post's curl examples, loader request fields, RDF formats, SPARQL query/update examples, and Python SPARQLWrapper usage are consistent with current official documentation. Neptune clusters can expose RDF/SPARQL and property-graph APIs, but RDF data and property-graph data are separate and cannot be queried across models with the wrong language.
