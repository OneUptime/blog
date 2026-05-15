# How to Install Node.js Using nvm on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Node.js, JavaScript, Linux

Description: Learn how to install Node.js Using nvm on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install Node.js Using nvm on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Installing Node.js using nvm gives each user account its own Node.js versions without replacing the Node.js packages managed by RHEL. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl git
sudo dnf group install -y "Development Tools"
```

## Step 2: Install Required Packages

Install nvm for your regular user account:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
```

Load nvm in your current shell session:

```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Verify the installation:

```bash
command -v nvm
```

## Step 3: Install Node.js with nvm

Install the latest Long Term Support (LTS) release of Node.js and set it as the default for new shell sessions:

```bash
nvm install --lts
nvm alias default 'lts/*'
```

## Step 4: Load nvm in New Shells

nvm does not run as a systemd service. Open a new terminal or reload your shell profile so the nvm initialization added by the installer takes effect:

```bash
source ~/.bashrc
```

If you use a different shell profile, source that file instead, such as `~/.bash_profile`, `~/.zshrc`, or `~/.profile`.

## Step 5: Verify the Configuration

Test the setup:

```bash
node --version
npm --version
npx --version
```

## Step 6: Configure Firewall Rules

Node.js installed through nvm does not require firewall rules by itself. Configure the firewall only for applications you run with Node.js. For example, if your application listens on TCP port 3000:

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Step 7: Use Project Versions and Monitor Apps

Keep project Node.js versions consistent with an `.nvmrc` file:

```bash
echo "lts/*" > .nvmrc
nvm install
nvm use
```

Monitor the resource usage of your Node.js application process and adjust the application configuration based on your workload.

## Security Considerations

- Install and use nvm as a regular user, not with `sudo`
- Review the nvm install script before running it in sensitive environments
- Avoid running global npm installs with `sudo`; nvm manages global packages per Node.js version
- Enable TLS/SSL in your Node.js application when it handles network traffic
- Restrict access with firewall rules for the application ports you expose
- Keep RHEL packages updated with `dnf update` and update nvm separately when new nvm releases are available

## Troubleshooting

Common issues and solutions:

1. **`nvm: command not found`**: Open a new terminal or source your shell profile, such as `source ~/.bashrc`
2. **Node.js version does not persist**: Run `nvm alias default 'lts/*'` after installing the LTS release
3. **Permission denied during npm installs**: Do not use `sudo`; reinstall packages under the nvm-managed Node.js version
4. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully installed Node.js using nvm on RHEL. Keep nvm and Node.js updated, and monitor your Node.js applications regularly to maintain security and performance.
