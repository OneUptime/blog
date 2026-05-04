# Validation Summary: How to Configure the OCI Provider in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible Infrastructure as Code)
- Oracle Cloud Infrastructure (OCI)
- OCI Terraform/OpenTofu Provider (`oracle/oci`)
- OCI CLI
- OpenSSL (for API key generation)
- OCI Instance Principal authentication

## Sources Consulted
- OCI Terraform provider registry: https://registry.terraform.io/providers/oracle/oci/latest
- Oracle "Configuring the Provider" docs: https://docs.oracle.com/en-us/iaas/Content/dev/terraform/configuring.htm
- Oracle API signing key documentation: https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm
- Oracle SDK/CLI config file documentation: https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm
- OCI CLI `iam tenancy get` reference: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/iam/tenancy/get.html
- OCI CLI `iam compartment list` reference: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/iam/compartment/list.html
- terraform-provider-oci releases: https://github.com/oracle/terraform-provider-oci/releases

## Issues Found
No technical issues found.

Verification notes:
- Provider source `oracle/oci` is correct (Oracle-maintained).
- `OCI_TENANCY_OCID`, `OCI_USER_OCID`, `OCI_FINGERPRINT`, `OCI_PRIVATE_KEY_PATH`, and `OCI_REGION` are all valid environment variables natively read by the OCI provider (in addition to the `TF_VAR_*` prefixed equivalents).
- `auth = "InstancePrincipal"` uses correct PascalCase (other valid values include `APIKey`, `ResourcePrincipal`, `SecurityToken`, `OKEWorkloadIdentity`).
- The `openssl rsa -pubout -outform DER ... | openssl md5 -c` fingerprint command is the official Oracle-documented method; OCI fingerprints are MD5 (not SHA-256) by design of the API signing scheme.
- `~/.oci/oci_api_key.pem` is the standard default path used in Oracle's official examples.
- `oci iam` CLI commands and flags shown are syntactically correct.

## Review Notes
- The provider version pin `~> 6.0` is somewhat behind the current major (the OCI provider is at 8.x as of mid-2026). The pin is still valid and the configuration syntax shown is stable across these versions, so this is not a correctness issue — readers may want to bump to `~> 8.0` for the latest features.
- The compartment listing command `oci iam compartment list --all --compartment-id-in-subtree true` works as written, but readers wanting to see compartments their user does not have direct access to may also want to add `--access-level ANY`.
- The chained command for fetching the tenancy OCID is functional but convoluted; using `oci iam tenancy get --tenancy-id <ocid>` directly with a known tenancy OCID (or reading from `~/.oci/config`) is generally simpler in practice.
