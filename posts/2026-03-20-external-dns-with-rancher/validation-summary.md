# Validation Summary: How to Set Up External DNS with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- ExternalDNS
- Kubernetes Ingress
- Kubernetes Services
- Helm
- AWS Route 53
- Cloudflare
- `kubectl`
- AWS CLI

## Sources Consulted
- ExternalDNS Helm chart README: https://github.com/kubernetes-sigs/external-dns/blob/master/charts/external-dns/README.md
- ExternalDNS Helm chart values: https://github.com/kubernetes-sigs/external-dns/blob/master/charts/external-dns/values.yaml
- ExternalDNS AWS tutorial: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md
- ExternalDNS Cloudflare tutorial: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/cloudflare.md
- ExternalDNS flags reference: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/flags.md
- ExternalDNS annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS ingress source docs: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/ingress/
- ExternalDNS service source docs: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/service/
- ExternalDNS TTL docs: https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/ttl/
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic
- AWS CLI `route53 list-resource-record-sets` reference: https://docs.aws.amazon.com/cli/latest/reference/route53/list-resource-record-sets.html

## Issues Found
- The post created the `route53-credentials` Secret in the `external-dns` namespace before creating that namespace. I moved `kubectl create namespace external-dns` ahead of the Secret command so the sequence works as written.
- The Helm values file used the deprecated top-level `provider: aws` form and unsupported current-chart keys under `aws:`. I updated the example to use `provider.name`, `AWS_DEFAULT_REGION`, and `extraArgs.aws-zone-type`, which match the maintained chart and provider docs.
- The verification command grepped for lowercase `desired change`, but ExternalDNS log examples use `Desired change`. I changed the command to `grep -i "desired change"` so it matches current output reliably.
- The Cloudflare example used unsupported current-chart keys (`cloudflare.apiToken` and `cloudflare.proxied`). I updated it to the supported Helm pattern using `provider.name`, `CF_API_TOKEN`, and `extraArgs.cloudflare-proxied`.

## Review Notes
- The post is technically salvageable and remains relevant after the corrections above.
- The guide uses static AWS credentials for Route 53. That works, but the ExternalDNS AWS tutorial recommends IAM roles for service accounts when the cluster runs on AWS.
