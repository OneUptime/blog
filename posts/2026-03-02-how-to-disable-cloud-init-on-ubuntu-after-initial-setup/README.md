# How to Disable cloud-init on Ubuntu After Initial Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, cloud-init, System Administration, Security

Description: Learn the correct ways to disable cloud-init on Ubuntu after initial instance setup, including disabling specific modules, preventing network reconfiguration, and fully removing cloud-init.

---

cloud-init is designed for cloud instance provisioning. Once your instance is set up and you're managing it through configuration management or manual administration, cloud-init can sometimes interfere - overwriting network configuration on reboot, re-applying stale configurations, or adding unnecessary boot time. Knowing how to safely disable parts or all of cloud-init is useful in several scenarios.

## Why You Might Want to Disable cloud-init

Common reasons to disable cloud-init after initial setup:

- Running Ubuntu in a VM or bare-metal environment that doesn't use cloud metadata
- Preventing cloud-init from overwriting your Netplan configuration on reboot
- Reducing boot time on instances that no longer need initialization
- Avoiding conflicts with configuration management tools
- Deploying custom images that are pre-configured and don't need cloud-init

## Method 1: The Official Disable File

The recommended way to disable cloud-init entirely:

```bash
# Create the disable marker file
sudo touch /etc/cloud/cloud-init.disabled

# Verify it's there
ls -la /etc/cloud/cloud-init.disabled
```

When cloud-init finds this file, it exits immediately without doing anything. This method is clean, reversible, and doesn't require uninstalling packages.

To re-enable cloud-init:

```bash
sudo rm /etc/cloud/cloud-init.disabled
```

## Method 2: Disabling via Kernel Parameters

Add a kernel parameter to disable cloud-init at boot:

```bash
# Edit GRUB configuration
sudo nano /etc/default/grub

# Find the line with GRUB_CMDLINE_LINUX_DEFAULT and add cloud-init=disabled
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash cloud-init=disabled"

# Update GRUB
sudo update-grub

# Reboot to apply
sudo reboot
```

This approach is useful when you want to control cloud-init status from the bootloader configuration rather than filesystem markers.

## Method 3: Disabling Specific cloud-init Services

Instead of disabling all of cloud-init, mask only the services you don't need:

```bash
# Disable all cloud-init services
sudo systemctl disable cloud-init-local.service
sudo systemctl disable cloud-init.service
sudo systemctl disable cloud-config.service
sudo systemctl disable cloud-final.service

# Mask them to prevent other units from starting them
sudo systemctl mask cloud-init-local.service
sudo systemctl mask cloud-init.service
sudo systemctl mask cloud-config.service
sudo systemctl mask cloud-final.service

# Verify
systemctl status cloud-init.service
```

Masking is stronger than disabling - a masked unit cannot be started even as a dependency of another service.

To unmask and re-enable:

```bash
sudo systemctl unmask cloud-init-local.service
sudo systemctl unmask cloud-init.service
sudo systemctl unmask cloud-config.service
sudo systemctl unmask cloud-final.service
sudo systemctl enable cloud-init-local.service cloud-init.service \
    cloud-config.service cloud-final.service
```

## Method 4: Disabling Only Network Configuration

The most common specific complaint is cloud-init overwriting Netplan configuration on reboot. You can disable only the network module while keeping everything else:

```bash
# Create a cloud.cfg.d file to disable network config
sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg << 'EOF'
network:
  config: disabled
EOF
```

This tells cloud-init to leave network configuration alone while still running all other modules. Your manually configured Netplan files won't be overwritten.

Verify it took effect:

```bash
# After reboot, check that cloud-init didn't touch netplan
ls -la /etc/netplan/
# cloud-init created files will have older timestamps

# Check cloud-init logs
grep -i "network" /var/log/cloud-init.log | grep -i "disabled"
```

## Method 5: Disabling Specific Modules

You can comment out or remove specific modules from the cloud-init configuration:

```bash
# Edit the cloud-init config
sudo nano /etc/cloud/cloud.cfg

# Find sections like cloud_init_modules, cloud_config_modules, cloud_final_modules
# Remove or comment out modules you don't want to run

# Example: disable the users-groups module
# cloud_config_modules:
#  - ...
#  - users-groups    # comment out to disable
#  - ...
```

Or add a drop-in file to override specific settings:

```bash
# Disable cc_puppet module
sudo tee /etc/cloud/cloud.cfg.d/90-disable-puppet.cfg << 'EOF'
puppet:
  install: false
  start: false
EOF
```

## Preventing cloud-init from Running on Subsequent Boots

By default, most cloud-init modules only run once per instance ID. But `bootcmd` and per-boot scripts run on every boot. Disable those selectively:

```bash
# Check for per-boot scripts
ls /var/lib/cloud/scripts/per-boot/

# Remove scripts you don't want running on every boot
sudo rm /var/lib/cloud/scripts/per-boot/your-script.sh

# Or disable the per-boot module in cloud.cfg
sudo tee /etc/cloud/cloud.cfg.d/99-no-per-boot.cfg << 'EOF'
cloud_final_modules:
  # Remove scripts-per-boot from this list
  - [package-update-upgrade-install, always]
  - scripts-vendor
  - scripts-per-once
  - scripts-per-instance
  - scripts-user
  - ssh-authkey-fingerprints
  - final-message
  - power-state-change
EOF
```

## Checking cloud-init Status After Disabling

```bash
# Check if disabled file exists
ls /etc/cloud/cloud-init.disabled

# Check service status
systemctl status cloud-init.service

# Check cloud-init's own status
cloud-init status

# Review logs from last boot
journalctl -b -u cloud-init.service
journalctl -b -u cloud-config.service
```

## Removing cloud-init Completely

If you're sure you never need cloud-init again, you can uninstall it:

```bash
# Remove cloud-init and its configuration
sudo apt-get purge cloud-init -y
sudo apt-get autoremove -y

# Remove cloud-init directories
sudo rm -rf /etc/cloud/
sudo rm -rf /var/lib/cloud/

# Remove cloud-init log files
sudo rm -f /var/log/cloud-init.log
sudo rm -f /var/log/cloud-init-output.log

# Verify removal
dpkg -l cloud-init   # should show no package
```

After removing cloud-init, network configuration must be managed entirely through Netplan or systemd-networkd. Make sure your network configuration is in a permanent Netplan file before removing cloud-init, otherwise you may lose network connectivity on the next reboot.

```bash
# Before removing, verify your static network config
cat /etc/netplan/*.yaml

# Apply and test your config without cloud-init
sudo netplan apply

# Check connectivity
ping -c 3 8.8.8.8
```

## Considerations Before Disabling

**Don't disable cloud-init on instances you might snapshot.** If you take a snapshot of an instance with cloud-init disabled and use it as a base image, new instances launched from that snapshot won't have cloud-init functionality for injecting SSH keys or running user data.

**Keep the disable file in images, remove it in launch configs.** A common pattern for golden images is to include cloud-init but put the disable file in the image. The bootstrap process removes the disable file, cloud-init runs once, then the disable file gets recreated. This gives you controlled, one-time initialization.

```bash
# In your Packer or image build script
echo "Disabling cloud-init for image distribution"
sudo touch /etc/cloud/cloud-init.disabled

# In your launch user data (a shell script, not cloud-config)
# since cloud-init is disabled, use alternative mechanisms
```

For most production Ubuntu servers that have completed their initial setup, simply creating `/etc/cloud/cloud-init.disabled` is the right call. It's reversible, clean, and doesn't require uninstalling packages that might be needed later.
