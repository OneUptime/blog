# How to Run Podman Containers with NVIDIA GPU Access on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Containers, GPU, Linux

Description: Step-by-step guide on run podman containers with nvidia gpu access using Red Hat Enterprise Linux 9.

---

Running GPU-accelerated workloads in containers requires passing the NVIDIA GPU device and driver libraries into the container. Podman supports this through CDI (Container Device Interface) on RHEL.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Podman installed (usually included in RHEL by default)
- NVIDIA GPU hardware installed

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/<service>/config.conf
```

Adjust the settings according to your requirements. Key parameters to configure include listening addresses, authentication settings, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart <service-name>
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Verify Podman is working
podman info

# Run a test container
podman run --rm docker.io/library/alpine echo "Hello from Podman"
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Check file ownership and permissions with `ls -laZ` (the Z flag shows SELinux contexts).
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.
- For container issues, check container logs with `podman logs <container-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
