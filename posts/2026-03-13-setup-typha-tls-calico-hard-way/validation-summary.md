# Validation Summary: How to Set Up Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Calico (CNI for Kubernetes)
- Typha (Calico's scalable datastore fan-out component)
- Felix (Calico's per-node agent)
- Kubernetes (Secrets, Deployments, DaemonSets, kubectl)
- OpenSSL (CA/CSR/x509 certificate generation)
- TLS / mTLS
- calicoctl (FelixConfiguration CRD patching)

## Sources Consulted
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration (for `typhaCAFile`, `typhaCertFile`, `typhaKeyFile`, `typhaCN`, `typhaURISAN` field names)
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration (for `TYPHA_CAFILE`, `TYPHA_SERVERCERTFILE`, `TYPHA_SERVERKEYFILE`, `TYPHA_CLIENTCN`, `TYPHA_CLIENTURISAN` environment variables)
- OpenSSL `req` and `x509` subcommand documentation (for flag syntax)

## Issues Found
1. **Step 1 - Incorrect command order**: The original snippet ran `cd /etc/calico/pki` before `mkdir -p /etc/calico/pki`, which would fail on a fresh host because you cannot `cd` into a directory that does not yet exist. Reordered so that `mkdir -p` runs first and `cd` runs after.

2. **Step 6 - Typo in FelixConfiguration field name**: The original snippet used `"tymphaCertFile"` (note the extra "m"), which is not a valid field on the `FelixConfiguration` CRD. Per the Calico Felix configuration reference, the correct field name is `typhaCertFile`. Fixed the typo so the `calicoctl patch` will actually update the certificate file path rather than being silently ignored or rejected.

## Review Notes
- The Typha environment variables (`TYPHA_CAFILE`, `TYPHA_SERVERCERTFILE`, `TYPHA_SERVERKEYFILE`) used in Step 5 are correct per the Typha configuration reference.
- The Felix configuration in Step 6 only sets `typhaCAFile`, `typhaCertFile`, and `typhaKeyFile`. The Calico docs state that if any TLS parameters are specified, then one of `typhaCN` or `typhaURISAN` must also be set so that Felix can authenticate Typha's identity. Likewise, on the Typha side, `TYPHA_CLIENTCN` or `TYPHA_CLIENTURISAN` is required so Typha can authenticate connecting Felix clients. The current post will leave authentication weaker than recommended; adding these would be a worthwhile hardening step in a follow-up but is not strictly a technical error in what is shown.
- Step 6 references `/felix-tls/...` paths inside Felix, but the post does not show how the `calico-felix-typha-tls` secret is mounted into the Felix DaemonSet at `/felix-tls`. Readers will need to mount that secret themselves; this is an omission rather than incorrect content.
- The OpenSSL commands are valid syntax. Using `rsa:4096` and a 10-year CA / 1-year leaf is reasonable, though some readers may prefer shorter leaf lifetimes.
- `kubectl patch deployment` with a strategic merge patch as shown will work, but the `containers` array merge semantics rely on `name` as the merge key, which is preserved here.
