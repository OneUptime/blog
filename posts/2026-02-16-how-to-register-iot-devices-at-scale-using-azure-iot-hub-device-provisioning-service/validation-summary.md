# Validation Summary: Register IoT Devices at Scale Using Azure IoT Hub Device Provisioning Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure IoT Hub
- Azure IoT Hub Device Provisioning Service (DPS)
- Azure CLI and Azure IoT CLI extension
- X.509 certificate attestation
- TPM attestation
- Symmetric key attestation
- OpenSSL
- Python
- Azure IoT Device SDK for Python

## Sources Consulted
- Microsoft Learn: Azure DPS documentation, https://learn.microsoft.com/en-us/azure/iot-dps/
- Microsoft Learn: Azure CLI `az iot dps enrollment-group`, https://learn.microsoft.com/en-us/cli/azure/iot/dps/enrollment-group
- Microsoft Learn: Azure CLI `az iot dps enrollment`, https://learn.microsoft.com/en-us/cli/azure/iot/dps/enrollment
- Microsoft Learn: Azure CLI `az iot dps certificate`, https://learn.microsoft.com/en-us/cli/azure/iot/dps/certificate
- Microsoft Learn: Azure CLI `az iot dps linked-hub`, https://learn.microsoft.com/en-us/cli/azure/iot/dps/linked-hub
- Microsoft Learn: Azure CLI `az iot hub create`, https://learn.microsoft.com/en-us/cli/azure/iot/hub
- Microsoft Learn: Use allocation policies with DPS, https://learn.microsoft.com/en-us/azure/iot-dps/how-to-use-allocation-policies
- Microsoft Learn: Symmetric key enrollment group tutorial, https://learn.microsoft.com/en-us/azure/iot-dps/how-to-legacy-device-symm-key
- Microsoft Learn: Verify X.509 CA certificates with DPS, https://learn.microsoft.com/en-us/azure/iot-dps/how-to-verify-certificates
- Microsoft Learn: X.509 certificate attestation with DPS, https://learn.microsoft.com/en-us/azure/iot-dps/concepts-x509-attestation
- Microsoft Learn: Azure IoT Device SDK for Python `ProvisioningDeviceClient`, https://learn.microsoft.com/en-us/python/api/azure-iot-device/azure.iot.device.provisioningdeviceclient
- Microsoft Learn: Azure IoT Device SDK for Python `IoTHubDeviceClient`, https://learn.microsoft.com/en-us/python/api/azure-iot-device/azure.iot.device.iothubdeviceclient

## Issues Found
- The OpenSSL root CA and device certificate commands referenced key files without creating them. Updated the commands to generate private keys with `-newkey` and `-keyout`, and added CA constraints and key usage extensions to the root CA certificate.
- The X.509 enrollment group command uploaded a root CA certificate but then used `--certificate-path`, which is for certificate-path based enrollment configuration. Updated the command to use `--ca-name "iot-root-ca"` for the uploaded DPS CA certificate.
- The symmetric-key enrollment group command used `--attestation-type symmetricKey`, which is not an option for `az iot dps enrollment-group create`. Updated the example to provide primary and secondary symmetric keys instead.
- The individual symmetric-key enrollment command omitted the required symmetric keys. Added primary and secondary key generation and passed them with `--primary-key` and `--secondary-key`.
- The individual enrollment initial twin example passed tags inside `--initial-twin-properties`. Updated it to use `--initial-twin-tags` for tags and `--initial-twin-properties` for desired properties.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI syntax was validated against Microsoft Learn command reference instead of local `az --help` output. The Python examples match the current Azure IoT Device SDK synchronous provisioning and IoT Hub client factory methods documented by Microsoft.
