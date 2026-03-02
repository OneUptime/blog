# How to Configure Apache Worker vs Prefork vs Event MPM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Performance, Web Server, Configuration

Description: Understand the differences between Apache's Prefork, Worker, and Event MPMs, when to use each one, and how to configure and tune them on Ubuntu.

---

Apache's Multi-Processing Module (MPM) determines how it handles connections and spawns worker processes. The choice of MPM significantly affects performance, memory use, and compatibility with PHP. Ubuntu ships with multiple MPMs available, but only one can be active at a time.

## The Three MPMs Explained

### Prefork MPM

Prefork uses a single-threaded process model. Each child process handles one request at a time. New connections wait until a process is free.

```
Main Process
├── Worker Process 1  (handles request A)
├── Worker Process 2  (handles request B)
├── Worker Process 3  (handles request C - idle)
└── Worker Process 4  (handles request D - idle)
```

**Characteristics:**
- Stable and battle-tested
- High memory usage (each process has its own memory space)
- Required for `mod_php` (the old PHP embedding method)
- Not compatible with HTTP/2
- Safe for non-thread-safe PHP extensions
- Slower under high concurrent load

**Use when:** You must use `mod_php` with legacy PHP extensions that aren't thread-safe.

### Worker MPM

Worker uses a hybrid multi-process, multi-thread model. Each process contains multiple threads, and each thread handles one request.

```
Main Process
├── Child Process 1
│   ├── Thread 1 (handles request A)
│   ├── Thread 2 (handles request B)
│   └── Thread 3 (handles request C - idle)
└── Child Process 2
    ├── Thread 1 (handles request D)
    ├── Thread 2 (idle)
    └── Thread 3 (idle)
```

**Characteristics:**
- Lower memory usage than Prefork
- Higher concurrency than Prefork
- Thread-safe code required (modules and PHP)
- Not compatible with `mod_php` (use PHP-FPM instead)
- Compatible with HTTP/2

**Use when:** You need better performance than Prefork and are using PHP-FPM, but want the stability of process isolation.

### Event MPM

Event is an evolution of Worker that adds asynchronous handling of keep-alive connections. Dedicated threads manage persistent connections, freeing worker threads to handle active requests.

```
Main Process
├── Child Process 1
│   ├── Listener Thread (manages keep-alive connections, dispatches requests)
│   ├── Worker Thread 1 (handles active request A)
│   ├── Worker Thread 2 (handles active request B)
│   └── Worker Thread 3 (idle)
└── Child Process 2
    ├── Listener Thread
    ├── Worker Thread 1 (idle)
    └── Worker Thread 2 (idle)
```

**Characteristics:**
- Best performance for high-traffic sites
- Handles keep-alive connections efficiently
- Required for HTTP/2
- Thread-safe code required
- Not compatible with `mod_php`
- Default on Ubuntu 22.04 and 24.04 when PHP-FPM is used

**Use when:** Running a production web server with PHP-FPM, especially if you need HTTP/2.

## Checking the Current MPM

```bash
# Check which MPM is currently active
sudo apache2ctl -M | grep mpm

# More readable output
sudo apache2ctl -V | grep MPM

# Check via loaded modules
ls /etc/apache2/mods-enabled/ | grep mpm
```

## Switching Between MPMs

### Switching to Event MPM (Recommended for PHP-FPM)

```bash
# First, disable mod_php if it's installed
sudo a2dismod php8.3  # Use your PHP version

# Disable current MPM
sudo a2dismod mpm_prefork

# Enable Event MPM
sudo a2enmod mpm_event

# Enable PHP-FPM instead
sudo apt install php8.3-fpm
sudo a2enmod proxy_fcgi setenvif
sudo a2enconf php8.3-fpm

# A restart is required for MPM changes
sudo systemctl restart apache2

# Verify
sudo apache2ctl -M | grep mpm
```

### Switching to Prefork (for mod_php compatibility)

```bash
# Disable Event or Worker
sudo a2dismod mpm_event

# Enable Prefork
sudo a2enmod mpm_prefork

# Enable mod_php
sudo a2dismod proxy_fcgi setenvif
sudo a2disconf php8.3-fpm
sudo a2enmod php8.3

sudo systemctl restart apache2
```

## Configuring MPM Settings

Each MPM has its own configuration file in `/etc/apache2/mods-available/`:

```bash
# View the current MPM configuration
cat /etc/apache2/mods-available/mpm_event.conf
# or mpm_prefork.conf or mpm_worker.conf
```

### Prefork Configuration

```bash
sudo nano /etc/apache2/mods-available/mpm_prefork.conf
```

