# Bazel Remote Cache Fails Only in CI: Debugging TLS, mTLS, Credentials, and Proxy Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bazel, CI/CD, Security, Build Cache, Troubleshooting

Description: Trace Bazel remote-cache failures through endpoint protocol, certificate trust, client authentication, credentials, and CI proxy configuration.

---

A Bazel cache that works on a laptop can fail in CI because the laptop has a private CA, a logged-in credential helper, or a network route the runner lacks. Start by identifying which connection layer failed. Changing action keys will not fix a TLS handshake or an authorization denial.

Use one small target and a fresh diagnostic output base so local results do not hide the remote request. Keep cache uploads disabled until the reader path is understood.

## Record the Effective Endpoint and Protocol

Compare the cache URL, protocol, instance name, Bazel version, and selected `.bazelrc` configuration. Distinguish `https://` for an HTTP cache from `grpcs://` for a TLS-protected gRPC cache. They are not interchangeable names for the same protocol.

Bazel's remote cache stores action metadata and output blobs through supported cache protocols. A browser loading an HTTP landing page proves little about the actual cache endpoint. [Remote caching](https://bazel.build/remote/caching).

Inspect available options for the version running in CI:

```bash
bazel version
bazel help build | rg 'remote_cache|remote_instance_name|tls_|credential_helper|remote_proxy'
```

Compare relevant configuration values without dumping secrets or an entire environment. Also check whether a containerized Bazel process receives the intended secret mounts and proxy settings; a host-side shell test may use a different filesystem and network.

## Diagnose Server Trust Before Client Identity

A runner must trust the CA that signed the cache server certificate, and the certificate must match the requested hostname. Common failures include missing intermediate certificates, a private CA absent from the runner, expired certificates, and using an IP address when the certificate covers only DNS names.

For an OpenSSL installation supporting these options:

```bash
cache_host=cache.example.com
openssl s_client \
  -connect "$cache_host:443" \
  -servername "$cache_host" \
  -verify_hostname "$cache_host" \
  -verify_return_error \
  -CAfile /run/ci-secrets/cache-ca.pem \
  </dev/null
```

This checks a TLS connection from that process. It does not prove Bazel uses the same trust material or that application authentication will succeed.

Configure Bazel's trusted CA explicitly when needed:

```text
build:ci-cache --remote_cache=grpcs://cache.example.com
build:ci-cache --tls_certificate=/run/ci-secrets/cache-ca.pem
build:ci-cache --remote_upload_local_results=false
```

These are `.bazelrc` entries selected with `--config=ci-cache`. Bazel's official option definitions describe `tls_certificate` as the certificate trusted to sign server certificates. [Authentication and TLS options](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/authandtls/AuthAndTLSOptions.java).

Do not disable certificate validation to make the cache green. Fix the hostname and trust chain used by the actual Bazel process.

## Add Both Parts of Mutual TLS

If the service requires mTLS, the client needs a certificate and its corresponding private key:

```text
build:ci-cache --tls_client_certificate=/run/ci-secrets/cache-client.pem
build:ci-cache --tls_client_key=/run/ci-secrets/cache-client-key.pem
```

Check file presence, ownership, readability by the job user, certificate validity, and whether the key matches the certificate. Do not print private-key contents into logs.

A trusted server certificate and a valid client certificate solve different halves of the handshake. The server may still reject the client because its issuing CA, identity, or authorization policy differs from what the laptop uses. Bazel's option documentation requires both client certificate and client key for client authentication. [TLS client options](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/authandtls/AuthAndTLSOptions.java).

## Check Application Credentials and Permissions

After TLS succeeds, HTTP 401/403 or gRPC authentication/permission errors point toward credentials or service authorization. Confirm the CI identity can read both action-cache records and the content-addressed blobs referenced by them.

A credential helper configured for the cache domain avoids putting a long-lived token in a committed `.bazelrc` file:

```text
build:ci-cache --credential_helper=cache.example.com=/opt/ci/bin/cache-credentials
```

The helper path is an example of your organization's installed helper. It must implement Bazel's documented helper protocol and obtain credentials non-interactively in CI. A developer's cached login is not available automatically on a fresh runner.

Bazel also supports request headers such as `--remote_cache_header=Name=Value`. Prefer secret-aware credential injection and avoid exposing tokens through shell tracing, process arguments, or unrestricted diagnostic files. [Remote cache options](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/options/RemoteOptions.java).

## Audit Proxies Without Guessing Their Syntax

A CI proxy may intercept TLS, block gRPC HTTP/2, strip authorization headers, or allow small metadata requests while rejecting large blob transfers. Inspect the route from inside the job container and compare proxy exclusions for the cache hostname.

Do not set `--remote_proxy=http://proxy:8080` based on its name. Bazel's current option help describes `remote_proxy` as a Unix-domain-socket proxy setting, for example `unix:/path/to/socket`. Verify protocol-specific proxy support for your Bazel version and transport instead of treating it as a generic HTTP proxy URL. [Remote proxy option source](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/options/RemoteOptions.java).

## Prove the Fix with Real Cache Reads

Populate a known small target through an authorized producer. Consume it from a fresh CI environment using read-only credentials and inspect cache-request results. Then test a target with larger output blobs to expose transfer limits hidden by the small test.

Record whether the failure was DNS/routing, server trust, client identity, application authorization, or transfer behavior. Restore uploads only for trusted producer jobs after read access works. That gives future certificate rotations and runner-image changes a concrete regression test instead of relying on a laptop's warm cache.

## References

- [Bazel remote caching](https://bazel.build/remote/caching)
- [Official authentication and TLS option definitions](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/authandtls/AuthAndTLSOptions.java)
- [Official remote-cache option definitions](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/remote/options/RemoteOptions.java)
- [Bazel cache debugging](https://bazel.build/remote/cache-local)
