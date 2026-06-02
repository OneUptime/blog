# Validation Summary: How to Set Up Amazon Managed Blockchain

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Amazon Managed Blockchain / AMB Access
- AWS CLI
- Amazon VPC interface endpoints / AWS PrivateLink
- Hyperledger Fabric 2.2
- Fabric CA client
- Hyperledger Fabric peer CLI and configtxgen
- Go chaincode with `fabric-contract-api-go`
- Amazon CloudWatch metrics and logs

## Sources Consulted
- AWS CLI `create-network` reference: https://docs.aws.amazon.com/cli/latest/reference/managedblockchain/create-network.html
- AWS CLI `create-node` reference: https://docs.aws.amazon.com/cli/latest/reference/managedblockchain/create-node.html
- AWS CLI `create-proposal` reference: https://docs.aws.amazon.com/cli/latest/reference/managedblockchain/create-proposal.html
- Amazon Managed Blockchain guide, create network and first member: https://docs.aws.amazon.com/managed-blockchain/latest/hyperledger-fabric-dev/get-started-create-network.html
- Amazon Managed Blockchain guide, interface VPC endpoints: https://docs.aws.amazon.com/managed-blockchain/latest/hyperledger-fabric-dev/managed-blockchain-endpoints.html
- Amazon Managed Blockchain guide, security groups: https://docs.aws.amazon.com/managed-blockchain/latest/hyperledger-fabric-dev/managed-blockchain-security-sgs.html
- Amazon Managed Blockchain guide, register and enroll a Fabric admin: https://docs.aws.amazon.com/managed-blockchain/latest/hyperledger-fabric-dev/managed-blockchain-hyperledger-create-admin.html
- Amazon Managed Blockchain guide, create a Fabric channel: https://docs.aws.amazon.com/managed-blockchain/latest/hyperledger-fabric-dev/get-started-create-channel.html
- Amazon Managed Blockchain peer node metrics: https://docs.aws.amazon.com/managed-blockchain/latest/hyperledger-fabric-dev/managed-blockchain-peer-node-metrics.html
- Amazon Managed Blockchain Hyperledger Fabric pricing: https://aws.amazon.com/managed-blockchain/pricing/hyperledger
- Hyperledger Fabric contract API for Go: https://pkg.go.dev/github.com/hyperledger/fabric-contract-api-go/contractapi

## Issues Found
- The IAM policy snippet was marked as JSON but included a `//` comment, which is not valid JSON. Moved the comment text outside the fenced JSON block.
- The `create-network` command omitted the Hyperledger Fabric edition. Added `--framework-configuration "Fabric={Edition=STARTER}"`, matching AWS examples and the CLI shape for Fabric network configuration.
- The VPC endpoint example hard-coded the service name without showing how to retrieve it and did not enable private DNS. Added a `get-network` query for `Network.VpcEndpointServiceName` and added `--private-dns-enabled`.
- The security group guidance incorrectly listed port 443 for the Fabric CA and treated `30001-30004` as fixed. Updated it to use the ordering, CA, and peer event service ports returned by the relevant AMB commands, typically in the 30000-34000 range.
- The admin enrollment step did not copy the enrolled signing certificate into `admincerts`, which AWS documents as required for the identity to validate as an admin. Added the minimal `mkdir` and `cp` commands.
- The CloudWatch metric names did not match the official AMB peer node metrics. Replaced `PeerNodeCPUUtilization`, `PeerNodeMemoryUtilization`, `TransactionCount`, and `BlockHeight` with documented metrics such as `CPUUtilization`, `MemoryUtilization`, `Transactions`, and `EndorserProposalDuration`.
- The monthly development cost estimate was too low because it omitted the hourly Starter Edition membership charge. Updated the estimate to roughly `$240-260/month` before data transfer and variable usage charges.
- The prerequisite requiring two subnets in different Availability Zones was stricter than the AMB interface endpoint requirement. Updated it to require at least one subnet, with two subnets noted for higher availability.

## Review Notes
The channel creation and chaincode sections remain intentionally high level. A production-ready guide should also show the required Fabric client environment variables, `configtx.yaml` profile contents, TLS root certificate download command, peer endpoint configuration, and the full Fabric 2.x chaincode package/install/approve/commit lifecycle.