```apache
<IfModule mpm_prefork_module>
    # Initial number of server processes to start
    StartServers             5

    # Minimum number of idle server processes
    MinSpareServers          5

    # Maximum number of idle server processes
    MaxSpareServers         10

    # Maximum number of connections any process can handle before respawning
    # Helps prevent memory leaks (0 = unlimited)
    MaxConnectionsPerChild   1000

    # Maximum number of simultaneous connections Apache will handle
    # This is the absolute ceiling - no more than this many requests at once
    MaxRequestWorkers       150

    # How long to wait for a client to send the complete request
    ServerLimit              150
</IfModule>
```

**Tuning Prefork:**
- `MaxRequestWorkers` is the key setting - it limits concurrent requests
- Each worker uses memory (typically 30-50MB per process)
- Rule of thumb: `MaxRequestWorkers` = (Available RAM) / (Size of one Apache process)
- Check process size: `ps aux | grep apache2 | awk '{print $6}'` (RSS in KB)

### Worker Configuration

```bash
sudo nano /etc/apache2/mods-available/mpm_worker.conf
```

```apache
<IfModule mpm_worker_module>
    # Number of child processes to start
    StartServers             2

    # Minimum/maximum number of idle threads
    MinSpareThreads         25
    MaxSpareThreads         75

    # Number of threads per child process
    ThreadsPerChild         25

    # Maximum number of request workers (total threads across all processes)
    MaxRequestWorkers      150

    # Maximum number of child processes
    ServerLimit              6

    # Thread limit per child process
    ThreadLimit             64

    # Max connections per child before respawning (0 = unlimited)
    MaxConnectionsPerChild   1000
</IfModule>
```

### Event Configuration

```bash
sudo nano /etc/apache2/mods-available/mpm_event.conf
```

```apache
<IfModule mpm_event_module>
    # Number of child processes at startup
    StartServers             2

    # Min/max idle threads across all processes
    MinSpareThreads         25
    MaxSpareThreads         75

    # Threads per child process (including listener thread)
    ThreadsPerChild         25

    # Maximum concurrent connections
    MaxRequestWorkers      150

    # Maximum child processes
    ServerLimit              4

    # Thread limit (must be >= ThreadsPerChild)
    ThreadLimit             64

    # Max connections per child before graceful restart
    MaxConnectionsPerChild   1000

    # Timeout for keep-alive connections (in seconds)
    KeepAliveTimeout         5

    # Maximum requests per keep-alive connection
    MaxKeepAliveRequests   100
</IfModule>
```

## Calculating Optimal Settings

### Memory-Based Calculation

```bash
# Check available memory
free -m

# Check how much memory each Apache process uses
ps aux | grep apache2 | awk '{sum+=$6} END {print "Total KB:", sum, "Average KB:", sum/NR}'

# Formula for MaxRequestWorkers (Prefork):
# MaxRequestWorkers = (Total RAM * 0.8) / Average process size in MB

# Example:
# 2GB RAM = 2048MB
# Average process = 40MB
# MaxRequestWorkers = (2048 * 0.8) / 40 = ~40
```

### Traffic-Based Calculation

```bash
# Check current active workers
sudo apache2ctl status
# Look at the Scoreboard section

# Count total requests per second
sudo awk '{print $7}' /var/log/apache2/access.log | sort | uniq -c | head -5

# Monitor Apache in real time
watch -n 1 'sudo apache2ctl status | grep "requests/sec"'
```

## Applying Configuration Changes

```bash
# Test configuration syntax before applying
sudo apache2ctl configtest

# Apply changes (non-graceful restart - drops current connections)
sudo systemctl restart apache2

# Or graceful restart (waits for current requests to finish)
sudo apachectl graceful

# Verify the new settings loaded
sudo apache2ctl -t -D DUMP_VHOSTS
sudo apache2ctl status | head -20
```

## Monitoring MPM Status

Enable the server status module to monitor worker utilization:

```bash
sudo a2enmod status
sudo systemctl reload apache2
```

```apache
# Add to a VirtualHost config
<Location /server-status>
    SetHandler server-status
    Require local
</Location>
```

```bash
# View status
curl http://localhost/server-status

# Machine-readable format
curl http://localhost/server-status?auto

# Example output shows the Scoreboard:
# _CWKS.W__W...
# _ = idle
# W = writing (active request)
# C = closing connection
# K = keepalive
# . = open slot
```

## Decision Guide

```
Are you using mod_php?
  Yes -> Prefork (only option)
  No (using PHP-FPM or other FastCGI) ->
    Do you need HTTP/2?
      Yes -> Event
      No ->
        Is memory more important than connections?
          Yes -> Event or Worker
          No -> Prefork (simpler tuning)
```

For most modern Ubuntu deployments:
- **Event MPM + PHP-FPM** is the standard configuration and gives the best performance
- **Prefork + mod_php** is for legacy setups that can't migrate to PHP-FPM
- **Worker MPM** is rarely chosen over Event on modern Apache versions

After switching MPMs, reload the configuration and monitor the server status page to verify worker utilization matches your expectations.
