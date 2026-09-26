# Validation Summary: How to Manage Cloudability Business Mappings as Code with REST and DSL Rules

## Status
validated

## Post Type
Technical guide with JSON configuration, a shell command, and Python REST API examples.

## Technologies Covered
- IBM Cloudability Business Mappings and Business Dimensions
- Cloudability REST API v3 and HTTP Basic authentication
- Business Mapping expression language: typed lookups, string literals, IN, equality, and regular-expression FIND
- Python 3, json, pathlib, and Requests
- Configuration versioning, deployment verification, and FinOps allocation

## Sources Consulted
- [IBM Business Mappings API](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-business-mappings-end-point): definition fields, account lookup, response examples, and creation endpoint.
- [IBM Business Mappings API, Standard documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-business-mappings-end-point): indexed retrieval and PUT examples.
- [IBM Business Mapping Expression Language](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=point-business-mapping-expression-language): quoted literals, typed lookups, and case-insensitive comparisons.
- [IBM Cloudability Business Mapping Expression Language, Federal documentation](https://www.ibm.com/docs/en/cloudability-gov/cloudability-federal/saas?topic=point-cloudability-business-mapping-expression-language): corroborating IN syntax, Java regular expressions, FIND search behavior, and anchors.
- [IBM Structure of a Business Mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=point-structure-business-mapping): ordered evaluation, first-match behavior, and default values.
- [IBM Getting started with Cloudability API V3](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3): regional hosts, API-key Basic authentication, permissions, and result envelopes.
- [IBM Apptio-Tools mapping updater](https://github.com/IBM/Apptio-Tools/blob/main/cloudability/business-mapping-update/update_mappings_from_csv.py): collection retrieval, result array, read-only check, returned index, PUT updates, POST creation, and payload construction.
- [IBM Business mapping](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=spend-business-mapping): processing at ingestion, current-month updates, and historical reprocessing.
- [Python json documentation](https://docs.python.org/3/library/json.html): serialization, parsing, and command-line validation.
- [Requests advanced usage](https://requests.readthedocs.io/en/latest/user/advanced/): session authentication and connect/read timeout tuples.
- [Requests quickstart](https://requests.readthedocs.io/en/latest/user/quickstart/): JSON request bodies, response decoding, and HTTP error handling.

## Issues Found
- The policy fixtures expected any item in another account to resolve to Unallocated. A payments or checkout service tag matches the first rule regardless of account and resolves to Commerce. Changed that fixture to specify a non-Commerce item in another account, so its stated Unallocated result follows from the ordered rules. No code changes were needed.

## Review Notes
- Parsed the JSON example successfully, ran the documented python3 -m json.tool command against it in a temporary directory, and checked both Python snippets with Python's AST parser. All checks passed.
- Confirmed the Business Dimension fields, quoted value expressions, API-key authentication, US v3 base URL, collection result shape, and indexed update route against official documentation and IBM's utility. No deprecated API usage was identified in these examples.
- Confirmed first-match ordering, case-insensitive text comparisons, IN syntax, and FIND semantics. Missing service tags do not satisfy the illustrated membership test; the account rule or default supplies the result.
- The code examples are workflow fragments. The pre-write comparison, review, read-back comparison, and reporting checks are prescribed in prose and must be implemented by the deployment job. The post correctly states that comparing before writing is not an atomic concurrency guarantee.
- Historical reprocessing is separate from accepting a mapping update. The documented rollback guidance correctly includes corrective reprocessing when previously processed data is affected.
- No authenticated Cloudability requests or production changes were performed. Runtime permissions, tenant-specific behavior, and processed reporting results require the sandbox validation described in the post.
- Direct retrieval of several IBM documentation pages returned HTTP 403; their relevant content was checked through search-indexed official IBM documentation. The links resolve to the intended indexed resources and were not treated as broken solely because of that retrieval restriction.
