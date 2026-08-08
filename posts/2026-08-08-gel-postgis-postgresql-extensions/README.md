# PostGIS and PostgreSQL Extensions in Gel 6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, PostgreSQL, PostGIS, Extension, Geospatial

Description: Use Gel 6 PostGIS through supported extension packages and EdgeQL, and understand why arbitrary PostgreSQL extensions still do not work.

---

Gel 6 added first-class PostGIS support, but that does not mean every PostgreSQL extension can be installed or used through Gel.

The supported model has two layers:

1. an extension implementation must be available to the Gel runtime; and
2. the extension must be enabled in the Gel branch's schema with `using extension ...`.

PostGIS is the notable standalone extension package. Gel also ships several built-in extensions, including `pgcrypto`, `pgvector`, `pg_trgm`, and `pg_unaccent`. An arbitrary extension found in a PostgreSQL package repository is not automatically a Gel extension.

## What Changed in Gel 6

Gel 6 introduced `ext::postgis`, exposing PostGIS spatial types and functions through Gel's native type system and EdgeQL. It includes `geometry`, `geography`, two- and three-dimensional box types, and a large set of spatial functions.

The EdgeQL names usually omit PostGIS's SQL `ST_` prefix because the `ext::postgis` namespace already identifies the library. For example:

- SQL `ST_Point` is exposed as `ext::postgis::point()`;
- SQL `ST_Distance` is exposed as `ext::postgis::distance()`;
- SQL `ST_DWithin` is exposed as `ext::postgis::dwithin()`; and
- SQL `ST_Transform` is exposed as `ext::postgis::transform()`.

This is an adapter, not raw SQL passthrough. Use the exact types and overloads in the Gel standard-library reference.

EdgeDB 5 and older servers do not gain this module by installing the renamed CLI or changing `edgedb` to `gel`. The server must be Gel 6 or newer, and the extension package must be supported by that deployment.

## Check Availability Before Editing Schema

For a local project-managed instance, list what the CLI can install:

```bash
gel extension list-available
```

List packages already installed:

```bash
gel extension list
```

The current extension guide uses this workflow for PostGIS:

```bash
gel extension install postgis
gel instance restart
```

The documentation scopes standalone CLI installation to local project-managed instances. Do not assume the same command manages a remote production server, a container image, or another hosted deployment. Check that deployment's extension catalog and provisioning procedure.

Availability is version-specific. A package visible on one developer's machine does not prove that CI, staging, a pinned Docker image, or an upgrade target provides the same package version.

## Enable PostGIS in Schema

After the runtime package is available, declare the extension at the top level of a `.gel` schema file:

```gel
using extension postgis;

type Place {
  required name: str;
  required location: ext::postgis::geography;
}
```

`using extension` must be outside a module block because an extension affects the whole branch rather than one module. Create and apply a migration normally:

```bash
gel migration create
gel migrate
```

This distinction is easy to miss:

- `gel extension install postgis` makes a standalone package available to the local managed instance;
- `using extension postgis;` enables it in a branch's schema; and
- migrations carry the schema declaration through environments, but cannot manufacture an unavailable runtime package.

Treat package availability as a deployment prerequisite and the `using` declaration as version-controlled schema.

## Store a Geographic Point

For longitude and latitude, use a spatial reference identifier and choose `geometry` or `geography` intentionally. The PostGIS convention for geodetic point coordinates is X as longitude and Y as latitude.

This insert constructs an SRID 4326 point and converts it to `geography`:

```edgeql
with location := ext::postgis::to_geography(
  ext::postgis::point(
    <float64>$longitude,
    <float64>$latitude,
    4326
  )
)
insert Place {
  name := <str>$name,
  location := location
};
```

Do not silently reverse longitude and latitude. Both are valid floating-point values over much of their ranges, so an inversion can produce plausible but geographically wrong data.

Also do not attach SRID 4326 to coordinates that are actually in another coordinate reference system. Setting an SRID labels coordinates; transforming coordinates is a separate operation.

## Query a Radius and Distance

Use the same type and spatial reference for the stored value and search origin:

