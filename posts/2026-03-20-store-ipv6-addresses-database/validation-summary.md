# Validation Summary: How to Store IPv6 Addresses in a Database

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- PostgreSQL `inet` and `cidr` network address types
- PostgreSQL subnet operators, GiST indexes, and range partitioning
- MySQL `INET6_ATON()` and `INET6_NTOA()`
- MySQL `VARBINARY` and `VARCHAR` storage
- SQLite storage classes
- Python `ipaddress`
- Django `GenericIPAddressField`

## Sources Consulted
- PostgreSQL Network Address Types: https://www.postgresql.org/docs/current/datatype-net-types.html
- PostgreSQL Network Address Functions and Operators: https://www.postgresql.org/docs/current/functions-net.html
- PostgreSQL GiST Built-in Operator Classes: https://www.postgresql.org/docs/current/gist-builtin-opclasses.html
- PostgreSQL Table Partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL Identity Columns: https://www.postgresql.org/docs/current/ddl-identity-columns.html
- MySQL 8.0 Miscellaneous Functions (`INET6_ATON()`, `INET6_NTOA()`): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html
- MySQL 8.0 `BINARY` and `VARBINARY` Types: https://dev.mysql.com/doc/refman/8.0/en/binary-varbinary.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Django `GenericIPAddressField` documentation: https://docs.djangoproject.com/en/6.0/ref/models/fields/#genericipaddressfield
- Django QuerySet `startswith` lookup documentation: https://docs.djangoproject.com/en/6.0/ref/models/querysets/#startswith
- SQLite Datatypes documentation: https://www.sqlite.org/datatype3.html

## Issues Found
- The MySQL prefix-query comment said "Use bit masking", but the SQL used an indexed byte-range comparison. Changed the comment to match the query.
- The Django example described a subnet query but used `startswith`, which is a text-prefix lookup rather than true subnet containment. Changed the comment and variable name to describe it as a prefix-style filter.
- The MySQL indexing comment said "full text for VARCHAR", which could be mistaken for a MySQL `FULLTEXT` index. Changed it to say B-tree indexes for `VARCHAR` or `VARBINARY`.
- The PostgreSQL partitioning example created a partition of `connections` without showing a partitioned parent table. Replaced it with a minimal partitioned parent table and a `/32` range partition.

## Review Notes
- PostgreSQL and MySQL client CLIs were not installed locally, so database snippets were validated against official documentation rather than executed.
- The Python normalization examples were executed locally and produced the expected normalized output.
- SQLite is only mentioned briefly in the post. A future improvement could add a dedicated SQLite `TEXT` or `BLOB` example, but the existing SQLite claim is technically accurate.
