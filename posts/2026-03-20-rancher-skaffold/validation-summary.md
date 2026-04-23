# Validation Summary: How to Set Up Skaffold for Development on Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Skaffold
- Helm
- Docker / BuildKit
- Kaniko
- kubectl

## Sources Consulted
- Skaffold installation docs: https://skaffold.dev/docs/install/
- Skaffold pipeline/config docs: https://skaffold.dev/docs/design/config/
- Skaffold CLI reference: https://skaffold.dev/docs/references/cli/
- Skaffold Helm deployer docs: https://skaffold.dev/docs/deployers/helm/
- Skaffold templated fields docs: https://skaffold.dev/docs/environment/templating/
- Skaffold profiles docs: https://skaffold.dev/docs/environment/profiles/
- Skaffold local build docs: https://skaffold.dev/docs/builders/build-environments/local/
- Skaffold in-cluster build docs: https://skaffold.dev/docs/builders/build-environments/in-cluster/
- Skaffold Docker builder docs: https://skaffold.dev/docs/builders/builder-types/docker/
- Skaffold file sync docs: https://skaffold.dev/docs/filesync/
- Skaffold tagger docs: https://skaffold.dev/docs/taggers/
- Skaffold custom test docs: https://skaffold.dev/docs/testers/custom/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Rancher cluster access docs: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/manage-clusters/access-clusters

## Issues Found
- The base `skaffold.yaml` used `apiVersion: skaffold/v4beta11`. I updated it to `skaffold/v4beta13`, which the current Skaffold docs identify as the current API version.
- The Helm deployment example used `setValues` with `{{.IMAGE_TAG}}`. Current Skaffold Helm integration expects image substitutions through `setValueTemplates`, so I changed the snippet to use the documented `IMAGE_REPO_*`, `IMAGE_TAG_*`, and `IMAGE_DIGEST_*` variables with the sanitized artifact name.
- The `skaffold dev --default-repo registry.example.com` example conflicted with an already fully qualified image name and would trigger Skaffold image rewriting. I removed that flag from the command example.
- The staging profile tried to set `namespace: staging` under `setValues`, which would pass it as a Helm value instead of setting the Helm release namespace. I changed the staging profile to use Skaffold `patches` for the namespace and replica count override.
- The prerequisite list implied BuildKit could replace Docker for the local-build workflow. I corrected that wording and made the local builder settings explicitly use Docker CLI plus BuildKit.
- The `kubectl create secret docker-registry` example omitted `--docker-email`, which is still shown in the current generated kubectl reference synopsis. I added the flag.
- The explanation after `skaffold dev` incorrectly implied every file save always triggers a rebuild and redeploy. I corrected it to reflect Skaffold’s documented file-sync behavior.
- The Kaniko example used outdated or incorrect fields (`buildContext.localDir`, `pullSecretName` for a Docker registry secret, and `serviceAccountName`). I replaced it with the current documented pattern using the `kaniko` builder and `build.cluster.dockerConfig.path`.
- The caching example used an invalid git tagger variant (`AbbreviatedTags`) and an incorrect explanation of `ignoreChanges`. I updated it to the valid `AbbrevTreeSha` variant.
- The test example used `kubectl run --rm` without attaching to the container and did not force `pytest` to be the executed command. I fixed it with `--attach` and `--command -- pytest tests/`.
- Several later snippets were labeled as standalone `skaffold-*.yaml` files even though they were partial config fragments. I updated the comments to clarify that those snippets should be added to an existing Skaffold config.

## Review Notes
- Rancher does not require Rancher-specific Skaffold configuration beyond a working kubeconfig/context; once `kubectl` is configured for the cluster, the Skaffold workflow is the standard remote-cluster workflow.
- The current generated Kubernetes reference still documents `--docker-email` in `kubectl create secret docker-registry` as of March 22, 2026.
