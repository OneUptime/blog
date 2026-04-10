# Validation Summary: How to Set Up IBM Cloud Databases for Redis

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- IBM Cloud Databases for Redis
- IBM Cloud CLI (`ibmcloud`)
- IBM Cloud Databases CLI plugin (`cloud-databases`)
- Redis CLI (`redis-cli`)
- Node.js with ioredis
- Python with redis-py
- jq for JSON processing
- TLS/SSL certificate handling

## Sources Consulted
- IBM Cloud Databases for Redis provisioning documentation (ibm-cloud-docs/databases-for-redis)
- IBM Cloud CLI `ibmcloud resource service-key` output format (confirmed array output requiring `.[0]` in jq)
- IBM Cloud Databases CLI plugin command reference (`ibmcloud cdb deployment-groups-set`)
- ioredis documentation for TLS connection options
- redis-py documentation for SSL parameters
- Node.js CommonJS vs ES modules specification (top-level await behavior)

## Issues Found

1. **jq path missing array index for certificate extraction** (line 59): The `ibmcloud resource service-key <name> --output json` command returns a JSON array, not a single object. The jq path `.credentials.connection.rediss.certificate.certificate_base64` was missing the `.[0]` array index prefix. Fixed to `.[0].credentials.connection.rediss.certificate.certificate_base64`.

2. **Node.js top-level await with CommonJS require()** (lines 96-97): The code used `require()` (CommonJS) but also used top-level `await`, which is only valid in ES modules. This would cause a `SyntaxError` at runtime. Fixed by wrapping the `await` calls in an async IIFE `(async () => { ... })();`.

3. **Incorrect scaling CLI command name** (lines 130-137): The command `ibmcloud cdb deployment-groups-set-config` does not exist. The correct command is `ibmcloud cdb deployment-groups-set`. Additionally, the group identifier `member` is a positional argument, not a `--group` flag. Fixed from `deployment-groups-set-config my-redis --group member --memory 2048` to `deployment-groups-set my-redis member --memory 2048`.

## Review Notes
- The `members_memory_allocation_mb` provisioning parameter was verified as correct.
- The `rediss` (double 's') connection key in the credentials JSON is correct — IBM Cloud uses the `rediss://` URI scheme for TLS-enabled Redis.
- The Python example correctly uses `ssl=True` and `ssl_ca_certs` parameters, which are the current redis-py API.
- The `redis-cli --tls` flag is available in Redis 6+, which aligns with the post's stated Redis version support.
