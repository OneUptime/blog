# How to Set Up SOPS Pre-Commit Hooks for Flux Repositories

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secret, Encryption, Pre-Commit, Git Hooks, CI/CD

Description: Learn how to set up Git pre-commit hooks that prevent accidentally committing unencrypted secrets to your Flux GitOps repository.

---

One of the biggest risks in a GitOps workflow is accidentally committing unencrypted secrets to your Git repository. Once a secret is pushed in plaintext, it is in the Git history forever (unless you rewrite history). Pre-commit hooks provide a safety net by checking that files expected to be encrypted are actually encrypted before allowing a commit. This guide shows how to set up these hooks for a Flux repository using SOPS.

## Why Pre-Commit Hooks Are Essential

Developers can accidentally commit unencrypted secrets in several ways. They might create a new secret file and forget to run `sops --encrypt`. They might decrypt a file for debugging and forget to re-encrypt it. They might modify `.sops.yaml` in a way that breaks encryption rules. A pre-commit hook catches these mistakes before they reach the repository.

## Option 1: Using the pre-commit Framework

The `pre-commit` framework provides a standardized way to manage Git hooks.

Install pre-commit:

```bash
pip install pre-commit
# or

brew install pre-commit
```

Create a `.pre-commit-config.yaml` in your repository root:

```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
    hooks:
      - id: gitleaks

  - repo: local
    hooks:
      - id: sops-check-encryption
        name: Check SOPS encryption
        entry: ./scripts/check-sops-encryption.sh
        language: unsupported_script
        files: '(secret|credential|token|key).*\.yaml$'
        stages: [pre-commit]
```

Create the validation script at `scripts/check-sops-encryption.sh`:

```bash
#!/bin/bash
set -euo pipefail

EXIT_CODE=0

for file in "$@"; do
  # Skip non-existent files (deleted files)
  if [ ! -f "$file" ]; then
    continue
  fi

  # Check if the file should be encrypted (matches secret-related patterns)
  if echo "$file" | grep -qiE '(secret|credential|token|key|password)'; then
    # Check if the file contains SOPS metadata
    if ! grep -q "sops:" "$file" || ! grep -q "ENC\[AES256_GCM" "$file"; then
      echo "ERROR: $file appears to contain secrets but is not SOPS-encrypted!"
      echo "       Run: sops --encrypt --in-place $file"
      EXIT_CODE=1
    fi
  fi
done

exit $EXIT_CODE
```

Make the script executable and install the hooks:

```bash
chmod +x scripts/check-sops-encryption.sh
pre-commit install
```

## Option 2: Custom Git Hook

For teams that do not want the pre-commit framework, create a custom Git hook.

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
set -euo pipefail

echo "Checking for unencrypted secrets..."

EXIT_CODE=0

while IFS= read -r -d '' file; do
  # Skip non-YAML files
  if ! echo "$file" | grep -q '\.yaml$'; then
    continue
  fi

  # Check if the file is in a secrets directory or has a secret-like name
  if echo "$file" | grep -qiE '(secret|credential|token|cred)'; then
    STAGED_CONTENT=$(git show ":$file")

    # Check for SOPS encryption markers
    if ! printf '%s\n' "$STAGED_CONTENT" | grep -q "sops:"; then
      echo "BLOCKED: $file is in a secrets path but is not SOPS-encrypted"
      EXIT_CODE=1
      continue
    fi

    # Check that sensitive fields are actually encrypted
    if printf '%s\n' "$STAGED_CONTENT" | grep -qE '^[[:space:]]+(data|stringData):'; then
      # Look for unencrypted values under data/stringData
      IN_DATA_BLOCK=false
      while IFS= read -r line; do
        if echo "$line" | grep -qE '^[[:space:]]+(data|stringData):'; then
          IN_DATA_BLOCK=true
          continue
        fi
        if echo "$line" | grep -qE '^[a-zA-Z]' && [ "$IN_DATA_BLOCK" = true ]; then
          IN_DATA_BLOCK=false
          continue
        fi
        if [ "$IN_DATA_BLOCK" = true ]; then
          if echo "$line" | grep -qE ':[[:space:]]+[^[:space:]]' && ! echo "$line" | grep -q 'ENC\['; then
            echo "BLOCKED: $file has unencrypted values in data/stringData block"
            EXIT_CODE=1
            break
          fi
        fi
      done <<< "$STAGED_CONTENT"
    fi
  fi
