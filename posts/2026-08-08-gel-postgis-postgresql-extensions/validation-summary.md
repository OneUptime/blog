# Validation Summary: PostGIS and PostgreSQL Extensions in Gel 6

## Status
validated

## Post Type
Technical guide / Reference

## Technologies Covered
- Gel 6 and Gel 7
- EdgeDB 5 and earlier version terminology
- EdgeQL and Gel Schema Definition Language
- PostgreSQL wire protocol and Gel SQL adapter
- PostgreSQL extensions
- PostGIS geometry, geography, spatial reference systems, and spatial indexes
- Gel extension CLI and schema migrations
- Gel built-in extensions: `pgcrypto`, `pgvector`, `pg_trgm`, and `pg_unaccent`

## Sources Consulted
- [Gel extensions reference](https://docs.geldata.com/reference/datamodel/extensions) — built-in and standalone extension lifecycle, top-level `using extension`, restart, and restore requirements.
- [Gel extension CLI reference](https://docs.geldata.com/reference/using/cli/gel_extension) — current `list`, `list-available`, and `install` subcommands.
- [Gel PostGIS standard-library reference](https://docs.geldata.com/reference/stdlib/postgis) — types, function overloads, Gel names, version markers, and index-aware operator wrappers.
- [Gel PostGIS 3.4.3 extension source](https://github.com/geldata/gel-postgis/blob/3.4.3/postgis.edgeql) — implementation signatures exposed to Gel.
- [Gel pgvector standard-library reference](https://docs.geldata.com/reference/stdlib/pgvector) — `using extension pgvector` and separately managed PostgreSQL backend caveat.
- [Gel 6 changelog](https://docs.geldata.com/resources/changelog/6_x) — introduction of PostGIS and SQL DML support in Gel 6.
- [Gel SQL adapter reference](https://docs.geldata.com/reference/using/sql_adapter) — PostgreSQL wire protocol, supported DML, unsupported DDL, and emulated introspection catalogs.
- [Gel indexes reference](https://docs.geldata.com/reference/datamodel/indexes) — Gel index declarations and PostgreSQL index types.
- [Gel `analyze` reference](https://docs.geldata.com/reference/edgeql/analyze) — `analyze` syntax and the REPL's `\expand` command.
- [Gel permissions reference](https://docs.geldata.com/reference/datamodel/permissions) — Gel 7 `sys::perm::ddl` requirement for schema changes and migrations.
- [Gel PostGIS announcement and example](https://www.geldata.com/blog/postgis-webhooks-networking-and-new-ai-models) — supported installation/schema workflow and ordering by a computed distance field.
- [PostgreSQL operator classes and operator families](https://www.postgresql.org/docs/current/indexes-opclass.html) — distinction between index access methods, operator classes, and operator families.
- [PostGIS `ST_Point`](https://postgis.net/docs/ST_Point.html) — point construction, SRID argument, and X/longitude and Y/latitude convention.
- [PostGIS `ST_DWithin`](https://postgis.net/docs/ST_DWithin.html) — geometry/geography units, same-SRID requirement, and spatial-index-aware bounding-box comparison.
- [PostGIS `ST_Distance`](https://postgis.net/docs/ST_Distance.html) — planar geometry units and geodesic geography distances in meters.
- [PostGIS `ST_SetSRID`](https://postgis.net/docs/ST_SetSRID.html) and [`ST_Transform`](https://postgis.net/docs/ST_Transform.html) — assigning an SRID versus transforming coordinates.
- [PostGIS data-management reference](https://postgis.net/docs/using_postgis_dbmanagement.html) — geometry/geography semantics, supported geodetic spatial reference systems, measurement units, performance, and spatial indexes.

## Issues Found
1. **Incorrect PostgreSQL index terminology** — The post called `pg::gist`, `pg::brin`, and `pg::spgist` “index families.” They are Gel-exposed PostgreSQL index types/access methods; PostgreSQL operator families are a different concept. Reworded the passage to identify the index types correctly and to distinguish declaring a spatial index in Gel schema from using a compatible function or operator in the query.
2. **Geometry measurement units described too narrowly** — The post said geometry measurements use the chosen projection's units. A PostGIS geometry may use an unprojected spatial reference system such as SRID 4326, so the technically correct rule is that measurements use the geometry's spatial reference system units. Updated the sentence accordingly.
3. **Geography type definition was unnecessarily restricted to Earth** — PostGIS accepts registered and custom geodetic spatial reference systems. Updated the definition to say that `geography` represents spatial features in a geodetic coordinate system.

## Review Notes
- All EdgeQL examples match the documented Gel signatures for `ext::postgis::point()`, `to_geography()`, `distance()`, and `dwithin()`. The computed `.distance_meters` ordering pattern is also used by Gel's official PostGIS launch example.
- `dwithin()` can use an applicable spatial index through its bounding-box comparison even though its Gel name does not have the `op_` prefix. The post's revised indexing advice does not imply that only `op_` wrappers are index-aware.
- The no-argument `gel instance restart` command is the workflow shown in the current extension guide for an active local project. Older CLI 6.0 releases required an explicit instance; using a current CLI with a Gel 6 server preserves the post's stated workflow.
- All external links in the post resolved to the labeled official resources during validation.
