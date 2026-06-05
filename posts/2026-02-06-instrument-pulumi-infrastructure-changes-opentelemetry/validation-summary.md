# Validation Summary: How to Instrument Pulumi Infrastructure Changes with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- Pulumi Python SDK
- Pulumi Automation API
- Pulumi AWS provider
- AWS VPC, subnet, security group, and RDS resources
- Infrastructure as Code tracing and metrics

## Sources Consulted
- Pulumi Python SDK reference: https://www.pulumi.com/docs/reference/pkg/python/pulumi/
- Pulumi Automation API guide: https://www.pulumi.com/docs/iac/guides/building-extending/automation-api/
- Pulumi AWS `aws.ec2.SecurityGroup` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/securitygroup/
- Pulumi AWS `aws.vpc.SecurityGroupIngressRule` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/vpc/securitygroupingressrule/
- Pulumi AWS `aws.ec2.Subnet` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/subnet/
- Pulumi AWS `aws.rds.SubnetGroup` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/rds/subnetgroup/
- Pulumi AWS `aws.rds.Instance` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/rds/instance/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html

## Issues Found
- The post originally claimed that wrapping Pulumi resource constructors traces actual resource creation, modification, deletion, and provisioning duration. Pulumi constructors register resources during program execution; provider operations happen later through the Pulumi engine. Updated the wording to distinguish resource registration spans from Automation API preview, update, and refresh spans.
- The resource-wrapper snippets attempted to set span attributes from `Output.apply()` callbacks after the `with` block had ended the span. OpenTelemetry span operations should not be called after a span is finished, so those callbacks were removed and the note now recommends using Automation API results or events for provider-assigned IDs and outcomes.
- The security group helper used inline `ingress` rules on `aws.ec2.SecurityGroup`. Current Pulumi AWS documentation recommends `aws.vpc.SecurityGroupIngressRule`/`SecurityGroupEgressRule` instead, so the snippet now creates separate ingress rule resources.
- The RDS instance example omitted master user configuration. Added `username` and `manage_master_user_password=True`, matching current Pulumi AWS RDS instance inputs and avoiding an incomplete new PostgreSQL DB instance example.
- The Automation API preview example set a span attribute to a mapping directly. Updated it to stringify `preview_result.change_summary`, matching OpenTelemetry attribute value constraints.
- The final summary repeated the inaccurate claim that every resource creation, modification, and deletion becomes an individual span. Updated it to describe resource registration tracing plus Automation API lifecycle tracing.

## Review Notes
The code snippets are syntactically valid Python. The examples are illustrative and still require normal Pulumi project setup, AWS credentials, the Pulumi CLI for Automation API, and OpenTelemetry exporter/reader configuration to run in a real environment.
