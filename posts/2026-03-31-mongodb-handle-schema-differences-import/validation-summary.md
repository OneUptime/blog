# Validation Summary: How to Handle Schema Differences During MongoDB Data Import

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Python
- PyMongo (MongoDB Python driver)
- datetime (Python standard library)

## Sources Consulted
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.insert_many
- Python datetime.strptime format codes: https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes
- PyMongo MongoClient API: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html

## Issues Found
No technical issues found.

## Review Notes
- The `apply_defaults` function assigns mutable default values (e.g., `{}` for `preferences`) by reference. In this specific pipeline — where documents are serialized to BSON via `insert_many` without intermediate mutation — this is safe. In a more general context, using `copy.deepcopy(default_value)` would be more defensive.
- The `unflatten` function only splits on the first separator (`maxsplit=1`), so deeply nested flat keys like `"address_city_name"` would produce `{"address": {"city_name": value}}` rather than `{"address": {"city": {"name": value}}}`. This is a design choice, not a bug, but worth noting for readers who need deeper nesting — a recursive approach would be needed.
- The `not doc.get(field)` check in `validate_document` treats all falsy values (0, empty string, False) as missing. For the fields checked (`email`, `createdAt`), this is appropriate since those should never be falsy. Readers applying this pattern to numeric or boolean fields should use an explicit `is None` check instead.
- All PyMongo APIs used (`MongoClient`, `insert_many` with `ordered=False`) are current and non-deprecated.
