# Validation Summary: How to Configure Dapr with Alibaba Cloud TableStore State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state store component)
- Alibaba Cloud TableStore (OTS)
- Alibaba Cloud CLI (`aliyun`)
- Kubernetes (secrets, component deployment)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr HTTP API (state management)

## Sources Consulted
- Dapr official documentation for Alibaba Cloud TableStore state store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-alicloud-tablestore/
- Dapr supported state stores index: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr `components-contrib` source code for `state/alicloud/tablestore/tablestore.go` (metadata struct verification)
- Dapr runtime component registration source code (`cmd/daprd/components/state_alicloud_tablestore.go`)
- Alibaba Cloud OpenAPI Explorer for TableStore management API (`InsertInstance` operation): https://next.api.aliyun.com/api/Ots/2016-06-20/InsertInstance
- Alibaba Cloud TableStore endpoint documentation

## Issues Found

### Issue 1: Wrong CLI product code and operation name for instance creation
- **What was wrong:** The blog used `aliyun tablestore CreateInstance`. The correct Alibaba Cloud CLI product code for TableStore is `ots` (not `tablestore`), and the API operation for creating an instance is `InsertInstance` (not `CreateInstance`).
- **What was changed:** Updated the command to `aliyun ots InsertInstance` with corrected parameters. Also removed the unverified `--NetworkType NORMAL` flag.
- **Why:** The Alibaba Cloud CLI uses the format `aliyun <product-code> <operation>`, and both the product code and operation name were incorrect.

### Issue 2: `CreateTable` is not available via the Alibaba Cloud CLI
- **What was wrong:** The blog showed `aliyun tablestore CreateTable ...` as a CLI command. `CreateTable` is a data-plane operation in the TableStore protocol (protobuf over HTTP sent directly to the instance endpoint). It is not exposed through the Alibaba Cloud management API / CLI.
- **What was changed:** Replaced the CLI command with guidance to create the table via the Alibaba Cloud console or TableStore SDK, and specified the required schema (primary key column `key` of type `STRING`, `MaxVersions` set to `1`).
- **Why:** Providing a non-functional CLI command would cause readers to encounter errors and lose trust in the tutorial.

## Review Notes
- The Dapr component configuration (type, metadata fields, version, apiVersion) is all correct and verified against both official documentation and source code.
- The component type `state.alicloud.tablestore` is confirmed as **Alpha** status, available since Dapr runtime v1.3.
- The endpoint URL format `https://{instanceName}.{regionId}.ots.aliyuncs.com` is the correct public endpoint pattern.
- The JavaScript SDK usage (`DaprClient`, `state.save`, `state.get`) and HTTP API usage (`/v1.0/state/{storeName}`) are correct.
- The `accessKey` metadata field name (not `accessKeySecret`) is correct per the Dapr component spec, even though Alibaba Cloud itself calls the credential "AccessKeySecret" — Dapr's field is simply `accessKey`.
