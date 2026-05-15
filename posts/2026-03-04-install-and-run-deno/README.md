# How to Install and Run Deno on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Deno, JavaScript, Linux

Description: Learn how to install and Run Deno on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to install and run Deno on RHEL. Following these steps will help you install the Deno runtime, create a small HTTP server, and run it as a systemd service.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Deno is a single-binary JavaScript and TypeScript runtime. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl unzip
```

## Step 2: Install Required Packages

Install Deno system-wide with the official shell installer:

```bash
curl -fsSL https://deno.land/install.sh | sudo DENO_INSTALL=/usr/local sh
```

Verify the installation:

```bash
deno --version
```

## Step 3: Configure the Service

Create a dedicated user and a small Deno application:

```bash
sudo useradd --system --user-group --home-dir /opt/deno-hello --shell /sbin/nologin denoapp
sudo mkdir -p /opt/deno-hello
sudo tee /opt/deno-hello/server.ts > /dev/null <<'EOF'
export default {
  fetch(_req: Request) {
    return new Response("Hello from Deno on RHEL\n");
  },
} satisfies Deno.ServeDefaultExport;
EOF
sudo chown -R denoapp:denoapp /opt/deno-hello
```

Create a systemd service for the application:

```bash
sudo tee /etc/systemd/system/deno-hello.service > /dev/null <<'EOF'
[Unit]
Description=Deno hello service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=denoapp
Group=denoapp
WorkingDirectory=/opt/deno-hello
ExecStart=/usr/local/bin/deno serve --host=0.0.0.0 --port=8000 /opt/deno-hello/server.ts
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```

Start with the defaults and adjust the script, port, permissions, and resource limits based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now deno-hello.service
sudo systemctl status deno-hello.service
```

## Step 5: Verify the Configuration

Test the setup:

```bash
curl -fsS http://127.0.0.1:8000
```

Check the logs for any errors:

```bash
journalctl -u deno-hello.service -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show deno-hello.service --property=MemoryCurrent
top -p $(pidof deno)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Grant only the Deno permissions the application needs, such as `--allow-read` for serving local files
- Keep RHEL packages updated with `dnf update` and update Deno with `deno upgrade`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u deno-hello.service -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port
4. **Deno command not found**: Confirm `/usr/local/bin/deno` exists or reinstall with `DENO_INSTALL=/usr/local`

## Conclusion

You have successfully installed and run Deno on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
