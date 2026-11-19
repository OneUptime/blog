# MLRun Returns 404 for `/api/v1/client-spec`: How to Fix `MLRUN_DB` URL and Environment Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Python, Troubleshooting

Description: Fix MLRun client-spec 404 errors by inspecting the effective API base URL, using MLRUN_DBPATH, and separating proxy routing from authentication and version compatibility.

A request to `/api/v1/client-spec` usually happens before your training code runs. MLRun uses the server's client specification to discover configuration and check compatibility. A 404 at that stage means you need to investigate the API route, not the model code.

Older troubleshooting examples sometimes call the setting `MLRUN_DB`. The currently documented client setting is **`MLRUN_DBPATH`**. Use the name supported by your installed release and inspect its effective value instead of assuming that changing an arbitrary environment variable changed the connection.

## Find the URL the SDK actually uses

The [MLRun client setup guide](https://docs.mlrun.org/en/stable/setup-guide.html) describes the API base URL and environment-file configuration. The [HTTP database client source](https://docs.mlrun.org/en/stable/_modules/mlrun/db/httpdb.html) shows `connect()` fetching `client-spec` and reading the returned server version.

Record the complete request URL from the exception, with credentials removed. Compare it with the platform's remote settings. Common mistakes include the MLRun UI URL, a Nuclio dashboard URL, a different tenant, and an API prefix appended to a base URL when the client already adds that prefix.

Inspect selected settings without dumping the whole environment:

```python
import os
from urllib.parse import urlsplit

for name in ("MLRUN_DBPATH", "MLRUN_DB"):
    value = os.getenv(name)
    if not value:
        print(name, "unset")
        continue
    parsed = urlsplit(value)
    print(name, {
        "scheme": parsed.scheme,
        "host": parsed.hostname,
        "port": parsed.port,
        "path": parsed.path,
        "has_embedded_credentials": parsed.username is not None,
    })
```

This avoids printing an embedded password or query string. If MLRun imports successfully, compare the environment with `mlrun.mlconf.dbpath` using the same redaction approach. An already-loaded configuration or explicit SDK argument may differ from a shell variable you just edited.

## Correct the base address

For the common host-root deployment, the environment value should identify the MLRun API service itself:

```dotenv
MLRUN_DBPATH=https://mlrun-api.default-tenant.app.example.com
```

This is an illustrative hostname. Copy your actual address from the platform's remote settings, as described in [Iguazio's environment guide](https://www.iguazio.com/docs/latest-release/intro/setup-env/). Keep credentials in the approved secret configuration rather than inserting them into the URL.

If the exception contains `//api/v1/client-spec`, remove an unintended trailing slash from a host-root base URL and retry. However, double-slash handling varies by client and reverse proxy. It is one diagnostic clue, not proof that every client-spec 404 has that cause.

For an installation intentionally served under a path prefix, use the administrator's supported external base path and ingress rewrite rules. Do not remove a required prefix merely to make the URL look shorter.

## Inspect the responding service

From the same network context as the notebook, inspect the status and content type of the API route. For an endpoint that permits unauthenticated discovery, a read-only check is:

```bash
curl --silent --show-error --dump-header response-headers.txt \
  --output response-body.txt \
  https://mlrun-api.default-tenant.app.example.com/api/v1/client-spec
```

Use normal authenticated SDK access when the deployment requires credentials; do not treat an unauthenticated 401 as a broken route. Keep captured files private if the response contains environment details.

An HTML page suggests a UI or proxy response. A JSON error from MLRun suggests that the request reached the API but the route or version differs. A redirect to login suggests an authentication boundary. A timeout or certificate error occurs before an HTTP 404 and should be diagnosed separately.

## Reload configuration and verify compatibility

Restarting the notebook kernel is a straightforward way to remove stale configuration during diagnosis. When changing the SDK configuration programmatically, the setup guide documents assigning `mlrun.mlconf.dbpath` and calling `mlrun.mlconf.reload()` to apply it. Recreate client objects that already captured the old endpoint.

Once client-spec succeeds, check the client and server versions under the release's compatibility policy. A much newer SDK can expect an API absent from an older server. Changing URLs repeatedly will not repair that incompatibility.

Finish with a permitted read-only project lookup, followed by a small test run if execution is part of your workflow. Save the corrected nonsecret endpoint, configuration source, and client/server versions. The useful outcome is that every notebook and CI process resolves the intended API consistently, not simply that one manually constructed curl request returns a page.
