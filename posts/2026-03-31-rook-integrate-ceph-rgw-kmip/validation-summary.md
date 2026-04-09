# Validation Summary: How to Integrate Ceph RGW with KMIP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- KMIP (Key Management Interoperability Protocol)
- PyKMIP (Python KMIP server/client library)
- OpenSSL (certificate generation)
- AWS CLI (S3-compatible object upload with SSE-KMS)
- Rook (mentioned in tags)

## Sources Consulted
- Ceph KMIP client implementation source: https://github.com/ceph/ceph/blob/main/src/rgw/rgw_kmip_client_impl.cc
- Ceph RGW encryption documentation: https://docs.ceph.com/en/latest/radosgw/encryption/
- Ceph KMIP integration documentation: https://docs.ceph.com/en/latest/radosgw/kmip/
- Ceph RGW config options definition: https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- PyKMIP GitHub repository and setup.py: https://github.com/OpenKMIP/PyKMIP

## Issues Found

### 1. Incorrect PyKMIP server start command
- **What was wrong:** The command `python -m kmip.services.server.engine --config kmip.conf` is invalid. The `kmip.services.server.engine` module is not designed to be run directly, and `--config` is not a recognized flag.
- **What was changed:** Replaced with `pykmip-server -f kmip.conf`, which is the correct console script entry point defined in PyKMIP's `setup.py` (maps to `kmip.services.server.server:main`).
- **Why:** Using the incorrect command would fail with a module error, preventing readers from setting up a test KMIP server.

### 2. Incorrect Ceph config option name for KMIP CA certificate
- **What was wrong:** The config option `rgw_crypt_kmip_ca_cert` does not exist in Ceph.
- **What was changed:** Replaced with `rgw_crypt_kmip_ca_path`, which is the correct option name as defined in Ceph's source code (`rgw_kmip_client_impl.cc`) and official documentation.
- **Why:** Using the wrong option name would result in Ceph ignoring the CA certificate path, causing TLS verification failures when RGW connects to the KMIP server.

## Review Notes
- The Python client code using `ProxyKmipClient` is correct, including import paths, constructor parameters, and the `create()` method signature.
- All OpenSSL certificate generation commands are syntactically correct.
- The `rgw_crypt_s3_kms_backend` value of `kmip` is correct (valid values: `barbican`, `vault`, `testing`, `kmip`).
- The AWS CLI SSE-KMS upload command is correct for Ceph RGW's S3-compatible API.
- The version requirement of "Ceph 17+" (Quincy) for KMIP support is accurate.
- KMIP default port 5696 is correct per the OASIS KMIP specification.
