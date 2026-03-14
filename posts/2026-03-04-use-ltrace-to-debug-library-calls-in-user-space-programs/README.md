# How to Use ltrace to Debug Library Calls in User-Space Programs on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ltrace, Debugging, Linux

Description: Learn how to use ltrace to Debug Library Calls in User-Space Programs on RHEL with step-by-step instructions, configuration examples, and best practices.

---

ltrace traces library calls made by user-space programs, showing which shared library functions an application calls and what arguments it passes. While strace shows kernel-level system calls, ltrace shows the higher-level library interface.

## Prerequisites

- RHEL
- Root or sudo access

## Step 1: Install ltrace

```bash
sudo dnf install -y ltrace
```

## Step 2: Trace a Command

```bash
ltrace ls /tmp
```

You will see calls to libc functions like `opendir`, `readdir`, `strcmp`, and `printf`.

## Step 3: Trace a Running Process

```bash
ltrace -p $(pidof myapp)
```

## Step 4: Filter by Library

Trace only calls to a specific library:

```bash
ltrace -l libssl.so.* openssl s_client -connect example.com:443
```

## Step 5: Show Return Values

ltrace shows return values by default. To also see the time spent:

```bash
ltrace -T ls /tmp
```

## Step 6: Count Calls

```bash
ltrace -c ls /tmp
```

This produces a summary of how many times each library function was called:

```bash
% time     seconds  usecs/call     calls      function
------ ----------- ----------- --------- --------------------
 35.00    0.000210          21        10 strlen
 25.00    0.000150          15        10 strcmp
```

## Step 7: Trace Child Processes

```bash
ltrace -f /usr/bin/make
```

## Step 8: Save Output

```bash
ltrace -o /tmp/ltrace.log myapp
```

## Comparing strace and ltrace

| Feature | strace | ltrace |
|---------|--------|--------|
| Traces | System calls (kernel) | Library calls (user space) |
| Overhead | Lower | Higher |
| Use case | Permission, I/O, network issues | Application logic, library bugs |

## Conclusion

ltrace complements strace by showing library-level interactions on RHEL. Use it to understand how applications use shared libraries, debug linking issues, and profile function call patterns.
