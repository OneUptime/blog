# Validation Summary: How to Deploy MongoDB on Oracle Cloud Infrastructure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Oracle Cloud Infrastructure (OCI) CLI
- OCI Compute Instances (VM.Standard.E4.Flex)
- OCI Block Volumes (iSCSI attachment)
- OCI VCN Security Lists
- Ubuntu 22.04 (Jammy)
- iSCSI (iscsiadm)
- XFS filesystem

## Sources Consulted
- OCI CLI Reference: `oci compute instance launch` — https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/instance/launch.html
- OCI CLI Reference: `oci bv volume create` — https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/bv/volume/create.html
- OCI CLI Reference: `oci compute volume-attachment attach` — https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/volume-attachment/attach.html
- OCI CLI Reference: `oci network security-list update` — https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/network/security-list/update.html
- MongoDB 7.0 Installation on Ubuntu — https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB `mongod.conf` configuration reference — https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- iSCSI Qualified Name (IQN) standard — RFC 3720

## Issues Found
- **`$IQDN` replaced with `$IQN` (lines 57-59):** The variable name `$IQDN` in the iSCSI connection commands was incorrect. The standard term per RFC 3720 and OCI documentation is **IQN** (iSCSI Qualified Name), not IQDN. The "D" appeared to be a confusion with FQDN (Fully Qualified Domain Name). Changed all three occurrences to `$IQN`.

## Review Notes
- The `oci compute volume-attachment attach --type iscsi` command is correct but OCI also provides a dedicated `attach-iscsi-volume` subcommand that exposes iSCSI-specific options (CHAP authentication, encryption in transit). For production use the dedicated subcommand may be preferable.
- The `oci network security-list update --ingress-security-rules` command replaces the entire ingress rules list rather than appending. In practice, users should include all existing rules in the JSON array to avoid losing rules (e.g., SSH access). The post does not warn about this.
- The admin user creation works because MongoDB's localhost exception allows the first user to be created without authentication when connecting from 127.0.0.1, even with `authorization: enabled`. This is correct as written.
