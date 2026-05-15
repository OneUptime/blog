# How to Set Up Podman Machine for Local Container Development on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Container, Linux

Description: Step-by-step guide on set up podman machine for local container development using Red Hat Enterprise Linux 9.

---

Podman Machine creates a lightweight virtual machine that runs a Podman-compatible Linux environment. On Linux hosts such as RHEL, Podman can run containers directly without a virtual machine, but Podman Machine can still be used when you want an isolated VM-backed container environment.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access to install packages
- A terminal session
- Podman installed through the `container-tools` package
- Hardware virtualization enabled for the local VM

## Step 1: Install Container Tools

Install Podman and the related container tools:

```bash
sudo dnf install container-tools
```

Confirm Podman is available:

```bash
podman --version
```

## Step 2: Initialize the Podman Machine

```bash
# Create the default Podman machine
podman machine init --cpus 2 --memory 2048 --disk-size 20
```

Adjust the CPU, memory, and disk size values according to your requirements. Memory is specified in MiB, and disk size is specified in GiB.

## Step 3: Start the Podman Machine

```bash
# Start the default machine
podman machine start

# Check the status
podman machine list
```


## Verification

Confirm everything is working by checking the machine and running a test container:

```bash
# Inspect the default machine
podman machine inspect

# Verify Podman is working
podman info

# Run a test container
podman run --rm registry.access.redhat.com/ubi9/ubi echo "Hello from Podman"
```

## Troubleshooting

- If the machine fails to start, inspect it with `podman machine inspect`.
- If the VM starts but container commands fail, check the connection with `podman system connection list`.
- Ensure all required packages are installed: `rpm -qa | grep container-tools`.
- For container issues, check container logs with `podman logs <container-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the machine and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
