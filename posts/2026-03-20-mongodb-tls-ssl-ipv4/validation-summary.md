# Validation Summary: How to Configure MongoDB TLS/SSL for IPv4 Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod, mongosh)
- TLS/SSL configuration in `mongod.conf`
- OpenSSL (CA and server certificate generation)
- PyMongo (Python MongoDB driver)
- Mongoose (Node.js MongoDB ODM)
- X.509 cluster authentication for replica sets

## Sources Consulted
- MongoDB Manual — TLS/SSL Configuration: https://www.mongodb.com/docs/manual/tutorial/configure-ssl/
- MongoDB Manual — `net.tls` configuration reference: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.tls
- MongoDB 4.2 Release Notes (introduction of `tls` options): https://www.mongodb.com/docs/manual/release-notes/4.2/
- MongoDB Connection String URI Format (TLS options): https://www.mongodb.com/docs/manual/reference/connection-string/
- PyMongo TLS docs: https://pymongo.readthedocs.io/en/stable/examples/tls.html
- Node.js MongoDB driver TLS options: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/tls/
- OpenSSL `req`, `x509`, and `genrsa` man pages

## Issues Found
- Introduction stated "MongoDB 4.0+ uses `tls` settings (replacing the deprecated `ssl` settings)". The `net.tls` options were actually introduced in MongoDB 4.2 (the `net.ssl` options were deprecated at that point but remained as aliases). Updated the text to "MongoDB 4.2+".

## Review Notes
- The `clusterAuthX509.attributes` configuration block under `net.tls` is valid only in MongoDB 8.0+. Earlier versions configure X.509 cluster auth via `security.clusterAuthMode: x509` (and optionally `setParameter: tlsX509ClusterAuthDNOverride`). The post doesn't claim a specific minimum version for that block, so it's correct for current MongoDB but worth noting for readers on older releases.
- The OpenSSL certificate generation flow is functional but minimal: it doesn't include `subjectAltName` (SAN) in the server certificate. Modern TLS clients (including the MongoDB drivers when strict hostname verification is on) generally require the server's IP/hostname to appear as a SAN, not just in the CN. With `tlsAllowInvalidCertificates=true` or `tlsAllowInvalidHostnames=true` this isn't enforced, which is why the example "works" — but in production a SAN should be added (e.g. via an OpenSSL config file with `subjectAltName = IP:10.0.0.5`). This is a common omission rather than an error in the post.
- The combined PEM file (`cat server.crt server.key > server.pem`) is the format MongoDB requires for `certificateKeyFile`. Correct.
- `db.serverStatus().transportSecurity` is a valid field in MongoDB 4.4+ that exposes TLS connection counters.
- `tls=true`, `tlsCAFile`, and `tlsAllowInvalidCertificates` are the current connection-string parameter names (the older `ssl=true`/`sslCAFile` are deprecated aliases).
- The pymongo `MongoClient` keyword arguments `tls=True` and `tlsCAFile="..."` are correct (PyMongo 3.9+).
- The Mongoose `tls`/`tlsCAFile` options are passed through to the Node.js MongoDB driver and are correct for current driver versions.
