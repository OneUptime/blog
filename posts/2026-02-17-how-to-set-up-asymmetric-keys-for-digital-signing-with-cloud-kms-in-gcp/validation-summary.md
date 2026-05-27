# Validation Summary: How to Set Up Asymmetric Keys for Digital Signing with Cloud KMS in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud KMS
- Google Cloud CLI (`gcloud`)
- Asymmetric signing keys
- ECDSA and RSA signing algorithms
- OpenSSL signature verification
- Python Google Cloud KMS client
- Python `cryptography` library
- JSON Web Tokens (JWT/JWS)
- Google Cloud IAM roles

## Sources Consulted
- Google Cloud KMS: Creating and validating digital signatures: https://cloud.google.com/kms/docs/create-validate-signatures
- Google Cloud KMS: Create a key: https://cloud.google.com/kms/docs/create-key
- Google Cloud KMS: Key purposes and algorithms: https://cloud.google.com/kms/docs/algorithms
- Google Cloud KMS: Verify an asymmetric signature of an EC key: https://cloud.google.com/kms/docs/samples/kms-verify-asymmetric-signature-ec
- Google Cloud KMS: Key rotation: https://cloud.google.com/kms/docs/key-rotation
- Google Cloud IAM: Cloud KMS roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/cloudkms
- Google Cloud SDK: `gcloud kms asymmetric-sign`: https://cloud.google.com/sdk/gcloud/reference/kms/asymmetric-sign
- Google Cloud SDK: `gcloud kms keys create`: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Python `cryptography` elliptic curve documentation: https://cryptography.io/en/latest/hazmat/primitives/asymmetric/ec/
- RFC 7518 JSON Web Algorithms: https://www.rfc-editor.org/rfc/rfc7518

## Issues Found
- The `gcloud kms asymmetric-sign` example precomputed a SHA-256 digest and then passed that digest file with `--digest-algorithm=sha256`. The official CLI documentation says this flag makes `gcloud` digest the input file, so the original example would sign a digest of the digest. I changed the command to pass `data.txt` directly to `--input-file`.
- The Python verification example used `utils.Prehashed(hashes.SHA256())` but passed the original data instead of the digest. I changed it to `ec.ECDSA(hashes.SHA256())`, which verifies the original message and matches the DER-encoded ECDSA signature returned by Cloud KMS.
- The JWT example base64url-encoded the DER-encoded ECDSA signature returned by Cloud KMS directly. RFC 7518 requires ES256 JWS signatures to use the raw `R || S` format. I added a small helper using `cryptography.hazmat.primitives.asymmetric.utils.decode_dss_signature` and encode the 64-byte JOSE signature instead.

## Review Notes
- The examples assume the signing key uses `ec-sign-p256-sha256`; the OpenSSL and JWT snippets should be adjusted if a different key algorithm is selected.
- `gcloud` was not installed in the review environment, so CLI behavior was verified against official Google Cloud SDK documentation instead of local `--help` output.
