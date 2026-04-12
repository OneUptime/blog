# Validation Summary: How to Use MongoDB with Stitch (Talend) for ETL

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- MongoDB (replica sets, oplog)
- Stitch (now part of Qlik, via Talend acquisition)
- Data warehouse destinations (Snowflake, BigQuery, Redshift, PostgreSQL)
- ELT replication methods (log-based, key-based, full table)

## Sources Consulted
- Stitch MongoDB v1 integration documentation (https://www.stitchdata.com/docs/integrations/databases/mongodb/v1)
- Stitch MongoDB Atlas v1 documentation (https://www.stitchdata.com/docs/integrations/databases/mongodb-atlas/v1)
- Stitch system tables and columns reference (https://www.stitchdata.com/docs/replication/loading/system-tables-columns)
- Stitch replication methods documentation (https://www.stitchdata.com/docs/replication/replication-methods)
- Qlik product lifecycle page (https://help.qlik.com/talend/en-US/customer-support-statements/Cloud/product-end-of-life-planning)

## Issues Found
1. **Incorrect query operator for key-based replication**: The post used `$gt` (greater than) for the key-based incremental replication query. Stitch actually uses `$gte` (greater than or equal to) to avoid missing records at the boundary. Fixed on line 88 and added clarification about potential duplicate rows.

2. **Incorrect MongoDB user roles**: The post specified `read` on a specific database and `clusterMonitor` on `admin`. Per official Stitch documentation, the required roles are `readAnyDatabase` on `admin` and `read` on `local`. The `clusterMonitor` role is not required. Fixed the `createUser` command accordingly.

3. **Outdated product ownership**: The post described Stitch as "acquired by Talend" without mentioning that Talend was subsequently acquired by Qlik in 2023. Updated the description and introduction to reflect the current ownership chain.

4. **Missing replication method**: The post listed only two replication methods (Log-Based Incremental and Key-Based Incremental). Stitch also supports Full Table Replication for MongoDB, which re-replicates the entire collection on each sync. Added Full Table Replication as a third option.

## Review Notes
- The title uses "ETL" while Stitch is technically an "ELT" (Extract, Load, Transform) service. The post body correctly identifies it as ELT. The title was left as-is since "ETL" is a commonly used umbrella term in search queries.
- Stitch remains operational under Qlik's portfolio with no announced end-of-life date, but feature development has reportedly slowed since the acquisitions.
- The `_sdc_` metadata columns and nested document flattening with double underscores (`__`) are accurately described.
- The schema evolution behavior (automatic column addition with NULLs for existing rows) is correctly described.
