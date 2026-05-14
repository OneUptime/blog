# How to Trace Library Calls with ltrace on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on trace library calls with ltrace using Red Hat Enterprise Linux 9.

---

ltrace traces calls to shared libraries. While strace shows kernel-level system calls, ltrace reveals the higher-level library functions a program invokes. This is particularly useful for understanding how applications interact with shared libraries.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Install ltrace

Trace library calls:

```bash
# Install ltrace

sudo dnf install -y ltrace gcc
```

On RHEL 9, a known issue prevents `ltrace` from tracing system executable files. This limitation does not apply to executables you build yourself.

Create a small test program:

```bash
cat > ltrace-demo.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    char *buffer = malloc(32);
    if (buffer == NULL) {
        return 1;
    }

    puts("ltrace demo");
    free(buffer);
    return 0;
}
EOF

gcc -o ltrace-demo ltrace-demo.c
```

## Step 3: Trace Library Calls

```bash

# Trace library calls for a command
ltrace ./ltrace-demo 2>&1 | head -50

# Trace a running process
ltrace -p <PID>

# Show only specific library calls
ltrace -e malloc+free ./ltrace-demo
```


## Verification

Confirm everything is working by reviewing the output:

```bash
# Review the generated output or log file
# Look for error patterns, failed calls, or resource issues

# Check that debug tools are installed
rpm -q ltrace gcc
```

## Troubleshooting

- If `ltrace` reports an error while tracing a system executable on RHEL 9, build and trace a user executable instead.
- Ensure all required packages are installed: `rpm -q ltrace gcc`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to review trace output carefully to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
