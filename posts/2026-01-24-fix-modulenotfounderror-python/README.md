# How to Fix 'ModuleNotFoundError' in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, ModuleNotFoundError, Import, Packages, Virtual Environments

Description: Understand and resolve Python's ModuleNotFoundError with practical solutions for import issues, path problems, and virtual environment configurations.

---

> "ModuleNotFoundError: No module named 'xyz'" is one of the most common errors Python developers encounter. While the message seems straightforward, the causes can range from a simple typo to complex environment configuration issues. This guide walks through the most common causes and their solutions.

The `ModuleNotFoundError` (introduced in Python 3.6, previously `ImportError`) occurs when Python cannot find the module you are trying to import. Understanding why this happens requires knowing how Python's import system works.

---

## Understanding Python's Import System

When you write `import something`, Python searches for the module in this order:

1. Built-in modules (like `sys`, `os`)
2. The directory containing the input script
3. Directories in `PYTHONPATH` environment variable
4. Installation-dependent default paths (site-packages)

```python
import sys

# View all paths Python searches
for path in sys.path:
    print(path)
```

If your module is not in any of these locations, you get `ModuleNotFoundError`.

---

## Common Cause 1: Package Not Installed

The most frequent cause is simply that the package is not installed:

```python
# This fails if requests is not installed
import requests
# ModuleNotFoundError: No module named 'requests'
```

### Solution: Install the Package

```bash
# Using pip
pip install requests

# If you have multiple Python versions
pip3 install requests

# Using a specific Python interpreter
python3 -m pip install requests

# With conda
conda install requests
```

### Verify Installation

```bash
# Check if package is installed
pip show requests

# List all installed packages
pip list

# Check from Python
python -c "import requests; print(requests.__version__)"
```

---

## Common Cause 2: Virtual Environment Issues

One of the most common scenarios is having packages installed in one environment but running Python from another:

```python
# You installed in global Python but running in a venv
# Or vice versa
```

### Solution: Verify Your Environment

```bash
# Check which Python you are using
which python
which python3

# On Windows
where python

# Check the environment in Python
import sys
print(sys.executable)
print(sys.prefix)
```

### Ensure Correct Environment is Active

```bash
# Activate virtual environment
# On Linux/macOS
source venv/bin/activate

# On Windows
venv\Scripts\activate

# Verify
which python  # Should point to venv/bin/python

# Then install packages
pip install requests
```

---

## Common Cause 3: Wrong Python Version

If you have multiple Python versions installed, packages might be installed for a different version:

```bash
# Installed for Python 3.8
python3.8 -m pip install requests

# But running with Python 3.10
python3.10 script.py
# ModuleNotFoundError!
```

### Solution: Use the Same Python for pip and Execution

```bash
# Always use python -m pip
python3 -m pip install requests
python3 script.py

# Or be explicit about version
python3.10 -m pip install requests
python3.10 script.py
```

---

## Common Cause 4: Package Name vs Import Name Mismatch

Some packages have different names on PyPI versus what you import:

```python
# Package name: opencv-python
# Import name: cv2
pip install opencv-python
import cv2

# Package name: Pillow
# Import name: PIL
pip install Pillow
from PIL import Image

# Package name: scikit-learn
# Import name: sklearn
pip install scikit-learn
import sklearn
```

### Common Mismatches

| PyPI Package Name | Import Name |
|------------------|-------------|
| opencv-python | cv2 |
| Pillow | PIL |
| scikit-learn | sklearn |
| beautifulsoup4 | bs4 |
| python-dateutil | dateutil |
| PyYAML | yaml |

---

## Common Cause 5: Local Module Conflicts

A local file with the same name as a standard library or installed package shadows it:

```python
# You have a file named 'random.py' in your directory
import random  # Imports YOUR random.py, not the built-in!
# This can cause confusing errors
```

### Solution: Rename Your File

```bash
# Bad file names (conflict with stdlib or common packages)
random.py
string.py
email.py
test.py
collections.py

# Check for conflicts
python -c "import random; print(random.__file__)"
# If it shows your local file, rename it!
```

---

## Common Cause 6: Package Structure Issues

