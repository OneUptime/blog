# Validation Summary: How to Set Up Geographic Traffic Routing with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic management
- Istio Gateway, VirtualService, and DestinationRule resources
- Istio locality load balancing and failover
- Kubernetes Services
- ExternalDNS
- AWS Route 53 geolocation routing
- Prometheus / Grafana metrics
- DNS and curl-based testing

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio locality load balancing failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- AWS Route 53 geolocation routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geo.html
- AWS CLI change-resource-record-sets reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/

## Issues Found
- Istio examples used `networking.istio.io/v1beta1`. Updated Gateway, VirtualService, and DestinationRule examples to `networking.istio.io/v1`, matching current Istio documentation.
- The Route 53 alias examples pointed `AliasTarget.DNSName` at regional vanity hostnames and used placeholder hosted zone IDs in a way that could be mistaken for the hosted zone containing `api.myapp.com`. Updated the examples to use regional load balancer DNS names and explicit load balancer canonical hosted zone ID placeholders.
- The ExternalDNS example included `set-identifier` but no Route 53 geolocation policy annotation. Added `external-dns.alpha.kubernetes.io/aws-geolocation-continent-code: "NA"` so the example actually creates a geolocation routing policy.
- The Region-Specific Routing example routed to subsets named `eu` and `default`, but no DestinationRule subsets were defined. Added subset definitions to the `user-service` DestinationRule.
- The text said Istio headers tag requests based on the DNS record used. Adjusted this to say the regional ingress gateway or front proxy sets the header from its own regional configuration.
- The monitoring query grouped ingress traffic by namespace while describing regional traffic. Updated the Prometheus examples to group by `source_cluster` and `destination_cluster`, which are standard Istio metric labels for multi-cluster deployments.
- The DNS testing example implied that querying `8.8.8.8` tests another geographic region. Replaced it with testing from a VM or shell running in the target region.
- The HTTPS curl examples set only the `Host` header while connecting to regional ingress hostnames, which can break TLS SNI and certificate validation. Replaced them with `curl --connect-to` so the request preserves both the `Host` header and SNI for `api.myapp.com`.

## Review Notes
- Route 53 geolocation routes based on the location of DNS queries, with EDNS client subnet support where available; it is not always identical to the user's physical location.
- Istio locality failover requires healthy endpoint detection, so the examples correctly include outlier detection.
- Route 53 geolocation deployments should normally include a default record for unmapped client locations.
