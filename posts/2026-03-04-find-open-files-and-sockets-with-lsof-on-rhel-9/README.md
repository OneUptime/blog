# How to Find Open Files and Sockets with lsof on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on find open files and sockets with lsof using Red Hat Enterprise Linux 9.

---

lsof (list open files) shows every file descriptor a process has open, including regular files, directories, network sockets, pipes, and device files. Since Linux treats almost everything as a file, lsof gives you a comprehensive view of what a process is doing.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install lsof

Install the lsof package if it is not already installed:

```bash
sudo dnf install lsof
```

## Step 2: Inspect Open Files and Sockets

Use lsof to inspect open files and connections:

```bash
# Show all open files for a process
lsof -p <PID>

# Show all network connections
lsof -i

# Show who has a specific file open
lsof /var/log/messages

# Show all files opened by a user
lsof -u nginx

# Show listening ports
lsof -iTCP -sTCP:LISTEN -P -n
```

## Step 3: Check lsof Output

```bash
# Confirm lsof is installed and available
lsof -v

# Check which process is listening on port 22
lsof -iTCP:22 -sTCP:LISTEN -P -n
```


## Verification

Confirm lsof can list open files and sockets:

```bash
# List open files for the current shell
lsof -p $$

# List active network sockets without DNS or service-name lookups
lsof -i -P -n
```

## Troubleshooting

- If `lsof` is not found, install it with `sudo dnf install lsof`.
- If expected processes are missing from the output, rerun the command with `sudo` so lsof can inspect processes owned by other users.

## Conclusion

You have successfully used lsof to inspect open files and sockets on RHEL. Remember to rerun lsof with `sudo` when you need a system-wide view and keep your RHEL system updated with the latest security patches.
