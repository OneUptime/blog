# Validation Summary: How to Fix 'Coverage Report' Generation Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Jest
- ts-jest
- Istanbul / NYC
- pytest-cov
- coverage.py
- TypeScript source maps
- GitHub Actions
- Codecov

## Sources Consulted
- Jest configuration documentation: https://jestjs.io/docs/configuration
- Jest CLI documentation: https://jestjs.io/docs/cli
- ts-jest options documentation: https://kulshekhar.github.io/ts-jest/docs/getting-started/options
- NYC README and configuration documentation: https://github.com/istanbuljs/nyc
- coverage.py configuration reference: https://coverage.readthedocs.io/en/latest/config.html
- pytest-cov configuration documentation: https://pytest-cov.readthedocs.io/en/latest/config.html
- TypeScript TSConfig sourceMap documentation: https://www.typescriptlang.org/tsconfig/sourceMap.html
- TypeScript TSConfig inlineSources documentation: https://www.typescriptlang.org/tsconfig/inlineSources.html
- Codecov GitHub Action README: https://github.com/codecov/codecov-action
- GitHub Actions artifact migration documentation: https://github.com/actions/upload-artifact/blob/main/docs/MIGRATION.md

## Issues Found
- The first Jest `collectCoverageFrom` example put both the incorrect and correct configuration under duplicate keys in the same `module.exports` object. Split them into separate config objects so the example does not rely on duplicate property behavior.
- The ts-jest TypeScript example used the deprecated `globals['ts-jest']` configuration style. Updated it to configure ts-jest through Jest's `transform` option, which is the current documented approach.
- The NYC ES modules example included a `node --experimental-vm-modules node_modules/.bin/nyc mocha` command, which is not the documented NYC pattern for loading transpilers or require hooks. Removed the command and kept the NYC config-based example.
- The Python coverage example was labeled as `pytest.ini or pyproject.toml` while using TOML-only `[tool.*]` sections. Updated the fence and comment to `pyproject.toml`.
- The pytest-cov example set `--cov=src` while also setting `source = ["src"]`; pytest-cov documents that `--cov=<value>` overrides coverage.py's `source` option. Changed it to `--cov`.
- The pytest-cov example used `dynamic_context = "test_function"` and `parallel = true` for pytest context and subprocess behavior. Updated it to `--cov-context=test` and `patch = ["subprocess"]` for current pytest-cov and coverage.py behavior.
- The coverage.py report example used `exclude_lines`, which replaces default exclusions. Updated it to `exclude_also` so default exclusions such as `pragma: no cover` are preserved.
- The Codecov GitHub Actions examples used `codecov/codecov-action@v4` without a token. Updated examples to `@v5` with `token: ${{ secrets.CODECOV_TOKEN }}` to match current Codecov guidance.
- The NYC merge examples generated JSON reports in report directories and then tried to merge/report from those directories as if they were raw NYC temp data. Updated the commands to preserve `.nyc_output`, use `nyc merge` on raw data, and generate reports from the raw coverage temp directory.
- The Jest multi-project example placed `coverageDirectory` inside individual project configs. Moved coverage collection and output settings to the root config so the example reflects Jest's root-level coverage behavior.

## Review Notes
- The remaining guidance is technically sound for the covered tools, but exact coverage behavior can still vary by project transform stack, module system, and tool versions.
- The post intentionally uses generic examples; production projects should pin compatible Jest, ts-jest, NYC, pytest-cov, and coverage.py versions in their own dependency files.
