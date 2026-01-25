# How to Fix "ImportError: attempted relative import" in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Imports, Modules, Packages, Debugging

Description: Understand and fix the "ImportError: attempted relative import with no known parent package" error in Python with clear explanations and solutions.

---

The "ImportError: attempted relative import with no known parent package" error confuses many Python developers. It occurs when you try to use relative imports in a script that Python does not recognize as part of a package. This guide explains why it happens and how to fix it.

## Understanding the Error

The error appears when you use relative imports (with dots) in a file that Python runs as a standalone script.

```python
# my_module.py
from . import helper  # This causes the error when running: python my_module.py
```

The error message:

```
ImportError: attempted relative import with no known parent package
```

Or in older Python versions:

```
ImportError: attempted relative import in non-package
```

## Why This Happens

Python determines how to resolve imports based on how you run your code:

1. **As a module** (`python -m package.module`): Python knows the package structure
2. **As a script** (`python module.py`): Python does not know about any parent package

When you run a file directly with `python filename.py`, Python sets `__name__` to `"__main__"` and `__package__` to `None`. Relative imports need `__package__` to be set to work.

```python
# Check how your script is being run
print(f"__name__: {__name__}")
print(f"__package__: {__package__}")

# When run as script:
# __name__: __main__
# __package__: None

# When run as module:
# __name__: mypackage.mymodule
# __package__: mypackage
```

## Project Structure Example

Let's use this project structure for examples:

```
myproject/
    __init__.py
    main.py
    utils/
        __init__.py
        helper.py
        processor.py
```

## Solution 1: Run as a Module

Instead of running the file as a script, run it as a module.

```python
# utils/processor.py
from . import helper  # Relative import

def process():
    helper.do_something()
```

```bash
# Wrong - causes import error
python myproject/utils/processor.py

# Correct - run as module from project parent directory
python -m myproject.utils.processor
```

The `-m` flag tells Python to run the module as part of a package, setting `__package__` correctly.

## Solution 2: Use Absolute Imports

Replace relative imports with absolute imports using the full package path.

```python
# Instead of relative import
# from . import helper

# Use absolute import
from myproject.utils import helper
```

For this to work, the package must be importable. You can either:

1. Install the package with `pip install -e .` (development mode)
2. Add the project root to `PYTHONPATH`
3. Add the path programmatically

```python
# Adding path programmatically (not recommended for production)
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Now absolute imports work
from myproject.utils import helper
```

## Solution 3: Restructure as Installable Package

Create a proper package structure with `setup.py` or `pyproject.toml`.

```
myproject/
    pyproject.toml
    src/
        mypackage/
            __init__.py
            main.py
            utils/
                __init__.py
                helper.py
```

```toml
# pyproject.toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "mypackage"
version = "0.1.0"

[tool.setuptools.packages.find]
where = ["src"]
```

Install in development mode:

```bash
pip install -e .
```

Now imports work anywhere:

```python
from mypackage.utils import helper
```

## Solution 4: Use if __name__ == "__main__" Pattern

Structure your modules to be importable but also runnable.

```python
# utils/processor.py

# Use absolute or relative imports normally
from . import helper

def process():
    """Main processing function."""
    return helper.do_something()

def main():
    """Entry point when run directly."""
    result = process()
    print(result)

if __name__ == "__main__":
    main()
```

Then run as a module:

```bash
python -m myproject.utils.processor
```

## Solution 5: Conditional Import Based on Context

Handle both cases with conditional logic (useful during development).

```python
# utils/processor.py

try:
    # When run as part of package
    from . import helper
except ImportError:
    # When run as script
    import helper

def process():
    helper.do_something()
```

This approach has drawbacks and is not recommended for production code, but it can be useful during development.

## Common Scenarios and Fixes

### Scenario 1: Running Tests

```
myproject/
    mypackage/
        __init__.py
        module.py
    tests/
        test_module.py
```

```python
# tests/test_module.py

# This fails if you run: python tests/test_module.py
# from ..mypackage import module  # ERROR!

# Solution: Use absolute imports
from mypackage import module

def test_something():
    assert module.function() == expected
```

Run tests with pytest, which handles imports correctly:

```bash
pytest tests/
```

### Scenario 2: Scripts in Package

```
myproject/
    mypackage/
        __init__.py
        cli.py  # Command-line script
        core.py
```

```python
# mypackage/cli.py
from . import core  # Works when run as: python -m mypackage.cli

def main():
    core.run()

if __name__ == "__main__":
    main()
```

Add entry points in `pyproject.toml`:

```toml
[project.scripts]
mycommand = "mypackage.cli:main"
```

After installing, run with:

```bash
mycommand  # Works!
```

### Scenario 3: Jupyter Notebooks

Notebooks often have import issues. Use absolute imports and ensure the package is installed.

```python
# In a notebook cell

# Option 1: Install package
# !pip install -e /path/to/myproject

# Option 2: Add to path
import sys
sys.path.insert(0, '/path/to/myproject')

# Now imports work
from mypackage import module
```

## Understanding Import Types

```python
# Absolute import - uses full path from a known package
from mypackage.utils import helper
import mypackage.utils.helper

# Relative import - uses dots to indicate current/parent package
from . import helper           # Same package
from .. import other_module    # Parent package
from ..utils import helper     # Sibling package
```

Relative imports only work inside packages (directories with `__init__.py`) when Python knows the package context.

## Quick Reference

| How You Run | __name__ | __package__ | Relative Imports |
|-------------|----------|-------------|------------------|
| `python script.py` | `__main__` | `None` | Fail |
| `python -m package.script` | `__main__` | `package` | Work |
| `import package.script` | `package.script` | `package` | Work |

## Summary

The relative import error occurs because Python does not know the package context when running a file as a script. Solutions:

1. **Run as module**: `python -m package.module` instead of `python module.py`
2. **Use absolute imports**: `from mypackage.module import x`
3. **Make an installable package**: Use `pip install -e .` for development
4. **Use entry points**: Define console scripts in `pyproject.toml`

For new projects, structure them as proper installable packages from the start. This eliminates import issues and makes your code more shareable and testable.
