# How to Configure fanotify for File Access Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, fanotify, File Monitoring, Security, Kernel

Description: Use fanotify on Ubuntu to monitor and optionally control file access events across entire filesystems, enabling fine-grained access auditing and security enforcement.

---

fanotify is a Linux kernel subsystem for filesystem event notification, introduced in kernel 2.6.36 and significantly expanded since. Unlike inotify, which requires separate watches on each directory, fanotify can monitor an entire filesystem mount point with a single notification group. This makes it suitable for anti-virus scanning, security auditing, and backup solutions that need comprehensive coverage without tracking individual directories.

fanotify also has a unique capability inotify lacks: it can **intercept** file access and decide whether to allow or deny it, making it useful for implementing mandatory access controls in user space.

## Key Differences from inotify

| Feature | inotify | fanotify |
|---------|---------|---------|
| Scope | Per-file/directory watches | Entire mount point |
| Access control | No | Yes (FAN_ACCESS_PERM, FAN_OPEN_PERM) |
| Provides PID of accessor | No | Yes |
| File descriptor to file | No | Yes (via /proc/self/fd) |
| Required privilege | None | CAP_SYS_ADMIN |
| NFS support | No | Limited |

## Prerequisites

fanotify requires root privileges or `CAP_SYS_ADMIN`. Kernel 5.1+ is recommended for the `FAN_REPORT_FID` feature (needed for robust directory monitoring without race conditions).

```bash
# Check kernel version
uname -r

# fanotify API is available in glibc headers
sudo apt install build-essential manpages-dev
```

## Basic fanotify C Program

fanotify is a C API - there's no standalone CLI tool like inotifywait. You write programs against the fanotify API.

```c
// fanotify_monitor.c - Monitor file access events on a mount point
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <limits.h>
#include <sys/fanotify.h>
#include <sys/stat.h>

#define BUF_SIZE 4096

// Resolve a file descriptor to its path via /proc/self/fd
static void print_file_path(int fd)
{
    char path[PATH_MAX];
    char proc_path[64];
    ssize_t len;

    snprintf(proc_path, sizeof(proc_path), "/proc/self/fd/%d", fd);
    len = readlink(proc_path, path, sizeof(path) - 1);
    if (len > 0) {
        path[len] = '\0';
        printf("  File: %s\n", path);
    } else {
        printf("  File: (unknown)\n");
    }
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <mount-point>\n", argv[0]);
        return 1;
    }

    const char *mount_point = argv[1];

    // Initialize fanotify with notification class FAN_CLASS_NOTIF
    // For access control, use FAN_CLASS_CONTENT or FAN_CLASS_PRE_CONTENT
    int fan_fd = fanotify_init(FAN_CLASS_NOTIF | FAN_NONBLOCK,
                               O_RDONLY | O_LARGEFILE);
    if (fan_fd < 0) {
        perror("fanotify_init");
        return 1;
    }

    // Mark the entire mount point for monitoring
    // FAN_MARK_MOUNT watches the whole filesystem
    if (fanotify_mark(fan_fd,
                      FAN_MARK_ADD | FAN_MARK_MOUNT,
                      FAN_OPEN | FAN_CLOSE_WRITE | FAN_ACCESS,
                      AT_FDCWD,
                      mount_point) < 0) {
        perror("fanotify_mark");
        close(fan_fd);
        return 1;
    }

    printf("Monitoring %s for file events...\n", mount_point);
    printf("Press Ctrl+C to stop\n\n");

    char buf[BUF_SIZE];
    ssize_t len;

    while (1) {
        // Read fanotify events
        len = read(fan_fd, buf, sizeof(buf));
        if (len < 0) {
            if (errno == EAGAIN) {
                // No events right now - wait
                usleep(10000);
                continue;
            }
            perror("read");
            break;
        }

        // Process each event in the buffer
        struct fanotify_event_metadata *event;
        event = (struct fanotify_event_metadata *)buf;

        while (FAN_EVENT_OK(event, len)) {
            if (event->vers != FANOTIFY_METADATA_VERSION) {
                fprintf(stderr, "Unexpected fanotify metadata version\n");
                break;
            }

            // Print event info
            printf("Event:\n");
            printf("  PID: %d\n", event->pid);

            // Determine event type
            if (event->mask & FAN_OPEN)
                printf("  Type: OPEN\n");
            if (event->mask & FAN_ACCESS)
                printf("  Type: ACCESS (read)\n");
            if (event->mask & FAN_CLOSE_WRITE)
                printf("  Type: CLOSE_WRITE (modified)\n");

            // Print the file path using the provided file descriptor
            if (event->fd >= 0) {
                print_file_path(event->fd);
                close(event->fd);  // Must close the event fd
            }

            printf("\n");

            // Move to next event
            event = FAN_EVENT_NEXT(event, len);
        }
    }

    close(fan_fd);
    return 0;
}
```

