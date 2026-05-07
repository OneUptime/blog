# Validation Summary: How to Configure External DNS with Rancher

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Rancher
- Kubernetes
- ExternalDNS
- Helm
- AWS Route 53
- Cloudflare
- Google Cloud DNS
- Kubernetes Services
- Kubernetes Ingress

## Sources Consulted
- ExternalDNS Helm chart docs: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- ExternalDNS GKE / Google Cloud DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- ExternalDNS annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS TTL docs: https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/ttl/
- ExternalDNS service source docs: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/service/
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Helm upgrade reference: https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The Helm values used deprecated or ignored provider settings (`provider: aws`, `provider: cloudflare`, `provider: google`, plus nested `aws`, `cloudflare`, and `google` blocks that the current chart does not consume). I updated the examples to use `provider.name`, `env`, and `extraArgs`/volume settings supported by the current chart.
- The AWS static-credentials example created a secret that ExternalDNS would not automatically read. I replaced it with the documented credentials-file secret pattern and added the required `AWS_SHARED_CREDENTIALS_FILE`, `extraVolumes`, and `extraVolumeMounts` settings.
- The Google Cloud DNS example created a secret but did not mount it into the pod, set `GOOGLE_APPLICATION_CREDENTIALS`, or pass `--google-project`. I added those settings and the missing Helm install command so the example is complete.
- The Ingress TTL example used only the `ttl` annotation. ExternalDNS documents that TTL annotations require the hostname annotation on the resource, so I added `external-dns.alpha.kubernetes.io/hostname: app.example.com`.
- The service and ingress explanations claimed ExternalDNS always creates A records. I adjusted the wording to reflect that, depending on provider and load balancer or ingress target, ExternalDNS may create A/AAAA, CNAME, or provider-specific alias records.
- The policy change example could drop release values during `helm upgrade`. I added `--reuse-values` so the provider configuration is preserved while switching to `upsert-only`.

## Review Notes
- The post is Rancher-themed, but the ExternalDNS setup itself is provider-specific and Kubernetes-specific; Rancher mainly acts as the cluster management layer.
- The prerequisite line mentions Rancher `v2.6 or later`, which is an older minimum-version reference. It does not change the ExternalDNS mechanics described here, but readers should still use a currently supported Rancher release.
