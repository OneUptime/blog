# How to Set Up Pre-Commit Hooks for Istio Config Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pre-Commit Hooks, Configuration Validation, GitOps, DevOps

Description: Learn how to set up pre-commit hooks that validate your Istio configuration files before they ever reach your cluster, catching errors early in the development workflow.

---

Catching a broken Istio VirtualService or DestinationRule after it hits your cluster is painful. Your traffic routing breaks, services go down, and you spend the next hour figuring out which commit introduced the bad config. A much better approach is to validate Istio configurations before they even get committed to your repository.

Pre-commit hooks give you that safety net. Every time someone runs `git commit`, the hook kicks in, validates the Istio YAML files in the changeset, and blocks the commit if something is wrong. Here is how to set this up properly.

## Prerequisites

You will need a few tools installed on your development machine:

- `istioctl` (the Istio CLI)
- `kubectl` with a valid kubeconfig (for dry-run validation)
- `python3` or `bash` for the hook scripts
- The `pre-commit` framework (optional but recommended)

Install `istioctl` if you have not already:

```bash
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-*/bin:$PATH
```

## Using istioctl validate

The core of our validation strategy is `istioctl validate`. This command checks Istio configuration files for syntax errors, schema violations, and common mistakes without needing a running cluster.

```bash
istioctl validate -f networking/virtual-service.yaml
```

If the file is valid, you get a clean output. If there are problems, you get specific error messages:

```text
Error: 1 error occurred:
    * VirtualService "my-service" has empty destination host
```

You can also validate entire directories:

```bash
istioctl validate -f networking/
```

## Setting Up a Basic Git Pre-Commit Hook

The simplest approach is a bash script in `.git/hooks/pre-commit`. Create the file:

```bash
#!/bin/bash

# Find all staged YAML files that look like Istio configs
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ya?ml$')

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

ERRORS=0

for file in $STAGED_FILES; do
    # Check if the file contains Istio API versions
    if grep -q "networking.istio.io\|security.istio.io\|telemetry.istio.io" "$file"; then
        echo "Validating Istio config: $file"
        OUTPUT=$(istioctl validate -f "$file" 2>&1)
        if [ $? -ne 0 ]; then
            echo "FAILED: $file"
            echo "$OUTPUT"
            ERRORS=$((ERRORS + 1))
        else
            echo "PASSED: $file"
        fi
    fi
done

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "$ERRORS file(s) failed Istio validation. Commit blocked."
    exit 1
fi

exit 0
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

The problem with this approach is that `.git/hooks` is not tracked by Git. Your teammates would need to manually set up the same hook on their machines. That is where the `pre-commit` framework helps.

## Using the Pre-Commit Framework

The `pre-commit` framework lets you define hooks in a `.pre-commit-config.yaml` file that lives in your repository. Install it first:

```bash
pip install pre-commit
```

Create `.pre-commit-config.yaml` in the root of your repo:

```yaml
repos:
  - repo: local
    hooks:
      - id: istio-validate
        name: Validate Istio Configuration
        entry: bash -c 'for f in "$@"; do if grep -q "networking.istio.io\|security.istio.io\|telemetry.istio.io" "$f"; then istioctl validate -f "$f" || exit 1; fi; done' --
        language: system
        files: '\.ya?ml$'
        pass_filenames: true
```

Then install the hooks:

```bash
pre-commit install
```

Now everyone who clones the repo and runs `pre-commit install` gets the same validation hooks. You can also add this to your onboarding docs or run it automatically via a setup script.

## Adding Schema Validation with kubeval or kubeconform

`istioctl validate` checks Istio-specific resources, but you might also have plain Kubernetes resources mixed in. Adding `kubeconform` gives you broader coverage:

```bash
pip install kubeconform
```

Update your `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: istio-validate
        name: Validate Istio Configuration
        entry: bash -c 'for f in "$@"; do if grep -q "networking.istio.io\|security.istio.io\|telemetry.istio.io" "$f"; then istioctl validate -f "$f" || exit 1; fi; done' --
        language: system
        files: '\.ya?ml$'
        pass_filenames: true

      - id: kube-validate
        name: Validate Kubernetes Resources
        entry: bash -c 'kubeconform -strict -ignore-missing-schemas "$@"' --
        language: system
        files: '\.ya?ml$'
        pass_filenames: true
```

The `-ignore-missing-schemas` flag prevents kubeconform from failing on Istio CRDs that it does not have schemas for. Those are already covered by `istioctl validate`.

## Adding OPA/Rego Policy Checks

For teams that want to enforce organizational policies on Istio configs, you can add Open Policy Agent (OPA) checks to the pre-commit hook. For example, you might want to enforce that all VirtualServices include a timeout:

Create a policy file at `policies/istio/require-timeout.rego`:

```rego
package istio.virtualservice

deny[msg] {
    input.kind == "VirtualService"
    route := input.spec.http[_]
    not route.timeout
    msg := sprintf("VirtualService '%s' HTTP route missing timeout", [input.metadata.name])
}
```

Then add a hook that runs `conftest`:

```yaml
      - id: istio-policy
        name: Check Istio Policies
        entry: conftest test --policy policies/istio/
        language: system
        files: '\.ya?ml$'
        pass_filenames: true
```

Install conftest:

```bash
brew install conftest
```

## Handling Multi-Document YAML Files

Istio configs often come in multi-document YAML files (separated by `---`). Both `istioctl validate` and `kubeconform` handle these natively, so no special treatment is needed. But if you are writing custom validation scripts, be aware of this:

```bash
# This works fine with multi-document YAML
istioctl validate -f multi-resource.yaml
```

## Making the Hook Fast

Pre-commit hooks need to be fast or developers will bypass them with `--no-verify`. A few tips:

1. Only validate changed files, not the entire config directory
2. Run validations in parallel when possible
3. Skip non-Istio YAML files early with the grep check

Here is a parallel version of the validation script:

```bash
#!/bin/bash

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ya?ml$')

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

TMPFILE=$(mktemp)

echo "$STAGED_FILES" | xargs -P 4 -I {} bash -c '
    if grep -q "networking.istio.io\|security.istio.io\|telemetry.istio.io" "{}"; then
        OUTPUT=$(istioctl validate -f "{}" 2>&1)
        if [ $? -ne 0 ]; then
            echo "FAILED: {}" >> '"$TMPFILE"'
            echo "$OUTPUT" >> '"$TMPFILE"'
        fi
    fi
'

if [ -s "$TMPFILE" ]; then
    cat "$TMPFILE"
    rm "$TMPFILE"
    exit 1
fi

rm "$TMPFILE"
exit 0
```

## Sharing Hooks Across Teams

The `pre-commit` framework is the cleanest solution for sharing, but you can also use a Makefile approach:

```makefile
.PHONY: install-hooks
install-hooks:
	cp scripts/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
	@echo "Pre-commit hooks installed"
```

Add `make install-hooks` to your project setup instructions.

## Testing Your Hooks

Before trusting your hooks in production, test them with known-bad configs:

```bash
# Create a deliberately broken VirtualService
cat > /tmp/bad-vs.yaml <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: broken-service
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: ""
EOF

istioctl validate -f /tmp/bad-vs.yaml
# Should output an error
```

## Wrapping Up

Pre-commit hooks for Istio validation are one of those things that take 30 minutes to set up and save you hours of debugging down the road. Start with the basic `istioctl validate` hook, add kubeconform for broader Kubernetes validation, and layer on OPA policies as your team's requirements grow. The key is making the feedback loop as tight as possible so bad configs never leave a developer's machine.
