# Validation Summary: How to Use SRV DNS Records with MongoDB Connection Strings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (connection strings, `mongodb+srv://` URI scheme)
- DNS SRV and TXT records
- MongoDB Atlas
- Node.js MongoDB driver (`mongodb` package)
- PyMongo (Python MongoDB driver)
- `dig` CLI tool for DNS lookups

## Sources Consulted
- MongoDB Connection String URI Format documentation: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB DNS Seed List Connection Format specification: https://www.mongodb.com/docs/manual/reference/connection-string/#dns-seed-list-connection-format
- MongoDB SRV connection string spec (Initial DNS Seedlist Discovery): https://github.com/mongodb/specifications/blob/master/source/initial-dns-seedlist-discovery/initial-dns-seedlist-discovery.md
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/
- RFC 2782 (DNS SRV records): https://www.rfc-editor.org/rfc/rfc2782

## Issues Found
No technical issues found.

## Review Notes
- The Node.js example uses `require()` (CommonJS) with top-level `await`, which would require wrapping in an async function in a real CommonJS module. This is standard practice for blog post snippets and does not warrant a change.
- The TXT record options shown (`authSource` and `replicaSet`) are correct — MongoDB only allows `authSource`, `replicaSet`, and `loadBalanced` as TXT record options.
- PyMongo 4.0+ includes `dnspython` as a required dependency (installed automatically), so no separate install note is needed for current versions.
- The claim that `mongodb+srv://` automatically enables TLS is correct — the SRV URI scheme sets `tls=true` by default.
- The DNS record examples correctly show SRV targets within the same parent domain as the SRV hostname, which is a MongoDB requirement for SRV connection strings.
