# Validation Summary: How to Use Helm Post Renderers with Kustomize

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm post-renderers
- Kustomize
- Kubernetes manifests, NetworkPolicy, PodDisruptionBudget, and topology spread constraints
- Argo CD Applications and ApplicationSets
- GitHub Actions CI/CD
- Bash scripting

## Sources Consulted
- Helm Advanced Techniques: Post Rendering: https://helm.sh/docs/topics/advanced/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm template command reference: https://helm.sh/docs/helm/helm_template/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Pod topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/multiple_sources/
- Azure setup-helm GitHub Action: https://github.com/Azure/setup-helm
- Azure k8s-set-context GitHub Action: https://github.com/Azure/k8s-set-context
- imranismail/setup-kustomize GitHub Action: https://github.com/imranismail/setup-kustomize

## Issues Found
- The basic post-renderer script wrote fixed filenames under `/tmp`, which could collide across concurrent runs. Updated it to use `mktemp -d`, clean up with `trap`, and pass the temporary directory to `kustomize build`.
- The `helm template ... | kustomize build -` example was not a valid Kustomize workflow because Kustomize builds from a kustomization directory rather than treating arbitrary Helm manifest YAML on stdin as a resource. Replaced it with a temporary kustomization directory that includes the Helm output as a resource.
- The direct `helm install --post-renderer kustomize --post-renderer-args "--enable-helm"` example was incorrect because Helm post-renderers must be executables that accept rendered manifests on stdin and write valid manifests to stdout. Replaced it with the executable script usage.
- The flexible post-renderer script appended a second `resources:` key to existing kustomization files, which can produce invalid or ambiguous YAML. Updated it to use `kustomize edit add resource helm-output.yaml`.
- The development overlay comment said it inherited from base even though the example did not reference the base. Changed the comment to describe the actual behavior.
- The production overlay listed new PodDisruptionBudget and NetworkPolicy objects under `patches`. Kustomize patches modify existing resources; new objects belong under `resources`. Moved them to `resources`.
- The production image transformer used both `newTag` and a placeholder digest. Removed the invalid placeholder digest from the example.
- The NetworkPolicy namespace selectors used a non-standard `name` label. Changed them to the standard namespace label `kubernetes.io/metadata.name`.
- The Argo CD Application and ApplicationSet snippets combined Helm and Kustomize fields as if Kustomize were a Helm post-renderer in native Argo CD. Updated them to supported Kustomize source examples and added required `project` and `destination` fields.
- The GitHub Actions examples used older action major versions. Updated Helm, Kustomize, and Kubernetes context setup actions to current documented versions.
- The troubleshooting Kustomize commands tried to build an overlay without adding the Helm-rendered manifest as a resource. Updated them to mirror the temporary-directory post-render flow.

## Review Notes
The post is technically relevant and valid after correction. Argo CD's native Helm source still does not expose Helm CLI post-renderer usage directly; teams that need true Helm post-rendering in Argo CD should use a supported config management plugin or render Helm through Kustomize with `--enable-helm` configured as described in the Argo CD documentation.
