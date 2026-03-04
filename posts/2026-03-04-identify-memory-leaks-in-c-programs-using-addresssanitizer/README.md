# How to Identify Memory Leaks in C Programs Using AddressSanitizer on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on identify memory leaks in c programs using addresssanitizer using Red Hat Enterprise Linux 9.

---

AddressSanitizer (ASan) is a compile-time instrumentation tool that detects memory errors such as buffer overflows, use-after-free, and memory leaks. It is built into GCC and Clang, making it easy to use on RHEL without installing additional software.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Compile and run with AddressSanitizer:

```bash
# Install GCC
sudo dnf install -y gcc gcc-c++

# Compile with AddressSanitizer enabled
gcc -fsanitize=address -g -o my_program my_program.c

# Run the program (ASan reports errors to stderr)
./my_program
```

Example output for a buffer overflow:

```
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x...
READ of size 4 at 0x... thread T0
    #0 0x... in main /path/to/file.c:10
```

For memory leak detection, add `-fsanitize=leak`:

```bash
gcc -fsanitize=address,leak -g -o my_program my_program.c
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status <service-name>

# Review recent logs
journalctl -u <service-name> --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
