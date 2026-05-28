# Validation Summary: How to Connect to Memorystore Memcached from a GKE Pod

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Memorystore for Memcached
- Google Kubernetes Engine
- Kubernetes ConfigMaps, Deployments, Services, and probes
- Google Cloud CLI
- kubectl
- Python
- Flask
- pymemcache
- Memcached Auto Discovery

## Sources Consulted
- Google Cloud Memorystore for Memcached: Connect to a Memcached instance: https://cloud.google.com/memorystore/docs/memcached/connect-memcached-instance
- Google Cloud Memorystore for Memcached: Networking: https://cloud.google.com/memorystore/docs/memcached/networking
- Google Cloud Memorystore for Memcached: Use the Auto Discovery service: https://cloud.google.com/memorystore/docs/memcached/use-auto-discovery
- Google Cloud Memorystore for Memcached: About the Auto Discovery service: https://docs.cloud.google.com/memorystore/docs/memcached/about-auto-discovery
- pymemcache HashClient API documentation: https://pymemcache.readthedocs.io/en/latest/apidoc/pymemcache.client.hash.html
- pymemcache Client API documentation: https://pymemcache.readthedocs.io/en/latest/apidoc/pymemcache.client.base.html
- pymemcache serde API documentation: https://pymemcache.readthedocs.io/en/latest/apidoc/pymemcache.serde.html
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The main Python example used pymemcache's deprecated `serializer` and `deserializer` constructor parameters. I changed it to the current `serde=serde.pickle_serde` API so the example uses the documented serializer/deserializer object interface.
- The auto-discovery example used `client.get("config cluster")`, which sends a normal Memcached `get` request instead of the documented `config get cluster` discovery command. I changed it to `client.raw_command("config get cluster", end_tokens="END\r\n")`.
- The auto-discovery parser treated every response line as a pipe-delimited node. I updated it to parse the documented response shape: header line, configuration version line, then a whitespace-separated node list with `node-ip|node-ip|node-port` entries.
- The auto-discovery example passed `serde.python_memcache_serializer` as the `serde` argument to `HashClient`, but `serde` expects an object implementing `serialize` and `deserialize`. I changed it to `serde=serde.pickle_serde`.
- The auto-discovery example used a host-only environment variable even though Google Cloud returns the discovery endpoint as `IP:port`. I changed it to parse `MEMCACHED_DISCOVERY_ENDPOINT` as `host:port`.

## Review Notes
- Google Cloud documents that GKE access to Memorystore for Memcached requires VPC-native/IP aliasing and the same region/network, which matches the post's core networking guidance.
- Google Cloud notes that Memcached node IP addresses and discovery endpoint IP addresses do not change. Updating the ConfigMap after scaling is still reasonable because scaling changes the node list.
- The local environment did not have `gcloud` or `kubectl` installed, so CLI flags were verified against official documentation rather than local `--help` output.
- Python and YAML snippets were syntax-checked locally after edits.
