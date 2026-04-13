# Validation Summary: How to Set Up Atlas Stream Processing Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Stream Processing
- Atlas CLI (`atlas streams` commands)
- Apache Kafka (as a stream source)
- mongosh (stream processing shell commands)

## Sources Consulted
- MongoDB Atlas CLI installation docs (https://www.mongodb.com/docs/atlas/cli/current/install-atlas-cli/)
- Atlas CLI `atlas streams instances create` reference (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-streams-instances-create/)
- Atlas CLI `atlas streams instances update` reference (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-streams-instances-update/)
- Atlas CLI `atlas streams connections create` reference (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-streams-connections-create/)
- Atlas Admin API OpenAPI specification for `StreamsConnection` schema
- MongoDB Atlas Stream Processing documentation (https://www.mongodb.com/docs/atlas/atlas-sp/)
- mongosh `sp.*` methods reference (https://www.mongodb.com/docs/mongodb-shell/reference/methods/#stream-processing-methods)

## Issues Found

1. **Incorrect Atlas CLI installation command**: The post used `npm install -g @mongodb-js/atlas-cli`, which is not a valid package. The Atlas CLI is installed via system package managers (e.g., `brew install mongodb-atlas`). Fixed to show the correct installation method.

2. **Incorrect AWS region format**: The post used `US_EAST_1` for the `--region` flag, but Atlas CLI uses the `VIRGINIA_USA` naming convention. Fixed to `VIRGINIA_USA`.

3. **Incorrect Kafka connection JSON structure**: The post nested authentication fields (`saslMechanism`, `saslUsername`, `saslPassword`) inside the `security` object. Per the Atlas API schema, `authentication` and `security` are separate top-level objects. Also, the mechanism name `SCRAM-SHA-256` was incorrect; the valid values are `SCRAM-256`, `SCRAM-512`, `PLAIN`, or `OAUTHBEARER`. Fixed to use the correct structure with separate `authentication` and `security` objects and `SCRAM-512` as the mechanism.

4. **Non-existent `sp.status()` method**: The post listed `sp.status()` as a mongosh command, but this method does not exist. The documented `sp.*` methods are `listConnections()`, `listStreamProcessors()`, `createStreamProcessor()`, `process()`, and per-processor methods like `sp.<name>.stats()`. Removed the `sp.status()` line.

5. **Non-existent `atlas streams instances update --tier` command**: The `atlas streams instances update` command does not support a `--tier` flag. The tier is set at instance creation time and cannot be changed via the CLI update command. Replaced the scaling command with a note explaining this limitation.

6. **Non-existent `atlas streams processors logs` command**: There is no `processors` subcommand group under `atlas streams`. The valid subcommand groups are `connections`, `instances`, and `privateLinks`. For audit logs, the correct command is `atlas streams instances download`. Fixed to use the correct command and added a mongosh `sp.<name>.stats()` example for runtime monitoring.

## Review Notes
- The instance tier specifications (SP10: 4 vCPU/16 GB, SP30: 8 vCPU/32 GB, SP100: 32 vCPU/128 GB) could not be verified against official documentation. These specs may be approximate or outdated. The tier names SP10 and SP100 could not be independently confirmed beyond SP30 (which is the documented default).
- The mongosh connection string uses a placeholder hostname `stream.mongodb.net`. In practice, users should retrieve the actual hostname from the `atlas streams instances describe` output, which the post does correctly instruct.
- The prerequisite that stream processing requires an M10+ cluster could not be independently verified from official docs. Atlas Stream Processing instances are separate compute resources (SP tiers), so the cluster tier requirement may be more nuanced.
