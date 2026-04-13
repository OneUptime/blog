# Validation Summary: How to Deploy MongoDB on Azure with ARM Templates

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code Guide

## Technologies Covered
- MongoDB 7.0
- Azure Resource Manager (ARM) templates
- Azure Virtual Machines (Microsoft.Compute/virtualMachines)
- Azure Virtual Networks (Microsoft.Network/virtualNetworks)
- Azure Network Security Groups (Microsoft.Network/networkSecurityGroups)
- Azure Availability Sets (Microsoft.Compute/availabilitySets)
- Azure CustomScript Extension (Microsoft.Azure.Extensions)
- Azure CLI (`az deployment group create`)
- Ubuntu 22.04 LTS (Jammy)

## Sources Consulted
- ARM template schema reference: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/syntax
- Microsoft.Compute/virtualMachines API reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/virtualmachines
- Microsoft.Network/virtualNetworks API reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.network/virtualnetworks
- Microsoft.Compute/availabilitySets API reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/availabilitysets
- Azure CustomScript extension v2 for Linux: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- ARM template dependency resolution (resourceId vs reference): https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/resource-dependency
- MongoDB 7.0 installation on Ubuntu: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/

## Issues Found

1. **VNet missing `dependsOn` for NSG**: The VNet resource referenced the NSG via `resourceId()` in the subnet's `networkSecurityGroup` property, but did not declare an explicit `dependsOn`. ARM does not infer implicit dependencies from `resourceId()` calls (only from `reference()` and `list*()` functions), so the NSG might not exist when the VNet is created. Added `"dependsOn": ["mongo-nsg"]` to the VNet resource.

2. **VM `storageProfile` missing required `osDisk`**: The `storageProfile` only contained `imageReference` and `dataDisks` but was missing the required `osDisk` property. Without it, ARM template validation fails. Added an `osDisk` block with `"createOption": "FromImage"` and `Premium_LRS` managed disk type.

3. **CustomScript `script` property placed in `settings` instead of `protectedSettings`**: The `script` property (base64-encoded inline script) is only valid inside `protectedSettings` for the CustomScript extension v2.x on Linux. Placing it in `settings` causes the extension to ignore or reject it. Changed `"settings"` to `"protectedSettings"`.

4. **Install script did not configure mongod to use the mounted data disk**: The script formatted and mounted `/dev/sdc` to `/data/mongodb` but never updated `/etc/mongod.conf` to change `dbPath` from the default `/var/lib/mongodb`. Added a `sed` command to update the `dbPath` setting.

5. **Install script did not configure replica set or network binding**: The post is about deploying a three-node replica set, but the script never set `replication.replSetName` or changed `bindIp` from `127.0.0.1`. Without these, nodes cannot communicate or form a replica set. Added commands to set `bindIp: 0.0.0.0` and append `replication.replSetName: rs0` to `mongod.conf`.

## Review Notes
- The post uses a static replica set name "rs0" in the install script rather than injecting the `mongoReplicaSetName` parameter. For a production template, you'd use ARM's `concat()` to inject the parameter value into the script. This is acceptable for a tutorial.
- The post does not show the `rs.initiate()` step needed to actually initialize the replica set after all nodes are running. A reader would need to SSH into one node and run `rs.initiate()` with the member configuration. This is a completeness gap but not a technical error in what's shown.
- The NIC resource (`mongo-nic-0`) is referenced but never defined in the post. The post notes the VM is "repeated for each node" so the NIC is presumably part of the full template but omitted for brevity. This is acceptable.
- The availability set's `platformFaultDomainCount: 3` is valid for the `eastus` region used in the CLI example, but not all Azure regions support 3 fault domains. A production template might parameterize this.
- The `echo /dev/sdc /data/mongodb xfs defaults 0 0 >> /etc/fstab` line is missing from the script, meaning the data disk mount won't persist across VM reboots. This is a best-practice gap but not an error in the ARM template itself.