```edgeql
with origin := ext::postgis::to_geography(
  ext::postgis::point(
    <float64>$longitude,
    <float64>$latitude,
    4326
  )
)
select Place {
  id,
  name,
  distance_meters := ext::postgis::distance(.location, origin)
}
filter ext::postgis::dwithin(
  .location,
  origin,
  <float64>$radius_meters
)
order by .distance_meters
limit 20;
```

For PostGIS `geography`, `ST_DWithin` and `ST_Distance` use meters by default; Gel exposes those functions with adapted EdgeQL names. For `geometry`, distance units come from the geometry's spatial reference system. A 4326 geometry is not a shortcut for an accurate global meter distance.

Use `dwithin()` for the radius predicate, then calculate and order by distance for the candidates. On large datasets, spatial indexing and operator compatibility are essential. Gel's PostGIS reference marks wrappers for index-aware PostGIS operators with an `op_` prefix and identifies the relevant Gel PostgreSQL index types (`pg::gist`, `pg::brin`, and `pg::spgist`). Consult the exact Gel and PostGIS versions, create an appropriate spatial index in Gel schema, use a compatible function or operator in the query, and verify the EdgeQL query with `analyze`. Do not assume that merely storing a spatial scalar or calling an adapted function creates the intended spatial access path.

## Geometry and Geography Are Different Choices

`ext::postgis::geometry` represents planar geometry in a coordinate system. It supports the broadest range of spatial functions, with measurements expressed in the geometry's spatial reference system units.

`ext::postgis::geography` represents spatial features in a geodetic coordinate system. It makes longitude-and-latitude distance behavior easier to reason about, but PostGIS supports fewer geography operations and they can cost more computation.

Choose based on the workload:

- local or projected geometric work often fits `geometry` with an appropriate projected SRID;
- global points and meter-based Earth distances often fit `geography`; and
- applications doing both may transform deliberately rather than treating the types as interchangeable.

Keep SRID assumptions in schema documentation and tests. A type name alone does not validate the coordinate order, region, or source data quality.

## Built-in PostgreSQL-backed Extensions

Current Gel documentation lists these built-in extensions among others:

- `pg_trgm`, exposed through `ext::pg_trgm`;
- `pg_unaccent`, exposed through `ext::pg_unaccent`;
- `pgcrypto`, exposed through `ext::pgcrypto`; and
- `pgvector`, exposed through `ext::pgvector`.

Built-in Gel extensions do not use the standalone `gel extension install` step. Enable a supported one at schema top level:

```gel
using extension pgvector;
```

Then use only the types and functions documented in its Gel module. When Gel uses a separately managed PostgreSQL backend, the backend administrator may still need to provide the underlying PostgreSQL extension; for example, the `ext::pgvector` reference explicitly calls this out. Availability and APIs can evolve, so consult the documentation for the deployed Gel major version rather than extrapolating from PostgreSQL extension SQL.

Gel-specific extensions such as `auth`, `ai`, GraphQL, and EdgeQL-over-HTTP also use `using extension`, but they are not PostgreSQL extensions in the sense implied by `CREATE EXTENSION`.

## Why Arbitrary CREATE EXTENSION Does Not Work

Gel 6 and newer expose a PostgreSQL wire protocol and a SQL adapter, but the adapter does not support PostgreSQL DDL such as `CREATE`, `ALTER`, or `DROP`. Schema remains managed through Gel SDL and migrations.

This therefore is not a supported installation route:

```sql
CREATE EXTENSION some_extension;
```

It will not work through the Gel SQL adapter. Connecting around Gel directly to the backing PostgreSQL cluster and changing its catalogs is also not a substitute: Gel owns a higher-level schema, compiler, migration history, and type mapping that an arbitrary PostgreSQL extension does not integrate with.

An extension needs more than shared-library files. Gel must expose compatible types, casts, functions, volatility, schema objects, and migration behavior. PostGIS in Gel 6 is significant precisely because that integration now exists.

## Do Not Equate the SQL Adapter With PostgreSQL

PostgreSQL-compatible clients can query Gel through the SQL adapter, and Gel 6 supports a subset of SQL data modification. That helps analytics and integration tools, but it does not turn the branch into an unrestricted PostgreSQL database.

