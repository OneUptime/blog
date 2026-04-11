# Validation Summary: How to Implement Redis mTLS with Service Mesh

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Redis (TLS configuration)
- OpenSSL (certificate generation)
- cfssl (mentioned as alternative)
- Node.js with ioredis
- Python with redis-py
- Kubernetes (Secrets, Deployments, kubectl)
- mTLS / TLS 1.2 and 1.3

## Sources Consulted
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- OpenSSL man pages for genrsa, req, x509 commands
- ioredis TLS options documentation: https://github.com/redis/ioredis
- redis-py SSL documentation: https://redis-py.readthedocs.io/en/stable/examples/ssl_connection_examples.html
- Kubernetes Secret types documentation: https://kubernetes.io/docs/concepts/configuration/secret/#secret-types
- Kubernetes pod command/args specification: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Python ssl module documentation: https://docs.python.org/3/library/ssl.html

## Issues Found

### 1. Kubernetes Deployment command list format (Fixed)
**What was wrong:** In the Redis Deployment YAML, the `command` list combined flags and their values as single strings (e.g., `- --tls-port 6380`). In Kubernetes, each item in the `command` list is passed as a separate `argv` element without shell word-splitting. This means `"--tls-port 6380"` would be passed as one argument, which `redis-server` cannot parse correctly — it expects the flag name and value as separate arguments.

**What was changed:** Split each flag and its value into separate list items (e.g., `- --tls-port` followed by `- "6380"`).

**Why:** Kubernetes `command` and `args` lists do not invoke a shell, so each array element becomes a single `argv` entry. Redis-server's argument parser expects `--key` and `value` as separate arguments.

## Review Notes
- The `tls-ciphers` directive includes `ECDHE-ECDSA-AES256-GCM-SHA384`, which requires an ECDSA certificate. Since the tutorial generates RSA keys, only the `ECDHE-RSA-AES256-GCM-SHA384` cipher would actually be used. This is not an error (Redis silently skips inapplicable ciphers), but could be slightly confusing.
- The `tls-ciphers` setting only applies to TLS 1.2. For TLS 1.3 (also enabled via `tls-protocols`), Redis uses `tls-ciphersuites` which defaults to a secure set. This is correct behavior but worth noting.
- The Kubernetes Secret YAML uses `type: kubernetes.io/tls` with an additional `ca.crt` field. While Kubernetes allows extra data fields on TLS-type secrets, the standard fields are only `tls.crt` and `tls.key`. Using `type: Opaque` would be more conventional when including a CA cert, but this works as-is.
- The Node.js example uses top-level `await` with CommonJS `require()`. Top-level await requires ES modules. This is a common shorthand in blog code snippets and the intent is clear.
- The title mentions "Service Mesh" but the post focuses on native Redis mTLS rather than service mesh sidecar-based mTLS (e.g., Istio, Linkerd). The Kubernetes deployment section is related but doesn't cover service mesh integration specifically.
