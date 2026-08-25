# Run Fulcio Locally with Docker Compose and an Ephemeral Test CA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fulcio, Sigstore, Docker Compose, Certificate Authority, Tesseract, Cosign, Local Development

Description: Launch and inspect Fulcio's versioned local Compose stack, understand its Dex and CT services, and avoid treating either an in-memory ephemeral CA or repository-shipped test keys as production trust.

---

Fulcio's repository includes a convenient local stack for development, but its exact services and CA backend are version-dependent. The current `main` Compose file runs Fulcio with a repository file-backed test root and a Tesseract certificate-transparency service, and also starts a local Dex service that the default Fulcio issuer file does not register. The setup guide still describes an older/default ephemeral-CA and Trillian topology.

Inspect the files in the release or commit you actually check out. Neither a process-generated ephemeral root nor the private key shipped in a public test repository is suitable for production.

## Pin and Inspect the Lab Version

Clone Fulcio and select a release tag or reviewed commit:

```bash
git clone https://github.com/sigstore/fulcio.git
cd fulcio
git checkout YOUR_REVIEWED_TAG_OR_COMMIT

docker compose config
```

Before starting, verify these details in `docker-compose.yml`:

- the `fulcio-server` command and its `--ca` backend;
- the mounted issuer configuration;
- the CT log URL and CT implementation;
- published ports;
- mounted CA key and certificate paths; and
- persistent volumes.

On current `main`, the relevant defaults are:

```text
Fulcio HTTP       localhost:5555
Fulcio gRPC       localhost:5554
Fulcio metrics    localhost:2112
Dex               localhost:8888
Tesseract CT      localhost:6962
CT static reader  localhost:8000
CA backend        fileca
```

The listed `localhost` addresses are convenient host access URLs, not loopback-only bindings. Because the Compose mappings omit a host IP, Docker publishes them on all host interfaces by default. Use a loopback-bound override or firewall rules when the lab must not be reachable from the network.

The metrics host port can be changed with `FULCIO_METRICS_PORT`. The identity YAML mount can be changed with `FULCIO_CONFIG`. Treat both as version-specific conveniences from the checked-out Compose file.

## Start and Check the Stack

Run:

```bash
docker compose up --build
```

In another terminal, check Fulcio health and issuer configuration:

```bash
curl --fail http://localhost:5555/healthz

curl --fail --silent \
  http://localhost:5555/api/v2/configuration |
  jq .
```

Extract the root from the lab's first trust-bundle chain only for inspection or explicitly bootstrapped local test trust:

```bash
curl --fail --silent --show-error \
  http://localhost:5555/api/v2/trustBundle |
  jq --exit-status --raw-output \
    '.chains[0].certificates[-1]' \
  > fulcio-lab-root.pem

openssl x509 -in fulcio-lab-root.pem -noout \
  -subject -issuer -fingerprint -sha256 -dates
```

Do not teach a production verifier to download and trust whatever a live `/api/v2/trustBundle` endpoint returns. Real trust roots must arrive through an authenticated bootstrap, normally TUF or a controlled trusted-root document.

## Understand the Current Compose Services

Current `main` mounts `config/identity/config.yaml` into Fulcio and starts a local Dex service with a mock connector. The default issuer file does not include Dex's `http://dex-idp:8888/auth` issuer, so using Dex for browser-based tests requires a matching `FULCIO_CONFIG` and issuer routing that is reachable from both the browser and containers. The stack starts Tesseract as the CT service, with a repository-provided CT key and a named volume for log storage. A separate static reader serves the stored CT data.

The Fulcio service currently starts with arguments equivalent to:

```text
--ca=fileca
--fileca-cert=/etc/fulcio/root.pem
--fileca-key=/etc/fulcio/root.key
--fileca-key-passwd=fulcio
--ct-log-url=http://tesseract:6962
```

Those values are deliberately convenient for a public development repository. The signing key and password are known to every reader of the repository. Persistence across a restart does not make them secure.

The setup guide's statement that Compose uses an ephemeral CA and Trillian reflects another version of the lab. This is why copying commands from `main` documentation into a pinned older release-or assuming `main` is stable production configuration-causes confusing mismatches.

## Run the Explicit Ephemeral Mode

For a minimal Fulcio API test without CT, the official setup guide shows:

```bash
go run main.go serve \
  --port 5555 \
  --ca ephemeralca \
  --ct-log-url=''
```

The ephemeral backend generates an ECDSA CA key and self-signed root in memory at startup. On server shutdown, the key material disappears. On restart, a new root is created.

That behavior has practical consequences:

- certificates from the previous process do not chain to the new root;
- clients that cached the old lab root will reject certificates from the restarted server;
- the old private key cannot be recovered to reproduce issuance or operate the CA;
- there is no production key protection, backup, rotation, ceremony, or audit process; and
- `--ct-log-url=''` removes certificate transparency entirely.

The source and server help both label `ephemeralca` as testing-only. It is useful for unit tests, API exploration, and disposable integration environments precisely because losing the CA is acceptable there.

## Do Not Confuse File Persistence with Production Safety

