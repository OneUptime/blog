# How to Configure PHP-FPM Pool Tuning for High-Traffic Sites on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PHP-FPM, Performance, Tuning, Web Server, Linux

Description: Optimize PHP-FPM pool settings on RHEL to handle high traffic loads by tuning process management, memory usage, and request handling.

---

PHP-FPM (FastCGI Process Manager) performance directly impacts your site's ability to handle concurrent users. Proper pool tuning on RHEL ensures efficient resource use under heavy load.

## Understand Process Managers

PHP-FPM offers three process management strategies:

- **static**: Fixed number of child processes (best for dedicated servers)
- **dynamic**: Adjusts between min and max (good general purpose)
- **ondemand**: Spawns processes as needed (best for low-traffic or memory-constrained servers)

## Calculate Optimal Settings

```bash
# Check average PHP-FPM worker memory usage
ps -ylC php-fpm --sort:rss | awk '{sum += $8; n++} END {print "Avg RSS:", sum/n/1024, "MB"}'

# Check total available memory
free -m | awk '/^Mem:/ {print "Available:", $7, "MB"}'
```

Use this formula: `max_children = (Available Memory - Buffer) / Average Worker Memory`

For example, with 4GB available and 50MB per worker: `max_children = (4000 - 512) / 50 = ~70`

## Configure the Pool

```bash
# Edit the www pool configuration
sudo vi /etc/php-fpm.d/www.conf
```

For a high-traffic site on a server with 8GB RAM:

```ini
; Use dynamic process management
pm = dynamic

; Maximum number of child processes
pm.max_children = 100

; Number of children created on startup
pm.start_servers = 20

; Minimum number of idle children
pm.min_spare_servers = 10

; Maximum number of idle children
pm.max_spare_servers = 30

; Number of requests before a worker is recycled (prevents memory leaks)
pm.max_requests = 500

; Timeout for serving a single request
request_terminate_timeout = 60s

; Slow log for debugging performance issues
slowlog = /var/log/php-fpm/www-slow.log
request_slowlog_timeout = 5s
```

## Enable Status Page for Monitoring

```bash
# In /etc/php-fpm.d/www.conf, add:
# pm.status_path = /status
# ping.path = /ping

# In your Nginx config, add a location block:
sudo tee -a /etc/nginx/conf.d/php-status.conf << 'CONF'
server {
    listen 127.0.0.1:8081;
    location /status {
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        allow 127.0.0.1;
        deny all;
    }
}
CONF
```

## Apply and Monitor

```bash
# Restart PHP-FPM to apply changes
sudo systemctl restart php-fpm

# Monitor the status page
curl http://127.0.0.1:8081/status

# Watch active processes in real time
watch -n 1 'ps aux | grep php-fpm | grep -v grep | wc -l'
```

Monitor the `max children reached` counter in the status output. If it increases frequently, raise `pm.max_children`. Check the slow log regularly to identify bottleneck scripts.
