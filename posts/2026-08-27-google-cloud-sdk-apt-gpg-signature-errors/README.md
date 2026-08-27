# How to Fix Google Cloud SDK `apt update` GPG Signature Errors After a Repository Key Rotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Google Cloud CLI, APT, GPG, Debian, Ubuntu, Troubleshooting

Description: Repair Google Cloud CLI APT signature failures with the current Google keyring and a single correctly scoped `signed-by` repository entry.

---

An Ubuntu or Debian host can suddenly fail `apt-get update` for the Google Cloud CLI repository with messages such as `NO_PUBKEY`, `EXPKEYSIG`, or "the following signatures couldn't be verified." A repository signing-key change is one possible cause, but the same symptom can also come from a stale keyring, duplicate source definitions, a bad system clock, or a proxy serving altered or cached metadata.

The safe fix is to restore the repository configuration from Google's current installation documentation. Do not bypass APT authentication with `trusted=yes`, `--allow-unauthenticated`, or signature-checking options.

## Identify the Failing Repository

Run the update without suppressing its diagnostics:

```bash
sudo apt-get update
```

Confirm that the failing URI is the Google packages repository:

```text
https://packages.cloud.google.com/apt cloud-sdk
```

Then find every configured entry for it:

```bash
grep -Rhsn 'packages\.cloud\.google\.com/apt.*cloud-sdk' \
  /etc/apt/sources.list \
  /etc/apt/sources.list.d/*.list 2>/dev/null
```

Google's documentation warns against duplicate `cloud-sdk` entries. Two entries can point at the same repository while using different `signed-by` options or keyrings, producing a confusing `Conflicting values set for option Signed-By` error before APT even verifies a signature.

Also check basic host integrity:

```bash
date --iso-8601=seconds
curl -I https://packages.cloud.google.com/apt/dists/cloud-sdk/InRelease
```

An incorrect clock can make valid signatures appear not yet valid or expired. A TLS-inspecting proxy, captive portal, or repository mirror can return content other than Google's signed `InRelease` file. Fix that path instead of importing arbitrary keys from an error message.

## Install the Current Google Key into a Dedicated Keyring

Google's current instructions for supported modern Debian and Ubuntu releases use `gpg --dearmor` and `/usr/share/keyrings/cloud.google.gpg`:

```bash
sudo apt-get install ca-certificates gnupg curl

curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
  | sudo gpg --dearmor --yes \
      -o /usr/share/keyrings/cloud.google.gpg
```

The downloaded file is Google's published APT key endpoint. Do not substitute a key copied from a forum, a keyserver result selected only by a short key ID, or a file attached to an issue.

On older systems Google's page still documents `apt-key` fallbacks, but `apt-key` is deprecated by modern Debian and Ubuntu. Use the dedicated keyring and `signed-by` approach whenever the distribution supports it.

Inspect the resulting file without modifying it:

```bash
ls -l /usr/share/keyrings/cloud.google.gpg
gpg --show-keys /usr/share/keyrings/cloud.google.gpg
```

This catches an empty HTML response, a zero-byte file, or a permissions problem. The keyring only needs to be readable by APT; it must not be writable by unprivileged users.

## Configure Exactly One Scoped Repository Entry

The supported repository line is:

```text
deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main
```

After removing duplicate Google Cloud SDK entries from other APT source files, write a single canonical file:

```bash
echo 'deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main' \
  | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list >/dev/null
```

Using `signed-by` scopes this trust key to that repository. It is preferable to placing a repository key in a legacy global trust store where it could authenticate unrelated repositories.

Check the final state:

```bash
grep -Rhsn 'packages\.cloud\.google\.com/apt.*cloud-sdk' \
  /etc/apt/sources.list \
  /etc/apt/sources.list.d/*.list 2>/dev/null

sudo apt-get update
apt-cache policy google-cloud-cli
```

The grep should show one active source definition. `apt-cache policy` should show a candidate from `packages.cloud.google.com` when the repository is healthy.

## Interpret Errors That Remain

If replacing the keyring does not fix the update, diagnose the exact message instead of repeatedly importing the key.

| Error | What to inspect |
| --- | --- |
| `NO_PUBKEY` | The source's `signed-by` path, keyring contents, and file readability |
| `EXPKEYSIG` | Whether the current key endpoint was actually fetched and the host clock is correct |
| `Conflicting values set for option Signed-By` | Duplicate source lines with different keyring settings |
| `Clearsigned file isn't valid` | Proxy, captive portal, mirror, or cached HTML replacing repository metadata |
| TLS certificate failure | CA certificates, system time, proxy trust, and DNS, not the APT signing key |
| `Release file is not valid yet` | System clock and time synchronization |

To see which configuration APT is using, include debug output for the authentication stage:

```bash
sudo apt-get -o Debug::Acquire::gpgv=true update
```

Do not delete all of `/var/lib/apt/lists` as the first response. Stale lists can be a problem, but clearing caches does not repair a missing key, a mismatched `signed-by` path, or a duplicate repository entry.

## Keep Images and CI Builds Reproducible

Container images often retain an old keyring layer even though `apt-get update` runs in a later layer. Google's documentation shows adding the source, fetching the key, updating, and installing in one build step. At minimum, ensure the key is fetched during a fresh build and that an image cache cannot preserve an obsolete keyring indefinitely.

For long-lived hosts, configuration management should own both files as a pair:

- `/usr/share/keyrings/cloud.google.gpg`
- `/etc/apt/sources.list.d/google-cloud-sdk.list`

Monitor `apt-get update` failures and refresh the pair from the official instructions when Google changes repository signing material. Avoid hard-coding undocumented fingerprints or alternate download locations that are not part of the published installation flow.

## Official Documentation

- [Install the Google Cloud CLI on Debian and Ubuntu](https://cloud.google.com/sdk/docs/install#deb)
- [Google Cloud CLI versioned archives](https://cloud.google.com/sdk/docs/downloads-versioned-archives)
- [Google Cloud CLI release notes](https://cloud.google.com/sdk/docs/release-notes)

## Conclusion

Repair a Google Cloud CLI APT signature failure by confirming the failing URI, eliminating duplicate `cloud-sdk` entries, downloading Google's current public key into the documented keyring, and binding one repository entry to it with `signed-by`. If verification still fails, investigate time, TLS, and proxy behavior. Never turn off APT signature verification to make an update pass.
