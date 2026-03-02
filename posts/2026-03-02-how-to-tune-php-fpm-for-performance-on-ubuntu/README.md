# How to Tune PHP-FPM for Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PHP, PHP-FPM, Performance, Web Server

Description: Tune PHP-FPM process manager settings, worker counts, and memory limits on Ubuntu to handle more traffic with fewer resources and faster response times.

---

A default PHP-FPM installation handles light traffic acceptably but fails under load. The defaults are conservative - designed to work on small servers without causing OOM kills. Tuning PHP-FPM for your specific workload can dramatically increase throughput while actually using less memory than a misconfigured setup.

## Understanding Process Manager Types

PHP-FPM has three process manager (pm) modes, and choosing the right one for your workload matters more than any other setting:

**static**: Spawns a fixed number of workers at startup and keeps them running. Best for dedicated high-traffic servers where you want predictable memory usage and zero worker spawn latency.

**dynamic**: Spawns workers between a minimum and maximum, scaling up under load and killing idle workers. Good for servers with variable traffic.

**ondemand**: Starts workers when requests arrive and kills them when idle. Uses the least memory but has latency for spawning. Best for low-traffic sites.

## Calculating the Right Worker Count

The most important number to get right is `pm.max_children`. Too few and requests queue up under load. Too many and the server runs out of RAM and starts swapping, which kills performance.

Calculate how much RAM each PHP worker uses:

```bash
# Check average memory usage of running PHP-FPM processes
ps -ylC php-fpm8.3 --sort:rss | awk '{ sum+=$8 } END { print sum/NR/1024, "MB average" }'

# Or use this more readable approach
ps aux | grep php-fpm | grep -v grep | \
    awk '{sum += $6} END {print sum/NR/1024 " MB average RSS per process"}'
```

Calculate max_children:

```
Available RAM = Total RAM - OS RAM - Database RAM - Other services RAM
max_children = Available RAM / Average worker RAM
```

Example: Server with 4GB RAM, 512MB for OS, 1GB for MySQL:
- Available for PHP: 2.5GB = 2560MB
- Average worker: 80MB
- max_children = 2560 / 80 = 32

**Add a 20% safety margin:** `max_children = 26`

## Tuning Dynamic PM Settings

With `pm = dynamic`, several related settings work together:

```ini
; /etc/php/8.3/fpm/pool.d/www.conf

pm = dynamic

; Absolute maximum workers (based on RAM calculation above)
pm.max_children = 30

; Workers to start when FPM starts
; Rule of thumb: min_spare_servers + 1
pm.start_servers = 5

; Minimum idle workers to keep ready
; Low-traffic baseline: 2-3
; High-traffic: 5-10
pm.min_spare_servers = 3

; Maximum idle workers before FPM kills them
; Should be less than max_children
; Typically: max_children * 0.4
pm.max_spare_servers = 12

; Recycle workers after this many requests to prevent memory leaks
; 500-1000 is a good range for most apps
pm.max_requests = 500
```

## Tuning Static PM for High Traffic

For a dedicated server handling consistent load:

```ini
pm = static

; Set this to fill available RAM
; Use the calculation from above
pm.max_children = 30

; Still recycle workers to prevent memory leaks
pm.max_requests = 1000
```

With static PM, PHP-FPM allocates all worker memory at startup. This prevents the latency of spawning workers during traffic spikes.

## Timeout Settings

```ini
; Maximum time for a request to complete
; Requests exceeding this are terminated with a 502 to the client
request_terminate_timeout = 60s

; Log requests that take longer than this (for performance analysis)
slowlog = /var/log/php8.3-slow.log
request_slowlog_timeout = 5s

; Timeout for child process to stop gracefully during shutdown
; Should be >= request_terminate_timeout
emergency_restart_threshold = 10
emergency_restart_interval = 1m
process_control_timeout = 10s
```

## Socket vs TCP Port

Use a Unix socket instead of TCP for local connections - it has less overhead:

```ini
; Unix socket (faster - use this for local Nginx/Apache)
listen = /run/php/php8.3-fpm.sock
listen.backlog = 511

; TCP (use only if Nginx and PHP-FPM are on different servers)
; listen = 127.0.0.1:9000
```

Adjust the socket backlog to handle connection bursts:

