# Validation Summary: How to Use ibd2sdi to Extract InnoDB Metadata

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- `ibd2sdi` CLI utility
- Serialized Dictionary Information (SDI) format
- `jq` for JSON processing

## Sources Consulted
- MySQL 8.0 Reference Manual — ibd2sdi utility: https://dev.mysql.com/doc/refman/8.0/en/ibd2sdi.html
- MySQL 8.0 Reference Manual — InnoDB Data Dictionary: https://dev.mysql.com/doc/refman/8.0/en/innodb-data-dictionary.html

## Issues Found

1. **Non-existent `--list` option**: The post used `ibd2sdi --list` to list SDI record IDs without full output. `--list` is not a valid `ibd2sdi` option. The correct option is `--skip-data` (`-s`), which retrieves only `id` and `type` fields without the data payload. Fixed the command and updated the example output from a fabricated tabular format to the actual JSON output format that `--skip-data` produces.

2. **Incorrect example output format for listing**: The original example output showed a text table (`id type / 2  1 / 1  2`). The actual `--skip-data` output is JSON (an array with `"ibd2sdi"` as the first element followed by objects with `type` and `id` fields). Fixed to show correct JSON output.

3. **Incorrect jq path for version metadata**: The post claimed `jq '.[0]'` would print the SDI header with the MySQL version. In reality, `.[0]` in `ibd2sdi` JSON output is just the string `"ibd2sdi"`, not version metadata. Version information (`mysqld_version_id`, `dd_version`, `sdi_version`) is located inside each record's `object` field. Fixed the jq expression to `.[1].object | {mysqld_version_id, dd_version, sdi_version}` and updated the description accordingly.

## Review Notes
- The jq expressions for parsing column information (`.[1].object.dd_object.columns[]`) are correct and match the actual SDI JSON structure.
- The SDI type values (1 for table, 2 for tablespace) are correctly documented.
- The recovery scenario using `ALTER TABLE ... IMPORT TABLESPACE` is a valid and well-known technique.
- The post correctly notes that `ibd2sdi` was introduced in MySQL 8.0 and that `.frm` files were used prior to 8.0.
- The `--pretty` option (available from MySQL 8.0.16) is enabled by default in `ibd2sdi`, so piping through `jq` is not strictly necessary for readability but is useful for filtering.
