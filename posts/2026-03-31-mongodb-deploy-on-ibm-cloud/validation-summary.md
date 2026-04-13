# Validation Summary: How to Deploy MongoDB on IBM Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- IBM Cloud VPC (Virtual Server Instances, Block Storage, Security Groups)
- IBM Cloud CLI (`ibmcloud is` subcommands)
- IBM Cloud Monitoring (Sysdig-based agent)
- Ubuntu 22.04 (Jammy)
- XFS filesystem
- systemd

## Sources Consulted
- IBM Cloud VPC CLI reference for `instance-create`, `volume-create`, `instance-volume-attachment-add`, and `security-group-rule-add` — https://cloud.ibm.com/docs/vpc?topic=vpc-vpc-reference
- IBM Cloud docs on creating VPC resources — https://github.com/ibm-cloud-docs/vpc/blob/master/creating-vpc-resources.md
- IBM Cloud docs on attaching block storage — https://cloud.ibm.com/docs/vpc?topic=vpc-attaching-block-storage
- MongoDB 7.0 installation guide for Ubuntu — https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB 7.0 configuration file options — https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- MongoDB localhost exception documentation — https://www.mongodb.com/docs/v7.0/core/localhost-exception/

## Issues Found
No technical issues found.

## Review Notes
- The `storage.engine: wiredTiger` setting in `mongod.conf` is valid but redundant since WiredTiger has been the only supported storage engine since MongoDB 4.2. Including it explicitly is harmless and arguably adds clarity.
- The manual creation of the `mongodb` user/group before installing the `mongodb-org` package is redundant since the package postinst script creates this user automatically. However, it ensures correct ownership of the custom data directory and is not incorrect.
- The admin user creation relies on the MongoDB localhost exception (first user can be created from localhost even with authorization enabled). This is correct behavior but the post could optionally mention this for reader clarity.
- The hardcoded password `IBMCloudMongoPassword!` in the `createUser` example is a sample value. In production, readers should use a strong, unique password — ideally injected via environment variable or secrets manager.
