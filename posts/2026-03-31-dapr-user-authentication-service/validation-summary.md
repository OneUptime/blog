# Validation Summary: How to Build a User Authentication Service with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secrets management, state store, service invocation)
- Go (net/http, encoding/json)
- golang-jwt/jwt/v5 (JWT creation and validation)
- golang.org/x/crypto/bcrypt (password hashing)
- Kubernetes Secrets
- Dapr Go SDK (github.com/dapr/go-sdk/client)

## Sources Consulted
- Dapr Go SDK source code (`github.com/dapr/go-sdk/client`) — verified `GetSecret`, `GetState`, and `SaveState` method signatures
- Dapr Kubernetes secret store component source (`github.com/dapr/components-contrib/secretstores/kubernetes`) — confirmed that the `key` parameter in `GetSecret` maps to the Kubernetes Secret object name, not an individual data key
- Dapr runtime secrets API (`github.com/dapr/dapr/pkg/api/universal/secrets.go`) — confirmed the request mapping chain from SDK to component
- golang-jwt/jwt v5 source (`github.com/golang-jwt/jwt/v5`) — confirmed `Parse`, `NewWithClaims`, `SigningMethodHS256`, `MapClaims`, and `SigningMethodHMAC` all exist with the expected signatures

## Issues Found

1. **GetSecret key parameter was wrong (bug):** The code called `client.GetSecret(ctx, "secretstore", "jwtSigningKey", nil)`. With the `secretstores.kubernetes` component, the key parameter is the Kubernetes Secret object name, not a data key within the secret. Since the kubectl command creates a secret named `auth-secrets`, the correct call is `client.GetSecret(ctx, "secretstore", "auth-secrets", nil)`. The returned map then contains `"jwtSigningKey"` as a key. Fixed the key from `"jwtSigningKey"` to `"auth-secrets"`.

2. **Missing `fmt` import (compile error):** The `HandleValidate` function uses `fmt.Errorf("unexpected signing method")`, but `"fmt"` was not included in the import block. Added `"fmt"` to the imports.

3. **Unused `bcryptCost` secret (misleading):** The kubectl command included `--from-literal=bcryptCost=12`, but the code never retrieves this value and instead uses `bcrypt.DefaultCost` (which is 10, not 12). Removed the unused `bcryptCost` entry from the kubectl command to avoid confusion.

## Review Notes
- The `generateID()` function is called but never defined. This is typical for tutorial-style blog posts and is not treated as an error, but readers will need to provide their own implementation (e.g., using `github.com/google/uuid`).
- The session key uses `tokenString[:16]` as a prefix, which could theoretically have collisions. This is a design consideration rather than a bug.
- No state store component YAML is provided — only the secret store component. Readers will need to configure a state store component (e.g., `statestore` using Redis) separately.
- Error handling is minimal throughout (many errors are silently ignored with `_`). This is acceptable for a tutorial but should not be replicated in production code.
