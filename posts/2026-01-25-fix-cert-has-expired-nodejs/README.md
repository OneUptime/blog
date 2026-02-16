# How to Fix 'Error: CERT_HAS_EXPIRED' in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, SSL, TLS, Certificates, Troubleshooting

Description: Resolve the CERT_HAS_EXPIRED error in Node.js by updating certificates, configuring proper certificate management, and implementing certificate monitoring.

---

When you see this error in your Node.js application:

```
Error: CERT_HAS_EXPIRED
    at TLSSocket.onConnectSecure (_tls_wrap.js:1515:34)
```

It means the SSL certificate on the server you are connecting to has expired. This guide covers how to identify the problem and implement proper fixes.

## Identifying the Problem

First, check the certificate details:

```bash
# Check certificate expiration
openssl s_client -connect api.example.com:443 -servername api.example.com 2>/dev/null | openssl x509 -noout -dates

# Output:
# notBefore=Jan 1 00:00:00 2024 GMT
# notAfter=Jan 1 00:00:00 2025 GMT  <-- Expiration date
```

Or check programmatically:

```javascript
const https = require('https');

function checkCertificate(hostname, port = 443) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            port,
            method: 'HEAD',
            rejectUnauthorized: false  // Accept for checking purposes
        };

        const req = https.request(options, (res) => {
            const cert = res.socket.getPeerCertificate();

            const info = {
                subject: cert.subject,
                issuer: cert.issuer,
                validFrom: new Date(cert.valid_from),
                validTo: new Date(cert.valid_to),
                isExpired: new Date() > new Date(cert.valid_to),
                daysUntilExpiry: Math.floor(
                    (new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24)
                )
            };

            resolve(info);
        });

        req.on('error', reject);
        req.end();
    });
}

// Usage
const certInfo = await checkCertificate('api.example.com');
console.log('Certificate info:', certInfo);

if (certInfo.isExpired) {
    console.error('Certificate has expired!');
} else if (certInfo.daysUntilExpiry < 30) {
    console.warn(`Certificate expires in ${certInfo.daysUntilExpiry} days`);
}
```

## Solutions

### If You Control the Server

Renew the certificate:

```bash
# For Let's Encrypt certificates
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Check renewal status
sudo certbot certificates
```

Set up automatic renewal:

```bash
# Add to crontab
0 0 * * * /usr/bin/certbot renew --quiet
```

### If You Do Not Control the Server

Contact the server administrator. In the meantime, if you must connect and understand the security implications:

```javascript
// TEMPORARY WORKAROUND - NOT RECOMMENDED FOR PRODUCTION
const https = require('https');

const agent = new https.Agent({
    rejectUnauthorized: false  // Disables certificate validation
});

// Use only for specific requests
const response = await fetch('https://api.example.com/data', { agent });
```

This should only be used when:
- You are connecting to an internal service you trust
- The certificate renewal is in progress
- You have no other option

### Update Your Node.js or OS Certificates

Sometimes the issue is outdated root certificates on your system:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install --only-upgrade ca-certificates

# CentOS/RHEL
sudo yum update ca-certificates

# macOS
# Update via Software Update

# Update Node.js itself (includes updated root certs)
nvm install node --reinstall-packages-from=node
```

### Provide Updated Certificate Chain

If the server's certificate chain is incomplete:

```javascript
const https = require('https');
const fs = require('fs');

// Load intermediate/root certificates
const ca = [
    fs.readFileSync('/path/to/intermediate.pem'),
    fs.readFileSync('/path/to/root.pem')
];

const agent = new https.Agent({ ca });

const response = await fetch('https://api.example.com/data', { agent });
```

## Certificate Monitoring Service

Proactively monitor certificates before they expire:

```javascript
const https = require('https');

class CertificateMonitor {
    constructor(options = {}) {
        this.warningThresholdDays = options.warningThreshold || 30;
        this.criticalThresholdDays = options.criticalThreshold || 7;
    }

