# Validation Summary: How to Build Python Packages and Publish to PyPI on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Python packaging
- PyPI and TestPyPI
- pyproject.toml
- Hatchling
- setuptools
- build
- twine
- pip
- GitHub Actions
- PyPI Trusted Publishing

## Sources Consulted
- Python Packaging User Guide: Packaging Python Projects: https://packaging.python.org/en/latest/tutorials/packaging-projects/
- Python Packaging User Guide: The Packaging Flow: https://packaging.python.org/en/latest/flow/
- Python Packaging User Guide: pyproject.toml specification: https://packaging.python.org/en/latest/specifications/pyproject-toml/
- Python Packaging User Guide: The .pypirc file: https://packaging.python.org/en/latest/specifications/pypirc/
- Python Packaging User Guide: Writing your pyproject.toml: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
- setuptools documentation: Build System Support: https://setuptools.pypa.io/en/stable/build_meta.html
- Hatch documentation: Builds: https://hatch.pypa.io/1.6/build/
- PyPI documentation: Publishing with a Trusted Publisher: https://docs.pypi.org/trusted-publishers/using-a-publisher/
- Twine documentation: https://twine.readthedocs.io/

## Issues Found
- The prerequisites section installed `build` and `twine` directly with `pip3` before creating a virtual environment. On modern Ubuntu systems this can conflict with externally managed Python environments, so I changed the commands to create and activate a virtual environment before installing the tools.
- The Hatchling `pyproject.toml` example used legacy license table metadata and a `License ::` Trove classifier. Current PyPA metadata guidance prefers an SPDX license string with `license-files`, and license classifiers are deprecated when license expressions are used. I changed the example to `license = "MIT"`, added `license-files = ["LICENSE"]`, and removed the license classifier.
- The setuptools example used `build-backend = "setuptools.backends.legacy:build"`, which is not the documented setuptools PEP 517 backend. I changed it to `build-backend = "setuptools.build_meta"` and updated the setuptools requirement to a current version that supports the modern license metadata.
- The TestPyPI installation command omitted `--no-deps`. PyPA's tutorial recommends `--no-deps` because TestPyPI does not mirror all packages from PyPI and dependency resolution can fail or install unexpected packages. I added `--no-deps` to the command.

## Review Notes
The remaining commands, project layout, Hatchling package selection, `.pypirc` format, Twine upload commands, PyPI token usage, version bump guidance, and GitHub Actions trusted publishing example are consistent with the official documentation reviewed.
