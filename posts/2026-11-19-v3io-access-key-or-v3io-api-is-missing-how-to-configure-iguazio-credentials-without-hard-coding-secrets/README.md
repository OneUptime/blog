# Configure Missing Iguazio V3IO_ACCESS_KEY and V3IO_API Credentials Securely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Security, Python, CI/CD

Description: Supply Iguazio V3IO endpoints and access keys through runtime environments and secret references, then verify the configuration without exposing credentials.

A missing `V3IO_ACCESS_KEY` or `V3IO_API` error usually means the process performing the storage operation did not receive the configuration it needs. The process might be your notebook kernel, a CI runner, or a remote job. Fixing the environment in one of those places does not automatically fix the others.

For an Iguazio-backed deployment, start by identifying the failing process and its storage interface. MLRun can configure V3IO access automatically for functions running on Iguazio, but remote clients and overridden runtime configurations may need explicit settings. [MLRun V3IO datastore documentation](https://docs.mlrun.org/en/stable/store/datastore.html#v3io)

## Keep endpoint and identity settings distinct

The relevant values have different purposes:

| Setting | Purpose |
|---|---|
| `MLRUN_DBPATH` | MLRun API endpoint used by the client |
| `V3IO_API` | V3IO Web API endpoint used for data access |
| `V3IO_ACCESS_KEY` | Credential authenticating V3IO Web API requests |
| `V3IO_USERNAME` | Platform username, also used by some path-resolution operations |

Obtain the endpoint values from your installation's remote-client settings. Do not replace the data endpoint with the MLRun API URL just because both services belong to the same cluster. Custom domains and proxies can also make hostname substitution unreliable. [MLRun client environment guide](https://docs.mlrun.org/en/stable/setup-guide.html)

Use a credential associated with the intended workload identity. A nonempty key proves only that a value was supplied; it does not establish that the key is valid, belongs to this cluster, or grants access to the target path.

## Inspect presence without printing the key

Run this in the failing environment when using environment-based configuration:

```python
import os
from urllib.parse import urlsplit

for name in ("MLRUN_DBPATH", "V3IO_API", "V3IO_USERNAME", "V3IO_ACCESS_KEY"):
    print(name, "present" if os.environ.get(name) else "missing")

for name in ("MLRUN_DBPATH", "V3IO_API"):
    value = os.environ.get(name, "")
    try:
        host = urlsplit(value).hostname
    except ValueError:
        host = "invalid URL"
    print(name, "host:", host)
```

The check intentionally does not print credential values or URL-parsing exceptions, which can contain the malformed input. It inspects the process environment rather than MLRun's complete effective configuration. MLRun can infer `V3IO_API` from `MLRUN_DBPATH` for supported remote Iguazio endpoint formats, so a missing environment variable alone does not prove the data endpoint is unconfigured. If your deployment uses an MLRun secret provider, inspect that provider's configuration too. [MLRun client environment guide](https://docs.mlrun.org/en/stable/setup-guide.html)

An environment exported in a terminal after Jupyter started is not inherited retroactively by its kernel. Apply the change through the notebook service's supported configuration and restart the relevant process. Also check whether an older notebook cell overwrites the corrected values.

## Inject the CI credential from its secret store

For a GitHub Actions submission step, reference configured secrets in the step environment:

```yaml
env:
  MLRUN_DBPATH: ${{ secrets.MLRUN_DBPATH }}
  V3IO_API: ${{ secrets.V3IO_API }}
  V3IO_USERNAME: ${{ secrets.V3IO_USERNAME }}
  V3IO_ACCESS_KEY: ${{ secrets.V3IO_ACCESS_KEY }}
```

This is an environment fragment for an existing workflow, not a complete workflow. Create the values through the repository or deployment environment's secret management before running it. MLRun documents this approach for remote Iguazio CI execution. [MLRun CI integration guide](https://docs.mlrun.org/en/v1.9/projects/ci-integration.html)

If the variables are empty in a particular event or environment, inspect the CI platform's secret-availability rules. Copying the key into the workflow file would hide that configuration problem while creating a persistent credential exposure.

## Reference a Kubernetes secret for the job

Where the runtime needs a Kubernetes secret mapped into its environment, MLRun documents `set_env_from_secret`. For an existing job function and a secret provisioned in the job's namespace:

```python
function.set_env_from_secret(
    "V3IO_ACCESS_KEY",
    secret="iguazio-runtime",
    secret_key="access-key",
)
```

This references the stored value instead of embedding it in Python source. The mapping takes effect for functions executed remotely, where Kubernetes injects the value into the function pod; it does not populate the environment of a locally executed function. Confirm this API and your platform's secret-management workflow for the installed MLRun version. [MLRun secret-to-environment mapping](https://docs.mlrun.org/en/v1.9/secrets.html#mapping-secrets-to-environment)

Configure endpoint and username settings through the same deployment workflow. Verify the rendered job references the expected secret name and key, then run the presence check inside a small diagnostic job. A secret available to the notebook is not automatically present in every Kubernetes namespace.

## Verify access and rotation separately

After configuration succeeds, perform a small read against a known permitted object. Diagnose missing configuration, authentication rejection, and path authorization as separate outcomes. Test output access separately if the workload writes artifacts.

When rotating a key injected as an environment variable, replace the consuming pods or restart the process through its normal rollout. Updating the Kubernetes secret does not update an already running container's environment. [Kubernetes secret environment behavior](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/#define-container-environment-variables-using-secret-data)

Keep real keys out of notebook outputs, saved examples, image layers, and committed environment files. Document secret names and endpoint sources so another operator can reproduce the configuration without receiving the credential in a troubleshooting transcript.
