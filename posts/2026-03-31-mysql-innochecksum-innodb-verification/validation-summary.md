# Validation Summary: How to Use innochecksum for InnoDB Checksum Verification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL innochecksum utility
- InnoDB tablespace files (.ibd)
- InnoDB checksum algorithms (CRC32, innodb, none)
- Bash scripting for batch file validation

## Sources Consulted
- MySQL 8.0 Reference Manual — innochecksum: https://dev.mysql.com/doc/refman/8.0/en/innochecksum.html
- MySQL 8.0 Reference Manual — innodb_checksum_algorithm: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_checksum_algorithm

## Issues Found

1. **`--verbose` used without required `--log` flag**: The blog showed `innochecksum --verbose file.ibd` as standalone usage. Per the MySQL documentation, `--verbose` prints a progress indicator to the log file every five seconds, and the `--log` option must be specified for the progress indicator to be printed. Fixed by adding `--log=/tmp/innochecksum.log` to the command and noting the `--log` requirement.

2. **Fabricated verbose output format**: The blog showed output like `Verified: page 0 (FIL_PAGE_TYPE_FSP_HDR), checksum: crc32` and `Total number of pages: 384`, which does not match the documented innochecksum output. The actual verbose progress format is `page N okay: X.XXX% done`. Fixed the output example to reflect the documented format. Also added a note about the `--count` option for printing the total page count.

3. **Scanning script used fragile output-checking instead of exit codes**: The batch scanning script detected corruption by checking if `innochecksum` produced any output (`if [ -n "$result" ]`). This is fragile — the correct approach is to check the exit code, which the blog's own backup validation script already does with `||`. Fixed the scanning script to use `if ! innochecksum ...` for consistent and reliable exit-code-based detection.

## Review Notes
- The error message example `page 1234 invalid (fails log sequence number check)` is illustrative but not from the official documentation. The exact error format may differ across MySQL versions; however, the general concept (innochecksum reports page-level corruption) is correct.
- The claim that CRC32 is the default checksum algorithm in MySQL 5.7+ is correct for the `innodb_checksum_algorithm` server variable. Note that when `--strict-check` is not specified, innochecksum validates against all supported algorithms, not just CRC32.
- All command-line flags (`--start-page`, `--end-page`, `--page`, `--no-check`, `--write`, `--strict-check`, `--count`) are confirmed valid per MySQL 8.0 documentation.
- The requirement to stop MySQL before running innochecksum on active files is correctly stated.
