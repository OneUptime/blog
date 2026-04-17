# Validation Summary: How to Set Up Private Endpoints for ClickHouse Cloud

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse Cloud
- ClickHouse Cloud REST API
- AWS PrivateLink / VPC Interface Endpoints
- GCP Private Service Connect (PSC)
- Azure Private Link (mentioned)
- AWS CLI (`aws ec2 create-vpc-endpoint`)
- gcloud CLI (`gcloud compute forwarding-rules create`)
- `clickhouse client` (native TCP with TLS)

## Sources Consulted
- ClickHouse Cloud AWS PrivateLink docs: https://clickhouse.com/docs/manage/security/aws-privatelink
- ClickHouse Cloud GCP Private Service Connect docs: https://clickhouse.com/docs/manage/security/gcp-private-service-connect
- ClickHouse Cloud API reference: https://clickhouse.com/docs/cloud/manage/api/services-api-reference
- ClickHouse default ports documentation (8443 HTTPS, 9440 native TCP + TLS)
- AWS EC2 `create-vpc-endpoint` CLI reference
- gcloud `compute forwarding-rules create` reference for PSC consumer endpoints

## Issues Found

1. **Wrong HTTP method and request body for the privateEndpointConfig endpoint.** Post used `POST` with a JSON body (`cloudProvider`, `region`). The correct call is `GET /v1/organizations/{orgId}/services/{serviceId}/privateEndpointConfig` with no body. Fixed.

2. **Wrong response field name.** Post referred to `endpointServiceName`; the actual field is `endpointServiceId`. Fixed.

3. **Wrong authorization scheme.** Post used `Authorization: Bearer $CLICKHOUSE_API_KEY`. ClickHouse Cloud API uses HTTP Basic auth with `Key ID` as user and `Key Secret` as password. Changed to `--user "${KEY_ID}:${KEY_SECRET}"` in both curl examples.

4. **Wrong PATCH body shape for adding a private endpoint ID.** Post used a bare array (`"privateEndpointIds": ["vpce-..."]`). The API requires add/remove sub-objects: `"privateEndpointIds": {"add": ["vpce-..."]}`. Fixed.

5. **Missing required flag on GCP PSC forwarding rule.** `gcloud compute forwarding-rules create` for a PSC consumer endpoint requires `--load-balancing-scheme=""` (empty string) to differentiate it from a normal internal L4 load balancer. Added.

6. **Wrong port for `clickhouse client --secure`.** Post used `--port 8443`, which is the HTTPS port. The native `clickhouse client` uses TCP+TLS on port `9440`. Fixed.

## Review Notes
- The AWS CLI `create-vpc-endpoint` command is correct in shape; the example values are placeholders — readers should substitute the `endpointServiceId` returned by the ClickHouse Cloud API and a VPC/subnet/security-group in the same region as the service.
- Response bodies from the ClickHouse Cloud API are wrapped in a top-level `result` object; readers parsing programmatically should pipe through `jq .result`. Not called out in the post but not strictly wrong either.
- The optional "disable public internet access" step is console-based and the UI labels may drift; no code-level verification needed.
