# How to use Envoy dynamic configuration with xDS protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, xDS, Dynamic Configuration

Description: Learn how to implement dynamic configuration in Envoy using the xDS protocol for runtime updates without restarts.

---

The xDS (discovery service) protocol enables Envoy to receive configuration updates dynamically at runtime without restarts. This is essential for large-scale deployments where static configuration is impractical. xDS consists of multiple discovery services including LDS (Listener), RDS (Route), CDS (Cluster), EDS (Endpoint), and SDS (Secret) for different configuration types.

## Static vs Dynamic Configuration

Static configuration is loaded at startup from files. Dynamic configuration is fetched from a management server via xDS APIs. Most production deployments use a hybrid approach with some static bootstrap configuration and dynamic runtime configuration.

## Bootstrap Configuration

```yaml
node:
  cluster: my-cluster
  id: envoy-1

dynamic_resources:
  lds_config:
    resource_api_version: V3
    api_config_source:
      api_type: GRPC
      transport_api_version: V3
      grpc_services:
      - envoy_grpc:
          cluster_name: xds_cluster
  cds_config:
    resource_api_version: V3
    api_config_source:
      api_type: GRPC
      transport_api_version: V3
      grpc_services:
      - envoy_grpc:
          cluster_name: xds_cluster

static_resources:
  clusters:
  - name: xds_cluster
    connect_timeout: 1s
    type: STRICT_DNS
    http2_protocol_options: {}
    load_assignment:
      cluster_name: xds_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: control-plane.default.svc.cluster.local
                port_value: 18000

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

This configuration tells Envoy to fetch listeners and clusters from an xDS server.

## Listener Discovery Service (LDS)

LDS dynamically provides listener configurations. The control plane sends listener resources:

```go
package main

import (
    "context"

    core "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
    listener "github.com/envoyproxy/go-control-plane/envoy/config/listener/v3"
    hcm "github.com/envoyproxy/go-control-plane/envoy/extensions/filters/network/http_connection_manager/v3"
    "github.com/envoyproxy/go-control-plane/pkg/cache/types"
    "github.com/envoyproxy/go-control-plane/pkg/cache/v3"
)

