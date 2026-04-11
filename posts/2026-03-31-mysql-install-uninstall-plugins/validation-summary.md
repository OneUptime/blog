# Validation Summary: How to Install and Uninstall MySQL Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (8.0+)
- MySQL Plugin System (`INSTALL PLUGIN` / `UNINSTALL PLUGIN`)
- MySQL Component System (`INSTALL COMPONENT` / `UNINSTALL COMPONENT`)
- MySQL configuration (`my.cnf` / `plugin-load-add`)
- `information_schema.PLUGINS`

## Sources Consulted
- MySQL 8.0 Reference Manual — INSTALL PLUGIN Statement: https://dev.mysql.com/doc/refman/8.0/en/install-plugin.html
- MySQL 8.0 Reference Manual — UNINSTALL PLUGIN Statement: https://dev.mysql.com/doc/refman/8.0/en/uninstall-plugin.html
- MySQL 8.0 Reference Manual — INSTALL COMPONENT Statement: https://dev.mysql.com/doc/refman/8.0/en/install-component.html
- MySQL 8.0 Reference Manual — Server Plugin Loading: https://dev.mysql.com/doc/refman/8.0/en/plugin-loading.html
- MySQL 8.0 Reference Manual — Connection Control Plugins: https://dev.mysql.com/doc/refman/8.0/en/connection-control-installation.html
- MySQL 8.0 Reference Manual — Password Validation Plugin: https://dev.mysql.com/doc/refman/8.0/en/validate-password-installation.html
- MySQL 8.0 Reference Manual — mysql.component Table: https://dev.mysql.com/doc/refman/8.0/en/component-table.html

## Issues Found

### 1. Incorrect description of plugin activation options (Section: "Disabling Without Uninstalling")
- **What was wrong:** The section title and introductory text said "Disable a plugin at startup without uninstalling it" but the example used `FORCE_PLUS_PERMANENT`, which does the opposite — it forces the plugin to remain loaded and prevents uninstalling at runtime. Additionally, the description of `FORCE` was inaccurate: the post claimed it "prevents disabling," but `FORCE` actually requires successful plugin initialization at startup (the server refuses to start if the plugin fails to load). It does not prevent the plugin from being disabled or uninstalled at runtime.
- **What was changed:** Renamed the section heading to "Controlling Plugin Activation at Startup," corrected the introductory text to accurately describe the purpose, and rewrote the explanation of `FORCE_PLUS_PERMANENT`, `OFF`, and `FORCE` to match their documented behavior.
- **Why:** The original text would mislead readers into thinking `FORCE_PLUS_PERMANENT` disables a plugin and that `FORCE` prevents disabling, both of which are the opposite of what these options actually do.

### 2. Malformed table in example output (Section: "Verifying Installation")
- **What was wrong:** The `VALIDATE PASSWORD` value in the example output table was missing a trailing space before the closing `|`, and the column separator width (`-----------------`) was too narrow for the data. This made the table visually inconsistent and not representative of actual MySQL output formatting.
- **What was changed:** Widened the third column separator and added proper padding spaces to all rows.
- **Why:** MySQL's tabular output is always consistently padded. The original table would confuse readers comparing their own output.

## Review Notes
- The macOS Homebrew plugin path listed (`/usr/local/lib/mysql/plugin/`) is correct for Intel Macs but Apple Silicon Macs use `/opt/homebrew/lib/mysql/plugin/`. This is not incorrect but could be noted in a future update.
- In MySQL 8.0, the `validate_password` plugin is deprecated in favor of the `validate_password` component. The post does cover both approaches, which is good, but a brief note that the component is preferred for new installations would be a useful future addition.
- All SQL syntax (`INSTALL PLUGIN`, `UNINSTALL PLUGIN`, `INSTALL COMPONENT`, `UNINSTALL COMPONENT`, `SHOW VARIABLES`, `information_schema.PLUGINS` query) is correct and current for MySQL 8.0.
- The `plugin-load-add` configuration directive syntax is correct.
- The troubleshooting steps for "Can't open shared library" errors are accurate and practical.
