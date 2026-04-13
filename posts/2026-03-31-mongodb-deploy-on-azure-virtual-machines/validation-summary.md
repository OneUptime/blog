# Validation Summary: How to Deploy MongoDB on Azure Virtual Machines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Azure CLI (`az vm create`, `az vm disk attach`, `az network nsg rule create`)
- Azure Virtual Machines (Standard_D4s_v3)
- Azure Managed Disks (Premium SSD / Premium_LRS)
- Azure Network Security Groups
- Ubuntu 22.04 LTS (Jammy)
- XFS filesystem
- mongosh

## Sources Consulted
- Azure CLI `az vm create` reference: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest#az-vm-create
- Azure CLI `az vm disk attach` reference: https://learn.microsoft.com/en-us/cli/azure/vm/disk?view=azure-cli-latest#az-vm-disk-attach
- Azure CLI `az network nsg rule create` reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest#az-network-nsg-rule-create
- MongoDB 7.0 installation on Ubuntu: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB configuration file options: https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- MongoDB localhost exception: https://www.mongodb.com/docs/v7.0/core/localhost-exception/
- MongoDB replica set initiation: https://www.mongodb.com/docs/v7.0/reference/method/rs.initiate/

## Issues Found
1. **Missing `chown` for MongoDB data directory**: After mounting the data disk at `/data/mongodb`, the directory is owned by root. The MongoDB service runs as the `mongodb` user and needs ownership of the data directory. Without `sudo chown -R mongodb:mongodb /data/mongodb`, mongod would fail to start with a permission error. Added the chown command after the mount step.

2. **Missing `rs.initiate()` before creating admin user**: The mongod.conf includes `replication.replSetName: "rs0"`, which means the node starts in `STARTUP2` state and cannot accept write operations until the replica set is initiated. The `db.createUser()` call would fail because the node is not yet a primary. Added a separate `mongosh --eval "rs.initiate();"` step before the user creation command.

## Review Notes
- Using `/dev/sdc1` in `/etc/fstab` works but is fragile on Azure since device names can change on reboot. Using UUID (from `blkid`) would be more robust. This is a best-practice consideration rather than a correctness error.
- The hardcoded password `SecurePassword123!` is clearly a placeholder, which is appropriate for a tutorial. A production note about using a secrets manager or environment variable could strengthen the post but is not required.
- The blog configures a replica set on a single node. The summary correctly advises deploying three nodes across Availability Zones for production HA. The single-node rs.initiate() shown is a valid starting point.
