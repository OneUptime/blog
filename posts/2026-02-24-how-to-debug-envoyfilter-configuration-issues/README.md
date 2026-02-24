# How to Debug EnvoyFilter Configuration Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Debugging, Envoy, Kubernetes, Troubleshooting

Description: Practical techniques and tools for diagnosing and fixing EnvoyFilter configuration problems in Istio service mesh deployments.

---

EnvoyFilter is arguably the most powerful resource in Istio's API, but it's also the most frustrating to debug. When something goes wrong, you often get zero feedback. Your filter just silently doesn't apply, or worse, it applies partially and causes weird behavior. After spending many hours debugging these things, here are the techniques that actually work.

## Start with the Config Dump

The single most useful debugging tool is the Envoy config dump. This shows you the actual configuration that's running inside the proxy, after all patches have been applied:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET config_dump > config_dump.json
```

This file is usually massive (tens of thousands of lines), so you'll want to filter it. To look at just the listeners:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET config_dump?resource=dynamic_listeners
```

For clusters:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET config_dump?resource=dynamic_active_clusters
```

For route configurations:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET config_dump?resource=dynamic_route_configs
```

## Check if Your Filter Was Applied

The most common problem is that your EnvoyFilter simply isn't being applied. To check, look for your filter name in the config dump:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET config_dump | grep "my-filter-name"
```

If your filter doesn't show up at all, the likely causes are:

1. **Wrong namespace**: EnvoyFilters in `istio-system` apply to all workloads. EnvoyFilters in other namespaces only apply to workloads in that namespace.

2. **Wrong workloadSelector**: If you specified a `workloadSelector`, make sure the labels actually match the target pod. Check with:

```bash
kubectl get pods -l app=my-app -o jsonpath='{.items[0].metadata.labels}' | python3 -m json.tool
```

3. **Wrong match criteria**: The `match` section in your configPatches is extremely specific. If even one field doesn't match the existing configuration, the patch won't apply.

## Use istioctl analyze

Before digging into config dumps, run the analyzer:

```bash
istioctl analyze -n default
```

This catches common configuration errors, including some EnvoyFilter issues. It won't catch everything, but it's a good first step.

## Check Pilot Logs

Istiod (the control plane) is responsible for compiling EnvoyFilters into the final proxy configuration. If there's an issue with your filter, Pilot might log a warning:

```bash
kubectl logs -n istio-system deploy/istiod | grep -i "envoyfilter\|error\|warn" | tail -20
```

## Use the Proxy Status Command

This shows whether the proxy is in sync with the control plane:

```bash
istioctl proxy-status
```

If your proxy shows as `STALE`, it means it hasn't received the latest configuration yet. This can happen if the control plane is overloaded or if there's a connectivity issue between the proxy and Pilot.

For more detail on a specific proxy:

```bash
istioctl proxy-config all deploy/my-app -o json > proxy_config.json
```

## Debugging Match Criteria

The most subtle issues come from incorrect match criteria. Here's a checklist of things to verify:

### Context
Make sure `context` matches your scenario:
- `SIDECAR_INBOUND` - for traffic coming INTO the pod
- `SIDECAR_OUTBOUND` - for traffic going OUT of the pod
- `GATEWAY` - for traffic through an ingress/egress gateway
- `ANY` - matches all contexts

### Listener Match
If you're matching on a listener, check the actual listener names and ports:

```bash
istioctl proxy-config listener deploy/my-app
```

### Route Configuration Match
Route names can be tricky. Check the actual route config names:

```bash
istioctl proxy-config route deploy/my-app
```

### Cluster Match
For cluster patches, verify the cluster names:

```bash
istioctl proxy-config cluster deploy/my-app
```

## The "Before and After" Technique

This is the most reliable way to figure out what's happening. Get the config dump before applying your EnvoyFilter, then get it again after, and diff them:

```bash
# Before
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET config_dump > before.json

# Apply your filter
kubectl apply -f my-envoyfilter.yaml

# Wait a few seconds for propagation
sleep 10

# After
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET config_dump > after.json

# Diff
diff before.json after.json
```

If the diff is empty, your filter isn't matching anything.

## Common Error Patterns

### Filter Applied but Not Working

If the filter appears in the config dump but doesn't seem to do anything, check these:

1. **Wrong filter chain**: Envoy can have multiple filter chains on a single listener (for different ports or SNI hosts). Your filter might be on a different chain than the one handling your traffic.

2. **Filter order**: Some filters need to come before others. For example, if you're adding an auth filter, it needs to come before the router. Use `INSERT_BEFORE` with `envoy.filters.http.router` as the reference.

3. **Typed config issues**: The `@type` URL must exactly match the proto type. A common mistake is using v2 type URLs with v3 configurations.

### Proxy Crashes After Applying Filter

If the istio-proxy container starts crashing after you apply an EnvoyFilter, check the logs immediately:

```bash
kubectl logs deploy/my-app -c istio-proxy --previous
```

The `--previous` flag shows logs from the crashed container. Common causes include:

- Invalid filter configuration that Envoy can't parse
- Missing required fields in the filter config
- Referencing a cluster that doesn't exist (for Lua httpCall)

### Filter Works for Some Requests but Not Others

This usually means your match criteria are too broad or too narrow. Use the access log to see which requests are going through which filter chains:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request GET stats | grep http
```

## Enabling Debug Logging

You can temporarily increase the Envoy log level to get more detailed information:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request POST 'logging?level=debug'
```

Warning: debug logging is extremely verbose. Don't leave it on in production. To reset:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- pilot-agent request POST 'logging?level=warning'
```

## Validating YAML Before Applying

A surprising number of issues come from YAML syntax problems. Before applying, validate your EnvoyFilter:

```bash
kubectl apply --dry-run=client -f my-envoyfilter.yaml
```

This catches YAML syntax errors but won't validate the Envoy-specific configuration inside the `value` field.

## Tips for Prevention

1. Always test EnvoyFilters in a non-production namespace first
2. Use `workloadSelector` to limit the blast radius
3. Keep a known-good config dump so you can always compare
4. Add descriptive names to your EnvoyFilters so they're easy to find in the config dump
5. Document your EnvoyFilters extensively, including why each match criterion is set the way it is

Debugging EnvoyFilter problems is never fun, but having a systematic approach makes it much more manageable. Start with the config dump, verify your match criteria, and work your way through the checklist. Most issues fall into a few common categories, and once you've seen each one a couple of times, you'll spot them quickly.
