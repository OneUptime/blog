# Validation Summary: How to Set Up IoT Core Custom Domains

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core domain configurations
- AWS Certificate Manager (ACM)
- AWS CLI
- Amazon Route 53 DNS records and health checks
- TLS security policies
- MQTT client testing

## Sources Consulted
- AWS IoT Core Developer Guide: Creating and configuring customer managed domains: https://docs.aws.amazon.com/iot/latest/developerguide/iot-custom-endpoints-configurable-custom.html
- AWS IoT Core Developer Guide: Managing domain configurations: https://docs.aws.amazon.com/iot/latest/developerguide/iot-custom-endpoints-managing.html
- AWS IoT Core Developer Guide: Transport security in AWS IoT Core: https://docs.aws.amazon.com/iot/latest/developerguide/transport-security.html
- AWS CLI Command Reference: create-domain-configuration: https://docs.aws.amazon.com/cli/latest/reference/iot/create-domain-configuration.html
- AWS CLI Command Reference: update-domain-configuration: https://docs.aws.amazon.com/cli/latest/reference/iot/update-domain-configuration.html
- AWS CLI Command Reference: iot-data publish: https://docs.aws.amazon.com/cli/latest/reference/iot-data/publish.html
- Amazon Route 53 Developer Guide: Choosing between alias and non-alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html

## Issues Found
- The post said imported private-CA scenarios should import "that CA's certificate." Changed this to importing the server certificate signed by the CA, which matches ACM and AWS IoT Core requirements.
- The post did not mention the separate public validation certificate required for private-CA or self-signed server certificates. Added that caveat and noted where `--validation-certificate-arn` applies.
- The post implied a single public hostname could route dev and production devices to different accounts. Changed the wording to use consistent environment-specific subdomains, which is the technically accurate DNS pattern unless split DNS or another routing layer is used.
- The post described `CREDENTIAL_PROVIDER` and `JOBS` as usable `service-type` choices. The AWS CLI/API list those enum values, but AWS IoT Core documentation states that domain configurations currently support only `DATA`. Added that caveat.
- The post said domain configurations are created disabled by default. AWS documentation only states that configurations can be updated to `ENABLED` or `DISABLED`; changed the instruction to enable only if the configuration is disabled.
- The post said `describe-domain-configuration` returns the CNAME target in `domainName`. For customer managed domains, DNS should point to the account's `iot:Data-ATS` endpoint returned by `describe-endpoint`. Updated the command, field name, and example endpoint.
- The post suggested Route 53 alias records can be used directly instead of CNAME for IoT Core. Route 53 aliases are limited to selected AWS resources or records in the same hosted zone, while AWS IoT Core documentation instructs using a CNAME for customer managed domains. Replaced the claim with that caveat.
- The AWS CLI `iot-data publish` example passed a JSON payload without the AWS CLI v2 `--cli-binary-format raw-in-base64-out` option. Added the option and used the default HTTPS port in the endpoint URL.
- The certificate rotation section said AWS IoT Core supports up to four server certificates and showed updating `server-certificate-arns`. AWS IoT Core currently supports only one server certificate ARN and the update-domain-configuration CLI does not accept `--server-certificate-arns`. Replaced the example with ACM reimport using the same certificate ARN.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI shapes were verified against the official AWS CLI command reference instead of local `aws --help` output.
- For private CA or self-signed server certificates, the post still keeps the public-CA/ACM-issued path as its primary command example and adds the validation-certificate requirement as a caveat.
