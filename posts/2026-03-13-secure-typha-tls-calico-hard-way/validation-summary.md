# Validation Summary: How to Secure Typha TLS in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Hardening Guide

## Technologies Covered
- Calico (project) Typha
- Kubernetes (Secrets, audit policy, RBAC, deployments)
- TLS / mTLS
- OpenSSL (x509, s_client, req)
- kubectl
- Felix (as Typha client)

## Sources Consulted
- [Calico Typha configuration reference (Tigera docs)](https://docs.tigera.io/calico/latest/reference/typha/configuration)
- [projectcalico/calico typha config_params.go (source of truth for Typha config options)](https://github.com/projectcalico/calico/blob/master/typha/pkg/config/config_params.go)
- [projectcalico/calico Issue #9507 — Configure strong cipher suites for Typha TLS connections](https://github.com/projectcalico/calico/issues/9507)
- [projectcalico/calico Issue #10707 — Felix and Typha certificates are entangled](https://github.com/projectcalico/calico/issues/10707)
- Kubernetes audit policy documentation (PolicyRule fields: level, resources, namespaces, verbs)
- OpenSSL `req`, `x509`, and `s_client` man pages

## Issues Found
1. **Step 3 (TYPHA_MINTLSVERSION env var):** The post originally instructed setting `TYPHA_MINTLSVERSION=VersionTLS13` on the Typha deployment. This is incorrect — Typha does not currently expose a `MinTLSVersion` configuration option. Verifying against the Typha config source (`typha/pkg/config/config_params.go`) confirms only `ServerKeyFile`, `ServerCertFile`, `CAFile`, `ClientCN`, and `ClientURISAN` exist as TLS-related parameters. The feature is tracked upstream in projectcalico/calico#9507 (still open). Replaced the inaccurate `kubectl set env` command with an accurate note about the upstream gap and added a working `openssl s_client -tls1_3` verification command to observe the negotiated protocol.
2. **Step 5 (Typha self-signed fallback claim):** The post claimed "Typha generates a self-signed cert if no cert is configured" and that the verification was to catch this fallback. This is inaccurate — Typha does not generate a self-signed certificate as a fallback; when TLS material is not configured Typha simply runs without TLS. Reworded the step so the rationale is "verify the certificate's issuer matches the trusted CA" rather than "catch self-signed fallback", which preserves the useful verification step while removing the inaccurate claim.

## Review Notes
- Step 1: CA key permission hardening (`chmod 600`, `chown root:root`) and the guidance to keep the CA key off the cluster (not in a Secret) are accurate and align with standard CA hygiene.
- Step 2: `TYPHA_CLIENTCN=calico-felix` is a valid Typha config option (per Tigera docs); the OpenSSL test commands are syntactically correct. Note that Felix's `calico-felix` is the conventional CN — the actual value should match what the operator's PKI uses.
- Step 4: The Kubernetes audit policy snippet (`level: Metadata`, `resources`, `namespaces`, `verbs`) matches the upstream PolicyRule schema. `kubectl auth can-i ... --list` will work but `--list` overrides the verb/resource arguments — `kubectl auth can-i --list -n calico-system` would be more idiomatic. Not changed because the command still functions and is a stylistic choice.
- Step 5: After the fix, the issuer check assumes the CA was created with CN `calico-typha-ca`. Readers using a different CA CN must adjust the grep accordingly — this is consistent with the rest of the hard-way series.
- Step 6: The `openssl x509 -req -CAcreateserial -days 90` command is correct. Note that `-CAcreateserial` creates a `.srl` next to the CA cert on first run and reuses it thereafter; readers running this in CI should be aware of the side-effect file.
- Step 7: The `kubectl create secret ... --dry-run=client -o yaml | kubectl apply -f -` pattern is the standard idiom for upserting Secrets. The closing reminder that old certs from the same CA remain valid until expiry (i.e., revocation requires CA rotation) is accurate — Calico does not consult CRLs.
- Future improvement: when projectcalico/calico#9507 lands, this guide can be updated to use the new option and demonstrate cipher-suite restriction directly.
