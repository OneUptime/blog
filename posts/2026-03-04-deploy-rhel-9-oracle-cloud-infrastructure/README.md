# How to Deploy RHEL on Oracle Cloud Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Oracle Cloud, OCI, Cloud, Linux

Description: Deploy and configure RHEL on Oracle Cloud Infrastructure compute instances with proper networking, storage, and monitoring.

---

Oracle Cloud Infrastructure (OCI) supports RHEL on compute instances through imported custom images. This guide covers deploying RHEL on OCI with proper networking, block storage, and integration with OCI services.

## Step 1: Create a Compute Instance

```bash
# Using OCI CLI to create a RHEL instance

# First, find the imported RHEL custom image OCID
oci compute image list \
  --compartment-id $COMPARTMENT_ID \
  --operating-system "Red Hat Enterprise Linux" \
  --operating-system-version "9" \
  --shape "VM.Standard.E4.Flex"

# Create the instance
oci compute instance launch \
  --compartment-id $COMPARTMENT_ID \
  --availability-domain "US-ASHBURN-AD-1" \
  --shape "VM.Standard.E4.Flex" \
  --shape-config '{"ocpus": 4, "memoryInGBs": 32}' \
  --image-id $RHEL9_IMAGE_ID \
  --subnet-id $SUBNET_ID \
  --ssh-authorized-keys-file ~/.ssh/id_rsa.pub \
  --display-name "rhel9-prod" \
  --assign-public-ip true
```

## Step 2: Configure the Instance

```bash
# SSH into the instance
ssh cloud-user@<public-ip>

# Update the system
sudo dnf update -y

# Format and mount a block volume (if attached)
sudo mkfs.xfs /dev/oracleoci/oraclevdb
sudo mkdir -p /data
echo '/dev/oracleoci/oraclevdb /data xfs defaults,noatime 0 0' | sudo tee -a /etc/fstab
sudo mount -a
```

## Step 3: Configure Security Lists

```bash
# Replace the ingress rules with an HTTPS ingress rule
oci network security-list update \
  --security-list-id $SECLIST_ID \
  --ingress-security-rules '[{
    "source": "0.0.0.0/0",
    "protocol": "6",
    "tcpOptions": {"destinationPortRange": {"min": 443, "max": 443}}
  }]' \
  --force

# Configure firewalld on the instance
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 4: Install OCI CLI on the Instance

```bash
# Install OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults

# Configure using instance principal (no credentials needed)
# The instance must have a dynamic group and policy configured
oci os ns get --auth instance_principal
```

## Step 5: Set Up Monitoring

```bash
# Install the Oracle Cloud Agent if Oracle provides an RPM for your image
sudo dnf install -y /path/to/oracle-cloud-agent.rpm

# Enable the Compute Instance Monitoring plugin
oci compute instance update \
  --instance-id $INSTANCE_OCID \
  --agent-config '{"pluginsConfig": [{"name": "Compute Instance Monitoring", "desiredState": "ENABLED"}]}' \
  --force

# Verify the agent is running
sudo systemctl status oracle-cloud-agent
```

## Conclusion

RHEL on Oracle Cloud Infrastructure works well with OCI's flexible compute shapes that let you customize CPU and memory independently. Use instance principals for credential-free access to OCI services and the Cloud Agent for integrated monitoring. OCI's block volumes provide high-performance storage for demanding RHEL workloads.
