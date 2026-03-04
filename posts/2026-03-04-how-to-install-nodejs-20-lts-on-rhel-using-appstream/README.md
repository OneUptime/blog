# How to Install Node.js 20 LTS on RHEL Using AppStream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Node.js, AppStream, JavaScript, LTS

Description: Learn how to install Node.js 20 LTS on RHEL using the AppStream module system for a supported and maintained Node.js runtime.

---

RHEL provides Node.js through its AppStream repository using modular packages. This allows you to install specific Node.js versions that are supported and receive security updates from Red Hat.

## Listing Available Node.js Modules

```bash
# List available Node.js module streams
sudo dnf module list nodejs

# Output shows available streams like:
# nodejs  18  [d]  common  Node.js 18
# nodejs  20      common  Node.js 20
```

## Installing Node.js 20

```bash
# Reset any previously enabled Node.js module
sudo dnf module reset nodejs -y

# Enable the Node.js 20 stream
sudo dnf module enable nodejs:20 -y

# Install Node.js
sudo dnf install -y nodejs

# Verify the installation
node --version
npm --version
```

## Installing Development Tools

```bash
# Install npm and development headers
sudo dnf install -y nodejs-devel npm

# Install build tools needed for native modules
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y python3
```

## Setting Up npm Global Directory

```bash
# Configure npm to install global packages in the user directory
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Test global install
npm install -g pm2
which pm2
```

## Switching Node.js Versions

```bash
# Switch from Node.js 20 to Node.js 18
sudo dnf module reset nodejs -y
sudo dnf module enable nodejs:18 -y
sudo dnf distro-sync -y

# Verify
node --version
```

## Using nvm as an Alternative

If you need more flexibility with versions:

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install Node.js 20 via nvm
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version
```

## Running a Quick Test

```bash
# Test Node.js with a simple HTTP server
cat << 'NODEJS' > /tmp/test-server.js
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Node.js 20 on RHEL\n');
});
server.listen(3000, () => {
  console.log('Server running on port 3000');
});
NODEJS

node /tmp/test-server.js &
curl http://localhost:3000
kill %1
```

The AppStream module approach is recommended for production RHEL servers because Red Hat provides security patches and updates. Use nvm for development environments where you need to switch between multiple versions frequently.
