# How to Deploy Red Hat Enterprise Linux AI (RHEL AI) on Bare-Metal Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RHEL AI, AI, Bare Metal, Granite

Description: Install and deploy RHEL AI on bare-metal servers to run IBM Granite foundation models with integrated InstructLab for enterprise AI workloads.

---

Red Hat Enterprise Linux AI (RHEL AI) is a purpose-built bootable image that includes InstructLab for model alignment and customization, and provides access to Granite open-source LLMs from IBM. The steps below use the InstructLab-based RHEL AI 1.x workflow for bare-metal deployment on servers with compatible NVIDIA GPUs.

## Prerequisites

- A server with supported NVIDIA GPUs (A100, H100, L40S, or L4 for inference serving; multi-GPU systems are required for the full customization workflow)
- At least 120 GB for the root (`/`) partition and 1 TB of additional storage for RHEL AI data in `/home`
- UEFI boot support
- RHEL AI bootable ISO downloaded from the Red Hat Customer Portal

## Download the RHEL AI Image

```bash
# Download from the Red Hat Customer Portal

# Navigate to: Downloads > Red Hat Enterprise Linux AI
# Select the bootable ISO for your architecture

# Alternatively, install with Kickstart by using the embedded or a custom bootc container image
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
4. The installer deploys the RHEL AI image with the InstructLab tooling pre-configured

## Verify the Installation

After the first boot:

```bash
# Check that NVIDIA drivers are loaded
nvidia-smi

# Verify the downloaded Granite models, if any, are available
ilab model list

# Check the InstructLab installation
ilab --version
```

## Serve the Granite Model

```bash
# Download the default Granite model if it is not already present
ilab model download --repository docker://registry.redhat.io/rhelai1/granite-7b-redhat-lab --release 1.2

# Start serving the downloaded Granite model
ilab model serve

# The API server starts on port 8000 by default
# Test the served default model
ilab model chat
```

## Customize the Model with InstructLab

```bash
# Initialize the taxonomy
ilab config init

# Add domain-specific knowledge
mkdir -p ~/.local/share/instructlab/taxonomy/knowledge/my_domain
# Create qna.yaml files with your domain knowledge, then validate them
ilab taxonomy diff

# Generate synthetic training data
ilab data generate

# Train the model with your generated data
ilab model train --strategy lab-multiphase \
    --phased-phase1-data ~/.local/share/instructlab/datasets/<generation-date>/<knowledge-train-messages-jsonl-file> \
    --phased-phase2-data ~/.local/share/instructlab/datasets/<generation-date>/<skills-train-messages-jsonl-file>

# Serve the customized model
ilab model serve --model-path <path-to-best-performed-checkpoint>
```

## Configure as a systemd Service

```bash
# Create a user service for model serving
mkdir -p $HOME/.config/systemd/user

cat << EOF > $HOME/.config/systemd/user/ilab-serve.service
[Unit]
Description=ilab model serve service

[Install]
WantedBy=multi-user.target default.target

[Service]
ExecStart=ilab model serve --model-family granite
Restart=always
EOF

# Reload and start the service
systemctl --user daemon-reload
systemctl --user start ilab-serve.service

# Allow the user service to start after boot
sudo loginctl enable-linger

# Check the service status
systemctl --user status ilab-serve.service

# View logs
journalctl --user-unit ilab-serve.service -f
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

RHEL AI on bare metal provides a supported platform for enterprise AI workloads with Red Hat's support, security updates, InstructLab tooling, and access to the Granite model family.
