# Validation Summary: How to Use IPv6 with Fastify

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fastify
- Node.js
- IPv6
- HTTP
- JSON Schema
- Ajv

## Sources Consulted
- Fastify Server reference: https://fastify.dev/docs/latest/Reference/Server/
- Fastify Request reference: https://fastify.dev/docs/latest/Reference/Request/
- Fastify Validation and Serialization reference: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/
- Fastify Decorators reference: https://fastify.dev/docs/latest/Reference/Decorators/
- Fastify Logging reference: https://fastify.dev/docs/latest/Reference/Logging/
- Node.js `node:net` API: https://nodejs.org/api/net.html
- ajv-formats README: https://github.com/ajv-validator/ajv-formats
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981

## Issues Found
- The IPv6 rate-limiting example derived a `/64` bucket key by splitting the textual address on `:`, which breaks for compressed IPv6 forms such as `2001:db8::1` and can generate invalid keys. I updated the snippet to validate IPv6 with Node's `node:net` API, expand compressed IPv6 text to eight hextets, and then derive the first 64 bits correctly before appending `::/64`.

## Review Notes
- Binding Fastify to `host: '::'` is correct, but on many operating systems it may also accept IPv4 connections unless `ipv6Only: true` is set.
- `trustProxy: true` is valid and enables `X-Forwarded-*` handling, but in production it is usually better to scope trust to known proxy hops or networks rather than trust every upstream.
