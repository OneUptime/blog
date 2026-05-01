# Validation Summary: How to Use Ephemeral Values in Provisioners in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu ephemerality (`ephemeral` resources, ephemeral locals, provisioners, `connection` blocks)
- HCL configuration language
- AWS provider (`aws_secretsmanager_secret_version`, `aws_eks_cluster_auth`, `aws_db_instance`, `aws_eks_cluster`, `aws_instance`)
- Vault provider (`vault_kv_secret_v2`)
- CLI tooling used from provisioners (`curl`, `psql`, `kubectl`, `docker`)

## Sources Consulted
- [OpenTofu ephemerality documentation](https://opentofu.org/docs/language/ephemerality/)
- [OpenTofu ephemeral resources documentation](https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/)
- [OpenTofu local values documentation](https://opentofu.org/docs/language/values/locals/)
- [OpenTofu provisioner connection settings](https://opentofu.org/docs/language/resources/provisioners/connection/)
- [OpenTofu local-exec provisioner documentation](https://opentofu.org/docs/v1.8/language/resources/provisioners/local-exec/)
- [AWS provider docs for `aws_secretsmanager_secret_version` ephemeral resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/secretsmanager_secret_version)
- Official AWS provider source doc consulted for the same resource: [raw doc file](https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/ephemeral-resources/secretsmanager_secret_version.html.markdown)
- [AWS provider docs for `aws_eks_cluster_auth` ephemeral resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/eks_cluster_auth)
- Official AWS provider source doc consulted for the same resource: [raw doc file](https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/ephemeral-resources/eks_cluster_auth.html.markdown)
- [Vault provider docs for `vault_kv_secret_v2` ephemeral resource](https://registry.terraform.io/providers/hashicorp/vault/latest/docs/ephemeral-resources/kv_secret_v2)
- Official Vault provider source doc consulted for the same resource: [raw doc file](https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/ephemeral-resources/kv_secret_v2.html.md)
- [AWS provider docs for `aws_db_instance`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)
- [AWS provider docs for `aws_eks_cluster`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster)
- [AWS provider docs for `aws_instance`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance)

## Issues Found
1. **Missing version/support constraint in the introduction**: The post did not mention that ephemeral resources are available in OpenTofu v1.11+ and require provider support. Updated the introduction to state both conditions so the scope matches the official docs.
2. **Invalid ephemeral local syntax**: The post used `ephemeral db_config = ...`, `ephemeral deploy_creds = ...`, and `ephemeral app_secrets = ...` inside `locals`, plus references such as `local.ephemeral.db_config`. OpenTofu locals become ephemeral automatically when their expressions depend on ephemeral values, and they are referenced as `local.<name>`. Fixed all three examples accordingly.
3. **Kubernetes example was incomplete for EKS TLS**: The `kubectl` example passed only `--server` and `--token`. EKS clients also need the cluster CA material unless they intentionally skip TLS verification. Fixed the example by passing `certificate_authority[0].data` into a temporary kubeconfig and using `kubectl --kubeconfig=...`.
4. **Resource-level `connection` block weakened the example's logging guarantees**: OpenTofu's docs warn that suppression checks are not performed on connection blocks inherited from a resource. Moved the SSH `connection` block into the `remote-exec` provisioner so the ephemeral private key is configured directly in the provisioner context.
5. **Invalid use of an ephemeral value in `triggers_replace`**: The post attempted to hash an ephemeral secret inside `triggers_replace`. Ephemeral values are only allowed in specific ephemeral contexts, and a managed resource argument like `triggers_replace` is not one of them. Replaced that trigger with a non-secret file hash for the script being executed and added a short inline comment explaining why.
6. **Incorrect conclusion wording**: The conclusion referred to `local.ephemeral` locals, which is not valid OpenTofu syntax. Updated it to refer to ordinary `locals`.

## Review Notes
- The AWS and Vault examples rely on provider versions that actually implement these ephemeral resource types. The resource names used in the post were confirmed in the current official provider docs, but readers should still pin compatible provider versions in real configurations.
- The "Basic Ephemeral Value in local-exec Provisioner" example is valid, but it still embeds the secret directly into the spawned shell command. The later recommendation to prefer environment variables is the safer pattern and should be favored in practice.
- The provisioner usage itself is technically valid, but OpenTofu continues to recommend provisioners only as a last resort.
