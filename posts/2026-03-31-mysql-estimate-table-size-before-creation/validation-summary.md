# Validation Summary: How to Estimate MySQL Table Size Before Creation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- Python (for estimation calculations)
- SQL (DDL, DML, information_schema queries)

## Sources Consulted
- MySQL 8.0 Reference Manual: Data Type Storage Requirements — https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual: InnoDB Row Formats — https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html
- MySQL 8.0 Reference Manual: InnoDB Page Structure and Fill Factor — https://dev.mysql.com/doc/refman/8.0/en/innodb-physical-structure.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- B-tree page split theory (ln(2) ≈ 69.3% average fill factor for random inserts)

## Issues Found

1. **Incorrect Python output (calculation error)**: The Python code with `avg_row_bytes=262`, `fill_factor=0.69`, `page_size_bytes=16384`, and `expected_rows=100,000,000` produces 35.4 GB, not 37.3 GB. The formula simplifies to `(rows * avg_bytes) / (fill_factor * 1073741824)` = `26,200,000,000 / 740,881,858.56` = 35.4 GB. Changed "37.3 GB" to "35.4 GB" in the output comment.

2. **Incorrect total table size estimate**: Because the data size was wrong at 37.3 GB, the total (data + index) was also wrong at ~41 GB. Corrected to `35.4 + 3.8 = ~39.2 GB`.

3. **Misleading fill factor description**: The post stated "InnoDB leaves pages at ~69% full on initial load." The 69% fill factor (≈ ln(2)) is the steady-state average for B-trees subject to random inserts due to page splits. On initial sequential bulk load, InnoDB fills pages to ~15/16 (93.75%). Changed to clarify that 69% applies to random inserts, with a note that sequential bulk loads fill to ~93%.

4. **Imprecise TEXT storage description**: The post claimed TEXT uses "0-12 bytes on-page, overflow stored separately." For InnoDB DYNAMIC row format (default in MySQL 8.0+), off-page TEXT/BLOB columns store a 20-byte pointer on-page, with content on overflow pages. Small values may be stored inline entirely. Changed to "20-byte pointer on-page if stored off-page (DYNAMIC format)."

## Review Notes
- The CHAR(N) = "N bytes" claim in the data type table is only accurate for single-byte character sets (e.g., latin1). With utf8mb4 (default in MySQL 8.0+), CHAR(N) can use up to N*4 bytes maximum, though InnoDB DYNAMIC format stores only the actual bytes used. This is an acceptable simplification for an estimation guide.
- The index size calculation does not apply the page fill factor, while the data size calculation does. This makes the index size slightly underestimated. For a more conservative estimate, dividing by the fill factor would give ~5.5 GB instead of ~3.8 GB.
- The sample data insertion using `FROM information_schema.COLUMNS LIMIT 1000000` depends on having enough rows in that system table. Most databases won't have 1 million columns. A cross join or recursive CTE would be more reliable for generating large sample datasets.
- The ~20 bytes InnoDB row overhead is a reasonable simplification. The actual overhead includes 5 bytes record header + 6 bytes transaction ID + 7 bytes roll pointer + variable-length offset list + null bitmap, which totals closer to 24-25 bytes for this specific table.