The SQL adapter's introspection catalogs are emulated, some PostgreSQL internals are unavailable, and DDL is unsupported. A tool that expects to run `CREATE EXTENSION`, install operator classes, create helper schemas, or inspect every native PostgreSQL catalog may fail even if its ordinary `SELECT` statements work.

Evaluate each tool's concrete SQL behavior. The label PostgreSQL-compatible is not a claim that every server-side extension or administration command is available.

## Plan Dumps, Restores, and Upgrades

The Gel extension guide states that a standalone extension required by a dump must be installed before restoring that dump. More generally, verify that the destination Gel version and runtime support every enabled extension before a cutover.

Use a rehearsal:

1. inventory top-level `using extension` declarations;
2. record `gel extension list` and `list-available` where those commands apply;
3. confirm the target platform's supported versions;
4. provision extension availability before restoring or applying dependent migrations;
5. restore into an isolated target branch or instance;
6. run spatial correctness and query-plan tests; and
7. keep the source available until rollback criteria expire.

Do not infer extension compatibility from the PostgreSQL major version alone. The Gel server version, Gel extension adapter, extension package build, hosting platform, and data dump all participate.

For a branch created from another branch, the schema can reference the extension only if the instance runtime already provides the required package. Include extension checks in ephemeral CI and preview-environment setup rather than discovering the gap during `gel migrate`.

## Test Correctness, Not Just Installation

After migration, test known geographic facts:

- a point round-trips through WKT or GeoJSON output as expected;
- longitude and latitude are not reversed;
- SRIDs match the source data;
- a known nearby point is inside the radius;
- a known distant point is outside;
- boundary behavior is defined; and
- distance units match the API contract.

Then test performance with representative data:

```edgeql
analyze with origin := ext::postgis::to_geography(
  ext::postgis::point(-0.1276, 51.5072, 4326)
)
select Place {
  name
}
filter ext::postgis::dwithin(.location, origin, 5000);
```

Use `\expand` in the REPL for fine-grained plan output. Confirm the intended access path after any index migration instead of assuming the planner selected it.

## Version-aware Notes

The product was named EdgeDB through version 5 and became Gel at version 6. Older articles may say EdgeDB is built on PostgreSQL but still report that PostGIS is unavailable. That can be historically correct for the version they tested.

Current commands use `gel extension`, schema files use `.gel`, and the module is `ext::postgis`. The underlying PostGIS function names may still appear in documentation descriptions because Gel maps them into its namespace. Always check the version marker on a function; the PostGIS module and its functions are marked as added in Gel 6.

Gel 7 permissions do not make extension package management an ordinary application operation. Extension package commands remain administrative, and schema changes require appropriate DDL authority. Keep runtime installation and schema migration out of request-serving roles.

## Official Documentation

- [Gel extensions](https://docs.geldata.com/reference/datamodel/extensions)
- [Gel extension CLI](https://docs.geldata.com/reference/using/cli/gel_extension)
- [Gel PostGIS standard library](https://docs.geldata.com/reference/stdlib/postgis)
- [Gel pgvector standard library](https://docs.geldata.com/reference/stdlib/pgvector)
- [Gel 6 changelog](https://docs.geldata.com/resources/changelog/6_x)
- [Gel PostGIS announcement and example](https://www.geldata.com/blog/postgis-webhooks-networking-and-new-ai-models)
- [Gel SQL adapter and DDL limitations](https://docs.geldata.com/reference/using/sql_adapter)
- [Gel indexes](https://docs.geldata.com/reference/datamodel/indexes)
- [Gel analyze](https://docs.geldata.com/reference/edgeql/analyze)
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html)
- [PostGIS ST_Distance](https://postgis.net/docs/ST_Distance.html)

## Conclusion

Gel 6 can use PostGIS because Gel ships a first-class `ext::postgis` integration and a supported standalone package workflow. Make the package available, enable it with a top-level schema declaration, migrate normally, and query its documented EdgeQL types and functions. Other PostgreSQL extensions work only when Gel explicitly supports them. The SQL adapter does not allow arbitrary `CREATE EXTENSION`, and direct backing-database changes bypass Gel's schema contract. Treat availability, restore compatibility, spatial correctness, and query plans as deployment requirements.
