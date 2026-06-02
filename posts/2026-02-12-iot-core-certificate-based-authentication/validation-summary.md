# Validation Summary: How to Configure IoT Core Certificate-Based Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core
- AWS CLI
- X.509 certificates
- Mutual TLS
- OpenSSL
- MQTT / Mosquitto

## Sources Consulted
- AWS CLI Command Reference: create-keys-and-certificate - https://docs.aws.amazon.com/cli/latest/reference/iot/create-keys-and-certificate.html
- AWS CLI Command Reference: register-ca-certificate - https://docs.aws.amazon.com/cli/latest/reference/iot/register-ca-certificate.html
- AWS CLI Command Reference: register-certificate - https://docs.aws.amazon.com/cli/latest/reference/iot/register-certificate.html
- AWS CLI Command Reference: create-certificate-from-csr - https://docs.aws.amazon.com/cli/latest/reference/iot/create-certificate-from-csr.html
- AWS CLI Command Reference: delete-certificate - https://docs.aws.amazon.com/cli/latest/reference/iot/delete-certificate.html
- AWS CLI Command Reference: describe-certificate - https://docs.aws.amazon.com/cli/latest/reference/iot/describe-certificate.html
- AWS IoT Core Developer Guide: Manage your CA certificates - https://docs.aws.amazon.com/iot/latest/developerguide/manage-your-CA-certs.html
- AWS IoT Core Developer Guide: Attach a thing or policy to a client certificate - https://docs.aws.amazon.com/iot/latest/developerguide/attach-to-cert.html
- AWS IoT Core Developer Guide: Server authentication - https://docs.aws.amazon.com/iot/latest/developerguide/server-authentication.html
- AWS IoT Core Developer Guide: Device communication protocols - https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html
- AWS IoT Core Developer Guide: Revoke a client certificate - https://docs.aws.amazon.com/iot/latest/developerguide/revoke-ca-cert.html
- AWS IoT API Reference: UpdateCertificate - https://docs.aws.amazon.com/iot/latest/apireference/API_UpdateCertificate.html

## Issues Found
- The post said a certificate needs a policy for actions beyond connecting. AWS IoT policies also authorize `iot:Connect`, so I changed the text to say an appropriate policy is required to connect, publish, subscribe, or perform other AWS IoT actions.
- The revocation section said the device would be disconnected on its next connection attempt. AWS documents that changing an active certificate to a non-active status disconnects existing connections within a few minutes and prevents reconnects, so I corrected the comment.
- The expiration monitoring example claimed `list-certificates` lists expiration dates, but that command returns certificate IDs, status, and creation dates, not validity. I replaced it with a loop that calls `describe-certificate` for each certificate and queries `validity.notAfter`.

## Review Notes
- The AWS CLI was not installed in this workspace, so command verification was performed against current official AWS CLI and AWS IoT Core documentation.
- The CA registration example uses `DEFAULT` mode because it includes a verification certificate. AWS currently recommends `SNI_ONLY` mode for many CA registration cases, but the documented `DEFAULT` flow remains valid.
