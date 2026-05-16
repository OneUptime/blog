# Validation Summary: How to Set Up Global Server Load Balancing for Talos

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Global Server Load Balancing (GSLB)
- DNS-based traffic steering
- AWS Route 53
- Cloudflare Load Balancing
- k8gb
- Helm
- NGINX
- PostgreSQL streaming replication configuration

## Sources Consulted
- AWS Route 53 API Reference: ResourceRecordSet, geolocation routing, latency routing, health check behavior: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- AWS Route 53 Developer Guide: geolocation record values and default records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-geo.html
- Cloudflare Load Balancers API reference: pools, geo steering, country pools, PoP pools, session affinity: https://developers.cloudflare.com/api/resources/load_balancers/
- Cloudflare Load Balancing geo steering documentation: https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/steering-policies/geo-steering/
- k8gb current documentation: getting started, resource references, Cloudflare deployment, multi-zone setup, strategies: https://www.k8gb.io/latest/intro/ and https://www.k8gb.io/latest/resource_ref/
- k8gb Helm chart values: https://raw.githubusercontent.com/k8gb-io/k8gb/master/chart/k8gb/values.yaml
- k8gb v0.19.0 API reference for `k8gb.io/v1beta1`: https://pkg.go.dev/github.com/k8gb-io/k8gb@v0.19.0/api/v1beta1io
- Kubernetes Ingress v1 concepts and API shape: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service concepts and LoadBalancer service type: https://kubernetes.io/docs/concepts/services-networking/service/
- PostgreSQL runtime configuration for replication settings: https://www.postgresql.org/docs/current/runtime-config-replication.html

## Issues Found
- The Route 53 health check examples used HTTPS on port 443, but the health endpoint deployed later in the post is an NGINX service listening on HTTP port 80. I changed the Route 53 health checks to `Type: "HTTP"` and `Port: 80`, and updated the monitoring script to probe `http://$IP/healthz`.
- The Cloudflare load balancer example used `pop_pools`, which Cloudflare documents as an Enterprise-only PoP mapping. I changed it to `country_pools` with country codes so the example matches general geo steering behavior.
- The k8gb Helm values used the older `dnsZone` and `edgeDNSZone` fields. Current k8gb docs recommend the `dnsZones` array with `parentZone` and `loadBalancedZone`, so I updated the Helm command.
- The k8gb Gslb example used the legacy `k8gb.absa.oss/v1beta1` API and embedded Ingress declaration. I updated it to the current `k8gb.io/v1beta1` API and a referenced Kubernetes `networking.k8s.io/v1` Ingress via `resourceRef`.
- The k8gb example included `splitBrainThresholdSeconds`, which the current k8gb API marks as deprecated and unused. I removed it.
- The GSLB testing section suggested using public resolvers like `8.8.8.8` and `1.1.1.1` to simulate geolocation. That is not reliable for geo routing because location can depend on resolver/client location and EDNS client subnet behavior. I changed the example to use clients or resolvers in the target regions.

## Review Notes
- AWS CLI and Helm were not installed in the local environment, so those examples were verified against official API and chart documentation rather than local `--help` output.
- The Kubernetes manifests are structurally consistent, but they assume the `monitoring` and `production` namespaces and the referenced application Service already exist.
- DNS-based GSLB behavior is affected by resolver caching, TTLs, EDNS client subnet support, and provider-specific failover semantics, so real-world failover timing can differ from the short examples.