The current Compose `fileca` root survives ordinary container restart because it comes from files in the checkout, and Tesseract data can survive in its Docker volume. It is still test-only because:

- the repository includes the private CA and CT keys;
- the CA password is present in Compose arguments;
- trust bootstrap is not an organizational root ceremony;
- local Dex configuration is a development identity system;
- availability, access control, backup, and monitoring are not production-designed; and
- a developer can replace every mounted trust file.

Never promote artifacts signed by this lab into a production policy. Keep lab, staging, and production roots in distinct trust stores and give them unmistakable operator names.

## Connect a Test Client Deliberately

The Fulcio setup guide documents test-only Cosign environment variables:

```bash
export SIGSTORE_ROOT_FILE="$PWD/fulcio-lab-root.pem"
export SIGSTORE_CT_LOG_PUBLIC_KEY_FILE="$PWD/config/ctfe/pubkey.pem"
```

It also demonstrates selecting local Fulcio with `--fulcio-url http://localhost:5555`. The environment variables are explicitly described as non-production. In Cosign v3, the direct `--fulcio-url` flag is deprecated, and the signing-configuration path is enabled by default; a legacy direct-URL invocation must also set `--use-signing-config=false`. Cosign v3's preferred custom-infrastructure path is a versioned signing configuration plus trusted-root material; a complete private signing system also needs appropriate Rekor and/or timestamp services.

The Fulcio Compose stack alone is not a complete production Sigstore deployment. In particular, Fulcio CT records certificate issuance, while Rekor records artifact signing metadata. Rekor v1's signed entry timestamp covers its integrated time; Rekor v2 relies on a separate RFC 3161 timestamp authority.

When a local signing test fails, check:

- Dex issuer URLs are reachable from both browser and containers;
- the requested token audience matches Fulcio's configured client ID (`sigstore` for the repository's default issuers; the bundled Dex client ID is `fulcio`);
- the issuer, including local Dex if used, appears in `/api/v2/configuration`;
- the root file matches the currently running CA instance;
- the CT public key matches the current CT service; and
- Cosign's release supports the selected custom-infrastructure flags or signing config.

## Reset the Lab Carefully

`docker compose down` removes containers and networks but normally keeps the named CT volume. Adding `--volumes` deletes the lab's CT state. That can be appropriate for a disposable test, but record that the history is being destroyed and never apply the pattern to production transparency data.

If using explicit `ephemeralca`, a mere Fulcio process restart rotates the root even when the CT container or volume remains. A CT service configured to accept only the file-backed test root will not automatically trust the new ephemeral root. Generate and configure a coherent test trust set rather than changing only one Compose argument.

## Replace Every Test Component for Production

A production Fulcio deployment should use:

- a protected KMS, HSM, KMS-encrypted Tink keyset, or managed CA backend appropriate to the threat model;
- an intermediate certificate beneath a protected root where practical;
- authenticated, versioned OIDC issuer configuration;
- a CT-capable backend and monitored CT log, preferably with embedded SCTs, or a documented private audit alternative;
- trusted-root distribution through TUF or controlled Sigstore trust documents;
- separate Rekor/timestamp infrastructure required by the client verification design; and
- backups, rotation, access controls, observability, and an incident runbook.

Fulcio's architecture specification explicitly classifies the password-protected on-disk `fileca` backend as testing-only and says it must not be used for production. If an on-disk keyset is required, use the separately documented KMS-encrypted Tink design rather than treating `fileca` encryption as production key protection.

Pin Fulcio and its deployment manifests to releases. `main` is valuable evidence of current development behavior, not a stable deployment contract.

## Official Documentation

- [Fulcio local setup and signing backends](https://github.com/sigstore/fulcio/blob/main/docs/setup.md)
- [Current Fulcio Docker Compose stack](https://github.com/sigstore/fulcio/blob/main/docker-compose.yml)
- [Fulcio v2 API definition](https://github.com/sigstore/fulcio/blob/main/fulcio.proto)
- [Fulcio ephemeral CA implementation](https://github.com/sigstore/fulcio/blob/main/pkg/ca/ephemeralca/ephemeral.go)
- [Fulcio server flags](https://github.com/sigstore/fulcio/blob/main/cmd/app/serve.go)
- [Fulcio certificate-transparency design](https://github.com/sigstore/fulcio/blob/main/docs/ctlog.md)
- [Fulcio signing-backend architecture and production restrictions](https://github.com/sigstore/architecture-docs/blob/main/fulcio-spec.md#62-signing)
- [Cosign custom infrastructure configuration](https://docs.sigstore.dev/cosign/system_config/custom_components/)
- [Sigstore timestamp behavior for Rekor and timestamp authorities](https://docs.sigstore.dev/cosign/verifying/timestamps/)
- [Docker Compose published-port syntax](https://docs.docker.com/reference/compose-file/services/#ports)

## Conclusion

Use Docker Compose as a pinned, disposable Fulcio lab and inspect the checked-out source to learn which CA and CT services it actually starts. An ephemeral root vanishes on restart, while current repository file-backed keys are publicly known; both are test conveniences, not production trust anchors.
