# Validation Summary: How to Create Tool Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- JSON Schema
- Ajv and ajv-formats
- Node.js path, URL, net, and Buffer APIs
- AI agent tool validation and permission checks
- Security validation patterns for file access, command input, SQL, and HTTP requests

## Sources Consulted
- Ajv options documentation: https://ajv.js.org/options.html
- Ajv modifying data during validation documentation: https://ajv.js.org/guide/modifying-data.html
- Node.js path API documentation: https://nodejs.org/api/path.html
- Node.js net API documentation: https://nodejs.org/api/net.html
- Node.js Buffer API documentation: https://nodejs.org/api/buffer.html
- Node.js URL API documentation: https://nodejs.org/api/url.html
- RFC 1918 private IPv4 address allocation: https://datatracker.ietf.org/doc/html/rfc1918
- OWASP Server-Side Request Forgery Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

## Issues Found
- Removed an unused `JSONSchemaType` import from the Ajv example because the code did not use that type.
- Updated the Ajv initialization comment so it accurately describes the options being set instead of implying that the snippet explicitly enables strict mode.
- Updated the permission guard to enforce each agent's `allowedCategories` allowlist. Previously the configuration included `allowedCategories`, but permission checks only used the broad permission level mapping.
- Replaced string-prefix path permission checks with `path.resolve()` and `path.relative()` based checks so sibling paths with similar prefixes are not accidentally allowed.
- Integrated `runCustomValidators()` into the validation pipeline. Previously custom validators were defined and discussed, but the pipeline never called them.
- Corrected the SQL custom validator regexes for `DELETE` and `UPDATE` without `WHERE`. The original `UPDATE` regex would also match queries that did include a `WHERE` clause.
- Improved the HTTP private-network validator to use `net.isIP()` and cover the full RFC 1918 `172.16.0.0/12` range instead of only `172.16.*`, and to handle loopback, link-local, and bracketed IPv6 hostnames.
- Changed file content size validation from `content.length` to `Buffer.byteLength(content, 'utf8')` so the check measures bytes rather than UTF-16 code units.

## Review Notes
The article is technically sound after the fixes. The examples remain educational and would still need production hardening for DNS rebinding, symlink race conditions, comprehensive SQL parsing, distributed rate limiting, and centralized audit logging.
