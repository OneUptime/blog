# Validation Summary: How to Set Up X.509 Certificate Authentication for Devices in Azure IoT Hub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure IoT Hub
- X.509 certificate authentication
- Azure CLI IoT Hub certificate and device identity commands
- OpenSSL
- Node.js Azure IoT Device SDK
- Azure Device Provisioning Service
- TLS and PKI certificate chains

## Sources Consulted
- Microsoft Learn: Authenticate identities with X.509 certificates in Azure IoT Hub - https://learn.microsoft.com/en-us/azure/iot-hub/authenticate-authorize-x509
- Microsoft Learn: az iot hub certificate CLI reference - https://learn.microsoft.com/en-us/cli/azure/iot/hub/certificate
- Microsoft Learn: az iot hub device-identity CLI reference - https://learn.microsoft.com/en-us/cli/azure/iot/hub/device-identity
- Microsoft Learn: Azure IoT SDK for Node.js X509 interface - https://learn.microsoft.com/en-us/javascript/api/azure-iot-common/x509
- Microsoft Learn: Azure IoT SDK for Node.js ConnectionString module - https://learn.microsoft.com/en-us/javascript/api/azure-iot-device/connectionstring
- Microsoft Learn: Device management using direct methods, X.509 Node.js connection example - https://learn.microsoft.com/en-us/azure/iot-hub/how-to-device-management
- Node.js TLS documentation for certificate chain and CA options - https://nodejs.org/api/tls.html
- OpenSSL 3.0 local command validation

## Issues Found
- The OpenSSL CA examples did not explicitly mark the generated root and intermediate certificates as CA certificates. Added `basicConstraints` and `keyUsage` extensions so the certificates are valid CA certificates for chain validation.
- The verification and device leaf certificate examples did not include leaf-certificate extensions. Added `basicConstraints=CA:FALSE`, `keyUsage`, and `extendedKeyUsage=clientAuth`.
- The Node.js sample suggested using the `ca` option for the device certificate chain. Corrected this because Node's `ca` option is for trusted peer CAs, while the client certificate chain belongs in the `cert` option.
- The intermediate CA section created an intermediate but did not show signing the device certificate with it before creating a chain. Added the intermediate signing command and changed the chain file to leaf plus intermediate, excluding the root CA.
- The post implied certificate revocation list behavior that IoT Hub does not provide for device certificate authentication. Clarified that compromised devices should be disabled in the IoT Hub identity registry and changed "revocation" wording to identity disablement and rotation.

## Review Notes
The Azure CLI commands and authentication method values are current. The JavaScript SDK usage is consistent with Microsoft examples, with the caveat that production code should avoid hard-coded connection strings and should load secrets from secure storage.
