# Validation Summary: How to Configure Dapr with Oracle Coherence State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state store component)
- Oracle Coherence Community Edition (CE) 22.06
- Docker (for running Coherence cluster)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Kubernetes (for applying component YAML)

## Sources Consulted
- Dapr Coherence state store component documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-coherence/
- Dapr components-contrib source (state/coherence/metadata.yaml): https://github.com/dapr/components-contrib
- Oracle Coherence CE Docker image documentation: https://github.com/oracle/coherence/tree/main/prj/coherence-docker
- Oracle Coherence CE container registry: https://github.com/oracle/coherence/pkgs/container/coherence-ce
- Oracle Coherence CLI (cohctl): https://github.com/oracle/coherence-cli
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- @dapr/dapr npm package: https://www.npmjs.com/package/@dapr/dapr

## Issues Found

1. **Component type name was wrong (line 60):** Changed `state.oraclecoherence` to `state.coherence`. The correct Dapr component type is `state.coherence`, not `state.oraclecoherence`.

2. **Metadata field `address` was wrong:** Changed to `serverAddress`. The correct metadata field name per the Dapr Coherence component spec is `serverAddress`.

3. **Fabricated `cacheName` metadata field removed:** The `cacheName` field does not exist in the Dapr Coherence state store component. Removed it entirely.

4. **Fabricated `nearCacheEnabled` metadata field removed:** There is no boolean toggle to enable near cache. Near caching is enabled by setting `nearCacheTTL` or `nearCacheUnits` to non-zero values. Removed the field from both the main config and the near cache section.

5. **`nearCacheHighUnits` renamed to `nearCacheUnits`:** The correct metadata field name is `nearCacheUnits`, not `nearCacheHighUnits`.

6. **Duration format was wrong for `nearCacheTTL` and `requestTimeout`:** Changed from millisecond integers (e.g., `"60000"`, `"10000"`) to Go duration strings (e.g., `"60s"`, `"10s"`). The Dapr Coherence component expects Go-style duration strings.

7. **Management REST API port was wrong:** Changed from port 9000 to port 30000. The Coherence CE Docker image exposes the Management over REST API on port 30000, not 9000.

8. **`cohctl` verification command was incorrect:** The `cohctl` CLI tool is not bundled in the Coherence CE Docker image, and the command syntax (`cohctl get members -u <url>`) was wrong. Replaced with a direct `curl` command against the Management REST API endpoint, which works without any additional tooling.

## Review Notes
- The Docker image tag `22.06.8` corresponds to a real Coherence CE release, though newer tags (e.g., `22.06.13`) are available. The tag is acceptable for a tutorial.
- The JavaScript SDK code is fully correct and uses current, non-deprecated APIs.
- The prerequisite of "Java 11 or later" is correct for the 22.06.x series, but newer Coherence versions (24.03+) require Java 17+. This is fine since the post specifically targets 22.06.
- The near cache latency claims (~2ms for cluster read, ~0.1ms for near cache) are illustrative and reasonable, though actual performance varies by deployment.
