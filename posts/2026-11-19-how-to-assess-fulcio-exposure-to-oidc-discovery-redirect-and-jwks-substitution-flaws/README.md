# How to Assess Fulcio Exposure to OIDC Discovery Redirect and JWKS Substitution Flaws

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, OIDC, Supply Chain Security, Troubleshooting

Description: Assess Fulcio discovery redirect and JWKS substitution exposure using deployed versions, issuer configuration, network evidence, and current upstream security advisories.

---

A Fulcio deployment can validate token claims correctly and still have an unsafe route to the keys used for validation. OIDC discovery is part of the trust boundary: it tells Fulcio where to obtain an issuer's signing keys, and it can cause outbound requests from the CA's network.

Assess the deployed build and configuration together. An affected version establishes exposure; it does not prove that someone exploited it. Conversely, a successful signing canary does not demonstrate that hostile discovery responses are rejected.

## Start with the correct advisories

The May 2026 advisory, GHSA-f5mr-q85p-6hh6, covers versions through 1.8.5 and identifies 1.8.6 as its patch. It describes cross-host discovery redirects, attacker-controlled JWKS information entering the verifier cache, and leakage of a local Kubernetes service-account token through affected discovery paths. [Read the original advisory](https://github.com/sigstore/fulcio/security/advisories/GHSA-f5mr-q85p-6hh6).

Do not stop the version review at 1.8.6. A later advisory, GHSA-55r8-p8r6-2f8m, covers blind SSRF through JWKS URLs with meta-issuers, affects versions through 1.8.8, and identifies 1.9.0 as its patch. It explicitly says the earlier SSRF fixes were incomplete. [Read the follow-up advisory](https://github.com/sigstore/fulcio/security/advisories/GHSA-55r8-p8r6-2f8m).

Use those minimum versions to interpret history, then select a supported release after checking all current advisories and [release notes](https://github.com/sigstore/fulcio/releases). A vendor backport needs evidence that the relevant changes are included; a familiar image tag alone is insufficient.

## Inventory the affected trust paths

Capture the image digest and the configuration actually mounted in every replica:

```bash
kubectl -n sigstore get pods -l app=fulcio -o json |
  jq '.items[] | {
    pod: .metadata.name,
    images: [.status.containerStatuses[]? | {name, image, imageID}]
  }'

kubectl -n sigstore get deploy fulcio -o json |
  jq '.spec.template.spec | {
    serviceAccountName,
    containers: [.containers[] | {name, args, volumeMounts}],
    volumes
  }'
```

Adapt labels to the deployment. Store the output as restricted operational evidence because configuration locations and internal names can be sensitive.

For each issuer, record whether it is a fixed entry or a meta-issuer pattern; who controls discovery and JWKS; whether either endpoint redirects; whether local API credentials are attached; and which network destinations the pod can reach. Include old replicas and disaster-recovery installations.

An issuer allowlist and an IP allowlist answer different questions. A permitted external issuer can still publish a JWKS URL pointing somewhere inappropriate. The safe dialer, redirect handling, credential scoping, and network egress policy are separate controls. [Fulcio's configuration implementation](https://github.com/sigstore/fulcio/blob/main/pkg/config/config.go) is useful for tracing their order in your release.

## Inspect behavior without creating an exploit

For an administrator-approved issuer, inspect the initial response without following redirects:

```bash
ISSUER='https://id.example.com'
curl --silent --show-error \
  --connect-timeout 5 --max-time 15 \
  --dump-header discovery.headers \
  --output discovery.json \
  "${ISSUER%/}/.well-known/openid-configuration"
```

Review the HTTP status, `Location` header if present, declared issuer, and `jwks_uri`. A curl result is a network observation, not a test of Fulcio's validation code. Do not send production credentials to a diagnostic endpoint or follow an unexpected URL merely to see what happens.

If you need a rejection test, use isolated staging infrastructure and synthetic identities you control. Test the exact released binary against a cross-host redirect and disallowed destination, then verify both rejection and absence of unintended outbound credentials. Keep the test outside networks containing production metadata or administrative APIs.

## Investigate evidence separately from exposure

Preserve available Fulcio, ingress, DNS, egress-proxy, and Kubernetes audit logs before routine retention removes them. Look for unexpected discovery/JWKS hosts, unusual destinations, issuer changes, and certificate issuance inconsistent with normal CI activity.

Review what the Fulcio service account could access during the exposure window. If there is evidence its token reached an untrusted destination, use your Kubernetes incident process to invalidate affected credentials and review API activity. Do not assume upgrading retroactively undoes credential exposure or validates certificates already issued.

Absence of a log entry is only meaningful if that request path was logged. Document gaps instead of declaring the deployment uncompromised from incomplete telemetry.

## Close the assessment with explicit tests

Upgrade or apply a verified vendor fix, restart affected processes so old in-memory verifier state is not retained, and restore only reviewed issuer configuration. Confirm valid signing still works and rejected redirect/destination tests still fail.

Record the fixed digest, advisory coverage, test evidence, and any unresolved incident questions. Keep compatibility problems, such as mesh virtual-IP handling, separate from security acceptance: repair their supported configuration while preserving the protections that caused the original upgrade.
