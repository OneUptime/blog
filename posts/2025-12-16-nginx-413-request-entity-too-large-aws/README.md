# How to Fix "413 Request Entity Too Large" in Nginx on AWS Elastic Beanstalk

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Nginx, AWS, Elastic Beanstalk, File Upload, Troubleshooting

Description: Learn how to resolve the 413 Request Entity Too Large error in Nginx when deploying applications on AWS Elastic Beanstalk, including configuration methods for different platforms and deployment strategies.

---

The "413 Request Entity Too Large" error occurs when a client sends a request body that exceeds Nginx's configured limit. This is common when uploading files or sending large JSON payloads. On AWS Elastic Beanstalk, fixing this requires understanding how to properly configure Nginx across different platform versions.

## Understanding the Error

```mermaid
graph LR
    Client[Client] -->|"POST 50MB file"| ALB[Load Balancer]
    ALB --> Nginx[Nginx]
    Nginx -->|"Limit: 1MB"| X[413 Error]

    style X fill:#ffcdd2
```

By default, Nginx limits request body size to 1MB. Any larger request triggers a 413 error before reaching your application.

## Quick Fix: The client_max_body_size Directive

```nginx
# Increase limit to 100MB
client_max_body_size 100M;

# Or disable limit entirely (not recommended for production)
client_max_body_size 0;
```

## AWS Elastic Beanstalk Configuration Methods

### Method 1: .platform Hooks (AL2023 and Amazon Linux 2)

For Amazon Linux 2023 and Amazon Linux 2 platforms, use the `.platform` directory structure.

#### Directory Structure

```
your-app/
├── .platform/
│   └── nginx/
│       └── conf.d/
│           └── client_max_body_size.conf
└── your-application-files/
```

#### .platform/nginx/conf.d/client_max_body_size.conf

```nginx
client_max_body_size 100M;
```

### Method 2: Full Nginx Configuration Override

For more control, override the entire server configuration.

