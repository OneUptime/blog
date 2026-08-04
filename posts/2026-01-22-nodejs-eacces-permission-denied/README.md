# How to Fix 'Error: EACCES: permission denied' in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Error, Permission, npm, Linux

Description: Learn how to diagnose and fix EACCES permission denied errors in Node.js when installing packages, writing files, or running scripts.

---

The EACCES error occurs when Node.js or npm tries to access a file or directory without proper permissions. This commonly happens during global package installation or when reading/writing files.

## Common EACCES Scenarios

### Global npm Install

```text
npm ERR! Error: EACCES: permission denied, access '/usr/local/lib/node_modules'
```

### File Operations

```text
Error: EACCES: permission denied, open '/etc/config.json'
    at Object.openSync (fs.js:476:3)
```

### Port Binding

```text
Error: listen EACCES: permission denied 0.0.0.0:80
```

## Fixing Global npm Permission Issues

### Solution 1: Change npm's Default Directory

Create a directory for global installations:

```bash
# Create directory for global packages

mkdir -p ~/.local/bin

# Configure npm to use this directory
npm config set prefix ~/.local

# Add to PATH in ~/.profile
echo 'export PATH=~/.local/bin:$PATH' >> ~/.profile
source ~/.profile
```

Verify:

```bash
npm config get prefix
# Should show /home/username/.local
```

### Solution 2: Use Node Version Manager (nvm) (Recommended)

nvm installs Node.js in your home directory, avoiding permission issues:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash

# Restart terminal or run
source ~/.bashrc

# Install the latest LTS Node.js
nvm install --lts

# Use the latest LTS version
nvm use --lts
```

### Solution 3: Fix npm Cache Permissions

```bash
# Clear npm cache
npm cache clean --force

# Fix ownership of npm directories
sudo chown -R "$(whoami):$(id -gn)" ~/.npm
sudo chown -R "$(whoami):$(id -gn)" ~/.local
```

### Avoid: Using sudo with npm

Avoid installing packages with sudo:

```bash
# WRONG - Don't do this
sudo npm install -g package-name

# This creates permission issues and security risks
```

## Fixing File Permission Issues

### Check File Permissions

```bash
# View file permissions
ls -la /path/to/file

# View directory permissions
ls -la /path/to/directory
```

### Fix Ownership

```bash
# Change owner
sudo chown username:username /path/to/file

# Change owner recursively
sudo chown -R username:username /path/to/directory
```

### Fix Permissions

```bash
# Make file readable/writable
chmod 644 /path/to/file

# Make directory accessible
chmod 755 /path/to/directory

# Make directory and contents writable by the owner
chmod -R u+rwX,go+rX,go-w /path/to/directory
```

### Common Permission Values

| Permission | Number | Description |
|------------|--------|-------------|
| rwx------ | 700 | Owner only |
| rwxr-xr-x | 755 | Everyone can read/execute |
| rw-r--r-- | 644 | Everyone can read |
| rw-rw-rw- | 666 | Everyone can read/write |

## Handling in Node.js Code

### Check Access for Diagnostics

Use `access()` for diagnostics or explicit checks, but don't use it as a preflight check immediately before `open()`, `readFile()`, or `writeFile()`. Open, read, or write the file directly and handle the error to avoid race conditions.

```javascript
const fs = require('fs');
const { access, constants } = require('fs/promises');

async function checkAccess(path) {
  try {
    // Check if file exists and is readable
    await access(path, constants.R_OK);
    console.log('Can read');
    
    // Check if writable
    await access(path, constants.W_OK);
    console.log('Can write');
    
    // Check if executable
    await access(path, constants.X_OK);
    console.log('Can execute');
    
    return true;
  } catch (error) {
    console.error('Access denied:', error.message);
    return false;
  }
}
```

### Graceful Error Handling

```javascript
const fs = require('fs').promises;

async function writeFile(path, content) {
  try {
    await fs.writeFile(path, content);
    console.log('File written successfully');
  } catch (error) {
    if (error.code === 'EACCES') {
      console.error(`Permission denied: Cannot write to ${path}`);
      console.error('Check file permissions or run with appropriate privileges');
      
      // Try alternative location
      const altPath = `/tmp/${path.split('/').pop()}`;
      console.log(`Attempting to write to ${altPath} instead`);
      await fs.writeFile(altPath, content);
    } else {
      throw error;
    }
  }
}
```

### Use Appropriate Directories

```javascript
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

// Use temp directory for temporary files
const tempDir = os.tmpdir();
const tempFile = path.join(tempDir, 'myapp-data.json');

// Use home directory for user data
const homeDir = os.homedir();
const configDir = path.join(homeDir, '.myapp');