done < <(git diff --cached --name-only -z --diff-filter=ACM)

if [ $EXIT_CODE -eq 0 ]; then
  echo "All secret files are properly encrypted."
fi

exit $EXIT_CODE
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Option 3: Distributable Hook via Husky or Lefthook

For consistent hook distribution across the team, use lefthook:

Install lefthook:

```bash
brew install lefthook
```

Create `lefthook.yml` in the repository root:

```yaml
pre-commit:
  commands:
    check-sops:
      glob: "**/*secret*{.yaml,.yml}"
      run: ./scripts/check-sops-encryption.sh {staged_files}

    check-sensitive-patterns:
      glob: "**/*.{yaml,yml}"
      run: |
        for file in {staged_files}; do
          if grep -qiE '(password|api.?key|secret.?key|private.?key|token):[[:space:]]+[a-zA-Z0-9]' "$file" 2>/dev/null; then
            if ! grep -q "ENC\[AES256_GCM" "$file" 2>/dev/null; then
              echo "WARNING: $file may contain unencrypted sensitive data"
              exit 1
            fi
          fi
        done

    gitleaks:
      run: gitleaks git --pre-commit --redact --staged --no-banner
```

Install the hooks:

```bash
lefthook install
```

## Detecting Common Secret Patterns

Enhance your hook to detect common sensitive patterns:

```bash
#!/bin/bash
# scripts/detect-secrets.sh

PATTERNS=(
  "password:[[:space:]]*['\"]?[a-zA-Z0-9]"
  "api[_-]?key:[[:space:]]*['\"]?[a-zA-Z0-9]"
  "secret[_-]?key:[[:space:]]*['\"]?[a-zA-Z0-9]"
  "access[_-]?key:[[:space:]]*['\"]?[a-zA-Z0-9]"
  "private[_-]?key:[[:space:]]*['\"]?[a-zA-Z0-9]"
  "token:[[:space:]]*['\"]?[a-zA-Z0-9]"
  'BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY'
  'BEGIN CERTIFICATE'
  "connectionstring:[[:space:]]*['\"]?[a-zA-Z0-9]"
)

EXIT_CODE=0

for file in "$@"; do
  [ ! -f "$file" ] && continue
  echo "$file" | grep -q '\.yaml$' || continue

  for pattern in "${PATTERNS[@]}"; do
    if grep -qiE "$pattern" "$file" 2>/dev/null; then
      if ! grep -q "ENC\[AES256_GCM" "$file" 2>/dev/null; then
        echo "ALERT: Possible unencrypted secret in $file (pattern: $pattern)"
        EXIT_CODE=1
        break
      fi
    fi
  done
done

exit $EXIT_CODE
```

## Auto-Encryption Hook

Instead of just blocking commits, automatically encrypt files:

```bash
#!/bin/bash
# .git/hooks/pre-commit (auto-encrypt variant)

while IFS= read -r -d '' file; do
  if echo "$file" | grep -qiE 'secret.*\.yaml$'; then
    if ! grep -q "sops:" "$file"; then
      echo "Auto-encrypting $file..."
      if sops --encrypt --in-place "$file"; then
        git add "$file"
        echo "Encrypted and re-staged: $file"
      else
        echo "ERROR: Failed to encrypt $file. Ensure .sops.yaml is configured."
        exit 1
      fi
    fi
  fi
done < <(git diff --cached --name-only -z --diff-filter=ACM)
```

Note: auto-encryption hooks should be used cautiously. They can mask developer mistakes and may encrypt files that were intentionally left unencrypted.

## Testing the Pre-Commit Hook

Verify the hook works:

```bash
# Create an unencrypted secret (should be blocked)
cat <<EOF > secrets/test-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: test
type: Opaque
stringData:
  password: plaintext-password
EOF

git add secrets/test-secret.yaml
git commit -m "Test commit"
# Should be blocked by the pre-commit hook

# Now encrypt and try again
sops --encrypt --in-place secrets/test-secret.yaml
git add secrets/test-secret.yaml
git commit -m "Add encrypted test secret"
# Should succeed
```

## Conclusion

Pre-commit hooks are a critical safety net for Flux repositories using SOPS. They prevent the most common mistake in secret management: committing plaintext credentials to Git. Whether you use the pre-commit framework, custom Git hooks, or lefthook, the key is to ensure every developer has the hooks installed and that your CI pipeline also validates encryption as a backup check.
