# Validation Summary: How to Manage ClickHouse with SaltStack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (database server and client packages)
- SaltStack (Salt) — master/minion configuration management
- SaltStack pillar data for environment-specific configuration
- SaltStack state modules: pkgrepo, pkg, file, service
- Jinja templating within Salt states

## Sources Consulted
- SaltStack official documentation for `pkgrepo.managed` state module (https://docs.saltproject.io/en/latest/ref/states/all/salt.states.pkgrepo.html) — verified apt vs. yum parameter differences (`baseurl` is yum-only, `name` with full source line is required for apt, `humanname` is yum/zypper-only, `refresh_db` deprecated since 2018.3.0)
- SaltStack official documentation for `state.apply` execution module (https://docs.saltproject.io/en/latest/ref/modules/all/salt.modules.state.html) — verified that `state.apply` without arguments runs highstate, while `state.apply <state_name>` requires an `init.sls` or matching `.sls` file
- ClickHouse official installation documentation for Debian/Ubuntu (https://clickhouse.com/docs/en/install) — verified correct apt repository format, distribution components (`stable`, `lts`), and GPG key URL

## Issues Found

### 1. Repository state mixed deb and RPM parameters
**What was wrong:** The `pkgrepo.managed` state used `baseurl` (a yum/RPM-only parameter) and `humanname` (a yum/zypper-only parameter) alongside a deb repository URL (`https://packages.clickhouse.com/deb`). The `name` parameter was set to `clickhouse` instead of the full apt source line required for Debian/Ubuntu systems. The `dist` and `comps` parameters, while valid for apt, are unnecessary when the full source line is provided in `name`.

**What was changed:** Replaced with proper apt repository configuration: `name` set to the full source line (`deb https://packages.clickhouse.com/deb lts main`), added `file` parameter to specify the sources list path, removed `baseurl`, `humanname`, `dist`, and `comps`.

### 2. Deprecated `refresh_db` parameter
**What was wrong:** The `refresh_db` parameter has been deprecated since Salt 2018.3.0.

**What was changed:** Replaced `refresh_db: true` with `refresh: true`.

### 3. Apply commands referenced non-existent state
**What was wrong:** The commands used `state.apply clickhouse`, which requires a `clickhouse/init.sls` or `clickhouse.sls` file to exist. The blog defines individual state files (`repo.sls`, `install.sls`, `config.sls`, `service.sls`) but no `init.sls`. These commands would fail with a "No matching sls" error.

**What was changed:** Changed to `state.apply` (without arguments) which runs the highstate, applying all states matched by the top file — the correct approach given the top file is defined.

### 4. Inconsistent minion naming in examples
**What was wrong:** The single-minion example used `ch01`, which does not match the `clickhouse_*` glob pattern defined in the top file. When running `state.apply` (highstate), `ch01` would not receive the clickhouse states because it doesn't match the top file targeting.

**What was changed:** Changed `ch01` to `clickhouse_01` for consistency with the `clickhouse_*` pattern in the top file.

## Review Notes
- The `key_url` points to a path under `/rpm/` (`https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key`) even though this is a deb repository. This is correct — ClickHouse's official Debian/Ubuntu installation instructions use this same URL. The GPG key is the same for both deb and RPM repositories.
- The Jinja expressions in `config.sls` (e.g., `{{ pillar['clickhouse']['listen_host'] }}`) are unquoted in the YAML. While this works because Salt processes Jinja before YAML parsing, it is a common source of errors if the pillar values contain YAML-special characters. Quoting them (e.g., `"{{ pillar['clickhouse']['listen_host'] }}"`) would be more robust but is not strictly required.
- The `watch_in` directive on the config state and the `require: - file: clickhouse-config` on the service state create a redundant dependency since `watch` implies `require`. This is not an error but is slightly redundant.
- The pillar data includes a `password` field and a `version` field that are never referenced in any of the state files shown. This is not an error (unused pillar data is harmless) but may confuse readers who expect to see them used.
- For modern Debian/Ubuntu systems (Debian 11+, Ubuntu 22.04+), `apt-key` is deprecated. A more modern approach would use `signed-by` in the source line with a keyring file, but this is an enhancement rather than an error in the current state.
