# Validation Summary: How to Use MySQL Enterprise Data Masking and De-Identification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Enterprise Edition
- MySQL Enterprise Data Masking and De-Identification (component-based, 8.0.33+)
- MySQL Enterprise Data Masking plugin (older 8.0 versions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Data Masking Component Installation: https://dev.mysql.com/doc/refman/8.0/en/data-masking-components-installation.html
- MySQL 8.0 Reference Manual — Data Masking Component Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/data-masking-component-functions.html
- MySQL 8.0 Reference Manual — Data Masking Components vs Plugin: https://dev.mysql.com/doc/refman/8.0/en/data-masking-components-vs-plugin.html
- MySQL 8.0 Release Notes (8.0.33): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-33.html

## Issues Found
1. **Version number incorrect**: Post stated the component was available in MySQL 8.0.28+. The component-based data masking was introduced in MySQL 8.0.33. Fixed to "8.0.33+".
2. **Incomplete component installation**: Post showed only `INSTALL COMPONENT 'file://component_masking'`. Two components are required: `file://component_masking` (core service) and `file://component_masking_functions` (SQL functions). Added the second INSTALL COMPONENT statement.
3. **Verification command wrong for components**: Post used `SHOW PLUGINS` to verify, which only works for the plugin-based install. Added `SELECT * FROM mysql.component;` for verifying component installation, and kept `SHOW PLUGINS` for the plugin path.
4. **mask_pan and mask_pan_relaxed descriptions/results were swapped**: `mask_pan()` masks all but the last 4 digits (result: `XXXXXXXXXXXX1111`), while `mask_pan_relaxed()` keeps the first 6 and last 4 digits (result: `411111XXXXXX1111`). The post had these reversed. Swapped the comments and results.
5. **mask_inner result used wrong masking character**: Post showed `Jo******th` using asterisks. The default masking character for `mask_inner()` is `X`. Fixed to `JoXXXXXXth`.
6. **mask_outer result was incorrect**: For `mask_outer('john.doe@example.com', 4, 7)`, the first 4 and last 7 characters are masked. The correct result is `XXXX.doe@examXXXXXXX` (20 chars). Post showed `XXXXdoe@example.XXXXX` which had incorrect character counts. Fixed the result.
7. **mask_iban result used wrong masking character and preserved wrong characters**: `mask_iban()` defaults to `*` (not `X`) and keeps only the first two country-code letters visible. Fixed result from `DE89XXXXXXXXXXXX3000` to `DE********************`.

## Review Notes
- `mask_iban()` and `mask_uuid()` were introduced in MySQL 8.0.33 as component-only functions. They do not exist in the older plugin-based implementation. The post does not explicitly note this version requirement for these specific functions.
- `mask_iban()` and `mask_uuid()` use `*` as their default masking character, while `mask_inner()`, `mask_outer()`, `mask_pan()`, `mask_pan_relaxed()`, and `mask_ssn()` use `X`. This inconsistency in defaults could be worth noting for readers.
- The dictionary functions (`masking_dictionary_term_add`, `gen_dictionary`) are component-only features (8.0.33+) and are not available in the plugin-based version.
- MySQL Enterprise Data Masking requires a MySQL Enterprise Edition commercial license.
