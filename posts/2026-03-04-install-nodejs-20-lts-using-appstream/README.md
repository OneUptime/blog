# How to Install Node.js 20 LTS on RHEL 9 Using AppStream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Node.js, JavaScript, Linux

Description: Learn how to install Node.js 20 LTS Using AppStream on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Node.js 20 LTS is available in the RHEL 9 AppStream repository, providing an easy installation path with official Red Hat support and security updates.

## Prerequisites

- RHEL 9
- Root or sudo access

## Step 1: List Available Node.js Versions

```bash
dnf module list nodejs
```

## Step 2: Enable and Install Node.js 20

```bash
sudo dnf module enable nodejs:20 -y
sudo dnf install -y nodejs
```

## Step 3: Verify Installation

```bash
node --version
npm --version
```

## Step 4: Test with a Simple Script

```bash
node -e "console.log('Hello from Node.js ' + process.version)"
```

## Step 5: Install Build Tools (Optional)

For compiling native addons:

```bash
sudo dnf install -y gcc-c++ make
```

## Step 6: Set npm Global Directory

Avoid using sudo with npm global installs:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Step 7: Update npm

```bash
npm install -g npm@latest
```

## Conclusion

Installing Node.js 20 LTS from RHEL 9 AppStream provides a stable, supported runtime with seamless integration into the RHEL package management system. Updates are delivered through standard dnf commands.
