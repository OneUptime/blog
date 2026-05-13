# Validation Summary: How to Configure NATS Accounts with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NATS
- NATS accounts
- NATS Helm chart
- Kubernetes Secrets
- Kubernetes Deployments
- Flux CD HelmRelease
- Flux CD Kustomization
- Sealed Secrets

## Sources Consulted
- NATS account configuration and import/export documentation: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/accounts
- NATS server configuration and JetStream account settings: https://docs.nats.io/running-a-nats-service/configuration
- NATS resolver documentation: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt/resolver
- nsc generate config reference: https://nats-io.github.io/nsc/nsc_generate_config.html
- Official NATS Kubernetes and Helm chart documentation: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- Official NATS Helm chart README and values for chart 1.2.4: https://github.com/nats-io/k8s/tree/main/helm/charts/nats and https://raw.githubusercontent.com/nats-io/k8s/nats-1.2.4/helm/charts/nats/README.md
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes Deployment documentation: https://v1-33.docs.kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post claimed to demonstrate resolver-based JWT account configuration, but the HelmRelease example used static account definitions. I changed the introduction, prerequisites, architecture diagram, credential generation, and NATS configuration wording to consistently describe static account configuration.
- The original `nsc` commands generated JWT credentials and a resolver config that were not used by the HelmRelease. I replaced them with password generation and Kubernetes Secret examples that match the static account configuration.
- The NATS Helm chart values used `extraEnvs`, which is not the chart 1.2.4 value shape. I changed this to `container.env`, matching the official chart values.
- NATS config variables in Helm values need to use the chart's `<< $VAR >>` templating form for NATS config variables. I updated the password references accordingly.
- The NATS export syntax was incorrect for static account config. I changed stream exports to scalar subjects and ensured every import has a corresponding export.
- The `system_account: SYS` setting referenced an account that did not exist. I added a `SYS` account and matching password Secret key.
- The application Deployment referenced a Secret in the wrong namespace and was missing required `apps/v1` Deployment fields. I changed it to use an application-namespace Secret and added a selector, matching template labels, and a container image.
- The verification section expected a permissions violation from account isolation, but accounts have separate subject namespaces and the configured import explicitly allows `orders.>`. I changed the verification comments to describe successful import behavior and non-exported subject isolation.
- The password rotation best practice implied that changing a Secret and reloading NATS was enough. Because the example injects passwords via environment variables, I updated it to require restarting or reconciling the NATS pods so env vars refresh.
- The conclusion overstated account isolation as preventing subscriptions to subjects by name. I revised it to say accounts prevent receiving messages from other account namespaces unless imports and exports allow it.

## Review Notes
The post is now technically coherent as a static account configuration tutorial. A future version could add a separate JWT resolver tutorial using `nsc generate config --nats-resolver` and the chart's `config.resolver` / `resolver_preload` support, but that would be a different implementation path.
