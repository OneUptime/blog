# How to Use Trusted Platform Module (TPM) with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TPM, Security, Hardware Security, Kubernetes

Description: A complete guide to using Trusted Platform Module (TPM) with Talos Linux for hardware-backed security, disk encryption, and measured boot.

---

Trusted Platform Module (TPM) is a hardware security chip found on most modern servers and workstations. It provides a hardware root of trust that software alone cannot replicate. Talos Linux supports TPM 2.0 for TPM-backed disk encryption and trusted boot when combined with Secure Boot. This guide walks you through enabling and using TPM features in your Talos Linux cluster.

## What Is TPM and Why It Matters

A TPM is a dedicated microcontroller designed to secure hardware through integrated cryptographic keys. Think of it as a tiny vault built into your server's motherboard. It can store encryption keys, generate random numbers, and perform cryptographic operations without exposing the key material to software.

For Kubernetes infrastructure running on Talos Linux, TPM provides several important capabilities:

- **Disk encryption keys** sealed to the hardware, so a stolen disk cannot be read on a different machine
- **Measured boot** that records boot-stage measurements into TPM PCRs for policy checks
- **Signed PCR policies** that let Talos unlock disks only when the expected boot measurements are present
- **Secure key sealing** for disk encryption keys that should not be exposed directly to software

## Checking for TPM Hardware

Before configuring TPM support, verify that your hardware has a TPM 2.0 chip and that it is enabled in the BIOS/UEFI:

```bash
# Check if the Talos node has a TPM device available

talosctl read /sys/class/tpm/tpm0/tpm_version_major --nodes <node-ip>

# The output should be "2" for TPM 2.0

# Get more detailed TPM information
talosctl dmesg --nodes <node-ip> | grep -i tpm
```

If the TPM device is not showing up, you may need to enable it in your server's UEFI firmware settings. The setting is usually found under Security or Advanced settings and might be labeled as "TPM Device", "Security Device Support", or "Intel PTT" (for Intel systems) or "AMD fTPM" (for AMD systems).

## Enabling TPM-Based Disk Encryption

One of the most valuable uses of TPM with Talos is encrypting the EPHEMERAL and STATE partitions using keys sealed to the TPM. This means the disk is automatically decrypted during boot on the correct hardware, but the data is inaccessible if someone removes the disk and tries to read it on a different machine.

Configure TPM-based encryption in your Talos machine configuration:

```yaml
# machine-config-tpm-encryption.yaml
# Enable TPM-sealed disk encryption for Talos partitions
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
    state:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
```

Apply this configuration when generating your Talos config:

```bash
# Generate a Talos configuration with TPM encryption enabled
talosctl gen config my-cluster https://cluster-endpoint:6443 \
  --install-image factory.talos.dev/metal-installer/<schematic-id>:<talos-version> \
  --install-disk /dev/sda \
  --config-patch @machine-config-tpm-encryption.yaml

# Apply the configuration to a node in maintenance mode
talosctl apply-config --nodes <node-ip> --file controlplane.yaml --insecure
```

## Understanding PCR-Based Sealing

TPM uses Platform Configuration Registers (PCRs) to record measurements of the boot process. Each PCR stores a hash that represents a specific aspect of the system state. When you seal an encryption key to specific PCRs, the key can only be retrieved when those PCRs contain the expected values.

Here are the PCRs most relevant to Talos Linux:

| PCR | What It Measures |
|-----|-----------------|
| PCR 0 | BIOS/UEFI firmware code |
| PCR 1 | BIOS/UEFI firmware configuration |
| PCR 4 | Boot loader and loaded EFI application code |
| PCR 7 | Secure Boot state |
| PCR 8 | Boot loader configuration |
| PCR 11 | UKI measurements and Talos boot phases |

You can read the current PCR values from a Talos node:

```bash
# Read TPM PCR values from the node
talosctl read /sys/class/tpm/tpm0/pcr-sha256/0 --nodes <node-ip>
talosctl read /sys/class/tpm/tpm0/pcr-sha256/7 --nodes <node-ip>
```

## Configuring Measured Boot with Secure Boot

For the strongest security guarantees, combine TPM with UEFI Secure Boot. Talos supports Secure Boot on UEFI systems with Secure Boot images, and when combined with TPM, it creates a trusted boot chain for the operating system.