Compile and run:

```bash
gcc -O2 -o fanotify_monitor fanotify_monitor.c

# Requires root for FAN_MARK_MOUNT
sudo ./fanotify_monitor /
```

## Access Control with fanotify

fanotify's most powerful feature is denying access. This requires `FAN_CLASS_CONTENT` or `FAN_CLASS_PRE_CONTENT` and the `FAN_OPEN_PERM` event type.

```c
// fanotify_access_control.c - Intercept and control file opens
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <limits.h>
#include <sys/fanotify.h>

#define BUF_SIZE 4096
#define BLOCKED_SUFFIX ".blocked"

static char *get_file_path(int fd)
{
    static char path[PATH_MAX];
    char proc_path[64];
    ssize_t len;

    snprintf(proc_path, sizeof(proc_path), "/proc/self/fd/%d", fd);
    len = readlink(proc_path, path, sizeof(path) - 1);
    if (len > 0) {
        path[len] = '\0';
        return path;
    }
    return NULL;
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <mount-point>\n", argv[0]);
        return 1;
    }

    // FAN_CLASS_CONTENT for permission events
    int fan_fd = fanotify_init(FAN_CLASS_CONTENT, O_RDONLY | O_LARGEFILE);
    if (fan_fd < 0) {
        perror("fanotify_init");
        return 1;
    }

    // Watch for file open events and request permission
    if (fanotify_mark(fan_fd,
                      FAN_MARK_ADD | FAN_MARK_MOUNT,
                      FAN_OPEN_PERM,
                      AT_FDCWD,
                      argv[1]) < 0) {
        perror("fanotify_mark");
        return 1;
    }

    printf("Access control active on %s\n", argv[1]);
    printf("Files with suffix '%s' will be blocked\n\n", BLOCKED_SUFFIX);

    char buf[BUF_SIZE];
    ssize_t len;

    while (1) {
        len = read(fan_fd, buf, sizeof(buf));
        if (len < 0) {
            perror("read");
            break;
        }

        struct fanotify_event_metadata *event;
        event = (struct fanotify_event_metadata *)buf;

        while (FAN_EVENT_OK(event, len)) {
            struct fanotify_response response;
            response.fd = event->fd;

            char *path = get_file_path(event->fd);
            int block = 0;

            if (path != NULL) {
                // Block access to files ending in .blocked
                size_t path_len = strlen(path);
                size_t suffix_len = strlen(BLOCKED_SUFFIX);

                if (path_len >= suffix_len &&
                    strcmp(path + path_len - suffix_len, BLOCKED_SUFFIX) == 0) {
                    printf("BLOCKED: PID %d tried to open %s\n",
                           event->pid, path);
                    block = 1;
                }
            }

            // Send allow or deny response
            response.response = block ? FAN_DENY : FAN_ALLOW;
            write(fan_fd, &response, sizeof(response));

            close(event->fd);
            event = FAN_EVENT_NEXT(event, len);
        }
    }

    close(fan_fd);
    return 0;
}
```

## Using fanotify for Security Auditing

A practical application is tracking which processes access sensitive files:

