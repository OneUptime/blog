# How to Secure MongoDB Connection Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Connection String, Secrets Management, Database

Description: Learn how to secure MongoDB connection strings by avoiding hardcoded credentials, using environment variables, secrets managers, and TLS options to protect database access.

---

MongoDB connection strings often contain credentials, hostnames, and authentication details. Hardcoding them in source code or configuration files is a common security mistake that leads to credential leaks. This guide covers best practices for managing connection strings securely.

## Anatomy of a MongoDB Connection String

```text
mongodb://username:password@host:27017/database?authSource=admin&tls=true
```

A typical secure connection string includes:
- Credentials (username and password)
- Host and port
- Database name and auth source
- TLS parameters

## Never Hardcode Credentials

Avoid this:

```javascript
// Bad - credentials in source code
const client = new MongoClient("mongodb://admin:Password123@prod-db:27017/myapp")
```

Do this instead:

```javascript
// Good - credentials from environment variables
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)
```

## Use Environment Variables

Set the connection string as an environment variable:

```bash
export MONGODB_URI="mongodb://appuser:SecurePass@db.internal:27017/myapp?authSource=admin&tls=true"
```

In a Docker or Kubernetes deployment, inject it via secrets:

```yaml
# Kubernetes Secret
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-creds
type: Opaque
stringData:
  uri: "mongodb://appuser:SecurePass@db.internal:27017/myapp?authSource=admin"
```

Reference the secret in your deployment:

```yaml
env:
  - name: MONGODB_URI
    valueFrom:
      secretKeyRef:
        name: mongodb-creds
        key: uri
```

## Store Connection Strings in a Secrets Manager

For production environments, retrieve credentials from a secrets manager at runtime:

```python
import boto3
from pymongo import MongoClient

def get_secret():
    client = boto3.client("secretsmanager", region_name="us-east-1")
    response = client.get_secret_value(SecretId="mongodb/production/uri")
    return response["SecretString"]

mongo_uri = get_secret()
db_client = MongoClient(mongo_uri)
```

## Always Use TLS in Connection Strings

Include TLS parameters to ensure connections are encrypted:

```text
mongodb://user:pass@host:27017/myapp?tls=true&tlsCAFile=/etc/ssl/ca.crt&authSource=admin
```

Or in driver options:

```javascript
const client = new MongoClient(process.env.MONGODB_URI, {
  tls: true,
  tlsCAFile: "/etc/ssl/mongodb/ca.crt"
})
```

## URL-Encode Special Characters in Passwords

If the password contains characters like `@`, `/`, or `?`, URL-encode them:

```python
from urllib.parse import quote_plus

username = "appuser"
password = quote_plus("P@ssw0rd!#")
uri = f"mongodb://{username}:{password}@host:27017/myapp"
```

## Rotate Credentials Regularly

Update MongoDB user passwords and regenerate connection strings on a schedule:

```javascript
// Rotate the password
use myapp
db.updateUser("appuser", { pwd: "NewSecurePass456!" })
```

Update the secret in your secrets manager and trigger a rolling restart of dependent services.

## Add .env to .gitignore

If using `.env` files locally, ensure they are never committed:

```bash
# .gitignore
.env
.env.local
*.env
```

Scan for committed secrets with tools like `git-secrets` or `truffleHog`.

## Audit Connection Strings in Codebases

Search for hardcoded MongoDB URIs in your codebase:

```bash
grep -r "mongodb://" . --include="*.js" --include="*.py" --include="*.ts"
grep -r "MONGODB_URI\s*=" . --include="*.env"
```

## Summary

Secure MongoDB connection strings by storing credentials in environment variables or secrets managers, never hardcoding them in source code. Always include TLS parameters, URL-encode special characters in passwords, and rotate credentials regularly. Use `.gitignore` and secret scanning tools to prevent accidental credential exposure.
