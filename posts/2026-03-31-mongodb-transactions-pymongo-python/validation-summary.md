# Validation Summary: How to Use Transactions with PyMongo in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.0+ replica sets, 4.2+ sharded clusters)
- PyMongo (3.7+)
- Python

## Sources Consulted
- PyMongo official documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html
- PyMongo collection API docs: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html
- PyMongo errors docs: https://pymongo.readthedocs.io/en/stable/api/pymongo/errors.html
- PyMongo read_preferences docs: https://pymongo.readthedocs.io/en/stable/api/pymongo/read_preferences.html
- PyMongo GitHub source (`pymongo/__init__.py`): https://github.com/mongodb/mongo-python-driver
- MongoDB Transactions docs: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Sharded Cluster Transactions: https://www.mongodb.com/docs/manual/core/transactions-sharded-clusters/
- MongoDB Production Considerations for Transactions: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/

## Issues Found
1. **Incorrect MongoDB version claim for sharded clusters**: The post stated "Transactions require MongoDB 4.0+ running as a replica set or sharded cluster." MongoDB 4.0 only supports transactions on replica sets; sharded cluster transactions require MongoDB 4.2+. Fixed to: "Transactions require MongoDB 4.0+ for replica sets or MongoDB 4.2+ for sharded clusters."

2. **`ReadConcern` import from wrong module**: The post used `from pymongo import ReadConcern, WriteConcern`. While `WriteConcern` is exported at PyMongo's top level, `ReadConcern` is not — it must be imported from `pymongo.read_concern`. Fixed to separate imports: `from pymongo import WriteConcern` and `from pymongo.read_concern import ReadConcern`.

3. **Non-idiomatic `return_document` parameter**: The post used `return_document=True` in `find_one_and_update`. While this technically works because `ReturnDocument.AFTER` is defined as `True`, it is not the documented API and is fragile. Fixed to use `return_document=ReturnDocument.AFTER` with the proper `from pymongo import ReturnDocument` import.

## Review Notes
- The manual retry pattern in "Retry Pattern for Transient Errors" only handles `TransientTransactionError` but not `UnknownTransactionCommitResult`. This is acceptable since the section is specifically scoped to transient errors and the post correctly recommends `with_transaction` (which handles both) as the preferred approach.
- The minimum PyMongo version `>=3.7` is correct for the `with_transaction` callback API, though PyMongo 4.x is the current major version. The pip install command will install the latest version anyway.
