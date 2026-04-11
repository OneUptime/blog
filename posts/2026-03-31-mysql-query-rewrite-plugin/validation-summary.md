# Validation Summary: How to Use the MySQL Query Rewrite Plugin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- MySQL Rewriter Query Rewrite Plugin
- SQL query optimization via rewrite rules

## Sources Consulted
- MySQL 8.0 Reference Manual - Section 7.6.4 "The Rewriter Query Rewrite Plugin" (https://dev.mysql.com/doc/refman/8.0/en/rewriter-query-rewrite-plugin.html)
- MySQL 8.0 Reference Manual - Section 7.6.4.1 "Installing or Uninstalling the Rewriter Query Rewrite Plugin" (https://dev.mysql.com/doc/refman/8.0/en/rewriter-query-rewrite-plugin-installation.html)
- MySQL 8.0 Reference Manual - Section 7.6.4.2 "Using the Rewriter Query Rewrite Plugin" (https://dev.mysql.com/doc/refman/8.0/en/rewriter-query-rewrite-plugin-usage.html)
- MySQL 8.0 Reference Manual - Section 7.6.4.3 "Rewriter Query Rewrite Plugin Reference" (https://dev.mysql.com/doc/refman/8.0/en/rewriter-query-rewrite-plugin-reference.html)
- MySQL Server source code (plugin/rewriter/ directory, install_rewriter.sql.in)

## Issues Found

1. **Manual install steps caused duplicate plugin installation**: The blog originally showed running `INSTALL PLUGIN rewriter SONAME 'rewriter.so'` followed by `SOURCE install_rewriter.sql`. However, the `install_rewriter.sql` script already contains the `INSTALL PLUGIN` statement, so running both would produce a duplicate plugin error. Fixed by removing the redundant `INSTALL PLUGIN` command and showing only the `SOURCE` approach for the manual install path. Also changed the verification query to use `SHOW GLOBAL VARIABLES LIKE 'rewriter_enabled'`, which is the method recommended in the official documentation.

2. **Non-existent status variable `Rewriter_number_warnings`**: The blog listed `Rewriter_number_warnings` as a Rewriter status variable, but this variable does not exist in MySQL. The actual status variables are `Rewriter_number_loaded_rules`, `Rewriter_number_reloads`, `Rewriter_number_rewritten_queries`, and `Rewriter_reload_error`. Fixed by replacing the fabricated variable with the correct ones and updating their descriptions.

## Review Notes
- The install script path `/usr/share/mysql/install_rewriter.sql` varies by MySQL version and packaging method. On MySQL 8.0 RPM/DEB packages it is typically `/usr/share/mysql-8.0/install_rewriter.sql`, while tarball installs place it under `<basedir>/share/`. The blog uses the 5.7-era convention which may still work on some distributions. Since the official docs simply refer to "the share directory of your MySQL installation" without specifying an absolute path, the hardcoded path is acceptable as a common example but readers may need to adjust it.
- The plugin verification query using `information_schema.plugins WHERE plugin_name = 'rewriter'` works because MySQL string comparisons on information_schema are case-insensitive, even though the plugin is registered as `Rewriter` (capital R). The fix changed this to the canonical `SHOW GLOBAL VARIABLES` approach.
- All SQL syntax in the rewrite rule examples (INSERT, UPDATE, DELETE, `?` placeholders, `flush_rewrite_rules()` procedure, `enabled = 'NO'` enum value) is correct per the official documentation.
- The `pattern_database` column usage and the omission of auto-populated columns (`pattern_digest`, `normalized_pattern`) are both appropriate for a tutorial-level post.
