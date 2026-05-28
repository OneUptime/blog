# Validation Summary: How to Create a Memorystore for Memcached Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Memorystore for Memcached
- Google Cloud CLI
- Private services access and Service Networking
- Memcached configuration parameters
- Python pymemcache
- Node.js memjs
- Cloud Monitoring

## Sources Consulted
- Google Cloud CLI reference for `gcloud memcache instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/memcache/instances/create
- Google Cloud CLI reference for `gcloud memcache instances update`: https://docs.cloud.google.com/sdk/gcloud/reference/memcache/instances/update
- Memorystore for Memcached supported versions: https://docs.cloud.google.com/memorystore/docs/memcached/supported-versions
- Memorystore for Memcached Auto Discovery overview: https://docs.cloud.google.com/memorystore/docs/memcached/about-auto-discovery
- Memorystore for Memcached scaling documentation: https://docs.cloud.google.com/memorystore/docs/memcached/scale-instances
- Memorystore for Memcached supported configurations: https://docs.cloud.google.com/memorystore/docs/memcached/supported-memcached-configurations
- Memorystore for Memcached monitoring documentation: https://docs.cloud.google.com/memorystore/docs/memcached/monitor-instances
- Google Cloud private services access documentation: https://docs.cloud.google.com/vpc/docs/configure-private-services-access
- pymemcache HashClient API documentation: https://pymemcache.readthedocs.io/en/latest/apidoc/pymemcache.client.hash.html
- memjs client documentation: https://memjs.netlify.app/

## Issues Found
- The `--memcached-version` examples used `MEMCACHE_1_6_15`, but current `gcloud memcache` documentation accepts values such as `1.6.15`. Updated the examples and parameter description.
- The API enablement prerequisite omitted the Service Networking API needed for the private services access setup. Added `servicenetworking.googleapis.com` to the enable command.
- The `--node-cpu` range was described as `1 to 32`, but Google Cloud documents valid values as `1` or even numbers from `2` to `32`. Corrected the range.
- The `max-item-size` description said the maximum was 5 MB. Memorystore for Memcached supports up to 128 MiB, with divisibility and minimum constraints. Updated the description.
- The post implied Memcached distributes data across nodes natively and that clients automatically use auto-discovery. Clarified that distribution is client-side and that auto-discovery requires a compatible client or custom discovery logic.
- The scaling section implied existing cached data is redistributed when adding nodes. Google Cloud documents that Memorystore does not rebalance cached data automatically. Updated the explanation.
- The Redis comparison implied Memcached does not have per-key TTL management. Memcached supports item expiration, so the Redis comparison was narrowed to advanced expiration commands and key introspection.

## Review Notes
The Python and Node.js examples use manually supplied node lists rather than the Memorystore discovery endpoint. This is technically valid, but production applications that scale node counts should use a client with compatible auto-discovery support or implement discovery endpoint polling.
