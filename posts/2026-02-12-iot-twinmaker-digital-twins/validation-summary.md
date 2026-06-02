# Validation Summary: How to Use IoT TwinMaker for Digital Twins

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS IoT TwinMaker
- AWS CLI
- AWS IAM
- Amazon S3
- AWS Lambda
- Amazon DynamoDB
- AWS IoT SiteWise
- Grafana AWS IoT TwinMaker plugin
- Python / boto3

## Sources Consulted
- AWS CLI `iottwinmaker create-workspace` documentation: https://docs.aws.amazon.com/cli/latest/reference/iottwinmaker/create-workspace.html
- AWS CLI `iottwinmaker create-component-type` documentation: https://docs.aws.amazon.com/cli/latest/reference/iottwinmaker/create-component-type.html
- AWS CLI `iottwinmaker create-entity` documentation: https://docs.aws.amazon.com/cli/latest/reference/iottwinmaker/create-entity.html
- AWS CLI `iottwinmaker create-scene` documentation: https://awscli.amazonaws.com/v2/documentation/api/2.4.18/reference/iottwinmaker/create-scene.html
- AWS CLI `iottwinmaker get-property-value` documentation: https://docs.aws.amazon.com/cli/latest/reference/iottwinmaker/get-property-value.html
- AWS CLI `iottwinmaker get-property-value-history` documentation: https://docs.aws.amazon.com/cli/latest/reference/iottwinmaker/get-property-value-history.html
- AWS IoT TwinMaker data connector interface documentation: https://docs.aws.amazon.com/iot-twinmaker/latest/guide/data-connector-interfaces.html
- AWS IoT TwinMaker time-series data connector guide: https://docs.aws.amazon.com/iot-twinmaker/latest/guide/time-series-data-connectors.html
- Grafana AWS IoT TwinMaker App plugin page: https://grafana.com/grafana/plugins/grafana-iot-twinmaker-app/

## Issues Found
- The workspace `--s3-location` used an `s3://` URI, but the AWS CLI requires the S3 bucket ARN. Changed it to `arn:aws:s3:::my-twinmaker-workspace`.
- Several example AWS ARNs used a 9-digit account ID. AWS IAM and Lambda ARN patterns require a 12-digit account ID, so the examples now use `123456789012`.
- The component type `functions` example included an unsupported `"type": "DATA_CONNECTOR"` field under `implementedBy`. Removed it and added the documented `scope` field for the entity-level data reader.
- The Lambda data connector response used `propertyReference` and `propertyValue`, which match the static attribute reader shape, not the time-series data reader shape. Updated it to return `entityPropertyReference` and `values`.
- The Python connector generated UTC timestamps by appending `Z` to a naive local timestamp. Updated it to create timezone-aware UTC timestamps.
- The scene `--content-location` used an S3 URI, but the CLI expects a relative path to the scene content definition file. Changed it to `scenes/factory-overview.json`.
- The explanation said TwinMaker does not host 3D models. Clarified that operational IoT time-series data is not stored in TwinMaker, while workspace resources such as scenes and 3D models are stored in the configured S3 bucket.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI documentation instead of local `aws --help` output. The post remains a simplified tutorial: production deployments should add least-privilege IAM scoping, Lambda error handling, pagination, and validation of connector input fields.
