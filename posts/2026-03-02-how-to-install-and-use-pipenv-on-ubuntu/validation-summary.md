# Validation Summary: How to Install and Use pipenv on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and usage guide

## Technologies Covered
- Ubuntu
- Python
- pip
- pipx
- pipenv
- virtualenv
- Pipfile and Pipfile.lock
- pyenv
- Docker
- requirements.txt
- Environment variables and .env files

## Sources Consulted
- Pipenv installation documentation: https://pipenv.pypa.io/en/latest/installation.html
- Pipenv command line interface documentation: https://pipenv.pypa.io/en/latest/cli.html
- Pipenv commands reference: https://pipenv.pypa.io/en/latest/commands.html
- Pipenv advanced usage documentation: https://pipenv.pypa.io/en/latest/advanced.html
- Pipenv configuration documentation: https://pipenv.pypa.io/en/stable/configuration.html
- Pipenv virtual environments documentation: https://pipenv.pypa.io/en/stable/virtualenv.html
- pipenv PyPI project page: https://pypi.org/project/pipenv/
- PEP 668: Marking Python base environments as externally managed: https://peps.python.org/pep-0668/

## Issues Found
- The post presented `pip install --user pipenv` as the simplest installation method. Current Pipenv documentation notes that this legacy user install can fail on modern Linux distributions such as Ubuntu 24.04+ because of PEP 668. I changed the first method to pipx, moved pip to a legacy method, and added the modern Ubuntu caveat.
- The project creation comment implied `.venv/` is created by default. Pipenv creates virtual environments under the user virtualenv directory by default, unless `PIPENV_VENV_IN_PROJECT=1` is set. I corrected the comment.
- The dependency update workflow used `pipenv check` for security scanning. Current Pipenv documentation marks `check` as deprecated and documents `pipenv scan` as the replacement. I changed the command to `pipenv scan`.
- The requirements examples duplicated `pipenv requirements --dev` and described it as generating locked exact versions. `pipenv requirements` already reads from `Pipfile.lock`; `--dev` includes dev packages, while `--dev-only` emits only dev packages. I corrected the comments and added `--dev-only` and `--hash` examples.
- The cleanup examples used `pipenv --rm`. Current Pipenv commands documentation marks that legacy flag as deprecated and recommends `pipenv remove`. I changed both examples to `pipenv remove`.

## Review Notes
The remaining examples are technically valid for a general Ubuntu/Pipenv workflow. The local machine did not have `python3-venv`/`ensurepip`, so I could not install a temporary local Pipenv binary for live CLI checks without changing system packages; validation was performed against current official Pipenv documentation and authoritative package metadata instead.
