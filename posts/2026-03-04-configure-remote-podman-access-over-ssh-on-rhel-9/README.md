# How to Configure Remote Podman Access over SSH on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Linux

Description: Step-by-step guide on configure remote podman access over ssh using Red Hat Enterprise Linux 9.

---

Podman supports remote access over SSH, allowing you to manage containers on remote RHEL servers from your local workstation. This eliminates the need for a daemon and uses your existing SSH infrastructure for authentication.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- SSH access to the remote RHEL host
- Root or sudo access if you want to manage the rootful Podman socket
- A terminal session
- Podman installed on the remote host
- The Podman remote client installed on your workstation

## Step 2: Configure the Podman Socket

On the remote RHEL host, enable the Podman API socket for the user that will run containers:

```bash
# Connect to the remote host
ssh user@rhel9.example.com

# Enable the rootless Podman API socket
systemctl --user enable --now podman.socket
```

If you need the user's Podman socket to remain available after the user logs out, enable lingering for that user:

```bash
sudo loginctl enable-linger user
```

For rootful Podman management, enable the system socket instead:

```bash
# Enable and start the rootful Podman API socket
sudo systemctl enable --now podman.socket
```

## Step 3: Add the Remote Connection

From your local workstation, add the remote host as a Podman system connection. Replace the user, host name, SSH key, and socket path with values from your environment:

```bash
# Add a rootless remote Podman connection
podman system connection add \
  --identity ~/.ssh/id_ed25519 \
  --socket-path /run/user/1000/podman/podman.sock \
  rhel9 \
  user@rhel9.example.com

# Make it the default connection
podman system connection default rhel9

# List configured connections
podman system connection list
```

For a rootful connection, use the rootful socket path:

```bash
podman system connection add \
  --identity ~/.ssh/id_ed25519 \
  --socket-path /run/podman/podman.sock \
  rhel9-root \
  root@rhel9.example.com
```


## Verification

Confirm everything is working by checking the remote Podman connection:

```bash
# Verify the remote Podman service is reachable
podman --connection rhel9 info

# Run a test container on the remote host
podman --connection rhel9 run --rm registry.access.redhat.com/ubi9/ubi echo "Hello from remote Podman"
```

## Troubleshooting

- If the socket fails to start, check the logs with `journalctl --user -u podman.socket -e --no-pager` for rootless Podman or `sudo journalctl -u podman.socket -e --no-pager` for rootful Podman.
- Check file ownership and permissions with `ls -laZ` (the Z flag shows SELinux contexts).
- Ensure all required packages are installed: `rpm -q podman podman-remote`.
- Verify that SSH works before adding the Podman connection: `ssh -i ~/.ssh/id_ed25519 user@rhel9.example.com`.
- For container issues, check container logs with `podman logs <container-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
