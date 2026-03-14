# How to List Open Files and Network Connections with lsof on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Lsof, Debugging, Linux

Description: Learn how to list Open Files and Network Connections with lsof on RHEL with step-by-step instructions, configuration examples, and best practices.

---

lsof (List Open Files) shows all files opened by running processes, including regular files, directories, network sockets, pipes, and devices. On Linux, everything is a file, making lsof an incredibly versatile diagnostic tool.

## Prerequisites

- RHEL
- Root or sudo access for viewing other users' files

## Step 1: Install lsof

```bash
sudo dnf install -y lsof
```

## Step 2: List All Open Files

```bash
sudo lsof
```

This produces a lot of output. Use filters to narrow it down.

## Step 3: List Files Opened by a Process

```bash
sudo lsof -p $(pidof httpd)
```

Or by name:

```bash
sudo lsof -c httpd
```

## Step 4: Find Who Is Using a File

```bash
sudo lsof /var/log/messages
```

## Step 5: Find Processes Using a Port

```bash
sudo lsof -i :80
sudo lsof -i :443
```

List all network connections:

```bash
sudo lsof -i
```

Filter by protocol:

```bash
sudo lsof -i TCP
sudo lsof -i UDP
```

## Step 6: Find Processes Using a Directory

```bash
sudo lsof +D /var/log/
```

This is useful for finding which processes prevent you from unmounting a filesystem.

## Step 7: List Network Connections for a Process

```bash
sudo lsof -i -a -p $(pidof nginx)
```

The `-a` flag means AND (both conditions must match).

## Step 8: Find Deleted Files Still Held Open

```bash
sudo lsof | grep deleted
```

This helps recover disk space when files are deleted but processes still hold them open.

## Step 9: Show Established Connections

```bash
sudo lsof -i TCP -s TCP:ESTABLISHED
```

## Common Options

| Option | Description |
|--------|-------------|
| `-p PID` | Filter by process ID |
| `-c NAME` | Filter by command name |
| `-u USER` | Filter by user |
| `-i [ADDR]` | Network files (optional address filter) |
| `+D DIR` | Recursively search directory |
| `-t` | Show only PIDs (for scripting) |
| `-n` | Do not resolve hostnames |
| `-P` | Do not resolve port names |

## Scripting Example

Kill all processes using a specific file:

```bash
sudo kill $(sudo lsof -t /path/to/file)
```

## Conclusion

lsof is a fundamental diagnostic tool on RHEL for understanding which processes use which files and network connections. It is essential for troubleshooting disk space issues, port conflicts, and file locking problems.
