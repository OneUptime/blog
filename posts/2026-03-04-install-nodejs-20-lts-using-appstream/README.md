# How to Install Node.js 20 LTS on RHEL 9 Using AppStream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Node.js, JavaScript, Linux

Description: Learn how to install Node.js 20 LTS Using AppStream on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Node.js 20 is available in the RHEL 9 AppStream repository for RHEL 9.3 and later. Red Hat lists the Node.js 20 Application Stream with an April 2026 retirement date, so use it only when you specifically need Node.js 20 and choose a currently supported stream for new deployments.

## Prerequisites

- RHEL 9.3 or later with AppStream enabled
- Root or sudo access

## Step 1: List Available Node.js Versions

```bash
dnf module list nodejs
```

## Step 2: Install Node.js 20

```bash
sudo dnf module install nodejs:20 -y
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

## Step 7: Update Node.js and npm

```bash
sudo dnf upgrade -y nodejs npm
```

## Conclusion

Installing Node.js 20 from RHEL 9 AppStream provides a runtime that integrates with the RHEL package management system. Check the RHEL Application Stream lifecycle before using it in production, and apply available updates through standard dnf commands.
