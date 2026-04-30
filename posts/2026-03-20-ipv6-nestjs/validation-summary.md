# Validation Summary: How to Use IPv6 with NestJS

## Status
validated

## Post Type
Guide

## Technologies Covered
- NestJS
- Node.js
- IPv6
- Fastify
- Express
- TypeScript
- class-validator
- RxJS

## Sources Consulted
- NestJS custom decorators: https://docs.nestjs.com/custom-decorators
- NestJS validation: https://docs.nestjs.com/techniques/validation
- NestJS Fastify/performance guidance: https://docs.nestjs.com/techniques/performance
- Node.js `net` API: https://nodejs.org/api/net.html
- Express behind proxies: https://expressjs.com/en/guide/behind-proxies.html
- Fastify server reference: https://fastify.dev/docs/latest/Reference/Server/
- Fastify request reference: https://fastify.dev/docs/latest/Reference/Request/
- class-validator repository documentation: https://github.com/typestack/class-validator

## Issues Found
- The original client IP decorator manually trusted `X-Forwarded-For` and imported Express `Request`, which made the example adapter-specific and bypassed the normal proxy-trust behavior of Express and Fastify. I changed it to prefer `req.ip`, keep a `req.socket.remoteAddress` fallback, and added a short note about enabling `trust proxy` or `trustProxy` behind a reverse proxy.
- The interceptor and allow-list guard repeated Express-specific request handling. I changed both to reuse the shared `extractClientIP()` helper so the IPv6 normalization logic is consistent and the examples remain compatible with both Express and Fastify request objects.

## Review Notes
- Binding Nest to `'::'` is valid. Per the Node.js `net` documentation, listening on the unspecified IPv6 address may also accept IPv4 connections on many operating systems.
- Nest's Fastify docs explicitly warn that Express-specific recipes may not carry over unchanged when using `FastifyAdapter`. The updated request examples avoid that mismatch by relying on request properties available across both adapters.
- Nest's `ValidationPipe` uses both `class-validator` and `class-transformer` in real applications. The post's validation example is still correct, but readers need both packages installed when enabling `ValidationPipe`.
