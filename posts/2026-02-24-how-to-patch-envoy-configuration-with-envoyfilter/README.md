# How to Patch Envoy Configuration with EnvoyFilter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Envoy, Patching, Kubernetes, Configuration

Description: Master the art of patching Envoy configuration through Istio EnvoyFilter including MERGE, REPLACE, ADD, and REMOVE operations with practical examples and debugging tips.

---

The most common use of EnvoyFilter in Istio is not adding new filters but patching existing configuration. You might need to change a timeout value that Istio does not expose, modify a cluster setting, adjust listener parameters, or tweak how Envoy handles specific traffic. Patching lets you modify the configuration that Istio generates without replacing it entirely.

## Patch Operations

EnvoyFilter supports several patch operations, and choosing the right one is critical:

**MERGE**: Deeply merges your patch with the existing configuration. Fields you specify override the existing values. Fields you do not specify remain unchanged. This is the safest operation for modifying existing resources.

**REPLACE**: Completely replaces the matched element with your patch. Everything that was there before is gone. Use with extreme caution.

**ADD**: Adds a new element to a list. Used for adding new filters, clusters, or listeners that do not exist yet.

**REMOVE**: Removes the matched element entirely.

**INSERT_BEFORE / INSERT_AFTER / INSERT_FIRST**: Inserts a new element relative to a matched element in a list. Primarily used for filter ordering.

## MERGE: The Workhorse Operation

MERGE is what you will use most often. It lets you change specific fields without affecting the rest of the configuration.

### Patching HTTP Connection Manager Settings

Change the idle timeout on the HTTP connection manager:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: hcm-idle-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            stream_idle_timeout: 300s
            request_timeout: 0s
```

The MERGE operation changes only `stream_idle_timeout` and `request_timeout`. All other HTTP connection manager settings (access logging, filters, codec settings, etc.) remain unchanged.

### Patching Cluster Settings

Modify upstream cluster configuration for a specific service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: cluster-settings
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: backend.default.svc.cluster.local
          portNumber: 8080
      patch:
        operation: MERGE
        value:
          connect_timeout: 5s
          per_connection_buffer_limit_bytes: 32768
          common_lb_config:
            healthy_panic_threshold:
              value: 0
```

This patches the cluster for `backend.default.svc.cluster.local:8080` to use a 5-second connection timeout, a 32KB per-connection buffer limit, and disables the panic threshold (which would normally route traffic to unhealthy hosts when too many hosts are ejected).

### Patching Listener Settings

Modify listener-level parameters:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: listener-settings
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 65536
          listener_filters_timeout: 5s
          continue_on_listener_filters_timeout: true
```

This increases the per-connection buffer limit to 64KB, sets a 5-second timeout for listener filters (including TLS handshake), and tells Envoy to continue processing even if listener filters time out.

## Patching Route Configuration

Modify route-level settings that Istio does not expose through VirtualService:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: route-settings
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: ROUTE_CONFIGURATION
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          max_direct_response_body_size_bytes: 8192
```

## Patching Virtual Host Settings

Modify virtual host configuration for specific routes:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: vhost-settings
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: VIRTUAL_HOST
      match:
        context: SIDECAR_INBOUND
        routeConfiguration:
          vhost:
            name: "inbound|http|8080"
      patch:
        operation: MERGE
        value:
          retry_policy:
            retry_on: "5xx,reset,connect-failure"
            num_retries: 3
            per_try_timeout: 2s
            retry_back_off:
              base_interval: 0.1s
              max_interval: 1s
```

## REPLACE Operation

REPLACE is more aggressive than MERGE. It completely replaces the matched element. Use it when you need to remove fields that MERGE cannot remove (since MERGE only adds or overrides fields).

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: replace-access-log
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            access_log:
              - name: envoy.access_loggers.file
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
                  path: /dev/stdout
                  log_format:
                    text_format_source:
                      inline_string: "[%START_TIME%] %REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %RESPONSE_CODE% %RESPONSE_FLAGS% %DURATION%ms\n"
```

Note: Even with MERGE, when you specify `access_log` as a list, it replaces the entire list because lists in protobuf are not deeply merged by field. This is a common gotcha.

## REMOVE Operation

Remove an element from the configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: remove-fault-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_INBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.fault
      patch:
        operation: REMOVE
```

This removes the fault injection filter from the HTTP filter chain. Use this if you want to ensure fault injection can never be applied to a specific service.

## Patching the Gateway

Patch the ingress gateway configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-connection-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: LISTENER
      match:
        context: GATEWAY
        listener:
          portNumber: 8443
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 131072
          connection_balance_config:
            exact_balance: {}
```

This sets a 128KB per-connection buffer and enables exact connection balancing on the gateway's HTTPS listener.

## Patching with Priority

When multiple EnvoyFilters modify the same resource, the order matters. Istio applies patches in this order:

1. EnvoyFilters in the `istio-system` namespace (sorted by creation time)
2. EnvoyFilters in the workload's namespace (sorted by creation time)
3. Within the same namespace, by `priority` field (lower numbers first)

Use the `priority` field to control ordering:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: base-settings
  namespace: default
spec:
  priority: 10
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: backend.default.svc.cluster.local
      patch:
        operation: MERGE
        value:
          connect_timeout: 10s
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: override-settings
  namespace: default
spec:
  priority: 20
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: backend.default.svc.cluster.local
      patch:
        operation: MERGE
        value:
          connect_timeout: 5s
```

The `override-settings` filter (priority 20) applies after `base-settings` (priority 10), so the final connect_timeout is 5s.

## Debugging Patches

### Verify the Patch Was Applied

Compare the configuration before and after:

```bash
# Dump the full config
istioctl proxy-config all deploy/my-app -n default -o json > /tmp/config-after.json

# Search for the specific value you patched
jq '.. | .connect_timeout? // empty' /tmp/config-after.json
```

### Check for Patch Errors

```bash
# Check istiod logs for EnvoyFilter errors
kubectl logs deploy/istiod -n istio-system | grep -i "envoyfilter\|patch"
```

### Use Proxy Config Diff

For targeted inspection:

```bash
# View cluster config for a specific service
istioctl proxy-config clusters deploy/my-app -n default --fqdn backend.default.svc.cluster.local -o json

# View listener config for a specific port
istioctl proxy-config listeners deploy/my-app -n default --port 8080 -o json
```

## Common Patching Gotchas

**List fields are replaced, not merged**: When you MERGE a field that contains a list (like `access_log` or `http_filters`), the entire list is replaced, not merged element by element.

**The @type field is required for typed_config**: Without it, Envoy does not know how to deserialize the configuration. Always include it.

**Match must be specific enough**: If your match is too broad, the patch applies to more listeners/clusters than intended. Always include port numbers and service names in your matches.

**MERGE does not remove fields**: If you need to remove a field, MERGE cannot do it (it can only add or override). Use REPLACE or REMOVE instead.

**Patches are fragile across upgrades**: Envoy configuration structure can change between versions. Always test patches after upgrading Istio.

## Summary

Patching Envoy configuration with EnvoyFilter is the most common way to customize Istio's proxy settings beyond what the standard APIs expose. Use MERGE for modifying existing values, REPLACE for completely rewriting an element, REMOVE for deleting elements, and ADD for inserting new ones. Always scope patches with workloadSelector and match conditions. Use priority to control ordering when multiple patches target the same resource. Verify patches with istioctl proxy-config and check istiod logs for errors. Remember that patches create a maintenance burden during upgrades, so document why each patch exists and check for standard API alternatives with each Istio release.
