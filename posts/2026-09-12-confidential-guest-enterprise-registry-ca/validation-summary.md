# Validation Summary: Pass an Enterprise Registry CA to Confidential Guest Image Pulls

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Confidential Containers (CoCo)
- Kubernetes and Kata Containers
- Confidential Data Hub (CDH) and image-rs
- Init-Data and remote attestation
- TLS, X.509, and private registry certificate trust
- TOML, Python 3.11, OpenSSL, gzip, and Base64

## Sources Consulted
- [CoCo Local Registries documentation](https://confidentialcontainers.org/docs/features/local-registries/)
- [CoCo Init-Data documentation](https://confidentialcontainers.org/docs/features/initdata/)
- [CDH example configuration at guest-components commit eae0bf63](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)
- [image-rs registry client implementation at guest-components commit eae0bf63](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/image.rs)
- [Python 3.11 `tomllib` documentation](https://docs.python.org/3.11/library/tomllib.html)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/3.0/man1/openssl-s_client/)
- [OpenSSL `x509` documentation](https://docs.openssl.org/3.0/man1/openssl-x509/)

## Issues Found
No technical issues found.

## Review Notes
The CDH field and image-rs behavior are deliberately pinned to guest-components commit `eae0bf63`, which makes the version-specific guidance reproducible. The Init-Data format and annotation also match current CoCo documentation. The Python examples are appropriately labeled Python 3.11+ because they use `tomllib`.
