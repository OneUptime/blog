# How to Use SystemTap for Dynamic Kernel Instrumentation on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kernel, Linux

Description: Step-by-step guide on use systemtap for dynamic kernel instrumentation using Red Hat Enterprise Linux 9.

---

SystemTap lets you write scripts that instrument a running kernel without recompiling or rebooting. You can trace function calls, monitor variables, aggregate statistics, and produce reports, all while the system continues to run.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Debug repositories enabled so the matching kernel debuginfo packages can be installed
- Root or sudo access
- A terminal session

## Step 2: Install SystemTap

Install and use SystemTap:

```bash
# Install SystemTap

sudo dnf install -y systemtap
sudo stap-prep

# Run a simple probe
sudo stap -e 'probe syscall.open { printf("%s opened %s\n", execname(), argstr) }'

# Trace disk I/O per process
sudo stap -e '
probe ioblock.request {
    printf("%s(%d) %s %d bytes\n", execname(), pid(), bio_rw_str(rw), size)
}
'
```

## Step 3: Run and Stop Probes

```bash
# Run a probe from a script file
sudo stap script.stp

# Stop a running probe
Ctrl+C
```


## Verification

Confirm everything is working by running a short test probe:

```bash
sudo stap -v -e 'probe kernel.function("vfs_read") { printf("read performed\n"); exit() }'
```

## Troubleshooting

- If `stap-prep` cannot install the required kernel packages, install them manually with `sudo dnf install kernel-debuginfo-$(uname -r) kernel-debuginfo-common-$(uname -m)-$(uname -r) kernel-devel-$(uname -r)`.
- Ensure the running kernel matches the installed debuginfo and development packages with `uname -r` and `rpm -qa | grep kernel`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor probe output regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
