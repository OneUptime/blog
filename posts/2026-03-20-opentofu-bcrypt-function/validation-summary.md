# Validation Summary: How to Use the bcrypt Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide for an OpenTofu built-in function.

## Technologies Covered
- OpenTofu (built-in `bcrypt` function, `tofu console`, locals, lifecycle)
- HCL syntax
- Terraform `random_password` resource
- AWS provider (`aws_instance`, `aws_ssm_parameter`)
- Kubernetes provider (`kubernetes_secret`)
- cloud-init user-data
- bcrypt password hashing algorithm
- htpasswd basic-auth format

## Sources Consulted
- OpenTofu `bcrypt` function docs: https://opentofu.org/docs/language/functions/bcrypt/
- Terraform `bcrypt` function docs (semantically identical): https://developer.hashicorp.com/terraform/language/functions/bcrypt
- Go `golang.org/x/crypto/bcrypt` (underlying implementation, MinCost=4, MaxCost=31, DefaultCost=10)
- nginx bcrypt support discussion: https://github.com/nginx/nginx/issues/1154
- ingress-nginx bcrypt issue: https://github.com/kubernetes/ingress-nginx/issues/3150
- Ubuntu `crypt(5)` manpage (bcrypt `$2a$` accepted in /etc/shadow): https://manpages.ubuntu.com/manpages/focal/en/man5/crypt.5.html

## Issues Found
- **"Handling Plan Diffs" section contained an incorrect workaround.** The original example wrapped `random_password.app_password.result` in `bcrypt()` and claimed this would "ensure hash is only computed once." This is wrong: `bcrypt()` is a function (not a resource), so it has no state, and it generates a fresh random salt on every invocation regardless of whether the input is stable. The OpenTofu/Terraform docs explicitly warn that "each call to this function will return a different value, even if the given string and cost are the same." I rewrote the section to (a) correct the explanation and (b) demonstrate the practical fix: apply `lifecycle { ignore_changes = [data] }` on the consuming resource so the hash is only set on first apply.

## Review Notes
- The function signature (`bcrypt(string, cost)`), default cost of 10, and cost range 4-31 are all accurate per the underlying `golang.org/x/crypto/bcrypt` library.
- The `$2a$` hash prefix is currently produced, but the OpenTofu docs note the prefix may change in future versions. Not flagged as an issue since this is implementation-detail accurate today.
- The "HTPasswd for Basic Auth" example is technically valid: bcrypt-format htpasswd entries work with Apache and with the Kubernetes ingress-nginx controller (which supports bcrypt via its lua auth handling). Note that vanilla nginx's built-in `ngx_http_auth_basic_module` historically does not reliably support bcrypt - readers using this pattern outside ingress-nginx should verify their nginx build/config supports it.
- The cloud-init shadow-file example works on modern Ubuntu (libxcrypt accepts `$2a$`). On older RHEL (<8.10) bcrypt was not supported in `/etc/shadow`; readers on those distros may need a different hashing scheme.
- Step 4 in "Step-by-Step Usage" already correctly mentions `ignore_changes` as the mitigation, so the post is now internally consistent after the fix.
