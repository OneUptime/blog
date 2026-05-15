# Validation Summary: How to Configure pytest with Coverage Reporting on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- Python
- pytest
- pytest-cov
- coverage.py
- pyproject.toml
- setup.cfg
- GitHub Actions
- Codecov

## Sources Consulted
- pytest configuration documentation: https://docs.pytest.org/en/stable/reference/customize.html
- pytest-cov configuration and CLI option documentation: https://pytest-cov.readthedocs.io/en/latest/config.html
- coverage.py configuration reference: https://coverage.readthedocs.io/en/7.10.7/config.html
- coverage.py command documentation: https://coverage.readthedocs.io/en/7.11.2/commands/index.html
- coverage.py exclusion documentation: https://coverage.readthedocs.io/en/7.14.0/excluding.html
- Codecov GitHub Action documentation: https://github.com/codecov/codecov-action
- Local CLI verification with pytest 9.0.3, pytest-cov 7.1.0, and coverage.py 7.14.0

## Issues Found
- The sample project uses a `src/` layout, but the pytest configuration did not make `src` importable. Added `pythonpath = ["src"]` to the `pyproject.toml` example and `pythonpath = src` to the `setup.cfg` example so `from mypackage.calculator import Calculator` works when following the tutorial directly.
- The sample tests did not cover `Calculator.power()`, so the documented `fail_under = 80` setting caused the sample project to fail with 58% coverage. Added `test_power()` to cover positive and negative exponents, bringing the sample to 100% coverage.
- The GitHub Actions example used `codecov/codecov-action@v3`. Updated it to `codecov/codecov-action@v5`, changed `file` to `files`, and added `token: ${{ secrets.CODECOV_TOKEN }}` to match current Codecov action guidance.

## Review Notes
- The pytest-cov report formats, `--cov-branch`, `--cov-fail-under`, and `--cov-report=` examples were verified against pytest-cov documentation and local CLI help.
- The coverage.py `pyproject.toml`, `setup.cfg`, report, combine, HTML, XML, JSON, and exclusion examples align with coverage.py documentation.
- `setup.cfg` remains technically valid for pytest configuration, though pytest documentation recommends `pyproject.toml` or `pytest.ini` for anything beyond simple use cases.