```yaml
# machine-config-secureboot-tpm.yaml
# Enable Secure Boot with TPM-sealed encryption
machine:
  install:
    image: factory.talos.dev/installer-secureboot/<schematic-id>:<talos-version>
    disk: /dev/sda
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
    state:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
```

The Secure Boot variant of the Talos installer includes signed bootloader components that satisfy the Secure Boot chain:

```bash
# Generate a schematic for the Talos Image Factory
# Secure Boot is selected by using the installer-secureboot image path
cat > secureboot-schematic.yaml <<'EOF'
customization:
  systemExtensions:
    officialExtensions: []
EOF

# Get the schematic ID from the Image Factory
SCHEMATIC_ID=$(curl -s -X POST --data-binary @secureboot-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/x-yaml" | jq -r '.id')

# Use the secure boot installer image
echo "Installer: factory.talos.dev/installer-secureboot/${SCHEMATIC_ID}:<talos-version>"
```

## Handling TPM During Upgrades

When you upgrade Talos Linux, the boot measurements change because the kernel and initramfs are different. With Secure Boot images, the new UKI must contain a PCR policy signed by the same PCR signing key, and the configured PCR states must still match.

```bash
# Perform a Talos upgrade using the matching installer image
talosctl upgrade --nodes <node-ip> \
  --image factory.talos.dev/installer-secureboot/<schematic-id>:<talos-version>

# Verify the node comes back up with encryption intact
talosctl health --nodes <node-ip>
```

If something goes wrong during an upgrade and the TPM policy no longer matches, you can recover an encrypted EPHEMERAL partition using a static key that you should keep as a backup. Avoid using static keys for the STATE partition in production, because Talos stores STATE encryption configuration in the META partition.

```yaml
# machine-config-tpm-with-backup.yaml
# TPM encryption with a static backup key for EPHEMERAL recovery
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
        - slot: 1
          static:
            passphrase: "your-recovery-passphrase-keep-this-safe"
    state:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
```

Store the recovery passphrase in a secure location like a hardware security module or a secrets manager, separate from the infrastructure it protects.

## TPM in Cloud Environments

Many cloud providers offer virtual TPM (vTPM) support for their instances. This lets you use TPM features even in cloud deployments:

- **AWS** - Available on Nitro-based instances with NitroTPM
- **Azure** - Available through Trusted Launch VMs
- **GCP** - Available through Shielded VMs

```bash
# Example: Creating an AWS EC2 instance with vTPM support for Talos
aws ec2 run-instances \
  --image-id ami-talos-secureboot \
  --instance-type m5.xlarge \
  --tpm-support v2.0 \
  --count 1
```

## Verifying TPM Status

After setting up TPM, verify everything is working correctly:

```bash
# Check the configured volume encryption keys
talosctl get volumeconfigs STATE --nodes <node-ip> -o yaml
talosctl get volumeconfigs EPHEMERAL --nodes <node-ip> -o yaml

# Verify the TPM device is recognized
talosctl dmesg --nodes <node-ip> | grep -i "tpm"

# Check volume status, including encrypted volume locations and PCRs on newer Talos releases
talosctl get volumestatus STATE --nodes <node-ip> -o yaml
talosctl get volumestatus EPHEMERAL --nodes <node-ip> -o yaml
```

## Security Considerations

While TPM significantly improves your security posture, keep these points in mind:

1. **Physical security still matters** - TPM protects against disk theft but not against an attacker with prolonged physical access to a powered-on machine.
2. **Backup your recovery keys** - If the TPM chip fails, you need an alternative way to unlock your disks.
3. **Monitor TPM events** - Log and alert on TPM-related events to detect potential tampering attempts.
4. **Plan for hardware replacement** - When you replace a server, the new TPM will have different keys. Have a process for re-provisioning nodes.

## Conclusion

TPM support in Talos Linux adds a hardware-backed security layer that is difficult to achieve with software alone. By sealing disk encryption keys to the TPM and combining this with Secure Boot, you create a trusted boot path for Talos and its encrypted volumes. The configuration is straightforward, and Talos handles the complexity of TPM interactions so you can focus on running your cluster securely.
