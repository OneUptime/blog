# How to Deploy ClickHouse on Oracle Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Oracle Cloud, OCI, Deployment, Linux

Description: Deploy ClickHouse on Oracle Cloud Infrastructure with VM shapes, block volume configuration, security lists, and Object Storage integration for backups.

---

Oracle Cloud Infrastructure (OCI) offers competitive pricing and the Always Free tier, making it an interesting platform for ClickHouse deployments. The Flexible VM shapes allow precise CPU and memory allocation.

## Choosing a VM Shape

OCI flexible shapes let you customize OCPU and memory independently:

- **VM.Standard.E4.Flex** - AMD EPYC, up to 64 OCPU and 1024 GB RAM
- **VM.Standard.A1.Flex** - ARM-based Ampere, great price/performance
- **VM.Standard3.Flex** - Intel Ice Lake

A reasonable production starting point is `VM.Standard.E4.Flex` with 16 OCPU and 128 GB RAM.

## Creating the Instance

Using OCI CLI:

```bash
oci compute instance launch \
  --availability-domain "AD-1" \
  --compartment-id ocid1.compartment.oc1..xxx \
  --shape "VM.Standard.E4.Flex" \
  --shape-config '{"ocpus": 16, "memoryInGBs": 128}' \
  --image-id ocid1.image.oc1..xxx \
  --subnet-id ocid1.subnet.oc1..xxx \
  --ssh-authorized-keys-file ~/.ssh/id_rsa.pub \
  --assign-public-ip false \
  --display-name clickhouse-prod
```

Use `--assign-public-ip false` and access through a bastion host.

## Attaching a Block Volume

```bash
# Create a 1 TB block volume
oci bv volume create \
  --compartment-id ocid1.compartment.oc1..xxx \
  --availability-domain "AD-1" \
  --display-name "clickhouse-data" \
  --size-in-gbs 1024 \
  --vpus-per-gb 20

# Attach the volume (iSCSI)
oci compute volume-attachment attach \
  --type iscsi \
  --instance-id ocid1.instance.oc1..xxx \
  --volume-id ocid1.volume.oc1..xxx
```

Follow the iSCSI connection commands provided in the attachment output to mount the volume.

## Installing ClickHouse on Oracle Linux

```bash
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://packages.clickhouse.com/rpm/clickhouse.repo
sudo dnf install -y clickhouse-server clickhouse-client
sudo systemctl enable --now clickhouse-server
```

## Security List Rules

Add ingress rules to the subnet's security list:

```bash
oci network security-list update \
  --security-list-id ocid1.securitylist.oc1..xxx \
  --ingress-security-rules '[
    {"source": "10.0.0.0/8", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 8123, "max": 8123}}},
    {"source": "10.0.0.0/8", "protocol": "6", "tcpOptions": {"destinationPortRange": {"min": 9000, "max": 9000}}}
  ]'
```

## OCI Object Storage for Backups

Configure ClickHouse to use OCI Object Storage via the S3-compatible API:

```sql
BACKUP DATABASE mydb
TO S3(
  'https://your-namespace.compat.objectstorage.us-phoenix-1.oraclecloud.com/my-bucket/clickhouse/',
  'your_access_key',
  'your_secret_key'
);
```

Generate S3-compatible credentials from OCI IAM under Customer Secret Keys.

## Free Tier Usage

OCI's Always Free tier includes 2 AMD VMs (VM.Standard.E2.1.Micro) with 1/8 OCPU and 1 GB memory each, or up to 4 Ampere A1 Arm instances with 4 OCPUs and 24 GB memory total. While not suitable for production ClickHouse, this is ideal for learning and development.

## Summary

Deploying ClickHouse on OCI uses flexible VM shapes for precise resource allocation, iSCSI block volumes for persistent storage, security list rules to restrict network access, and OCI Object Storage via the S3-compatible API for backups. The flexible shape model means you pay for exactly the resources ClickHouse needs.