async function ensureConfigDir() {
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Use XDG directories on Linux
const dataDir = process.env.XDG_DATA_HOME || 
                path.join(homeDir, '.local', 'share', 'myapp');
const cacheDir = process.env.XDG_CACHE_HOME || 
                 path.join(homeDir, '.cache', 'myapp');
```

## Port Permission Issues

### Ports Below 1024

Ports below 1024 require root privileges on Unix systems.

**Solution 1: Use Higher Port**

```javascript
const PORT = process.env.PORT || 3000;  // Use port above 1024
```

**Solution 2: Use authbind (Linux)**

```bash
# Install authbind
sudo apt-get install authbind

# Allow binding to port 80
sudo touch /etc/authbind/byport/80
sudo chown username /etc/authbind/byport/80
sudo chmod 755 /etc/authbind/byport/80

# Run with authbind
authbind --deep node server.js
```

**Solution 3: Use Reverse Proxy**

Use Nginx or Apache on port 80 to proxy to your Node.js app:

```nginx
# /etc/nginx/sites-available/myapp
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

**Solution 4: CAP_NET_BIND_SERVICE**

```bash
# Allow node to bind to privileged ports
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

## Docker Permission Issues

### Fix Node Modules Permissions

```dockerfile
# Dockerfile
FROM node:24

# Create app directory
WORKDIR /app

# Don't run as root
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy app source
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

EXPOSE 3000
CMD ["node", "server.js"]
```

### Volume Permission Issues

```yaml
# docker-compose.yml
services:
  app:
    build: .
    volumes:
      - ./data:/app/data
    user: "${UID}:${GID}"  # Use host user's UID/GID
```

Run with:

```bash
UID=$(id -u) GID=$(id -g) docker compose up
```

## Debugging Permission Issues

### Diagnostic Script

```javascript
const fs = require('fs');
const os = require('os');
const path = require('path');

function diagnosePermissions(filePath) {
  console.log('=== Permission Diagnostics ===\n');
  
  // Process info
  console.log('Process Info:');
  console.log(`  User ID: ${process.getuid()}`);
  console.log(`  Group ID: ${process.getgid()}`);
  console.log(`  Username: ${os.userInfo().username}`);
  console.log(`  Home: ${os.homedir()}`);
  
  // File info
  console.log(`\nFile: ${filePath}`);
  
  try {
    const stats = fs.statSync(filePath);
    console.log(`  Mode: ${stats.mode.toString(8)}`);
    console.log(`  Owner UID: ${stats.uid}`);
    console.log(`  Owner GID: ${stats.gid}`);
    console.log(`  Size: ${stats.size} bytes`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  File does not exist');
      
      // Check parent directory
      const dir = path.dirname(filePath);
      console.log(`\nParent Directory: ${dir}`);
      try {
        const dirStats = fs.statSync(dir);
        console.log(`  Mode: ${dirStats.mode.toString(8)}`);
        try {
          fs.accessSync(dir, fs.constants.W_OK);
          console.log('  Writable: Yes');
        } catch (e) {
          console.log(`  Writable: No - ${e.code}`);
        }
      } catch (e) {
        console.log(`  Cannot access: ${e.message}`);
      }
    } else {
      console.log(`  Error: ${error.message}`);
    }
  }
  
  // Access checks
  console.log('\nAccess Checks:');
  const checks = [
    [fs.constants.R_OK, 'Read'],
    [fs.constants.W_OK, 'Write'],
    [fs.constants.X_OK, 'Execute'],
  ];
  
  for (const [flag, name] of checks) {
    try {
      fs.accessSync(filePath, flag);
      console.log(`  ${name}: Yes`);
    } catch (e) {
      console.log(`  ${name}: No - ${e.code}`);
    }
  }
}

// Run diagnosis
diagnosePermissions(process.argv[2] || '/usr/local/lib');
```

### Check npm Directories

```bash
# Check npm prefix
npm config get prefix

# Check npm cache
npm config get cache

# List npm directories and permissions
ls -la $(npm config get prefix)/lib/node_modules
ls -la $(npm config get cache)
```

## Summary

| Issue | Solution |
|-------|----------|
| Global npm install fails | Change npm prefix to user directory |
| File write fails | Check ownership and permissions |
| Port 80/443 | Use reverse proxy or higher port |
| Docker volumes | Set correct UID/GID |

| Command | Description |
|---------|-------------|
| `chmod 755` | Owner rwx, others rx |
| `chmod 644` | Owner rw, others r |
| `chown user:group` | Change ownership |
| `npm config set prefix` | Change npm global dir |

| Best Practice | Description |
|---------------|-------------|
| Use nvm | Avoid system Node.js |
| Avoid sudo npm | Reduces permission issues |
| Use ~/.local | Safe global install location |
| Handle write errors directly | Graceful error handling |