    async checkCertificate(hostname, port = 443) {
        return new Promise((resolve, reject) => {
            const req = https.request(
                {
                    hostname,
                    port,
                    method: 'HEAD',
                    rejectUnauthorized: false
                },
                (res) => {
                    const cert = res.socket.getPeerCertificate();
                    const validTo = new Date(cert.valid_to);
                    const now = new Date();
                    const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));

                    let status = 'ok';
                    if (daysUntilExpiry <= 0) {
                        status = 'expired';
                    } else if (daysUntilExpiry <= this.criticalThresholdDays) {
                        status = 'critical';
                    } else if (daysUntilExpiry <= this.warningThresholdDays) {
                        status = 'warning';
                    }

                    resolve({
                        hostname,
                        validTo,
                        daysUntilExpiry,
                        status,
                        subject: cert.subject?.CN,
                        issuer: cert.issuer?.O
                    });
                }
            );

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Connection timeout'));
            });
            req.end();
        });
    }

    async checkMultiple(hosts) {
        const results = await Promise.allSettled(
            hosts.map(host => {
                const [hostname, port] = host.split(':');
                return this.checkCertificate(hostname, parseInt(port) || 443);
            })
        );

        return results.map((result, index) => ({
            host: hosts[index],
            ...(result.status === 'fulfilled'
                ? result.value
                : { status: 'error', error: result.reason.message })
        }));
    }
}

// Usage
const monitor = new CertificateMonitor({
    warningThreshold: 30,
    criticalThreshold: 7
});

const results = await monitor.checkMultiple([
    'api.example.com',
    'auth.example.com:443',
    'internal.example.com:8443'
]);

// Alert on issues
results.forEach(result => {
    if (result.status === 'expired') {
        console.error(`EXPIRED: ${result.host}`);
        // Send alert
    } else if (result.status === 'critical') {
        console.error(`CRITICAL: ${result.host} expires in ${result.daysUntilExpiry} days`);
        // Send alert
    } else if (result.status === 'warning') {
        console.warn(`WARNING: ${result.host} expires in ${result.daysUntilExpiry} days`);
    }
});
```

## Scheduled Certificate Checks

Run checks periodically:

```javascript
const cron = require('node-cron');

const hostsToMonitor = [
    'api.example.com',
    'auth.example.com',
    'payments.example.com'
];

// Check daily at 9 AM
cron.schedule('0 9 * * *', async () => {
    console.log('Running certificate check...');

    const results = await monitor.checkMultiple(hostsToMonitor);

    const issues = results.filter(r => r.status !== 'ok');

    if (issues.length > 0) {
        // Send notification
        await sendAlert({
            subject: 'SSL Certificate Issues Detected',
            body: formatIssues(issues)
        });
    }
});

function formatIssues(issues) {
    return issues.map(issue => {
        if (issue.status === 'expired') {
            return `EXPIRED: ${issue.host}`;
        } else if (issue.status === 'critical') {
            return `CRITICAL: ${issue.host} (expires in ${issue.daysUntilExpiry} days)`;
        } else if (issue.status === 'warning') {
            return `WARNING: ${issue.host} (expires in ${issue.daysUntilExpiry} days)`;
        } else if (issue.status === 'error') {
            return `ERROR: ${issue.host} - ${issue.error}`;
        }
    }).join('\n');
}
```

## Retry with Fallback

Implement retry logic that falls back to insecure mode for specific, trusted internal services:

```javascript
async function fetchWithCertRetry(url, options = {}) {
    try {
        // First try with certificate validation
        return await fetch(url, options);
    } catch (error) {
        if (error.code === 'CERT_HAS_EXPIRED') {
            // Log the issue
            console.error(`Certificate expired for ${url}`);

            // For internal services only, retry without validation
            const internalDomains = ['internal.example.com', 'dev.example.com'];
            const hostname = new URL(url).hostname;

            if (internalDomains.some(d => hostname.endsWith(d))) {
                console.warn('Retrying with certificate validation disabled (internal service)');

                const agent = new https.Agent({ rejectUnauthorized: false });
                return await fetch(url, { ...options, agent });
            }
        }

        throw error;
    }
}
```

## Docker and Kubernetes

Update certificates in containers:

```dockerfile
# Dockerfile
FROM node:18-alpine

# Update CA certificates
RUN apk add --no-cache ca-certificates && update-ca-certificates

WORKDIR /app
COPY . .
RUN npm ci

CMD ["node", "src/index.js"]
```

In Kubernetes, mount current certificates:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          volumeMounts:
            - name: ca-certificates
              mountPath: /etc/ssl/certs
              readOnly: true
      volumes:
        - name: ca-certificates
          hostPath:
            path: /etc/ssl/certs
            type: Directory
```

## Summary

CERT_HAS_EXPIRED means the server's SSL certificate has passed its validity date. The proper fix is to renew the certificate on the server side. If you do not control the server, contact the administrator. For temporary workarounds with internal services, you can disable validation for specific requests, but this should never be done in production for external services. Implement certificate monitoring to catch expiring certificates before they cause outages.
