# Validation Summary: How to Set Up CloudHSM for Hardware Key Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudHSM
- AWS KMS custom key stores
- AWS CLI
- CloudHSM Client SDK 5
- PKCS #11
- Python `python-pkcs11`
- OpenSSL
- Amazon CloudWatch

## Sources Consulted
- AWS CloudHSM User Guide: create a cluster: https://docs.aws.amazon.com/cloudhsm/latest/userguide/create-cluster.html
- AWS CloudHSM User Guide: HSM types: https://docs.aws.amazon.com/cloudhsm/latest/userguide/hsm-types.html
- AWS CloudHSM User Guide: compliance validation: https://docs.aws.amazon.com/cloudhsm/latest/userguide/fips-validation.html
- AWS CloudHSM User Guide: initialize a cluster: https://docs.aws.amazon.com/cloudhsm/latest/userguide/initialize-cluster.html
- AWS CloudHSM User Guide: install CloudHSM CLI: https://docs.aws.amazon.com/cloudhsm/latest/userguide/gs_cloudhsm_cli-install.html
- AWS CloudHSM User Guide: install PKCS #11 library for Client SDK 5: https://docs.aws.amazon.com/cloudhsm/latest/userguide/pkcs11-library-install.html
- AWS CloudHSM User Guide: Client SDK 5 configure tool examples: https://docs.aws.amazon.com/cloudhsm/latest/userguide/configure-tool-examples5.html
- AWS CloudHSM User Guide: activate a cluster with CloudHSM CLI: https://docs.aws.amazon.com/cloudhsm/latest/userguide/activate-cluster.html
- AWS CloudHSM User Guide: create users with CloudHSM CLI: https://docs.aws.amazon.com/cloudhsm/latest/userguide/cloudhsm_cli-user-create.html
- AWS CloudHSM User Guide: PKCS #11 authentication and mechanisms: https://docs.aws.amazon.com/cloudhsm/latest/userguide/pkcs11-pin.html and https://docs.aws.amazon.com/cloudhsm/latest/userguide/pkcs11-mechanisms.html
- AWS KMS CLI reference: create-custom-key-store: https://docs.aws.amazon.com/cli/latest/reference/kms/create-custom-key-store.html
- AWS KMS Developer Guide: create an AWS CloudHSM key store: https://docs.aws.amazon.com/kms/latest/developerguide/create-keystore.html
- AWS CloudHSM CloudWatch metrics: https://docs.aws.amazon.com/cloudhsm/latest/userguide/hsm-metrics-cw.html
- AWS CloudHSM pricing: https://aws.amazon.com/cloudhsm/pricing/
- AWS Price List API data for CloudHSM us-east-1, current offer version published 2026-04-16: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/CloudHSM/current/us-east-1/index.json
- Python PKCS#11 documentation: https://python-pkcs11.readthedocs.io/en/latest/

## Issues Found
- Updated FIPS positioning from FIPS 140-2 Level 3 / KMS Level 2 to current CloudHSM hsm2m FIPS 140-3 Level 3 wording. AWS KMS is also documented as using FIPS 140-3 Security Level 3 validated HSMs, so the old comparison was inaccurate.
- Changed the cluster creation example from `hsm1.medium` to `hsm2m.medium` and added `--mode FIPS` and `--network-type IPV4`. AWS documentation says new `hsm1.medium` clusters are no longer supported and `--mode` is required for hsm types except `hsm1.medium`.
- Replaced retired Client SDK 3 tooling (`cloudhsm-client`, `cloudhsm_mgmt_util`, PRECO login, `changePswd`, `createUser`) with current Client SDK 5 CloudHSM CLI and configure commands.
- Corrected PKCS #11 setup commands to install `cloudhsm-cli` and `cloudhsm-pkcs11`, copy `customerCA.crt`, and run `configure-cli` / `configure-pkcs11`.
- Fixed the Python `python-pkcs11` examples: key capabilities now use `MechanismFlag`, the persistent key session is opened read/write, and AES-CBC encryption now explicitly generates and passes an IV instead of expecting `encrypt()` to return one.
- Added the required `kmsuser` CloudHSM crypto user creation step before the KMS custom key store example.
- Updated CloudHSM pricing from the older approximate $1.50/hour figure to the current us-east-1 hsm2m price of about $1.60/hour.
- Reworded "custom algorithms" to "application-managed cryptographic operations" because CloudHSM supports documented algorithms and mechanisms rather than arbitrary custom cryptographic algorithms.

## Review Notes
The post is now technically aligned with current AWS CloudHSM Client SDK 5 documentation. The Python examples are API-correct for `python-pkcs11`, but they still require a configured CloudHSM cluster, installed native CloudHSM PKCS #11 library, network access to the HSM ENI, and valid CU credentials to run.