```c
// fanotify_audit.c - Audit sensitive file access with process info
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <limits.h>
#include <sys/fanotify.h>
#include <time.h>

#define BUF_SIZE 8192

// Get process name from /proc/PID/comm
static void get_proc_name(pid_t pid, char *name, size_t len)
{
    char path[64];
    int fd;
    ssize_t n;

    snprintf(path, sizeof(path), "/proc/%d/comm", pid);
    fd = open(path, O_RDONLY);
    if (fd >= 0) {
        n = read(fd, name, len - 1);
        if (n > 0) {
            name[n-1] = '\0';  // Remove trailing newline
        }
        close(fd);
    } else {
        strncpy(name, "unknown", len);
    }
}

// Get file path from event fd
static void get_file_path(int fd, char *path, size_t len)
{
    char proc_path[64];
    ssize_t n;

    snprintf(proc_path, sizeof(proc_path), "/proc/self/fd/%d", fd);
    n = readlink(proc_path, path, len - 1);
    if (n > 0) path[n] = '\0';
    else strncpy(path, "unknown", len);
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <path-to-watch>\n", argv[0]);
        return 1;
    }

    int fan_fd = fanotify_init(FAN_CLASS_NOTIF | FAN_REPORT_DFID_NAME,
                               O_RDONLY | O_LARGEFILE);
    if (fan_fd < 0) {
        // Fallback for older kernels without FAN_REPORT_DFID_NAME
        fan_fd = fanotify_init(FAN_CLASS_NOTIF, O_RDONLY | O_LARGEFILE);
        if (fan_fd < 0) {
            perror("fanotify_init");
            return 1;
        }
    }

    if (fanotify_mark(fan_fd, FAN_MARK_ADD | FAN_MARK_FILESYSTEM,
                      FAN_OPEN | FAN_CLOSE_WRITE | FAN_CREATE | FAN_DELETE,
                      AT_FDCWD, argv[1]) < 0) {
        // Fall back to mount-level if filesystem-level not supported
        if (fanotify_mark(fan_fd, FAN_MARK_ADD | FAN_MARK_MOUNT,
                          FAN_OPEN | FAN_CLOSE_WRITE,
                          AT_FDCWD, argv[1]) < 0) {
            perror("fanotify_mark");
            return 1;
        }
    }

    printf("Auditing file access on %s\n\n", argv[1]);

    char buf[BUF_SIZE];
    char file_path[PATH_MAX];
    char proc_name[256];
    time_t now;
    struct tm *tm_info;
    char time_str[26];

    while (1) {
        ssize_t len = read(fan_fd, buf, sizeof(buf));
        if (len <= 0) break;

        struct fanotify_event_metadata *event;
        event = (struct fanotify_event_metadata *)buf;

        while (FAN_EVENT_OK(event, len)) {
            now = time(NULL);
            tm_info = localtime(&now);
            strftime(time_str, sizeof(time_str), "%Y-%m-%d %H:%M:%S", tm_info);

            get_file_path(event->fd, file_path, sizeof(file_path));
            get_proc_name(event->pid, proc_name, sizeof(proc_name));

            printf("[%s] PID=%d (%s) -> %s [",
                   time_str, event->pid, proc_name, file_path);

            if (event->mask & FAN_OPEN)        printf("OPEN ");
            if (event->mask & FAN_CLOSE_WRITE) printf("WRITE ");
            if (event->mask & FAN_CREATE)      printf("CREATE ");
            if (event->mask & FAN_DELETE)      printf("DELETE ");
            printf("]\n");

            if (event->fd >= 0) close(event->fd);
            event = FAN_EVENT_NEXT(event, len);
        }
    }

    close(fan_fd);
    return 0;
}
```

Compile:

```bash
gcc -O2 -o fanotify_audit fanotify_audit.c

# Monitor sensitive directory
sudo ./fanotify_audit /etc/
```

## Running fanotify Monitor as a Service

```bash
sudo nano /etc/systemd/system/fanotify-audit.service
```

```ini
[Unit]
Description=fanotify File Access Audit
After=local-fs.target

[Service]
Type=simple
ExecStart=/usr/local/bin/fanotify_audit /etc
StandardOutput=journal
StandardError=journal
SyslogIdentifier=fanotify-audit
# Requires root for FAN_MARK_MOUNT
User=root

Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo install -m 755 fanotify_audit /usr/local/bin/
sudo systemctl enable --now fanotify-audit
sudo journalctl -u fanotify-audit -f
```

## fanotify Flags Reference

**fanotify_init flags:**
- `FAN_CLASS_NOTIF`: Notification only
- `FAN_CLASS_CONTENT`: Permission events after content is available
- `FAN_CLASS_PRE_CONTENT`: Permission events before content is available
- `FAN_NONBLOCK`: Non-blocking read
- `FAN_REPORT_FID`: Report file identifiers instead of fd (kernel 5.1+)

**fanotify_mark flags:**
- `FAN_MARK_MOUNT`: Mark entire mount point
- `FAN_MARK_FILESYSTEM`: Mark entire filesystem (kernel 4.20+)
- `FAN_MARK_ADD`: Add to mark

**Events:**
- `FAN_ACCESS`: File read
- `FAN_MODIFY`: File modified
- `FAN_OPEN`: File opened
- `FAN_CLOSE_WRITE`: File closed after write
- `FAN_CREATE`: File created (kernel 5.1+)
- `FAN_DELETE`: File deleted (kernel 5.1+)
- `FAN_OPEN_PERM`: Permission event for open (requires FAN_CLASS_CONTENT)

## Limitations

- Requires root or `CAP_SYS_ADMIN`
- Cannot watch network filesystems (NFS, CIFS) reliably
- `FAN_CREATE` and `FAN_DELETE` require kernel 5.1+
- Filesystem-level marks (`FAN_MARK_FILESYSTEM`) require kernel 4.20+
- The provided file descriptor gives the current file content, not the state at event time

## Summary

fanotify is the right tool when you need comprehensive filesystem monitoring across an entire mount point or when you need to control access in user space. Its ability to intercept file opens makes it valuable for implementing data loss prevention, antivirus scanning, and mandatory access control in user space. For simpler use cases watching specific directories without access control requirements, inotifywait is more accessible - but fanotify's scope and capabilities are genuinely unique when the use case requires them.
