# Validation Summary: How to Use PlanetScale for MySQL in the Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- PlanetScale (serverless MySQL-compatible database platform)
- Vitess (underlying sharding/clustering technology)
- pscale CLI
- gh-ost (GitHub Online Schema Change tool, referenced as one of PlanetScale's online DDL strategies)

## Sources Consulted
- PlanetScale CLI documentation (https://docs.planetscale.com/reference/planetscale-cli)
- PlanetScale branching documentation (https://docs.planetscale.com/concepts/branching)
- PlanetScale deploy requests documentation (https://docs.planetscale.com/concepts/deploy-requests)
- PlanetScale safe migrations documentation (https://docs.planetscale.com/concepts/safe-migrations)
- PlanetScale connection strings documentation (https://docs.planetscale.com/concepts/connection-strings)
- Vitess Online DDL documentation (https://vitess.io/docs/user-guides/schema-changes/managed-online-schema-changes/)
- PlanetScale CLI GitHub repository (https://github.com/planetscale/cli)

## Issues Found
No technical issues found.

## Review Notes
- The connection string example (`mysql://username:password@aws.connect.psdb.cloud/my-app-db?ssl-mode=require`) uses a generic format. In practice, the exact SSL parameter name and value vary by client driver (e.g., `sslmode=require` for some drivers, `ssl-mode=REQUIRED` for MySQL standard, `tls=true` for Go MySQL driver). The example is acceptable as a template.
- PlanetScale discontinued its free Hobby plan in 2024, but the platform and all described features remain available on paid plans. The post does not mention pricing, so no changes are needed.
- The online DDL explanation correctly mentions both `gh-ost` and Vitess as strategies. PlanetScale's default strategy is Vitess's VReplication-based migration, with `gh-ost` as an alternative. The "via `gh-ost` or Vitess" phrasing accurately represents the available options.
