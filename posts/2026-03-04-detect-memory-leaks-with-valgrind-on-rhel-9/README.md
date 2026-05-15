# How to Detect Memory Leaks with Valgrind on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on detect memory leaks with valgrind using Red Hat Enterprise Linux 9.

---

Memory leaks happen when a program allocates memory but never frees it. Over time, this causes the process to consume more and more memory until the system runs out. Valgrind's Memcheck tool detects these leaks and reports exactly where the unfreed allocations occurred.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Install and Run Valgrind

Run Valgrind to detect memory leaks:

```bash
# Install Valgrind

sudo dnf install -y valgrind

# Run with leak detection
valgrind --leak-check=full --show-leak-kinds=all --track-origins=yes ./my_program

# Generate a detailed report
valgrind --leak-check=full --log-file=valgrind-report.txt ./my_program
```

Key output to look for:

- **definitely lost**: Memory that was allocated but never freed
- **indirectly lost**: Memory reachable only through lost pointers
- **possibly lost**: Memory that may or may not be leaked

## Step 3: Review the Valgrind Report

```bash
# View the generated report
cat valgrind-report.txt

# Search for leak summaries
grep -E "definitely lost|indirectly lost|possibly lost|still reachable" valgrind-report.txt
```


## Verification

Confirm everything is working by checking the Valgrind output:

```bash
# Review the generated output or log file
# Look for error patterns, failed calls, or resource issues

# Check that Valgrind is installed
rpm -q valgrind
```

## Troubleshooting

- If Valgrind cannot run the program, check that the program path is correct and executable.
- Ensure all required packages are installed: `rpm -q <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to review Valgrind reports regularly while debugging to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
