# Validation Summary: How to Serialize Cross-Language Objects in Apache Geode with PDX

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- Apache Geode 2.0
- Portable Data eXchange (PDX) serialization
- Java
- Apache Geode Native .NET Client 1.15 and C#
- Apache Geode Native C++ Client
- Object Query Language (OQL)
- `gfsh` and the cluster configuration service
- Geode disk-store persistence and WAN gateway senders

## Sources Consulted

- Apache Geode 2.0 PDX serialization guide: https://geode.apache.org/docs/guide/latest/developing/data_serialization/gemfire_pdx_serialization.html
- Apache Geode 2.0 PDX serialization features: https://geode.apache.org/docs/guide/latest/developing/data_serialization/PDX_Serialization_Features.html
- Apache Geode 2.0 guide to programming with `PdxInstance`: https://geode.apache.org/docs/guide/latest/developing/data_serialization/program_application_for_pdx.html
- Apache Geode 2.0 PDX metadata persistence guide: https://geode.apache.org/docs/guide/latest/developing/data_serialization/persist_pdx_metadata_to_disk.html
- Apache Geode 2.0 `configure pdx` command reference: https://geode.apache.org/docs/guide/20/tools_modules/gfsh/command-pages/configure.html
- Apache Geode 2.0 cluster configuration service guide: https://geode.apache.org/docs/guide/20/configuring/cluster_config/gfsh_persist.html
- Apache Geode 2.0 querying serialized objects guide: https://geode.apache.org/docs/guide/20/developing/query_select/the_where_clause.html
- Apache Geode 2.0 backup and restore guide: https://geode.apache.org/docs/guide/20/managing/disk_storage/backup_restore_disk_store.html
- Apache Geode Java APIs for `PdxInstance`, `PdxInstanceFactory`, `PdxReader`, `PdxWriter`, `WritablePdxInstance`, and `FieldType`: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/pdx/package-summary.html
- Apache Geode Java APIs for `CacheFactory`, `ClientCacheFactory`, and `RegionService`: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/CacheFactory.html, https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientCacheFactory.html, and https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/RegionService.html
- Apache Geode Native .NET `IPdxInstanceFactory` and PDX type-mapper APIs: https://geode.apache.org/releases/latest/dotnetdocs/a00976.html and https://geode.apache.org/releases/latest/dotnetdocs/a00992.html
- Apache Geode 2.0 release and client/server compatibility information: https://geode.apache.org/releases/ and https://geode.apache.org/docs/guide/20/getting_started/upgrade/upgrade_planning.html

## Issues Found

- The field-type discussion attributed `PdxFieldTypeMismatchException` too directly to a later writer. Clarified that a factory can register a distinct, incompatible PDX type definition, while the documented mismatch exception occurs when a typed reader uses an accessor that does not match the stored field or when `WritablePdxInstance` receives an incompatible value.
- The server-side `getObject()` explanation omitted never-deserializable instances. Added that `getObject()` returns the `PdxInstance` itself when the instance was created with `neverDeserialize()`; obtaining a domain object from a deserializable instance still requires the domain class and compatible deserialization code.
- The schema-evolution explanation reversed the normal missing-field case and conflated class-based deserialization with `PdxInstance` access. Clarified that `PdxReader` returns a default when a serialized version lacks a field requested by the class-based reader, whereas `PdxInstance` exposes the exact field set of the serialized version and supports explicit presence checks with `hasField()`.

## Review Notes

- The Java and C# factory chains, Java-to-.NET field mappings, identity-field placement, OQL example, `gfsh` command, and Java cache configuration APIs are current and non-deprecated in the documentation reviewed.
- Apache Geode Native 1.15 is the latest documented .NET/C++ native client line, while the server documentation and Java APIs are Apache Geode 2.0. Geode documents older clients connecting to newer servers as supported.
- The Native .NET documentation targets the Microsoft .NET Framework client. Readers should not assume the example refers to a modern cross-platform .NET client.
- `configure pdx` requires the cluster configuration service, and only servers that use cluster configuration inherit the saved setting. The embedded-cache examples configure PDX directly and are not affected by that limitation.
- All eight links in the post's Official References section returned HTTP 200 and resolved to the intended Apache Geode documentation on 2026-09-02.
