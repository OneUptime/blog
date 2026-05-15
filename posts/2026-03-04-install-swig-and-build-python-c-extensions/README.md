# How to Install SWIG and Build Python C Extensions on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Python, Development, SWIG, Linux

Description: Learn how to install SWIG and Build Python C Extensions on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to install SWIG and build Python C extensions on RHEL. Following these steps will help you set up a reliable build environment on RHEL.

## Prerequisites

- RHEL 9 with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Installing SWIG and building Python C extensions requires the compiler toolchain, Python development headers, and the SWIG package. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf group install -y "Development Tools"
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y swig python3-devel python3-setuptools
```

Verify the installation:

```bash
swig -version
python3 --version
rpm -q swig python3-devel python3-setuptools
```

## Step 3: Create the Source and SWIG Interface Files

Create a small C library, header file, and SWIG interface file:

```bash
cat > example.h <<'EOF'
int add(int a, int b);
EOF

cat > example.c <<'EOF'
#include "example.h"

int add(int a, int b) {
    return a + b;
}
EOF

cat > example.i <<'EOF'
%module example
%{
#include "example.h"
%}

int add(int a, int b);
EOF
```

The `%module` directive names the Python module. The declarations after the `%}` block tell SWIG which C functions to expose.

## Step 4: Build the Python Extension

```bash
cat > setup.py <<'EOF'
from setuptools import Extension, setup

example_module = Extension(
    "_example",
    sources=["example.i", "example.c"],
)

setup(
    name="example",
    version="1.0",
    py_modules=["example"],
    ext_modules=[example_module],
)
EOF

python3 setup.py build_ext --inplace
```

## Step 5: Verify the Configuration

Test the generated Python module:

```bash
python3 - <<'EOF'
import example

print(example.add(2, 3))
EOF
```

The command should print:

```text
5
```

## Step 6: Check the Generated Files

SWIG generates a Python wrapper and setuptools builds a compiled extension:

```bash
ls -1 example.py example_wrap.c _example*.so
```

## Step 7: Performance Tuning

For production extensions, build with optimization flags and test with the same Python version you will use in production:

```bash
CFLAGS="-O2" python3 setup.py build_ext --inplace
```

## Security Considerations

- Build extensions as a regular user when possible
- Use trusted source code before compiling native extensions
- Keep compiler, Python, and SWIG packages updated with `dnf update`
- Avoid installing Python packages globally with `pip` as root on RHEL systems

## Troubleshooting

Common issues and solutions:

1. **`Python.h: No such file or directory`**: Install the matching Python development package, such as `python3-devel`
2. **`swig: command not found`**: Install the `swig` package and enable the CodeReady Linux Builder repository if necessary
3. **Import errors for `_example`**: Confirm that `python3 setup.py build_ext --inplace` completed and that `_example*.so` is in the same directory as `example.py`

## Conclusion

You have successfully installed SWIG and built a Python C extension on RHEL. Keep the build toolchain updated and rebuild extensions when you change Python versions.
