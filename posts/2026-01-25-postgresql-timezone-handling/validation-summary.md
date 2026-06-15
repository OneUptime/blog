# Validation Summary: How to Work with Timezones in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- PostgreSQL timestamp and timestamptz types
- PostgreSQL timezone configuration
- PostgreSQL `AT TIME ZONE`
- PostgreSQL PL/pgSQL

## Sources Consulted
- PostgreSQL Documentation: Date/Time Types - https://www.postgresql.org/docs/current/datatype-datetime.html
- PostgreSQL Documentation: Date/Time Functions and Operators (`AT TIME ZONE`, timestamp comparisons) - https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL Documentation: `pg_timezone_names` system view - https://www.postgresql.org/docs/current/view-pg-timezone-names.html
- PostgreSQL Documentation: `SET` command and `SET TIME ZONE` - https://www.postgresql.org/docs/current/sql-set.html
- PostgreSQL Documentation: Check Constraints - https://www.postgresql.org/docs/current/ddl-constraints.html

## Issues Found
- The audit table comment said `CURRENT_TIMESTAMP` returns `TIMESTAMPTZ` in UTC. PostgreSQL returns a `TIMESTAMPTZ` value that is displayed according to the current session timezone; when stored in a `TIMESTAMPTZ` column, it is stored internally in UTC. Updated the comment to reflect that behavior.
- The timezone settings example described `SHOW timezone` as viewing the server's default timezone. `SHOW timezone` reports the current session `TimeZone` setting, which may differ from the server default. Updated the comment.
- The DST example generated five hourly rows but only listed three output rows. Added the missing 05:00 and 06:00 local-time rows.
- The `user_profiles` table used a `CHECK` constraint with a subquery against `pg_timezone_names`. PostgreSQL check constraints cannot reference table data other than the row being checked, and a subquery in a check constraint is not valid for this use. Replaced it with a plain `NOT NULL` timezone column and a separate validation query for application logic or trigger-based validation.
- The pitfall about subtracting `TIMESTAMPTZ` and `TIMESTAMP` said the result is undefined. PostgreSQL has defined conversion behavior that depends on the session `TimeZone` setting. Updated the comment to say it depends on the session timezone.

## Review Notes
The general recommendation to use `TIMESTAMPTZ` is accurate for recording instants such as events, audit logs, and deployments. Future revisions could mention that recurring wall-clock schedules may also need a separate IANA timezone name in addition to any stored instant.
