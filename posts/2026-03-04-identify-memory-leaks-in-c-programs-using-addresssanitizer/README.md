# How to Identify Memory Leaks in C Programs Using AddressSanitizer on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on identify memory leaks in c programs using addresssanitizer using Red Hat Enterprise Linux 9.

---

AddressSanitizer (ASan) is a compile-time instrumentation tool that detects memory errors such as buffer overflows and use-after-free bugs. LeakSanitizer (LSan) can be used with ASan to detect memory leaks. These sanitizers are supported by GCC and Clang, making them easy to use on RHEL after installing the compiler packages.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Compile the Program

Compile and run with AddressSanitizer:

```bash
# Install GCC

sudo dnf install -y gcc gcc-c++

# Compile with AddressSanitizer enabled
gcc -fsanitize=address -g -fno-omit-frame-pointer -o my_program my_program.c

# Run the program (ASan reports errors to stderr)
./my_program
```

Example output for a buffer overflow:

```bash
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x...
READ of size 4 at 0x... thread T0
    #0 0x... in main /path/to/file.c:10
```

For memory leak detection, add `-fsanitize=leak` or keep `detect_leaks=1` enabled in `ASAN_OPTIONS`:

```bash
gcc -fsanitize=address,leak -g -fno-omit-frame-pointer -o my_program my_program.c
```

## Step 3: Run Leak Detection

```bash
# Run the program with leak detection enabled
ASAN_OPTIONS=detect_leaks=1 ./my_program

# Show available AddressSanitizer runtime options
ASAN_OPTIONS=help=1 ./my_program
```


## Verification

Confirm everything is working by checking the program output:

```bash
# A leak report starts like this
==12345==ERROR: LeakSanitizer: detected memory leaks
```

## Troubleshooting

- If sanitizer reports do not include source lines, compile with `-g` and run the program from the build host where the source files are available.
- If a leak is not reported, make sure leak detection is enabled with `ASAN_OPTIONS=detect_leaks=1` and that the executable was linked with the sanitizer flags.

## Conclusion

You have successfully compiled and run a C program with AddressSanitizer and LeakSanitizer. Use these flags during development and testing to catch memory issues early. For production environments, build without sanitizer flags unless you have a specific diagnostic reason to keep them enabled.
