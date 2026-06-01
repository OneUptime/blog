# Validation Summary: How to Use Hardware MFA Devices with AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS Security Token Service (STS)
- AWS Management Console
- AWS CLI
- FIDO2/WebAuthn security keys
- Hardware TOTP MFA tokens
- IAM role trust policies

## Sources Consulted
- AWS IAM User Guide: Assign a hardware TOTP token in the AWS Management Console - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_physical.html
- AWS IAM User Guide: Assign a passkey or security key in the AWS Management Console - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_fido.html
- AWS IAM User Guide: Supported configurations for using passkeys and security keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_fido_supported_configurations.html
- AWS IAM User Guide: Assign MFA devices in the AWS CLI or AWS API - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_cliapi.html
- AWS IAM User Guide: Resynchronize virtual and hardware MFA devices - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_sync.html
- AWS STS API Reference: GetSessionToken - https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html
- AWS CLI Command Reference: sts assume-role - https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- Yubico product page: YubiKey 5 NFC - https://www.yubico.com/us/product/yubikey-5-series/yubikey-5-nfc/

## Issues Found
- The introduction broadly claimed that hardware MFA devices "can't be phished." That is accurate for FIDO2 security keys in AWS, but not for hardware TOTP tokens. Reworded the sentence to distinguish FIDO2 phishing resistance from TOTP hardware-token benefits.
- Hardware TOTP examples incorrectly used IAM MFA ARNs such as `arn:aws:iam::123456789012:mfa/hardware-token-serial`. AWS documentation distinguishes hardware MFA device serial numbers from virtual MFA device ARNs. Updated the `enable-mfa-device`, `get-session-token`, helper script, `assume-role`, `deactivate-mfa-device`, and `resync-mfa-device` examples to use hardware serial-number examples such as `GAHT12345678`.
- The FIDO2 IAM user section said "You can also do this via CLI" before explaining that registration requires WebAuthn. AWS documentation states passkeys and security keys can be enabled from the AWS Management Console only, not the AWS CLI or API. Reworded the section to state that FIDO2 security keys cannot be registered through the CLI.
- The YubiKey pricing examples were slightly outdated. Updated the FIDO2 price range, the YubiKey 5 NFC example price, and the 10-admin cost estimate to align with current Yubico list pricing.

## Review Notes
- AWS now uses "passkey or security key" terminology in several IAM docs. The post's focus on hardware FIDO2 security keys remains technically valid, but future updates could mention synced passkeys separately from hardware MFA devices.
- The AWS CLI was not installed in the local review environment, so command syntax was verified against AWS official CLI and API documentation instead of local `aws --help` output.
