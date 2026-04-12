# Validation Summary: How to Work with Extended JSON in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Extended JSON v1 and v2 (Canonical and Relaxed modes)
- BSON type system
- mongoexport / mongoimport CLI tools
- Node.js `bson` npm package (`EJSON`)
- Python PyMongo `bson.json_util`
- Express.js (REST API example)

## Sources Consulted
- MongoDB Extended JSON (v2) documentation: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- MongoDB Extended JSON (v1) documentation: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json-v1/
- mongoexport documentation: https://www.mongodb.com/docs/database-tools/mongoexport/
- mongoimport documentation: https://www.mongodb.com/docs/database-tools/mongoimport/
- bson npm package (EJSON API): https://www.npmjs.com/package/bson
- PyMongo json_util documentation: https://pymongo.readthedocs.io/en/stable/api/bson/json_util.html
- JSON specification (RFC 8259)

## Issues Found
1. **mongoimport `--jsonArray` flag mismatch**: The `mongoexport` command did not use `--jsonArray`, so it outputs line-delimited JSON (one document per line). However, the `mongoimport` command included `--jsonArray`, which expects the input to be a JSON array. These are incompatible — importing a line-delimited file with `--jsonArray` would fail. **Fix**: Removed `--jsonArray` from the `mongoimport` command so both commands use the default line-delimited JSON format.

## Review Notes
- The Extended JSON v1 date example shows `{"$date": 1711843200000}` (raw number). The standard v1 "strict mode" representation used ISO-8601 strings `{"$date": "<ISO-string>"}`, while the raw number form was a "shell mode" variant. The shown format was commonly encountered in practice, so this is acceptable but could be more precise.
- The Express.js REST API example omits boilerplate setup (`const app = express()`, `ObjectId` import, `db` initialization). This is standard blog convention and not an error.
- The timestamp `1711843200000` correctly corresponds to `2024-03-31T00:00:00Z` — verified.
- All EJSON and json_util API usage is correct for current versions of the bson npm package and PyMongo.
- The `EJSON.stringify` options parameter `{ relaxed: true }` is explicitly specified in the REST API example; note that in bson v4.0+, `relaxed: true` is actually the default, so this is redundant but not wrong — it improves clarity.
