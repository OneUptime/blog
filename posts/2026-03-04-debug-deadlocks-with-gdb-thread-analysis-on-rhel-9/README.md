# How to Debug Deadlocks with gdb Thread Analysis on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on debug deadlocks with gdb thread analysis using Red Hat Enterprise Linux 9.

---

A deadlock occurs when two or more threads are each waiting for the other to release a resource, resulting in all of them being stuck forever. gdb's thread analysis capabilities let you examine the state of every thread and identify which locks they are waiting on.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- gdb installed (`sudo dnf install gdb` if needed)
- A terminal session

## Step 1: Analyze the Process with gdb

Analyze deadlocks with gdb:

```bash
# Attach to a stuck process

sudo gdb -p <PID>

# List all threads
(gdb) info threads

# Switch to a specific thread
(gdb) thread 2

# Show backtrace for current thread
(gdb) bt

# Show backtrace for all threads
(gdb) thread apply all bt

# Look for mutex/lock waits in the backtraces
(gdb) thread apply all bt full
```

Look for threads blocked on `pthread_mutex_lock`, `__lll_lock_wait`, or similar functions. If two threads are each waiting for a lock held by the other, you have found your deadlock.

## Step 2: Detach from the Process

```gdb
# Detach and let the process continue
(gdb) detach

# Exit gdb
(gdb) quit
```


## Verification

Confirm everything is working by checking the generated output:

```bash
# Review the generated output or log file
# Look for error patterns, failed calls, or resource issues

# Check that gdb is installed
rpm -q gdb
```

## Troubleshooting

- If gdb cannot attach, confirm the PID is correct and run gdb with sufficient privileges.
- If backtraces only show addresses, install the matching debuginfo packages for the program and its libraries.

## Conclusion

You have successfully completed the analysis described in this guide. Remember to monitor the application and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
