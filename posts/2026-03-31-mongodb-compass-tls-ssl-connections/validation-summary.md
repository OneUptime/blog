# Validation Summary: How to Use MongoDB Compass with TLS/SSL Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod server)
- MongoDB Compass (GUI client)
- TLS/SSL certificate configuration
- OpenSSL (certificate generation)
- MongoDB Atlas

## Sources Consulted
- MongoDB mongod TLS Options documentation: https://www.mongodb.com/docs/manual/reference/program/mongod/#tls-options
- MongoDB Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Compass TLS/SSL documentation: https://www.mongodb.com/docs/compass/current/connect/advanced-connection-options/tls-ssl/
- OpenSSL man pages for genrsa, req, x509 commands

## Issues Found
1. **Invalid `--tlsAllowConnectionsWithoutCertificates false` syntax** (line 74): The `--tlsAllowConnectionsWithoutCertificates` flag is a boolean flag in mongod that does not accept a value argument. Passing `false` as an argument is invalid CLI syntax. To require client certificates (mutual TLS), you simply omit this flag — when `--tlsCAFile` is specified, mongod requires client certificates by default. Fixed by removing the invalid flag and adding an explanatory note about the default behavior.

## Review Notes
- The "TLS Connection Modes in Compass" section describes four conceptual modes. Compass doesn't label them exactly this way in its UI — it provides a TLS toggle and separate fields for CA, client cert, and client key. The descriptions are reasonable conceptual groupings but not exact UI labels.
- The Atlas connection string includes `?tls=true` which is technically redundant when using the `mongodb+srv://` scheme (SRV connections default to TLS). This is not incorrect, just redundant — and arguably clearer for readers.
- The `cat client.crt client.key > client.pem` approach is correct but readers should be aware that Compass also supports specifying client certificate and client private key as separate files in newer versions.
