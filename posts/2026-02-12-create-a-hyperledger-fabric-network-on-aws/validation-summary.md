# Validation Summary: How to Create a Hyperledger Fabric Network on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Managed Blockchain / AMB Hyperledger Fabric
- AWS CLI
- Amazon EC2
- Amazon VPC interface endpoints / AWS PrivateLink
- Hyperledger Fabric 2.x
- Hyperledger Fabric CA, cryptogen, configtxgen, osnadmin, peer CLI
- Docker and Docker Compose
- Chaincode lifecycle

## Sources Consulted
- AWS CLI `managedblockchain create-network` command reference: https://docs.aws.amazon.com/cli/latest/reference/managedblockchain/create-network.html
- AWS CLI `managedblockchain create-node` command reference: https://docs.aws.amazon.com/cli/latest/reference/managedblockchain/create-node.html
- AWS CLI `managedblockchain get-network` command reference: https://docs.aws.amazon.com/cli/latest/reference/managedblockchain/get-network.html
- AWS Managed Blockchain Hyperledger Fabric VPC endpoint documentation: https://docs.aws.amazon.com/managed-blockchain/latest/hyperledger-fabric-dev/managed-blockchain-endpoints.html
- AWS Managed Blockchain Hyperledger Fabric security group documentation: https://docs.aws.amazon.com/managed-blockchain/latest/hyperledger-fabric-dev/managed-blockchain-security-sgs.html
- Hyperledger Fabric 2.5 install documentation: https://hyperledger-fabric.readthedocs.io/en/release-2.5/install.html
- Hyperledger Fabric 2.5 channel participation documentation: https://hyperledger-fabric.readthedocs.io/en/release-2.5/create_channel/create_channel_participation.html
- Hyperledger Fabric 2.5 `configtxgen` command reference: https://hyperledger-fabric.readthedocs.io/en/latest/commands/configtxgen.html
- Hyperledger Fabric 2.5 `peer channel` command reference: https://hyperledger-fabric.readthedocs.io/en/release-2.5/commands/peerchannel.html
- Hyperledger Fabric 2.5 chaincode lifecycle command reference: https://hyperledger-fabric.readthedocs.io/en/release-2.5/commands/peerlifecycle.html

## Issues Found
- The Managed Blockchain `create-network` example omitted `--framework-configuration "Fabric={Edition=STANDARD}"`, even though the Fabric edition is required by the AWS CLI schema. Added the framework configuration.
- The Managed Blockchain admin password used `@`, which AWS disallows for Fabric member admin passwords. Replaced it with a valid example password.
- The VPC endpoint example constructed a service name manually from the network ID. AWS documents that the VPC endpoint service name should be read from `get-network` / network details. Updated the command to query `Network.VpcEndpointServiceName` and enabled private DNS.
- The security group table listed fixed ports and a generic 443 CA port. AWS documents Managed Blockchain Fabric service ports in the 30000-34000 range, with actual endpoint ports returned by `get-network`, `get-member`, and `get-node`. Replaced the table with the documented port range and lookup guidance.
- The EC2 launch command created three instances while the sizing plan listed four components. Updated the count to four and made the tag generic.
- The Fabric install command used the older bootstrap script URL and older versions. Replaced it with the current official `install-fabric.sh` flow for Fabric 2.5.15 and Fabric CA 1.5.15.
- The self-managed Fabric section installed Fabric 2.5 but used the legacy system-channel channel creation flow. Updated it to generate a channel genesis block and join the orderer through the Fabric channel participation API with `osnadmin`.
- The Docker Compose orderer configuration used file-based genesis bootstrap. Updated it to `ORDERER_GENERAL_BOOTSTRAPMETHOD=none`, enabled channel participation, and added the orderer admin endpoint/TLS settings needed by `osnadmin`.
- The channel join commands used `peer channel create` with a channel transaction. Replaced them with `osnadmin channel join`, `peer channel fetch`, and `peer channel join`.
- The chaincode commit command did not include peer addresses and TLS root certificate files for collecting commit endorsements from both organizations. Added representative `--peerAddresses` and `--tlsRootCertFiles` flags.
- The security guidance implied KMS can directly store Fabric private keys. Adjusted it to recommend CloudHSM or encrypted secrets storage for private keys and KMS for encryption at rest where supported.

## Review Notes
The `configtx.yaml` and Docker Compose snippets remain abbreviated examples, so a real deployment still needs complete Fabric profile, orderer, application, policy, and peer service configuration. The post is technically valid as a high-level guide after the corrections, but production Fabric deployment should rely on complete generated configuration and environment-specific endpoint, MSP, and TLS paths.