For your own packages, incorrect structure causes import failures:

```
myproject/
    main.py
    utils/
        helper.py       # Missing __init__.py!
```

```python
# main.py
from utils import helper  # ModuleNotFoundError
```

### Solution: Add __init__.py Files

```
myproject/
    main.py
    utils/
        __init__.py     # Can be empty
        helper.py
```

Or use Python 3.3+ namespace packages (implicit namespace packages):

```python
# For namespace packages, ensure you're importing correctly
# and the parent directory is in sys.path
```

---

## Common Cause 7: Relative Import Issues

Relative imports require the code to be part of a package:

```python
# utils/helper.py
from . import config  # Relative import
```

Running directly causes errors:

```bash
python utils/helper.py
# ImportError: attempted relative import with no known parent package
```

### Solution: Run as Module

```bash
# Run as a module instead
python -m utils.helper

# Or from the parent directory
cd myproject
python -m utils.helper
```

---

## Common Cause 8: IDE/Editor Using Wrong Interpreter

Your IDE might be configured to use a different Python interpreter:

### VS Code

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Python: Select Interpreter"
3. Choose the correct interpreter (your venv or the one with packages)

### PyCharm

1. Go to Settings > Project > Python Interpreter
2. Select the correct interpreter
3. Verify packages are listed

---

## Debugging Techniques

### Check Module Search Path

```python
import sys
print("Python executable:", sys.executable)
print("Search path:")
for i, path in enumerate(sys.path):
    print(f"  {i}: {path}")
```

### Check If Module Exists

```python
import importlib.util

def check_module(module_name):
    spec = importlib.util.find_spec(module_name)
    if spec is None:
        print(f"Module '{module_name}' not found")
    else:
        print(f"Module '{module_name}' found at: {spec.origin}")

check_module('requests')
check_module('my_custom_module')
```

### Add Path Temporarily

```python
import sys
sys.path.insert(0, '/path/to/your/module')

# Now import should work
import your_module
```

### Using PYTHONPATH

```bash
# Add to PYTHONPATH temporarily
export PYTHONPATH="${PYTHONPATH}:/path/to/your/module"
python script.py

# Or inline
PYTHONPATH=/path/to/module python script.py
```

---

## Fixing Import in Different Scenarios

### Scenario: Script in Subdirectory

```
project/
    src/
        main.py
    lib/
        helper.py
```

```python
# main.py - trying to import from lib/
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from lib import helper  # Now works
```

### Scenario: Installed Package in Editable Mode

```bash
# For development, install your package in editable mode
pip install -e .

# This requires a setup.py or pyproject.toml
# Now you can import your package from anywhere
```

Example `pyproject.toml`:

```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "myproject"
version = "0.1.0"

[tool.setuptools.packages.find]
where = ["."]
```

---

## Prevention Best Practices

### Use requirements.txt

```bash
# Create requirements.txt
pip freeze > requirements.txt

# Install from requirements.txt
pip install -r requirements.txt
```

### Use Virtual Environments Consistently

```bash
# Create venv at project start
python -m venv venv

# Activate before any work
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Deactivate when done
deactivate
```

### Check Imports Early

```python
# At the top of your main script, verify critical imports
def check_dependencies():
    missing = []

    try:
        import requests
    except ImportError:
        missing.append('requests')

    try:
        import numpy
    except ImportError:
        missing.append('numpy')

    if missing:
        print(f"Missing packages: {', '.join(missing)}")
        print("Install with: pip install " + ' '.join(missing))
        sys.exit(1)

if __name__ == '__main__':
    check_dependencies()
```

---

## Summary

When you see `ModuleNotFoundError`:

1. **Check if installed**: `pip show module_name`
2. **Check environment**: `which python` and verify venv is active
3. **Check naming**: Is the import name different from package name?
4. **Check for conflicts**: Any local files shadowing modules?
5. **Check structure**: Are `__init__.py` files in place?
6. **Check IDE config**: Is your IDE using the right interpreter?

Most import errors come down to environment issues. When in doubt, create a fresh virtual environment, install your dependencies explicitly, and ensure your IDE is configured to use that environment.
