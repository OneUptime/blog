# How to Deploy Red Hat Enterprise Linux AI (RHEL AI) on Bare-Metal Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RHEL AI, AI, Bare Metal, Granite

Description: Install and deploy RHEL AI on bare-metal servers to run IBM Granite foundation models with integrated InstructLab for enterprise AI workloads.

---

Red Hat Enterprise Linux AI (RHEL AI) is a purpose-built OS image that includes the Granite family of open-source LLMs from IBM along with InstructLab for model alignment and customization. It is designed for bare-metal deployment on servers with NVIDIA GPUs.

## Prerequisites

- A server with NVIDIA GPUs (A100, H100, or L40S recommended)
- At least 200 GB disk space
- UEFI boot support
- RHEL AI bootable ISO downloaded from the Red Hat Customer Portal

## Download the RHEL AI Image

```bash
# Download from the Red Hat Customer Portal
# Navigate to: Downloads > Red Hat Enterprise Linux AI
# Select the bootable ISO for your architecture

# Alternatively, use the Red Hat Image Builder to create a custom image
```

## Create Bootable Media

```bash
# Write the ISO to a USB drive (on a connected workstation)
sudo dd if=rhel-ai-1.2-x86_64.iso of=/dev/sdX bs=4M status=progress
sync
```

## Install RHEL AI

Boot the server from the USB drive. The installer provides a streamlined experience:

1. Select the target disk for installation
2. Configure networking (static IP recommended for servers)
3. Set the root password and create an admin user
4. The installer deploys the RHEL AI image with all AI components pre-configured

## Verify the Installation

After the first boot:

```bash
# Check that NVIDIA drivers are loaded
nvidia-smi

# Verify the Granite model is available
ilab model list

# Check the InstructLab installation
ilab --version
```

## Serve the Granite Model

```bash
# Start serving the pre-installed Granite model
ilab model serve

# The API server starts on port 8000 by default
# Test with a curl request
curl http://localhost:8000/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "granite",
        "messages": [{"role": "user", "content": "What is RHEL AI?"}],
        "max_tokens": 200
    }'
```

## Customize the Model with InstructLab

```bash
# Initialize the taxonomy
ilab config init

# Add domain-specific knowledge
mkdir -p ~/.local/share/instructlab/taxonomy/knowledge/my_domain
# Create qna.yaml files with your domain knowledge

# Generate synthetic training data
ilab data generate

# Train the model with your data
ilab model train

# Serve the customized model
ilab model serve --model-path ~/.local/share/instructlab/checkpoints/
```

## Configure as a systemd Service

```bash
# Enable the model serving service
sudo systemctl enable --now rhel-ai-serve

# Check the service status
sudo systemctl status rhel-ai-serve

# View logs
journalctl -u rhel-ai-serve -f
```

## Network Configuration

```bash
# Open the inference API port
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# Configure a reverse proxy with nginx for TLS termination
sudo dnf install -y nginx
```

## Monitor GPU Utilization

```bash
# Watch GPU usage in real time
watch -n 1 nvidia-smi

# Check GPU temperature and power draw
nvidia-smi -q -d TEMPERATURE,POWER
```

RHEL AI on bare metal provides a turnkey platform for enterprise AI workloads with Red Hat's support, security updates, and the Granite model family ready to use out of the box.