func makeListener() *listener.Listener {
    return &listener.Listener{
        Name: "http_listener",
        Address: &core.Address{
            Address: &core.Address_SocketAddress{
                SocketAddress: &core.SocketAddress{
                    Address: "0.0.0.0",
                    PortValue: 8080,
                },
            },
        },
        FilterChains: []*listener.FilterChain{
            {
                Filters: []*listener.Filter{
                    {
                        Name: "envoy.filters.network.http_connection_manager",
                        ConfigType: &listener.Filter_TypedConfig{
                            TypedConfig: makeHttpConnectionManager(),
                        },
                    },
                },
            },
        },
    }
}
```

## Route Discovery Service (RDS)

RDS provides route configurations dynamically:

```go
func makeRoute() *route.RouteConfiguration {
    return &route.RouteConfiguration{
        Name: "local_route",
        VirtualHosts: []*route.VirtualHost{
            {
                Name: "backend",
                Domains: []string{"*"},
                Routes: []*route.Route{
                    {
                        Match: &route.RouteMatch{
                            PathSpecifier: &route.RouteMatch_Prefix{
                                Prefix: "/",
                            },
                        },
                        Action: &route.Route_Route{
                            Route: &route.RouteAction{
                                ClusterSpecifier: &route.RouteAction_Cluster{
                                    Cluster: "backend_service",
                                },
                            },
                        },
                    },
                },
            },
        },
    }
}
```

## Cluster Discovery Service (CDS)

CDS provides cluster configurations:

```go
func makeCluster() *cluster.Cluster {
    return &cluster.Cluster{
        Name: "backend_service",
        ConnectTimeout: durationpb.New(5 * time.Second),
        ClusterDiscoveryType: &cluster.Cluster_Type{
            Type: cluster.Cluster_EDS,
        },
        EdsClusterConfig: &cluster.Cluster_EdsClusterConfig{
            EdsConfig: &core.ConfigSource{
                ResourceApiVersion: core.ApiVersion_V3,
                ConfigSourceSpecifier: &core.ConfigSource_ApiConfigSource{
                    ApiConfigSource: &core.ApiConfigSource{
                        ApiType: core.ApiConfigSource_GRPC,
                        TransportApiVersion: core.ApiVersion_V3,
                        GrpcServices: []*core.GrpcService{
                            {
                                TargetSpecifier: &core.GrpcService_EnvoyGrpc_{
                                    EnvoyGrpc: &core.GrpcService_EnvoyGrpc{
                                        ClusterName: "xds_cluster",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        LbPolicy: cluster.Cluster_ROUND_ROBIN,
    }
}
```

## Endpoint Discovery Service (EDS)

EDS provides endpoint (backend host) information:

```go
func makeEndpoint() *endpoint.ClusterLoadAssignment {
    return &endpoint.ClusterLoadAssignment{
        ClusterName: "backend_service",
        Endpoints: []*endpoint.LocalityLbEndpoints{
            {
                LbEndpoints: []*endpoint.LbEndpoint{
                    {
                        HostIdentifier: &endpoint.LbEndpoint_Endpoint{
                            Endpoint: &endpoint.Endpoint{
                                Address: &core.Address{
                                    Address: &core.Address_SocketAddress{
                                        SocketAddress: &core.SocketAddress{
                                            Address: "10.0.0.1",
                                            PortValue: 8080,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        HostIdentifier: &endpoint.LbEndpoint_Endpoint{
                            Endpoint: &endpoint.Endpoint{
                                Address: &core.Address{
                                    Address: &core.Address_SocketAddress{
                                        SocketAddress: &core.SocketAddress{
                                            Address: "10.0.0.2",
                                            PortValue: 8080,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    }
}
```

## Secret Discovery Service (SDS)

SDS provides TLS certificates dynamically:

```yaml
transport_socket:
  name: envoy.transport_sockets.tls
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
    common_tls_context:
      tls_certificate_sds_secret_configs:
      - name: server_cert
        sds_config:
          resource_api_version: V3
          api_config_source:
            api_type: GRPC
            transport_api_version: V3
            grpc_services:
            - envoy_grpc:
                cluster_name: sds_cluster
```

## Aggregated Discovery Service (ADS)

ADS combines all xDS APIs into a single stream:

```yaml
dynamic_resources:
  ads_config:
    api_type: GRPC
    transport_api_version: V3
    grpc_services:
    - envoy_grpc:
        cluster_name: xds_cluster
  lds_config:
    ads: {}
  cds_config:
    ads: {}
```

## Configuration Version Control

Track configuration versions:

```bash
# Query current config version
curl http://localhost:9901/config_dump | jq '.configs[].version_info'

# Check dynamic listeners
curl http://localhost:9901/config_dump | jq '.configs[] | select(.["@type"] == "type.googleapis.com/envoy.admin.v3.ListenersConfigDump")'
```

## Incremental xDS

Use incremental xDS for efficient updates:

```yaml
ads_config:
  api_type: DELTA_GRPC
  transport_api_version: V3
  grpc_services:
  - envoy_grpc:
      cluster_name: xds_cluster
```

Delta xDS sends only changes, reducing bandwidth.

## Monitoring xDS

Track xDS health:

```promql
# Configuration updates
envoy_control_plane_connected_state

# Update successes
envoy_server_dynamic_unknown_update_success

# Update rejections
envoy_server_dynamic_unknown_update_rejected
```

## Best Practices

1. Use ADS for consistent configuration updates
2. Implement proper version control in your control plane
3. Monitor xDS connection health
4. Test configuration changes before wide rollout
5. Implement gradual rollout strategies
6. Use incremental xDS for large fleets
7. Keep bootstrap configuration minimal

## Conclusion

Dynamic configuration via xDS enables runtime updates without Envoy restarts, essential for large-scale deployments. Use LDS, RDS, CDS, and EDS to manage different configuration aspects independently, or combine them with ADS for atomic updates. Implement a robust control plane that tracks configuration versions and provides reliable xDS responses. Monitor xDS connection health and configuration update success to ensure your fleet stays synchronized.
