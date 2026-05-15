# How to Set Up a C/C++ Development Environment on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, C/C++, Development, Linux

Description: Learn how to set Up a C/C++ Development Environment on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up a C/C++ Development Environment on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Setting up a C/C++ development environment requires installing the compiler toolchain, build utilities, debugger, and optional profiling tools. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf groupinstall -y "Development Tools"
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y gcc gcc-c++ gdb make cmake git
```

Verify the installation:

```bash
rpm -q gcc gcc-c++ gdb make cmake git
```

## Step 3: Configure Git

Set the Git identity used for commits:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Replace the name and email address with the values you want to use for your projects.

## Step 4: Install Optional Toolchains

```bash
sudo dnf install -y llvm-toolset
```

Install the LLVM toolset if you want to use Clang, LLDB, or other LLVM-based tools alongside GCC.

## Step 5: Verify the Configuration

Check the compiler and debugger versions:

```bash
gcc --version
g++ --version
gdb --version
```

Build a small C program:

```bash
cat > hello.c <<'EOF'
#include <stdio.h>

int main(void) {
    puts("Hello from C on RHEL");
    return 0;
}
EOF

gcc -Wall -Wextra -g hello.c -o hello
./hello
```

## Step 6: Install Debugging Tools

For deeper troubleshooting, install common debugging and tracing tools:

```bash
sudo dnf install -y valgrind strace ltrace
```

These tools help inspect memory errors, system calls, and library calls while developing native applications.

## Step 7: Performance Tuning

Install performance measurement tools when you need to profile application behavior:

```bash
sudo dnf install -y perf sysstat
perf stat ./hello
```

## Security Considerations

- Build and test applications as a normal user rather than root
- Use compiler warnings such as `-Wall` and `-Wextra` during development
- Keep debug symbols in development builds with `-g`
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Compiler not found**: Verify the package is installed with `rpm -q gcc gcc-c++`
2. **Missing headers or libraries**: Install the matching `-devel` package for the library you are using
3. **Permission denied**: Build inside a directory owned by your user and verify file ownership with `ls -la`

## Conclusion

You have successfully set up a C/C++ development environment on RHEL. Keep the toolchain updated and verify builds regularly to maintain security and reliability.