#### .platform/nginx/nginx.conf

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Increase body size limit
    client_max_body_size 100M;

    # Increase buffer sizes for large requests
    client_body_buffer_size 10M;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;

    include /etc/nginx/conf.d/*.conf;
}
```

### Method 3: .ebextensions (Legacy and AL2)

For older platforms or additional flexibility, use `.ebextensions`.

#### Directory Structure

```
your-app/
├── .ebextensions/
│   └── nginx.config
└── your-application-files/
```

#### .ebextensions/nginx.config

```yaml
files:
  "/etc/nginx/conf.d/client_max_body_size.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      client_max_body_size 100M;

container_commands:
  01_reload_nginx:
    command: "systemctl reload nginx || service nginx reload"
```

### Method 4: Using proxy.conf for Proxy Settings

When using Nginx as a reverse proxy (common in Elastic Beanstalk):

#### .platform/nginx/conf.d/proxy.conf

```nginx
client_max_body_size 100M;
client_body_buffer_size 10M;

proxy_connect_timeout 300;
proxy_send_timeout 300;
proxy_read_timeout 300;
send_timeout 300;

proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
```

## Platform-Specific Configurations

### Node.js Platform

```
your-app/
├── .platform/
│   └── nginx/
│       └── conf.d/
│           └── upload.conf
├── package.json
└── app.js
```

#### .platform/nginx/conf.d/upload.conf

```nginx
client_max_body_size 100M;
```

### Python Platform (Django/Flask)

```
your-app/
├── .platform/
│   └── nginx/
│       └── conf.d/
│           └── upload.conf
├── requirements.txt
└── application.py
```

### Docker Platform

For Docker platforms, you may need to configure both the host Nginx and any Nginx inside containers.

#### .platform/nginx/conf.d/upload.conf

```nginx
client_max_body_size 100M;
```

#### Dockerfile (if using Nginx in container)

```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
```

## Complete Production Configuration

### .platform/nginx/conf.d/custom.conf

```nginx
# Request body size
client_max_body_size 100M;
client_body_buffer_size 10M;

# Timeouts for large uploads
client_body_timeout 300s;
client_header_timeout 60s;
send_timeout 300s;

# Proxy settings (for reverse proxy setups)
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;

# Buffer settings
proxy_buffer_size 128k;
proxy_buffers 8 256k;
proxy_busy_buffers_size 512k;
proxy_temp_file_write_size 512k;

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied expired no-cache no-store private auth;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/json;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## Also Configure AWS Load Balancer

The 413 error can also come from the AWS Application Load Balancer.

### Check ALB Limits

Application Load Balancer has a fixed maximum body size. If your uploads exceed this, you need to use a Network Load Balancer or configure direct uploads to S3.

### Configure Environment Variables

In your Elastic Beanstalk environment configuration:

```yaml
# .ebextensions/alb.config
option_settings:
  aws:elbv2:loadbalancer:
    IdleTimeout: 300
```

## Handling Very Large Files (S3 Presigned URLs)

For files larger than 100MB, consider using S3 presigned URLs for direct uploads.

### Backend (Node.js Example)

```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

app.get('/api/upload-url', async (req, res) => {
    const { filename, contentType } = req.query;

    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: `uploads/${Date.now()}-${filename}`,
        ContentType: contentType,
        Expires: 300 // URL expires in 5 minutes
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    res.json({ uploadUrl, key: params.Key });
});
```

### Frontend Example

```javascript
async function uploadFile(file) {
    // Get presigned URL from your backend
    const response = await fetch(`/api/upload-url?filename=${file.name}&contentType=${file.type}`);
    const { uploadUrl, key } = await response.json();

    // Upload directly to S3
    await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type
        }
    });

    return key;
}
```

## Debugging Tips

### Check Which Nginx Config is Active

SSH into your Elastic Beanstalk instance:

```bash
# Connect via EB CLI
eb ssh

# Check Nginx configuration
sudo nginx -T

# Check for syntax errors
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Check if your config file exists
ls -la /etc/nginx/conf.d/
```

### Verify Configuration Applied

```bash
# Make a test request
curl -X POST -H "Content-Type: application/json" \
    -d '{"test": "data"}' \
    http://your-app.elasticbeanstalk.com/api/test

# Check with larger payload
dd if=/dev/zero bs=1M count=50 | curl -X POST \
    -H "Content-Type: application/octet-stream" \
    --data-binary @- \
    http://your-app.elasticbeanstalk.com/api/upload
```

### Common Issues

1. **Config not applied**: Ensure file is in correct directory
   ```bash
   # For AL2/AL2023
   ls -la .platform/nginx/conf.d/

   # Files should be included automatically
   ```

2. **Permission errors**: Check file permissions
   ```yaml
   # In .ebextensions
   files:
     "/etc/nginx/conf.d/upload.conf":
       mode: "000644"
       owner: root
       group: root
   ```

3. **Nginx not reloading**: Force reload after deployment
   ```yaml
   container_commands:
     99_reload_nginx:
       command: "systemctl reload nginx"
   ```

## Testing the Fix

### Using curl

```bash
# Create a test file
dd if=/dev/zero of=testfile bs=1M count=50

# Test upload
curl -X POST -F "file=@testfile" http://your-app.elasticbeanstalk.com/upload

# Should succeed with proper configuration
```

### Using Python

```python
import requests

# Create large payload
large_data = 'x' * (50 * 1024 * 1024)  # 50MB

response = requests.post(
    'http://your-app.elasticbeanstalk.com/api/upload',
    data=large_data,
    headers={'Content-Type': 'application/octet-stream'}
)

print(response.status_code)  # Should be 200, not 413
```

## Summary

| Platform | Configuration Location | Method |
|----------|----------------------|--------|
| AL2023 / AL2 | `.platform/nginx/conf.d/` | Drop-in config file |
| AL2023 / AL2 | `.platform/nginx/nginx.conf` | Full override |
| Any | `.ebextensions/` | File creation + reload |
| Docker | Both host and container | Configure both if needed |

The key directive is `client_max_body_size`. Set it appropriately for your use case, and remember to also configure timeouts and buffer sizes for reliable large file uploads. For very large files, consider using S3 presigned URLs to bypass the web server entirely.
