# How to Read an Entire Parameter Store Hierarchy Without Missing Paginated or Encrypted Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Parameter Store, Python, Configuration Management

Description: Load a complete Parameter Store hierarchy with pagination, decryption, collision checks, and validation before replacing application configuration.

A configuration loader can return successfully and still lose settings: it might read one page, flatten two different names into the same key, or leave encrypted values undecrypted. A later request can also fail after earlier pages have already changed the application's environment.

Treat loading as a transaction in your application: collect a candidate configuration, validate it, and publish it only after every request succeeds. This walkthrough reads a hierarchy in one AWS account and Region.

## Select the hierarchy precisely

For `/payments/prod/database/password`, request `Path="/payments/prod"` with `Recursive=True` to include nested settings. Without recursion, the request covers only parameters directly below the requested level. Supply the hierarchy, not the full name of a leaf you want to retrieve; use `GetParameter` for that leaf. See the documented [Path and Recursive arguments](https://docs.aws.amazon.com/boto3/latest/reference/services/ssm/client/get_parameters_by_path.html).

Use the application's credentials and explicit Region. Its role needs `ssm:GetParametersByPath` for the requested path. This action authorizes the path, so a deny on an individual descendant does not filter that descendant out of an authorized ancestor read. Choose an appropriate application boundary before loading recursively. See [retrieval authorization](https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-retrieval-authorization.html).

## Finish pagination even when a page is empty

One `get_parameters_by_path` call returns one service page. `MaxResults` accepts 1–10, and AWS describes results as best effort: a response can contain fewer items, including zero, while returning `NextToken`. Continue while the token exists. Neither an empty list nor fewer than ten parameters means completion. These are explicit [GetParametersByPath API semantics](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParametersByPath.html).

Boto3 supplies a [GetParametersByPath paginator](https://docs.aws.amazon.com/boto3/latest/reference/services/ssm/paginator/GetParametersByPath.html). Iterate it to exhaustion. `PageSize` controls individual requests; `MaxItems` caps the total traversal, so omit `MaxItems` when loading the entire hierarchy. Leave parameter filters unset too: a `Type`, `KeyId`, or `Label` filter intentionally selects a subset.

## Stage values before installing configuration

Install Boto3 in your application environment and configure its normal AWS credentials. This example uses an explicit expected-name set from the application's configuration contract; replace it with your complete deployment manifest.

```python
import boto3


def load_hierarchy(ssm, path, expected_names):
    # This loader deliberately accepts a non-root application prefix only.
    path = path.rstrip("/")
    if not path.startswith("/") or not path:
        raise ValueError("Use an absolute, non-root hierarchy path")

    values = {}
    metadata = {}
    pages = ssm.get_paginator("get_parameters_by_path").paginate(
        Path=path,
        Recursive=True,
        WithDecryption=True,
        PaginationConfig={"PageSize": 10},
    )

    for page in pages:
        for parameter in page.get("Parameters", []):
            name = parameter["Name"]
            if not name.startswith(path + "/"):
                raise RuntimeError("Parameter outside the requested hierarchy")
            if name in values:
                raise RuntimeError("Duplicate parameter name; reload required")
            values[name] = parameter["Value"]
            metadata[name] = {
                "Type": parameter["Type"],
                "Version": parameter["Version"],
            }

    if set(values) != set(expected_names):
        raise RuntimeError("Configuration names do not match the manifest")

    return {"values": values, "metadata": metadata}


ssm = boto3.client("ssm", region_name="us-east-1")
EXPECTED_NAMES = {
    "/payments/prod/database/host",
    "/payments/prod/database/password",
    "/payments/prod/cache/host",
}

# At startup, finish loading before starting application workers.
# If loading raises, this assignment never publishes a partial result.
CONFIG = load_hierarchy(ssm, "/payments/prod", EXPECTED_NAMES)
database_password = CONFIG["values"]["/payments/prod/database/password"]
```

Keep full names as dictionary keys. Both `database/host` and `cache/host` are valid distinct settings; reducing them to `host` silently overwrites one. Converting names into uppercase environment variables creates additional collisions. Any such mapping needs explicit collision checks.

The manifest comparison detects missing and unexpected names. A count comparison cannot distinguish two different sets of equal size. Build the expected set independently of this read; deriving it from the returned names provides no completeness check. Add application schema and expected-version validation before the function returns when your deployment requires them.

The local dictionaries are staging areas. Any SDK, decryption, or validation exception prevents publication. During reloads, keep the previous complete configuration and report failure through your normal error path; use your application's synchronization mechanism when replacing the configuration reference. Do not update `os.environ` or a shared cache inside the page loop.

## Require successful decryption

`WithDecryption=True` requests plaintext values for `SecureString` parameters. The caller needs effective `kms:Decrypt` authorization for the keys involved; both standard and advanced `SecureString` parameters require it. Customer managed keys also require the appropriate key-policy or grant authorization. See [Parameter Store encryption](https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html) and [KMS access control](https://docs.aws.amazon.com/kms/latest/developerguide/control-access.html).

Let errors propagate from the loader. Do not catch a KMS denial and return the pages already collected, substitute an empty password, or retry without decryption. Similarly, an exhausted retry policy or invalid pagination token means the load failed. Retry the complete load after resolving the cause.

Values remain in process memory. Avoid logging `CONFIG`, response dictionaries, exception locals, or enabling SDK debug output around secret reads.

## Verify with metadata, not secret output

For an operator check, AWS CLI v2 automatically follows pages:

```bash
aws ssm get-parameters-by-path \
  --region us-east-1 \
  --path /payments/prod \
  --recursive \
  --with-decryption \
  --page-size 10 \
  --query 'Parameters[].{Name:Name,Type:Type,Version:Version}' \
  --output json \
  --no-cli-pager
```

Check command success and compare the names, types, and versions with the intended manifest. This projection hides values from displayed output, but decrypted values still reach the CLI process because [`--query` is client-side filtering](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html). Keep debug logging disabled.

The [command reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameters-by-path.html) distinguishes `--page-size` from `--max-items`: the latter deliberately truncates total output. Its continuation token belongs with CLI `--starting-token`, not directly with SDK requests. `--no-paginate` restricts retrieval to one service call; `--no-cli-pager` only disables the terminal display pager. The [CLI pagination guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-pagination.html) explains that distinction.

## Account for concurrent changes

A finished paginator does not establish an atomic configuration snapshot. The [API contract](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParametersByPath.html) provides continuation tokens and individual parameter versions, without a snapshot guarantee across pages. Treat concurrent updates as potentially producing a mixture of versions; the name-set check cannot detect that.

For coupled settings, an application design is to populate a release-specific prefix, validate its manifest, then deploy readers pinned to that prefix. Keep the published prefix immutable while consumers use it. This makes consistency a property of your publication workflow instead of an assumption about pagination.
