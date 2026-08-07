# How to Install Yarn Package Manager on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, YARN, JavaScript, Linux

Description: Learn how to install Yarn Package Manager on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to install Yarn Package Manager on RHEL. Following these steps will help you install Node.js, enable Corepack, and activate Yarn.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- Enabled RHEL AppStream repositories

## Overview

Yarn runs on top of Node.js. On current RHEL releases, the recommended installation path is to install Node.js from RHEL AppStream and use Corepack to provide the `yarn` binary.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install Node.js and npm from a supported RHEL module stream. First list the streams available on your system:

```bash
sudo dnf module list nodejs
```

Then install a supported stream. For example, on RHEL 9 systems where `nodejs:20` is available:

```bash
sudo dnf module install -y nodejs:20
```

If your RHEL minor release does not provide `nodejs:20`, choose another supported stream shown by `dnf module list nodejs`, such as `nodejs:18`.

## Step 2: Verify Node.js and npm

```bash
node --version
npm --version
```

Verify the installed RPM package:

```bash
rpm -q nodejs npm
```

## Step 3: Enable Corepack

Corepack provides package-manager shims for Yarn and pnpm. Enable it after Node.js is installed:

```bash
sudo corepack enable
```

Activate the current stable Yarn release:

```bash
corepack prepare yarn@stable --activate
```

## Step 4: Initialize a Yarn Project

```bash
mkdir my-yarn-project
cd my-yarn-project
yarn init -2
```

This creates a new project configured for modern Yarn.

## Step 5: Verify the Configuration

Check the Yarn version:

```bash
yarn --version
```

Install dependencies for the project:

```bash
yarn install
```

## Step 6: Configure Network Access

Yarn does not run a system service or require inbound firewall rules. It needs outbound HTTPS access to the package registry configured for your project. Check the configured registry:

```bash
yarn config get npmRegistryServer
```

If your organization uses an internal npm registry, configure it in the project `.yarnrc.yml` file:

```yaml
npmRegistryServer: "https://registry.example.com"
```

## Step 7: Cache and Project Settings

Yarn stores configuration in `.yarnrc.yml` for modern Yarn projects. To inspect the effective configuration, run:

```bash
yarn config
```

## Security Considerations

- Keep Node.js and npm updated with `dnf update`
- Use HTTPS registries for package downloads
- Store registry tokens in user-level or CI secrets instead of committing them to the repository
- Pin the package manager version in project configuration so builds use the expected Yarn release

## Troubleshooting

Common issues and solutions:

1. **`yarn` command not found**: Run `sudo corepack enable`, then open a new shell and try again
2. **Requested Node.js stream is unavailable**: Run `sudo dnf module list nodejs` and install a stream available for your RHEL release
3. **Registry access fails**: Verify outbound HTTPS connectivity and check `yarn config get npmRegistryServer`

## Conclusion

You have successfully installed Yarn Package Manager on RHEL. Keep Node.js updated and pin Yarn per project to maintain reliable builds.
