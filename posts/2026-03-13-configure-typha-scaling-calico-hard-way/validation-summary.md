# Validation Summary: Configuring Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Calico Typha
- Calico FelixConfiguration
- Kubernetes Deployments and Services
- Kubernetes topology-aware routing
- Prometheus metrics
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Configuring Typha - https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico documentation: Configuring Felix - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Install Typha the hard way - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico documentation: Monitoring Typha with Prometheus - https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico v3.27.0 Typha configuration source - https://github.com/projectcalico/calico/blob/v3.27.0/typha/pkg/config/config_params.go
- Calico v3.27.0 Typha rebalancing source - https://github.com/projectcalico/calico/blob/v3.27.0/typha/pkg/k8s/rebalance.go
- Kubernetes documentation: Topology Aware Routing - https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/

## Issues Found
- The post said Typha is configured entirely through environment variables and has no configuration file. Calico documents both environment variables and a Typha configuration file, with environment variables taking precedence. Updated the wording to describe environment variables as the common manifest-mode approach while acknowledging the config file.
- The post described `TYPHA_MAXCONNECTIONSLOWERLIMIT` as the maximum number of Felix clients and said the default limit is unlimited. In Calico v3.27, Typha has `TYPHA_MAXCONNECTIONSUPPERLIMIT` and `TYPHA_MAXCONNECTIONSLOWERLIMIT`; the upper limit is the ceiling, and the lower limit is the floor used by Kubernetes connection rebalancing. Updated the explanation, YAML, and best practice.
- The YAML used `TYPHA_CLIENTTIMEOUT`, which is not a valid Typha v3.27 configuration parameter. Replaced it with `TYPHA_SERVERMAXFALLBEHINDSECS`, which controls when Typha disconnects a client that falls too far behind the current datastore state.
- The timeout example used a duration suffix for a Typha environment variable. Typha's seconds parser expects a numeric seconds value, so the value was changed from `90s` to `90`.
- The Typha Deployment example did not set `hostNetwork: true`, while the official hard-way Typha deployment uses host networking so Typha can start before pod networking is available and so localhost health checks work as expected. Added `hostNetwork: true`.
- The Felix `typhaReadTimeout` and `typhaWriteTimeout` comments incorrectly described connection retry and keepalive behavior. Updated them to match the Felix configuration reference: read timeout when reading from Typha, and write timeout when writing to Typha.
- The topology-aware routing section implied same-zone routing was guaranteed. Kubernetes documents this as a hint-based mechanism that works only when there are enough endpoints per zone. Updated the wording and annotation comment to reflect that behavior.

## Review Notes
- The post uses `calico/typha:v3.27.0`; the checked v3.27 source shows Typha's Prometheus metrics port default as `9093`, while current latest documentation may show a different default for newer Calico releases. The explicit `TYPHA_PROMETHEUSMETRICSPORT=9093` value is valid for the version used in the example.
- The Deployment remains a focused configuration example. Real hard-way deployments that use Typha mTLS must retain the TLS environment variables, volumes, and RBAC from the setup manifest.
