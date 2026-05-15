# Validation Summary: How to Use Talos Linux with DigitalOcean Managed Load Balancers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- DigitalOcean Droplets and custom images
- DigitalOcean Managed Load Balancers
- DigitalOcean Cloud Controller Manager
- Kubernetes Services of type LoadBalancer
- doctl
- kubectl

## Sources Consulted
- DigitalOcean Kubernetes load balancer annotation documentation: https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/
- DigitalOcean Cloud Controller Manager repository and release manifests: https://github.com/digitalocean/digitalocean-cloud-controller-manager
- DigitalOcean Cloud Controller Manager service annotations: https://raw.githubusercontent.com/digitalocean/digitalocean-cloud-controller-manager/master/docs/controllers/services/annotations.md
- DigitalOcean doctl custom image command reference: https://docs.digitalocean.com/reference/doctl/reference/compute/image/create/
- DigitalOcean doctl Droplet create command reference: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- DigitalOcean doctl certificate create command reference: https://docs.digitalocean.com/reference/doctl/reference/compute/certificate/create/
- DigitalOcean doctl load balancer list/get command references: https://docs.digitalocean.com/reference/doctl/reference/compute/load-balancer/list/ and https://docs.digitalocean.com/reference/doctl/reference/compute/load-balancer/get/
- Talos DigitalOcean installation documentation: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/cloud-platforms/digitalocean
- Talos platform configuration documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/talos-platform-configuration
- Talos CLI reference for `talosctl gen config`: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos MachineConfig reference for `externalCloudProvider`: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config

## Issues Found
- The DigitalOcean Cloud Controller Manager manifest URL used `releases/v0.1.47/manifest.yaml`, which does not exist in the upstream repository. Changed it to the current release manifest path, `releases/digitalocean-cloud-controller-manager/v0.1.67.yml`.
- The custom health check annotations were shown without `service.beta.kubernetes.io/do-loadbalancer-override-health-check`. Added the override annotation because DigitalOcean CCM ignores explicit health check path/protocol overrides unless that annotation is set.
- The TLS termination example used `do-loadbalancer-protocol: "https"` for the whole service while also exposing HTTP and enabling HTTP-to-HTTPS redirect. Changed it to DigitalOcean's documented pattern: default protocol `http`, `do-loadbalancer-tls-ports: "443"`, certificate ID, and redirect.
- The custom certificate upload command omitted `--type custom`. Added it to match current `doctl compute certificate create` documentation.
- The sticky sessions snippet omitted requirements documented by the CCM: sticky sessions need HTTP forwarding and should use `externalTrafficPolicy: Local`. Added the HTTP protocol annotation and `externalTrafficPolicy: Local`.
- The load balancer sizing section used the deprecated `do-loadbalancer-size-slug` annotation and size names. Replaced it with `do-loadbalancer-size-unit` and explained that the old size slugs are deprecated.
- The post claimed DigitalOcean does not support internal VPC-only load balancers. Updated the section to use `service.beta.kubernetes.io/do-loadbalancer-network: "INTERNAL"`, which is supported by the current DigitalOcean CCM/load balancer documentation.

## Review Notes
The Talos image example pins Talos v1.7.0, which is old but the referenced release asset still exists. A future update should consider moving the image workflow to Talos Image Factory and a currently supported Talos release.
