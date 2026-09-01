# Validation Summary: Why an Apache Geode Query Ignores Its Region: `Region.query` vs `QueryService`

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Apache Geode query APIs
- Geode Object Query Language (OQL)
- Java
- Geode client/server pools and authenticated client views
- Geode client-region shortcuts and local queries
- Geode partitioned regions and FunctionService queries
- Apache Geode `gfsh`
- Geode query authorization and method-invocation authorization

## Sources Consulted

- Apache Geode `Region` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/Region.html
- Apache Geode `QueryService` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/QueryService.html
- Apache Geode `Query` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/Query.html
- Apache Geode `QueryStatistics` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/QueryStatistics.html
- Apache Geode `RegionService` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/RegionService.html
- Apache Geode `ClientCache` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientCache.html
- Apache Geode `Pool` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/Pool.html
- Apache Geode `ClientCacheFactory` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientCacheFactory.html
- Apache Geode `ClientRegionShortcut` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientRegionShortcut.html
- Apache Geode `ServerOperationException` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ServerOperationException.html
- Apache Geode `RegionNotFoundException` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/RegionNotFoundException.html
- Apache Geode 2.0.2 `QueryOp` source: https://github.com/apache/geode/blob/rel/v2.0.2/geode-core/src/main/java/org/apache/geode/cache/client/internal/QueryOp.java
- Apache Geode Querying FAQ and API selection: https://geode.apache.org/docs/guide/latest/getting_started/querying_quick_reference.html
- Apache Geode Writing and Executing a Query in OQL: https://geode.apache.org/docs/guide/latest/developing/querying_basics/running_a_query.html
- Apache Geode Partitioned Region Query Restrictions: https://geode.apache.org/docs/guide/latest/developing/query_additional/partitioned_region_query_restrictions.html
- Apache Geode client-to-server event distribution: https://geode.apache.org/docs/guide/latest/developing/events/how_client_server_distribution_works.html
- Apache Geode region shortcuts: https://geode.apache.org/docs/guide/latest/basic_config/data_regions/region_shortcuts.html
- Apache Geode `gfsh` `list` command reference: https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/list.html
- Apache Geode `gfsh` `describe` command reference: https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/describe.html
- Apache Geode method-invocation authorizers: https://geode.apache.org/docs/guide/115/managing/security/method_invocation_authorizers.html

## Issues Found

- The partitioned-region paragraph referred to `QueryService.execute()`, but `QueryService` has no execution method. It creates `Query` instances, and execution is performed with `Query.execute(...)`. The sentence now correctly refers to plain `Query.execute()` from a client.
- The “Writing and executing OQL” URL redirected to the generic Geode documentation homepage because `querying_basics.html` is no longer the page for that topic. It now links to the current `running_a_query.html` page.
- The missing-region diagnostics named only `RegionNotFoundException`. A remote Java client query wraps a server-returned query exception in `ServerOperationException`, so the post now identifies both the server-side exception and its client-side wrapper.

## Review Notes

- The Java examples were compile-checked against `geode-core` 2.0.2. They use current, non-deprecated APIs; the cast from `Query.execute(...)` to `SelectResults<Order>` produces only the expected unchecked-cast warning because `Query.execute(...)` returns `Object`.
- The post's `Region.query(String)` predicate examples, use of `this`, and explanation that client calls execute on the server agree with the current Geode Javadoc. The API remains available and is not deprecated, although its Javadoc recommends `QueryService` for application queries.
- The full-OQL examples use current `QueryService.newQuery(String)` and `Query.execute(Object...)` APIs. Bind parameters are correctly used for values, and the post correctly warns that a string containing a region path is not a collection bind parameter.
- The execution-location table correctly distinguishes peer/local query services, default and named client pools, authenticated views, and `ClientCache.getLocalQueryService()`.
- The `PROXY`, `CACHING_PROXY`, and `LOCAL` descriptions match the current client-region shortcut definitions and documented interest/subscription behavior.
- The `gfsh` commands and the colocated partitioned-region equi-join requirement were verified against the official command and query-restriction documentation.
- All documentation links in the post resolve to the intended official Apache Geode pages after the corrected OQL link.
