# Validation Summary: Multi-Cluster Helm Deployments: Strategies and Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm
- Kubernetes
- Argo CD ApplicationSets
- Rancher Fleet
- Helmfile
- GitHub Actions
- GitLab CI/CD
- External Secrets Operator
- Bitnami Sealed Secrets / kubeseal
- Prometheus federation

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Matrix Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet Git Generator: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Templates and Go Template docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Helm install and upgrade command docs: https://helm.sh/docs/helm/helm_install/ and https://helm.sh/docs/helm/helm_upgrade/
- Rancher Fleet Git repository content docs: https://fleet.rancher.io/0.15/explanations/gitrepo-content
- SUSE/Rancher Fleet fleet.yaml reference: https://documentation.suse.com/cloudnative/continuous-delivery/next/en/reference/ref-fleet-yaml.html
- Helmfile configuration reference: https://helmfile.readthedocs.io/en/latest/configuration/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitLab CI script syntax docs: https://docs.gitlab.com/ci/yaml/script/
- External Secrets Operator latest API and getting started docs: https://external-secrets.io/latest/api/spec/ and https://external-secrets.io/latest/introduction/getting-started/
- Bitnami Sealed Secrets README: https://github.com/bitnami-labs/sealed-secrets
- Prometheus federation docs: https://prometheus.io/docs/prometheus/latest/federation/

## Issues Found
- The Argo CD ApplicationSet examples used legacy fasttemplate-style placeholders such as `{{name}}`, `{{server}}`, and `{{path.basename}}`. Updated both examples to enable `goTemplate`, added the recommended `goTemplateOptions: ["missingkey=error"]`, and changed placeholders to Go-template syntax such as `{{.nameNormalized}}`, `{{.server}}`, and `{{.path.basename}}`.
- The ApplicationSet examples used raw cluster names in generated Kubernetes resource names. Updated them to use `nameNormalized`, matching Argo CD guidance for names that may contain characters invalid in Kubernetes resource names.
- The ExternalSecret example used `external-secrets.io/v1beta1`. Updated it to the current `external-secrets.io/v1` API version shown in the latest External Secrets Operator documentation.
- The Sealed Secrets loop exported the controller key Secret YAML and passed it to `kubeseal --cert`. That is incorrect and risks handling private key material; `--cert` expects a public certificate file or URL. Updated the workflow to fetch each cluster's public certificate with `kubeseal --fetch-cert` and then seal with `--cert=${cluster}-sealed-secrets-cert.pem`.
- The Sealed Secrets example used a non-default controller name. Updated the example to `sealed-secrets-controller`, matching the default controller name in Bitnami Sealed Secrets documentation.

## Review Notes
- The GitLab CI `KUBECONFIG` example is valid when the referenced CI/CD variables are GitLab file-type variables or otherwise resolve to kubeconfig file paths. If the variables store base64-encoded kubeconfig contents instead, the job would need an explicit decode step similar to the GitHub Actions example.
- The ApplicationSet examples now intentionally fail on missing labels because `missingkey=error` is enabled. Production clusters selected by these examples should include the referenced `env` and `region` labels.