```ini
; Connections that can queue while all workers are busy
; Higher values prevent "connection refused" during spikes
; Must not exceed net.core.somaxconn system setting
listen.backlog = 511
```

Check the system limit:

```bash
sysctl net.core.somaxconn
# If it's 128 (default), increase it:
echo "net.core.somaxconn = 511" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## PHP-ini Settings Within the Pool

Override php.ini settings per pool for fine-grained control:

```ini
; Increase memory for this specific pool
php_admin_value[memory_limit] = 256M

; Disable functions not needed (security hardening)
php_admin_value[disable_functions] = exec,passthru,shell_exec,system

; Force error logging
php_admin_flag[log_errors] = on
php_admin_value[error_log] = /var/log/php/site-error.log

; Disable display of errors in production
php_flag[display_errors] = off

; Set session storage location
php_value[session.save_handler] = files
php_value[session.save_path] = /var/lib/php/sessions/site1
```

## OPcache Configuration for FPM

OPcache dramatically improves PHP performance. Configure it based on your application size:

```ini
; /etc/php/8.3/fpm/conf.d/10-opcache.ini

; Amount of memory for cached scripts (in MB)
; Check usage with: php -r "print_r(opcache_get_status());"
opcache.memory_consumption = 256

; Memory for string interning
opcache.interned_strings_buffer = 32

; Max number of files to cache
; php -r "echo count(get_required_files());" on a typical request to estimate
opcache.max_accelerated_files = 20000

; How often to check for script changes (0 = never check, requires restart to update)
; Production: 0 (and restart FPM on deploy)
; Development: 2
opcache.revalidate_freq = 0

; Validate that cached file timestamps match disk
opcache.validate_timestamps = 0

; Enable JIT (good for CPU-intensive code, marginal for typical web apps)
opcache.jit = tracing
opcache.jit_buffer_size = 128M
```

## Monitoring PHP-FPM Performance

Enable the status page in your pool configuration:

```ini
; Enable FPM status page
pm.status_path = /fpm-status
ping.path = /fpm-ping
```

```nginx
# Add to Nginx server block (restrict to localhost)
location ~ ^/(fpm-status|fpm-ping)$ {
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    allow 127.0.0.1;
    deny all;
}
```

Query the status page:

```bash
# Basic status
curl http://localhost/fpm-status

# Detailed output with per-process info
curl "http://localhost/fpm-status?full"

# JSON output
curl "http://localhost/fpm-status?json"
```

Key metrics to watch:
- **listen queue**: Should be 0 or very low. Non-zero means workers are all busy.
- **active processes**: Workers currently handling requests.
- **idle processes**: Workers waiting for requests.
- **max children reached**: Times max_children was hit (increase if > 0).

## Benchmark Before and After

```bash
# Install Apache Bench
sudo apt install apache2-utils -y

# Baseline test: 1000 requests, 50 concurrent
ab -n 1000 -c 50 http://localhost/

# After tuning, run again and compare:
# - Requests per second (higher is better)
# - Time per request (lower is better)
# - Failed requests (should be 0)
```

## Quick Diagnostic Script

```bash
# Check all key PHP-FPM metrics at once
echo "=== PHP-FPM Workers ==="
ps aux | grep php-fpm | grep -v grep | wc -l

echo "=== Average Worker Memory ==="
ps -ylC php-fpm8.3 --sort:rss 2>/dev/null | \
    awk 'NR>1 { sum+=$8 } END { printf "%.1f MB\n", sum/NR/1024 }'

echo "=== OPcache Status ==="
php -r "
\$s = opcache_get_status(false);
printf('Used: %.1f MB / %.1f MB (%.1f%% full)\n',
    \$s['memory_usage']['used_memory']/1024/1024,
    (\$s['memory_usage']['used_memory']+\$s['memory_usage']['free_memory'])/1024/1024,
    \$s['memory_usage']['used_memory']/(\$s['memory_usage']['used_memory']+\$s['memory_usage']['free_memory'])*100
);
printf('Cached scripts: %d\n', \$s['opcache_statistics']['num_cached_scripts']);
printf('Hit rate: %.1f%%\n', \$s['opcache_statistics']['opcache_hit_rate']);
"
```

Tuning PHP-FPM is not a one-time task. As your application grows and traffic patterns change, revisit these settings and monitor the `max children reached` counter as your primary signal that `pm.max_children` needs increasing.
