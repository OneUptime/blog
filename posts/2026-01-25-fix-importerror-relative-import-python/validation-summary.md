# Validation Summary: How to Fix 'ImportError: attempted relative import' in Python

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Python import system
- Python packages and modules
- Python command-line module execution with `-m`
- pip editable installs
- setuptools `pyproject.toml` package discovery
- pytest test execution
- Jupyter notebook import paths

## Sources Consulted
- Python documentation: The import system, package relative imports, and `__main__`: https://docs.python.org/3/reference/import.html
- Python documentation: Command-line `-m` and script execution behavior: https://docs.python.org/3/using/cmdline.html#cmdoption-m
- Python Packaging User Guide: Writing `pyproject.toml`: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
- Python Packaging User Guide: Development/editable installs: https://packaging.python.org/en/latest/guides/distributing-packages-using-setuptools/#working-in-development-mode
- setuptools documentation: Package discovery with `[tool.setuptools.packages.find]`: https://setuptools.pypa.io/en/latest/userguide/package_discovery.html
- pytest documentation: Import mechanisms and `sys.path` / `PYTHONPATH`: https://docs.pytest.org/en/stable/explanation/pythonpath.html

## Issues Found
- The `python -m` example showed `__name__` as the module's qualified name. When a module is executed with `python -m`, Python executes it as `__main__`; the post now shows `__name__: __main__` and keeps `__package__` as the package context.
- The programmatic `sys.path` example inserted `Path(__file__).parent.parent`, which points at the `myproject` package directory for `myproject/utils/processor.py`. To import `myproject.utils`, Python needs the parent directory of `myproject` on `sys.path`; the example now uses `Path(__file__).resolve().parents[2]`.
- The `if __name__ == "__main__"` section implied the relative-import module was directly runnable. With `from . import helper`, it still needs package context, so the wording now says it is runnable with `python -m`.
- The relative-import summary described packages only as directories with `__init__.py`. Python also supports namespace packages, so the wording now distinguishes regular packages from namespace packages.

## Review Notes
The remaining examples and commands are technically sound for modern Python. The post intentionally uses `pip install -e .`; official packaging documentation often shows `python3 -m pip install -e .`, but the shorter command is still common and valid when `pip` is on the intended interpreter path.
