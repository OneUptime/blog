# Validation Summary: How MySQL Stores Data on Disk

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB tablespace files, pages, extents, segments
- Clustered and secondary indexes (B-Tree)
- Doublewrite buffer
- information_schema system views

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB System Tablespace — https://dev.mysql.com/doc/refman/8.0/en/innodb-system-tablespace.html
- MySQL 8.0 Reference Manual: INNODB_TABLESPACES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: InnoDB Doublewrite Buffer — https://dev.mysql.com/doc/refman/8.0/en/innodb-doublewrite-buffer.html
- MySQL 8.0 Reference Manual: InnoDB Temporary Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-temporary-tablespace.html
- MySQL 8.0 Reference Manual: InnoDB Page Size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_page_size
- MySQL 8.0 Reference Manual: InnoDB File-Per-Table Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html

## Issues Found

1. **Invalid column `TOTAL_EXTENTS` in INNODB_TABLESPACES query**: The column `TOTAL_EXTENTS` does not exist in `information_schema.INNODB_TABLESPACES` in any MySQL version. The query would fail with an unknown column error. Replaced with `ALLOCATED_SIZE`, which is a valid column showing the actual allocated size on disk.

2. **Outdated system tablespace (ibdata1) description**: The post stated ibdata1 "contains the data dictionary, doublewrite buffer, and (historically) undo logs." In MySQL 8.0, the data dictionary moved to the `mysql.ibd` tablespace, and as of MySQL 8.0.20 the doublewrite buffer moved to separate `.dblwr` files. Updated to say ibdata1 contains the change buffer and noted the data dictionary and doublewrite buffer were in the system tablespace before MySQL 8.0.

3. **Incorrect ibtmp1 description ("sort buffers")**: The post described `ibtmp1` as storing "temporary tables and sort buffers." Sort buffers (`sort_buffer_size`) are in-memory structures, not stored in ibtmp1. The global temporary tablespace stores rollback segments for user-created temporary tables. Updated to "rollback segments for user-created temporary tables."

4. **Outdated doublewrite buffer location**: The post described the doublewrite buffer as "a reserved section of the tablespace." Since MySQL 8.0.20, the doublewrite buffer resides in separate `.dblwr` files, not within a tablespace. Added version-specific clarification.

## Review Notes
- The post uses "B-Tree" throughout; InnoDB technically uses B+Tree structures (leaf nodes contain data, internal nodes only contain keys). However, MySQL's own documentation uses "B-tree" terminology, so this is acceptable.
- The term "double lookup" for secondary index lookups is not standard MySQL terminology (more commonly "bookmark lookup" or simply "secondary index lookup"). This is a minor naming preference, not an error.
- The post doesn't specify a target MySQL version. The fixes bring it in line with MySQL 8.0, the current GA release.
